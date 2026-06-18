import React, { useState, useMemo } from 'react';
import FilterListbox from "../../../../components/filter/FilterListbox";
import { useNavigate } from 'react-router-dom';
import Pagination from "../../../../components/Pagination/pagination";
import { KPICard } from '../../../../components/kpi/KPI';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart
} from 'recharts';
import { DownloadIcon, FilterIcon, SearchIcon, EmployeeIcon, ActivityIcon, ProjectsIcon, DocumentIcon, ChevronRightIcon, TrendingUpIcon, WarningIcon, RefreshIcon, DesktopIcon, SuccessIcon, PendingIcon, AwardIcon, SecurityAlertIcon, TrendUpIcon, TrendDownIcon, ZapIcon, PrevIcon, DateRangeIcon, BarChartIcon, CloseIcon } from "@/components/icons";
import { utilizationService } from '../../services/utilizationService';
import GenericTable from "../../../../components/Table/table";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getResourceManagementErrorMessage, notify } from "../../utils/notify";

const getTodayStr = () => new Date().toISOString().split('T')[0];
const getLastYearStr = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
};

const ITEMS_PER_PAGE = 5;

const INITIAL_TOTAL_PAGES = {
  ANOMALIES: 1,
  RESOURCE: 1,
  PROJECT: 1,
  ROLE: 1,
  CLIENT: 1,
};

const extractRows = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  if (Array.isArray(payload.content)) return payload.content;
  if (payload.data) return extractRows(payload.data, keys);
  if (payload.page) return extractRows(payload.page, keys);

  return [];
};

const extractTotalPages = (payload, pageSize = ITEMS_PER_PAGE) => {
  const source = payload?.page || payload?.data || payload || {};
  const totalElements = Number(
    source.totalElements ??
    source.totalRecords ??
    source.totalCount ??
    payload?.totalElements ??
    payload?.totalRecords ??
    payload?.totalCount ??
    0
  );
  const totalPages = Number(
    source.totalPages ??
    payload?.totalPages ??
    (totalElements ? Math.ceil(totalElements / pageSize) : 1)
  );

  return Math.max(totalPages || 1, 1);
};

const getNumber = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null && item !== '');
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeSummary = (summary = {}) => ({
  ...summary,
  totalHours: getNumber(summary.totalHours, summary.actualHours),
  utilizationPercentage: getNumber(
    summary.utilizationPercentage,
    summary.overallUtilizationPercentage,
    summary.utilization,
  ),
  totalResources: getNumber(summary.totalResources, summary.totalUsers, summary.resourceCount),
  confidenceScore: getNumber(summary.confidenceScore, summary.averageConfidenceScore, 100),
});

const normalizeAlert = (alert = {}) => ({
  ...alert,
  resourceName: alert.resourceName || alert.scope || alert.projectName || alert.title || 'General',
  severity: alert.severity || alert.status || 'WARNING',
  message: alert.message || alert.description || alert.pattern || 'Utilization threshold signal detected.',
  recommendation: alert.recommendation || alert.action || alert.nextStep || 'Review utilization distribution.',
});

const normalizeResource = (resource = {}) => ({
  ...resource,
  resourceName: resource.resourceName || resource.userName || resource.name || 'Unassigned Resource',
  role: resource.role || resource.designation || 'Resource',
  totalHours: getNumber(resource.totalHours, resource.hours, resource.billableHours),
  billableRatio: getNumber(resource.billableRatio, resource.billablePercentage),
  utilizationPercentage: getNumber(
    resource.utilizationPercentage,
    resource.utilization,
    resource.billablePercentage,
  ),
  utilizationBand: resource.utilizationBand || resource.status || 'HEALTHY',
  trendSignal: resource.trendSignal || resource.trend || 'STABLE',
});

