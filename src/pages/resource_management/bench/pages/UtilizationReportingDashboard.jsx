import React, { useState, useMemo } from 'react';
import FilterListbox from "../../../../components/filter/FilterListbox";
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart
} from 'recharts';
import {
  Download, Filter, Search, Users, Activity,
  Briefcase, FileText, ChevronRight, TrendingUp, AlertTriangle, RefreshCcw, Monitor, ShieldCheck, Clock, Award, ShieldAlert, ArrowUpRight, ArrowDownRight, Zap, ArrowLeft, CalendarRange, BarChart3
} from 'lucide-react';
import { utilizationService } from '../../services/utilizationService';
import toast from 'react-hot-toast';
import GenericTable from "../../../../components/Table/table";

const MOCK_REPORT_DATA = {
  totalHours: 12450.5,
  utilizationPercentage: 82.4,
  totalResources: 145,
  confidenceScore: 98,
  alerts: [
    { severity: 'CRITICAL', resourceName: 'Alex Mercer', message: 'Sustained over-utilization (110%) for 3 consecutive weeks.', recommendation: 'Redistribute workload immediately.' },
    { severity: 'WARNING', resourceName: 'Sarah Chen', message: 'Under-utilization (45%) detected this month.', recommendation: 'Assign to pending internal projects.' }
  ],
  resourceUtilizations: [
    { resourceName: 'Alex Mercer', role: 'Senior Developer', totalHours: 180, utilizationPercentage: 110, utilizationBand: 'CRITICAL', trendSignal: 'UP', confidenceScore: 100 },
    { resourceName: 'Sarah Chen', role: 'UX Designer', totalHours: 72, utilizationPercentage: 45, utilizationBand: 'LOW', trendSignal: 'DOWN', confidenceScore: 100 },
    { resourceName: 'Michael Chang', role: 'Project Manager', totalHours: 160, utilizationPercentage: 100, utilizationBand: 'OPTIMAL', trendSignal: 'UP', confidenceScore: 95 },
    { resourceName: 'Emma Watson', role: 'Frontend Engineer', totalHours: 140, utilizationPercentage: 87, utilizationBand: 'OPTIMAL', trendSignal: 'UP', confidenceScore: 98 },
    { resourceName: 'James Rodriguez', role: 'Backend Engineer', totalHours: 155, utilizationPercentage: 96, utilizationBand: 'HIGH', trendSignal: 'UP', confidenceScore: 100 }
  ],
  projectUtilizations: [
    { projectName: 'Project Phoenix', clientName: 'Acme Corp', utilizationPercentage: 92, billableRatio: 90, resourceCount: 12, totalHours: 1840 },
    { projectName: 'Project Titan', clientName: 'Stark Ind.', utilizationPercentage: 105, billableRatio: 98, resourceCount: 8, totalHours: 1350 },
    { projectName: 'Internal Tools', clientName: 'Internal', utilizationPercentage: 65, billableRatio: 0, resourceCount: 5, totalHours: 600 }
  ],
  roleUtilizations: [
    { roleName: 'Frontend Engineer', totalHours: 4200, resourceCount: 35, utilizationPercentage: 85, billableRatio: 80 },
    { roleName: 'Backend Engineer', totalHours: 3800, resourceCount: 30, utilizationPercentage: 88, billableRatio: 85 },
    { roleName: 'UX Designer', totalHours: 1200, resourceCount: 15, utilizationPercentage: 70, billableRatio: 65 }
  ],
  clientUtilizations: [
    { clientName: 'Acme Corp', activeProjects: 3, totalHours: 2400, utilizationPercentage: 88, revenueYield: 92, status: 'Healthy' },
    { clientName: 'Stark Ind.', activeProjects: 2, totalHours: 1800, utilizationPercentage: 95, revenueYield: 98, status: 'Over-Serviced' }
  ]
};