const normalizeProject = (project = {}) => ({
  ...project,
  projectName: project.projectName || project.name || 'Unnamed Project',
  clientName: project.clientName || project.client || '-',
  uniqueResources: getNumber(project.uniqueResources, project.resourceCount, project.resources),
  totalHours: getNumber(project.totalHours, project.hours),
  utilizationPercentage: getNumber(project.utilizationPercentage, project.utilization),
  utilizationBand: project.utilizationBand || project.status || 'HEALTHY',
});

const normalizeRole = (role = {}) => ({
  ...role,
  roleName: role.roleName || role.role || 'Unnamed Role',
  uniqueResources: getNumber(role.uniqueResources, role.resourceCount, role.resources),
  totalHours: getNumber(role.totalHours, role.hours),
  utilizationPercentage: getNumber(role.utilizationPercentage, role.utilization),
  utilizationBand: role.utilizationBand || role.status || 'HEALTHY',
});

const normalizeClient = (client = {}) => ({
  ...client,
  clientName: client.clientName || client.name || 'Unnamed Client',
  uniqueProjects: getNumber(client.uniqueProjects, client.activeProjects, client.projectCount),
  totalHours: getNumber(client.totalHours, client.hours),
  utilizationPercentage: getNumber(client.utilizationPercentage, client.utilization),
  utilizationBand: client.utilizationBand || client.status || 'HEALTHY',
});