const getTodayStr = () => new Date().toISOString().split('T')[0];
const getLastYearStr = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
};

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

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await utilizationService.generateUtilizationReport(reportParams);
      setReportData(data);
    } catch (err) {
      console.error(err);
      setError('Failed to generate report. Please try again.');
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };


  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      toast.loading('Exporting CSV...', { id: 'csv-export' });
      await utilizationService.exportUtilizationCSV(reportParams);
      toast.success('Export successful', { id: 'csv-export' });
    } catch (err) {
      toast.error('Export failed', { id: 'csv-export' });
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      toast.loading('Exporting Excel...', { id: 'excel-export' });
      await utilizationService.exportUtilizationExcel(reportParams);
      toast.success('Export successful', { id: 'excel-export' });
    } catch (err) {
      toast.error('Export failed', { id: 'excel-export' });
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
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-none">Utilization Reporting & Dashboards</h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 capitalize tracking-normal flex items-center gap-2">
              <Activity size={14} className="text-emerald-600" /> Comprehensive utilization analytics by dimension
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!reportData || isExportingCSV}
            className="h-[42px] px-5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
          >
            {isExportingCSV ? <RefreshCcw size={16} className="animate-spin text-emerald-600" /> : <Download size={16} />}
            <span className="text-[12px] font-black capitalize">CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!reportData || isExportingExcel}
            className="h-[42px] px-5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-emerald-600/10"
          >
            {isExportingExcel ? <RefreshCcw size={16} className="animate-spin" /> : <Download size={16} />}
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
                <CalendarRange size={13} className="text-indigo-600 group-hover/date:scale-110 transition-transform" />
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
                    if (val === 'SUMMARY') { setActiveTab('ANOMALIES'); } else { setActiveTab(val); }
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
              {isGenerating ? <RefreshCcw size={14} className="animate-spin" /> : <BarChart3 size={14} />}
              {isGenerating ? 'ANALYZING...' : 'GENERATE'}
            </button>
          </div>
        </div>
      </div>
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-4 mb-6 shadow-sm">
          <AlertTriangle size={20} className="text-rose-500" />
          <div>
            <h4 className="text-[11px] font-black text-rose-900 capitalize">Error</h4>
            <p className="text-[12px] font-bold text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {!reportData && !isGenerating && !error && (
        <div className="bg-white rounded-3xl border border-dotted border-slate-200 p-24 flex flex-col items-center justify-center text-center group">
          <div className="h-20 w-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-8 border border-emerald-100 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
            <BarChart className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-900 capitalize tracking-tight">Utilization Reporting Engine</h3>
          <p className="mt-3 text-[13px] font-medium text-slate-400 max-w-sm italic">Configure your parameters above to generate utilization analytics across multiple dimensions.</p>
        </div>
      )}

      {isGenerating && (
        <div className="bg-white rounded-3xl border border-slate-100 p-24 flex flex-col items-center justify-center text-center">
          <div className="h-20 w-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-8 border border-emerald-100 animate-pulse">
            <RefreshCcw size={40} className="animate-spin" />
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
              { label: 'Total Actual Hours', value: reportData.totalHours, icon: <Clock />, color: 'text-indigo-600' },
              { label: 'Utilization %', value: `${reportData.utilizationPercentage}%`, icon: <TrendingUp />, color: 'text-emerald-600' },
              { label: 'Total Resources', value: reportData.totalResources, icon: <Users />, color: 'text-blue-600' },
              { label: 'Confidence Score', value: `${reportData.confidenceScore}%`, icon: <ShieldCheck />, color: 'text-amber-600' }
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`h-11 w-11 rounded-xl bg-slate-50 border border-slate-100 shadow-inner flex items-center justify-center ${kpi.color}`}>
                  {React.cloneElement(kpi.icon, { size: 20, strokeWidth: 2.5 })}
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 capitalize tracking-[0.2em] mb-0.5">{kpi.label}</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
             {['ANOMALIES', 'RESOURCE', 'PROJECT', 'ROLE', 'CLIENT'].map(tab => (
                <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`px-6 py-4 text-[11px] font-black capitalize tracking-widest whitespace-nowrap transition-all border-b-2 flex-1 ${activeTab === tab ? 'text-emerald-600 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'}`}
                >
                   {tab === 'ANOMALIES' ? 'UTILIZATION ANOMALIES' : `${tab} UTILIZATION REPORT`}
                </button>
             ))}
          </div>

          {/* Alerts */}
          {activeTab === 'ANOMALIES' && reportParams.includeAlerts && reportData.alerts?.length >= 0 && (
            <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden relative">
              <div className="bg-rose-50/50 px-8 py-5 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-rose-100 text-rose-500 rounded-lg flex items-center justify-center shadow-sm">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-rose-900 capitalize tracking-[0.1em]">Utilization Anomalies ({reportData.alerts?.length || 0})</h4>
                  </div>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                {(reportData.alerts || []).map((alert, idx) => (
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
            </div>
          )}

          {/* Resource Breakdown */}
          {activeTab === 'RESOURCE' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <Users className="text-indigo-600" />
                  <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.1em]">Resource Utilization Report</h4>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  <GenericTable
                    headers={["Resource", "Hours", "Billable %", "Utilization", "Status", "Trend"]}
                    columns={["resource_info", "hours_info", "billable_info", "utilization_info", "status_info", "trend_info"]}
                    rows={(Array.isArray(reportData) ? reportData : reportData.resourceUtilizations || []).map((res) => ({
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
                           {res.trendSignal === 'UP' ? <ArrowUpRight className="inline text-emerald-500" size={16} /> : res.trendSignal === 'DOWN' ? <ArrowDownRight className="inline text-rose-500" size={16} /> : <span className="text-slate-400 font-bold">-</span>}
                        </div>
                      )
                    }))}
                  />
               </div>
            </div>
          )}

           {/* Project Breakdown */}
           {activeTab === 'PROJECT' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-6">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <Monitor className="text-blue-600" />
                  <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.1em]">Project Utilization Report</h4>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  <GenericTable
                    headers={["Project", "Client", "Resources", "Hours", "Utilization", "Status"]}
                    columns={["project_name", "client_name_info", "resources_info", "hours_info", "utilization_info", "status_info"]}
                    rows={(Array.isArray(reportData) ? reportData : reportData.projectUtilizations || []).map((proj) => ({
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
               </div>
            </div>
          )}

           {/* Role Breakdown */}
           {activeTab === 'ROLE' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-6">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <Award className="text-amber-600" />
                  <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.1em]">Role Utilization Report</h4>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  <GenericTable
                    headers={["Role", "Resources", "Hours", "Utilization", "Status"]}
                    columns={["role_name", "resources_info", "hours_info", "utilization_info", "status_info"]}
                    rows={(Array.isArray(reportData) ? reportData : reportData.roleUtilizations || []).map((role) => ({
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
               </div>
            </div>
          )}

           {/* Client Breakdown */}
           {activeTab === 'CLIENT' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-6">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <Briefcase className="text-purple-600" />
                  <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.1em]">Client Utilization Report</h4>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  <GenericTable
                    headers={["Client", "Active Projects", "Hours", "Utilization", "Status"]}
                    columns={["client_name_label", "projects_info", "hours_info", "utilization_info", "status_info"]}
                    rows={(Array.isArray(reportData) ? reportData : reportData.clientUtilizations || []).map((client) => ({
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
               </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default UtilizationReportingDashboard;