const UtilizationReportingDashboard = () => {
  const navigate = useNavigate();
  const [reportParams, setReportParams] = useState({
    startDate: getLastYearStr(),
    endDate: getTodayStr(),
    reportType: 'SUMMARY',
    groupBy: 'WEEKLY',
    approvedOnly: true,
    includeTrends: true,
    includeAlerts: true,
    overUtilizationThreshold: 95,
    underUtilizationThreshold: 50,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ANOMALIES');
  const [loadedTabs, setLoadedTabs] = useState({});
  const [sectionLoading, setSectionLoading] = useState({});
  const [sectionErrors, setSectionErrors] = useState({});
  const [totalPagesByTab, setTotalPagesByTab] = useState(INITIAL_TOTAL_PAGES);

  const [currentPageAnomalies, setCurrentPageAnomalies] = useState(1);
  const [currentPageResource, setCurrentPageResource] = useState(1);
  const [currentPageProject, setCurrentPageProject] = useState(1);
  const [currentPageRole, setCurrentPageRole] = useState(1);
  const [currentPageClient, setCurrentPageClient] = useState(1);

  const buildBaseParams = () => ({
    startDate: reportParams.startDate,
    endDate: reportParams.endDate,
    groupBy: reportParams.groupBy,
    approvedOnly: reportParams.approvedOnly,
    overUtilizationThreshold: reportParams.overUtilizationThreshold,
    underUtilizationThreshold: reportParams.underUtilizationThreshold,
  });

  const buildExportParams = () => ({
    ...buildBaseParams(),
    reportType: reportParams.reportType || 'SUMMARY',
  });

  const resetPages = () => {
    setCurrentPageAnomalies(1);
    setCurrentPageResource(1);
    setCurrentPageProject(1);
    setCurrentPageRole(1);
    setCurrentPageClient(1);
    setTotalPagesByTab(INITIAL_TOTAL_PAGES);
  };

  const setPageForTab = (tab, page) => {
    if (tab === 'ANOMALIES') setCurrentPageAnomalies(page);
    if (tab === 'RESOURCE') setCurrentPageResource(page);
    if (tab === 'PROJECT') setCurrentPageProject(page);
    if (tab === 'ROLE') setCurrentPageRole(page);
    if (tab === 'CLIENT') setCurrentPageClient(page);
  };

  const loadTabData = async (tab, page = 1) => {
    const baseParams = buildBaseParams();
    const params = { ...baseParams, page: page - 1, size: ITEMS_PER_PAGE };

    setSectionLoading((prev) => ({ ...prev, [tab]: true }));
    setSectionErrors((prev) => ({ ...prev, [tab]: null }));

    try {
      let payload;
      let rows = [];
      let key;

      if (tab === 'ANOMALIES') {
        payload = await utilizationService.getUtilizationAlerts(params);
        rows = extractRows(payload, ['alerts', 'anomalies', 'breaches', 'content']).map(normalizeAlert);
        key = 'alerts';
      }

      if (tab === 'RESOURCE') {
        payload = await utilizationService.getUtilizationResources(params);
        rows = extractRows(payload, ['resourceUtilizations', 'resources', 'content']).map(normalizeResource);
        key = 'resourceUtilizations';
      }

      if (tab === 'PROJECT') {
        payload = await utilizationService.getUtilizationProjects(params);
        rows = extractRows(payload, ['projectUtilizations', 'projects', 'content']).map(normalizeProject);
        key = 'projectUtilizations';
      }

      if (tab === 'ROLE') {
        payload = await utilizationService.getUtilizationRoles(params);
        rows = extractRows(payload, ['roleUtilizations', 'roles', 'content']).map(normalizeRole);
        key = 'roleUtilizations';
      }

      if (tab === 'CLIENT') {
        payload = await utilizationService.getUtilizationClients(params);
        rows = extractRows(payload, ['clientUtilizations', 'clients', 'content']).map(normalizeClient);
        key = 'clientUtilizations';
      }

      setReportData((prev) => ({ ...(prev || {}), [key]: rows }));
      setTotalPagesByTab((prev) => ({ ...prev, [tab]: extractTotalPages(payload) }));
      setPageForTab(tab, page);
      setLoadedTabs((prev) => ({ ...prev, [tab]: true }));
    } catch (err) {
      console.error(err);
      setReportData((prev) => ({
        ...(prev || {}),
        ...(tab === 'ANOMALIES' ? { alerts: [] } : {}),
        ...(tab === 'RESOURCE' ? { resourceUtilizations: [] } : {}),
        ...(tab === 'PROJECT' ? { projectUtilizations: [] } : {}),
        ...(tab === 'ROLE' ? { roleUtilizations: [] } : {}),
        ...(tab === 'CLIENT' ? { clientUtilizations: [] } : {}),
      }));
      setSectionErrors((prev) => ({
        ...prev,
        [tab]: getResourceManagementErrorMessage(err, 'Failed to load section data'),
      }));
      setTotalPagesByTab((prev) => ({ ...prev, [tab]: 1 }));
      setLoadedTabs((prev) => ({ ...prev, [tab]: true }));
    } finally {
      setSectionLoading((prev) => ({ ...prev, [tab]: false }));
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);
    setLoadedTabs({});
    setSectionErrors({});
    resetPages();

    const nextTab = reportParams.reportType === 'SUMMARY' ? 'ANOMALIES' : reportParams.reportType;
    setActiveTab(nextTab);

    try {
      const baseParams = buildBaseParams();
      const summary = normalizeSummary(await utilizationService.getUtilizationSummary(baseParams));

      setReportData({
        ...summary,
        alerts: [],
        resourceUtilizations: [],
        projectUtilizations: [],
        roleUtilizations: [],
        clientUtilizations: [],
      });

      if (reportParams.includeTrends) {
        utilizationService.getUtilizationTrends(baseParams)
          .then((trends) => setReportData((prev) => ({ ...(prev || {}), trends })))
          .catch((err) => console.error('Failed to load utilization trends:', err));
      }

      utilizationService.getUtilizationAnalytics(baseParams)
        .then((analytics) => setReportData((prev) => ({ ...(prev || {}), analytics })))
        .catch((err) => console.error('Failed to load utilization analytics:', err));

      await loadTabData(nextTab, 1);
    } catch (err) {
      console.error(err);
      setError('Failed to generate report. Please try again.');
      notify.error(err, 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (reportData && !loadedTabs[tab]) {
      loadTabData(tab, 1);
    }
  };

  const anomaliesList = useMemo(() => reportData?.alerts || [], [reportData]);
  const totalAnomaliesPages = totalPagesByTab.ANOMALIES;
  const paginatedAnomalies = anomaliesList;

  const resourceList = useMemo(() => Array.isArray(reportData) ? reportData : reportData?.resourceUtilizations || [], [reportData]);
  const totalResourcePages = totalPagesByTab.RESOURCE;
  const paginatedResource = resourceList;

  const projectList = useMemo(() => Array.isArray(reportData) ? reportData : reportData?.projectUtilizations || [], [reportData]);
  const totalProjectPages = totalPagesByTab.PROJECT;
  const paginatedProject = projectList;

  const roleList = useMemo(() => Array.isArray(reportData) ? reportData : reportData?.roleUtilizations || [], [reportData]);
  const totalRolePages = totalPagesByTab.ROLE;
  const paginatedRole = roleList;

  const clientList = useMemo(() => Array.isArray(reportData) ? reportData : reportData?.clientUtilizations || [], [reportData]);
  const totalClientPages = totalPagesByTab.CLIENT;
  const paginatedClient = clientList;

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      notify.loading('Exporting CSV...', 'csv-export');
      await utilizationService.exportUtilizationCSV(buildExportParams());
      notify.complete('csv-export', 'Export successful', 'success');
    } catch (err) {
      notify.complete(
        'csv-export',
        getResourceManagementErrorMessage(err, 'Export failed'),
        'error',
      );
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      notify.loading('Exporting Excel...', 'excel-export');
      await utilizationService.exportUtilizationExcel(buildExportParams());
      notify.complete('excel-export', 'Export successful', 'success');
    } catch (err) {
      notify.complete(
        'excel-export',
        getResourceManagementErrorMessage(err, 'Export failed'),
        'error',
      );
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans select-none selection:bg-indigo-100 selection:text-indigo-900">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/resource-management/bench/utilization-performance')}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <PrevIcon size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-none">Utilization Reporting & Dashboards</h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 capitalize tracking-normal flex items-center gap-2">
              <ActivityIcon size={14} className="text-emerald-600" /> Comprehensive utilization analytics by dimension
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!reportData || isExportingCSV}
            className="h-[42px] px-5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
          >
            {isExportingCSV ? <RefreshIcon size={16} className="animate-spin text-emerald-600" /> : <DownloadIcon size={16} />}
            <span className="text-[12px] font-black capitalize">CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!reportData || isExportingExcel}
            className="h-[42px] px-5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-emerald-600/10"
          >
            {isExportingExcel ? <RefreshIcon size={16} className="animate-spin" /> : <DownloadIcon size={16} />}
            <span className="text-[12px] font-black capitalize">EXCEL</span>
          </button>
        </div>
      </div>

      {/* Report Config Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-6 relative group">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex flex-wrap items-center gap-5 flex-1">
            {/* Unified Calendar Picker */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 capitalize tracking-widest pl-1">Utilization Period</label>
              <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 hover:border-indigo-200 transition-all group/date">
                <DateRangeIcon size={13} className="text-indigo-600 group-hover/date:scale-110 transition-transform" />
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={reportParams.startDate}
                    onChange={(e) => setReportParams({ ...reportParams, startDate: e.target.value })}
                    onClick={(e) => e.target.showPicker()}
                    className="text-[11px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer w-auto min-w-[95px] h-7"
                  />
                  <span className="text-slate-300 mx-0.5">—</span>
                  <input
                    type="date"
                    value={reportParams.endDate}
                    onChange={(e) => setReportParams({ ...reportParams, endDate: e.target.value })}
                    onClick={(e) => e.target.showPicker()}
                    className="text-[11px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer w-auto min-w-[95px] h-7"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 capitalize tracking-widest pl-1">Report Type</label>
              <div className="relative">
                <FilterListbox
                  options={[
                    { value: "SUMMARY", label: "SUMMARY" },
                    { value: "RESOURCE", label: "RESOURCE" },
                    { value: "PROJECT", label: "PROJECT" },
                    { value: "CLIENT", label: "CLIENT" },
                    { value: "ROLE", label: "ROLE" },
                  ]}
                  value={reportParams.reportType}
                  onChange={(val) => {
                    setReportParams({ ...reportParams, reportType: val });
                    handleTabChange(val === 'SUMMARY' ? 'ANOMALIES' : val);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 capitalize tracking-widest pl-1">Grouping</label>
              <div className="relative">
                <FilterListbox
                  options={[{ value: "WEEKLY", label: "WEEKLY" }, { value: "MONTHLY", label: "MONTHLY" }]}
                  value={reportParams.groupBy}
                  onChange={(val) => setReportParams({ ...reportParams, groupBy: val })}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center self-end">
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="h-9 px-6 rounded-lg bg-indigo-600 text-white text-[11px] font-black capitalize tracking-widest hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              {isGenerating ? <RefreshIcon size={14} className="animate-spin" /> : <BarChartIcon size={14} />}
              {isGenerating ? 'ANALYZING...' : 'GENERATE'}
            </button>
          </div>
        </div>
      </div>
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-4 mb-6 shadow-sm">
          <WarningIcon size={20} className="text-rose-500" />
          <div>
            <h4 className="text-[11px] font-black text-rose-900 capitalize">Error</h4>
            <p className="text-[12px] font-bold text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {!reportData && !isGenerating && !error && (
        <div className="bg-white rounded-3xl border border-dotted border-slate-200 p-24 flex flex-col items-center justify-center text-center group">
          <div className="h-20 w-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-8 border border-emerald-100 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
            <BarChartIcon className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-900 capitalize tracking-tight">Utilization Reporting Engine</h3>
          <p className="mt-3 text-[13px] font-medium text-slate-400 max-w-sm italic">Configure your parameters above to generate utilization analytics across multiple dimensions.</p>
        </div>
      )}

      {isGenerating && (
        <div className="bg-white rounded-3xl border border-slate-100 p-24 flex flex-col items-center justify-center text-center">
          <div className="h-20 w-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-8 border border-emerald-100 animate-pulse">
            <RefreshIcon size={40} className="animate-spin" />
          </div>
          <h3 className="text-xl font-black text-emerald-900 capitalize tracking-tight">Compiling Intelligence Report</h3>
          <p className="mt-3 text-[13px] font-medium text-slate-400 max-w-sm italic leading-relaxed">Aggregating timesheet actuals...</p>
        </div>
      )}

      {reportData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Actual Hours', value: reportData.totalHours, icon: <PendingIcon />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Utilization %', value: `${reportData.utilizationPercentage}%`, icon: <TrendingUpIcon />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Total Resources', value: reportData.totalResources, icon: <EmployeeIcon />, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Confidence Score', value: `${reportData.confidenceScore}%`, icon: <SuccessIcon />, color: 'text-amber-600', bg: 'bg-amber-50' }
            ].map((kpi) => (
              <KPICard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                icon={React.cloneElement(kpi.icon, { size: 20, strokeWidth: 2.5 })}
                color={`${kpi.bg} ${kpi.color}`}
              />
            ))}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
             {['ANOMALIES', 'RESOURCE', 'PROJECT', 'ROLE', 'CLIENT'].map(tab => {
                const getTabText = (t) => {
                  if (t === 'ANOMALIES') return 'Utilization Anomalies';
                  if (t === 'CLIENT') return 'Client Utilization';
                  if (t === 'RESOURCE') return 'Resource Utilization Report';
                  if (t === 'PROJECT') return 'Project Utilization Report';
                  if (t === 'ROLE') return 'Role Utilization Report';
                  return t;
                };
                return (
                  <button
                     key={tab}
                     onClick={() => handleTabChange(tab)}
                     className={`px-6 py-4 text-[11px] font-black tracking-widest whitespace-nowrap transition-all border-b-2 flex-1 ${activeTab === tab ? 'text-emerald-600 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'}`}
                  >
                     {getTabText(tab)}
                  </button> 
                );
             })}
          </div>

          {/* Alerts */}
          {activeTab === 'ANOMALIES' && reportParams.includeAlerts && reportData.alerts?.length >= 0 && (
            <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden relative">
              <div className="bg-rose-50/50 px-8 py-5 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-rose-100 text-rose-500 rounded-lg flex items-center justify-center shadow-sm">
                    <SecurityAlertIcon size={20} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-rose-900 capitalize tracking-[0.1em]">Utilization Anomalies ({reportData.alerts?.length || 0})</h4>
                  </div>
                </div>
              </div>
              {sectionLoading.ANOMALIES ? (
                <div className="p-12 flex justify-center">
                  <LoadingSpinner text="Loading anomalies..." />
                </div>
              ) : sectionErrors.ANOMALIES ? (
                <div className="m-6 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-[12px] font-bold text-amber-700">{sectionErrors.ANOMALIES}</div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {paginatedAnomalies.map((alert, idx) => (
                    <div key={idx} className="p-5 bg-slate-50/30 rounded-2xl border border-slate-100 flex flex-col gap-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-black text-slate-900 capitalize">{alert.resourceName}</span>
                        <span className={`text-[10px] font-black capitalize px-2 py-1 rounded ${alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{alert.severity}</span>
                      </div>
                      <p className="text-[12px] font-medium text-slate-500">{alert.message}</p>
                      <p className="text-[11px] font-bold text-indigo-600 mt-2">Action: {alert.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
              {totalAnomaliesPages > 1 && (
                <div className="py-4 border-t border-slate-100">
                  <Pagination
                    currentPage={currentPageAnomalies}
                    totalPages={totalAnomaliesPages}
                    onPrevious={() => loadTabData('ANOMALIES', Math.max(1, currentPageAnomalies - 1))}
                    onNext={() => loadTabData('ANOMALIES', Math.min(totalAnomaliesPages, currentPageAnomalies + 1))}
                  />
                </div>
              )}
            </div>
          )}

          {/* Resource Breakdown */}
          {activeTab === 'RESOURCE' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <EmployeeIcon className="text-indigo-600" />
                  <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.1em]">Resource Utilization Report</h4>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  {sectionLoading.RESOURCE ? (
                    <div className="p-12 flex justify-center">
                      <LoadingSpinner text="Loading resources..." />
                    </div>
                  ) : sectionErrors.RESOURCE ? (
                    <div className="m-6 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-[12px] font-bold text-amber-700">{sectionErrors.RESOURCE}</div>
                  ) : (
                    <GenericTable
                      headers={["Resource", "Hours", "Billable %", "Utilization", "Status", "Trend"]}
                      columns={["resource_info", "hours_info", "billable_info", "utilization_info", "status_info", "trend_info"]}
                      rows={paginatedResource.map((res) => ({
                        ...res,
                        resource_info: (
                          <div className="flex flex-col text-left">
                            <span className="text-[13px] font-black text-slate-900">{res.resourceName}</span>
                            <span className="text-[11px] text-slate-500">{res.role}</span>
                          </div>
                        ),
                        hours_info: <div className="text-center font-bold">{res.totalHours}h</div>,
                        billable_info: <div className="text-center text-[12px] font-medium text-slate-600">{res.billableRatio}%</div>,
                        utilization_info: (
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                               <div
                                  className={`h-full rounded-full ${res.utilizationPercentage > 100 ? 'bg-rose-500' : res.utilizationPercentage < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(res.utilizationPercentage, 100)}%` }}
                               />
                            </div>
                            <span className="text-[11px] font-bold">{res.utilizationPercentage}%</span>
                          </div>
                        ),
                        status_info: (
                          <div className="text-center">
                             <span className={`text-[9px] font-black capitalize px-2 py-1 rounded ${res.utilizationBand === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : res.utilizationBand === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{res.utilizationBand || 'HEALTHY'}</span>
                          </div>
                        ),
                        trend_info: (
                          <div className="text-center">
                             {res.trendSignal === 'UP' ? <TrendUpIcon className="inline text-emerald-500" size={16} /> : res.trendSignal === 'DOWN' ? <TrendDownIcon className="inline text-rose-500" size={16} /> : <span className="text-slate-400 font-bold">-</span>}
                          </div>
                        )
                      }))}
                    />
                  )}
               </div>
               {totalResourcePages > 1 && (
                 <div className="py-4 border-t border-slate-100">
                   <Pagination
                     currentPage={currentPageResource}
                     totalPages={totalResourcePages}
                     onPrevious={() => loadTabData('RESOURCE', Math.max(1, currentPageResource - 1))}
                     onNext={() => loadTabData('RESOURCE', Math.min(totalResourcePages, currentPageResource + 1))}
                   />
                 </div>
               )}
            </div>
          )}

           {/* Project Breakdown */}
           {activeTab === 'PROJECT' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <DesktopIcon className="text-blue-600" />
                  <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.1em]">Project Utilization Report</h4>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  {sectionLoading.PROJECT ? (
                    <div className="p-12 flex justify-center">
                      <LoadingSpinner text="Loading projects..." />
                    </div>
                  ) : sectionErrors.PROJECT ? (
                    <div className="m-6 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-[12px] font-bold text-amber-700">{sectionErrors.PROJECT}</div>
                  ) : (
                    <GenericTable
                      headers={["Project", "Client", "Resources", "Hours", "Utilization", "Status"]}
                      columns={["project_name", "client_name_info", "resources_info", "hours_info", "utilization_info", "status_info"]}
                      rows={paginatedProject.map((proj) => ({
                        ...proj,
                        project_name: <div className="text-left font-black text-[13px] text-slate-900">{proj.projectName}</div>,
                        client_name_info: <div className="text-center text-[12px] text-slate-600">{proj.clientName}</div>,
                        resources_info: <div className="text-center text-[12px] text-slate-600">{proj.uniqueResources}</div>,
                        hours_info: <div className="text-center font-bold">{proj.totalHours}h</div>,
                        utilization_info: (
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                               <div
                                  className={`h-full rounded-full bg-blue-500`}
                                  style={{ width: `${Math.min(proj.utilizationPercentage, 100)}%` }}
                               />
                            </div>
                            <span className="text-[11px] font-bold">{proj.utilizationPercentage}%</span>
                          </div>
                        ),
                        status_info: (
                          <div className="text-center">
                             <span className={`text-[9px] font-black capitalize px-2 py-1 rounded ${proj.utilizationBand === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : proj.utilizationBand === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{proj.utilizationBand || 'HEALTHY'}</span>
                          </div>
                        )
                      }))}
                    />
                  )}
               </div>
               {totalProjectPages > 1 && (
                 <div className="py-4 border-t border-slate-100">
                   <Pagination
                     currentPage={currentPageProject}
                     totalPages={totalProjectPages}
                     onPrevious={() => loadTabData('PROJECT', Math.max(1, currentPageProject - 1))}
                     onNext={() => loadTabData('PROJECT', Math.min(totalProjectPages, currentPageProject + 1))}
                   />
                 </div>
               )}
            </div>
          )}

           {/* Role Breakdown */}
           {activeTab === 'ROLE' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <AwardIcon className="text-amber-600" />
                  <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.1em]">Role Utilization Report</h4>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  {sectionLoading.ROLE ? (
                    <div className="p-12 flex justify-center">
                      <LoadingSpinner text="Loading roles..." />
                    </div>
                  ) : sectionErrors.ROLE ? (
                    <div className="m-6 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-[12px] font-bold text-amber-700">{sectionErrors.ROLE}</div>
                  ) : (
                    <GenericTable
                      headers={["Role", "Resources", "Hours", "Utilization", "Status"]}
                      columns={["role_name", "resources_info", "hours_info", "utilization_info", "status_info"]}
                      rows={paginatedRole.map((role) => ({
                        ...role,
                        role_name: <div className="text-left font-black text-[13px] text-slate-900">{role.roleName}</div>,
                        resources_info: <div className="text-center text-[12px] text-slate-600">{role.uniqueResources}</div>,
                        hours_info: <div className="text-center font-bold">{role.totalHours}h</div>,
                        utilization_info: (
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                               <div
                                  className={`h-full rounded-full bg-amber-500`}
                                  style={{ width: `${Math.min(role.utilizationPercentage, 100)}%` }}
                               />
                            </div>
                            <span className="text-[11px] font-bold">{role.utilizationPercentage}%</span>
                          </div>
                        ),
                        status_info: (
                          <div className="text-center">
                             <span className={`text-[9px] font-black capitalize px-2 py-1 rounded ${role.utilizationBand === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : role.utilizationBand === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{role.utilizationBand || 'HEALTHY'}</span>
                          </div>
                        )
                      }))}
                    />
                  )}
               </div>
               {totalRolePages > 1 && (
                 <div className="py-4 border-t border-slate-100">
                   <Pagination
                     currentPage={currentPageRole}
                     totalPages={totalRolePages}
                     onPrevious={() => loadTabData('ROLE', Math.max(1, currentPageRole - 1))}
                     onNext={() => loadTabData('ROLE', Math.min(totalRolePages, currentPageRole + 1))}
                   />
                 </div>
               )}
            </div>
          )}

           {/* Client Breakdown */}
           {activeTab === 'CLIENT' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <ProjectsIcon className="text-purple-600" />
                  <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.1em]">Client Utilization Report</h4>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  {sectionLoading.CLIENT ? (
                    <div className="p-12 flex justify-center">
                      <LoadingSpinner text="Loading clients..." />
                    </div>
                  ) : sectionErrors.CLIENT ? (
                    <div className="m-6 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-[12px] font-bold text-amber-700">{sectionErrors.CLIENT}</div>
                  ) : (
                    <GenericTable
                      headers={["Client", "Active Projects", "Hours", "Utilization", "Status"]}
                      columns={["client_name_label", "projects_info", "hours_info", "utilization_info", "status_info"]}
                      rows={paginatedClient.map((client) => ({
                        ...client,
                        client_name_label: <div className="text-left font-black text-[13px] text-slate-900">{client.clientName}</div>,
                        projects_info: <div className="text-center text-[12px] text-slate-600">{client.uniqueProjects}</div>,
                        hours_info: <div className="text-center font-bold">{client.totalHours}h</div>,
                        utilization_info: (
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                               <div
                                  className={`h-full rounded-full bg-purple-500`}
                                  style={{ width: `${Math.min(client.utilizationPercentage, 100)}%` }}
                               />
                            </div>
                            <span className="text-[11px] font-bold">{client.utilizationPercentage}%</span>
                          </div>
                        ),
                        status_info: (
                          <div className="text-center">
                             <span className={`text-[9px] font-black capitalize px-2 py-1 rounded ${client.utilizationBand === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : client.utilizationBand === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{client.utilizationBand || 'HEALTHY'}</span>
                          </div>
                        )
                      }))}
                    />
                  )}
               </div>
               {totalClientPages > 1 && (
                 <div className="py-4 border-t border-slate-100">
                   <Pagination
                     currentPage={currentPageClient}
                     totalPages={totalClientPages}
                     onPrevious={() => loadTabData('CLIENT', Math.max(1, currentPageClient - 1))}
                     onNext={() => loadTabData('CLIENT', Math.min(totalClientPages, currentPageClient + 1))}
                   />
                 </div>
               )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default UtilizationReportingDashboard;
