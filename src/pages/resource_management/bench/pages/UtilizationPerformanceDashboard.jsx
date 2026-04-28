import React, { useEffect, useState, useMemo } from 'react';
<<<<<<< HEAD
=======
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
>>>>>>> 82b0b78a47fd566918f73e6afdadc381a5152649
import { useNavigate, useLocation } from 'react-router-dom';
import { getOperationalProjects } from '../services/operationalProjectsService';
// import LoadingSpinner from '../../../../components/LoadingSpinner';
// import Pagination from '../../../../components/Pagination/pagination';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
   BarChart, Bar, Cell, PieChart, Pie, Sector, Legend, LineChart, Line, ComposedChart
} from 'recharts';
import {
   ArrowLeft, TrendingUp, BarChart3, Users, Zap, Target, Activity,
   Download, Filter, Search, Award, Monitor, PieChart as PieIcon,
   ChevronRight, Briefcase, FileText, ShieldCheck, AlertTriangle,
   ArrowUpRight, ArrowDownRight, History, Bell, CheckCircle2,
   Share2, RefreshCcw, Info, Fingerprint, Lock, ShieldAlert,
   Scale, LayoutGrid, PieChart as PieChartIcon,
   TrendingUp as TrendingUpIcon, MoveUpRight, Circle, CalendarRange,
   ZapOff, Database, Clock, X, User, BarChart2
} from 'lucide-react';
import { getBillNonBillable, getResourceProjects } from '../../services/utilizationService';
import Pagination from '../../../../components/Pagination/pagination';
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { utilizationService } from '../../services/utilizationService';
import { fetchResources } from '../../services/resource';
import ResourceVisualizationDrawer from '../components/ResourceVisualizationDrawer';

// --- INTEGRATED MOCK DATA MODELS FOR ALL 12 STORIES ---

const KPI_STATS = [
   { label: 'Total Resources', value: '0', trend: 'Active Pool', icon: <Users />, color: 'text-rose-600', bg: 'bg-rose-50' },
   { label: 'Utilization', value: '0.0%', trend: 'Live', icon: <TrendingUpIcon />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
   { label: 'Billable Ratio', value: '0.0%', trend: '', icon: <Award />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
   { label: 'Confidence Score', value: '100%', trend: 'Verified', icon: <Fingerprint />, color: 'text-blue-600', bg: 'bg-blue-50' },
];

const BILLING_PIE_DATA = [
   { name: 'Billable', value: 72, color: '#4f46e5' },
   { name: 'Non-Billable', value: 18, color: '#818cf8' },
   { name: 'Internal', value: 10, color: '#cbd5e1' },
];

const PORTFOLIO_DATA = {
   DAILY: [
      { period: 'Mon', actual: 7.2, planned: 8, util: 90 },
      { period: 'Tue', actual: 8.5, planned: 8, util: 106.2 },
      { period: 'Wed', actual: 7.8, planned: 8, util: 97.5 },
      { period: 'Thu', actual: 6.4, planned: 8, util: 80 },
      { period: 'Fri', actual: 4.8, planned: 8, util: 60 },
   ],
   WEEKLY: [
      { period: 'W11', actual: 115, planned: 160, util: 71.8 },
      { period: 'W12', actual: 120, planned: 160, util: 75.0 },
      { period: 'W13', actual: 132, planned: 160, util: 82.5 },
      { period: 'W14', actual: 140, planned: 160, util: 87.5 },
      { period: 'W15', actual: 104, planned: 160, util: 65.0 },
      { period: 'W16', actual: 102, planned: 160, util: 63.8 },
   ],
   MONTHLY: [
      { period: 'Jan', actual: 480, planned: 640, util: 75 },
      { period: 'Feb', actual: 520, planned: 640, util: 81.2 },
      { period: 'Mar', actual: 544, planned: 640, util: 85.0 },
   ]
};

const extractOperationalProjects = (payload) => {
   if (Array.isArray(payload)) return payload;
   if (Array.isArray(payload?.projects)) return payload.projects;
   if (Array.isArray(payload?.data)) return payload.data;
   if (Array.isArray(payload?.projectHoursSummaries)) return payload.projectHoursSummaries;
   if (Array.isArray(payload?.projectSummaries)) return payload.projectSummaries;
   if (Array.isArray(payload?.content)) return payload.content;
   return [];
};

const normalizeString = (value) => String(value ?? '').trim().toLowerCase();

const isInternalProject = (project) => {
   const explicitInternalFlag = [
      project.isInternal,
      project.internalProject,
      project.isInternalProject,
   ].find((value) => typeof value === 'boolean');

   if (typeof explicitInternalFlag === 'boolean') {
      return explicitInternalFlag;
   }

   const typeSignals = [
      project.projectType,
      project.type,
      project.category,
      project.projectCategory,
      project.engagementType,
   ].map(normalizeString);

   if (typeSignals.some((value) => value.includes('internal'))) {
      return true;
   }

   const clientSignals = [
      project.client,
      project.clientName,
      project.customer,
      project.accountName,
   ].map(normalizeString);

   if (clientSignals.some((value) => value === 'internal' || value.includes('internal project'))) {
      return true;
   }

   return false;
};

const mapProjectCatalogEntry = (project) => {
   const billableHours = Number(
      project.billableHours ?? project.billable ?? project.billableHour ?? 0,
   );
   const nonBillableHours = Number(
      project.nonBillableHours ?? project.nonBillable ?? project.nonBillableHour ?? 0,
   );
   const resourceHours = Number(
      project.resourceHours ?? project.totalResourceHours ?? project.totalHours ?? billableHours + nonBillableHours,
   );
   const internalHours = Math.max(resourceHours - billableHours - nonBillableHours, 0);
   const billingBase = billableHours + nonBillableHours + internalHours;
   const billable = billingBase > 0 ? Number(((billableHours / billingBase) * 100).toFixed(1)) : 0;
   const nonBillable = billingBase > 0 ? Number(((nonBillableHours / billingBase) * 100).toFixed(1)) : 0;
   const internal = billingBase > 0 ? Number(((internalHours / billingBase) * 100).toFixed(1)) : 0;
   const util = Number(
      project.utilization ?? project.utilizationPercentage ?? project.utilizationPercent ?? 0,
   );

   return {
      id: project.projectId || project.id || 'N/A',
      name: project.project || project.projectName || project.name || 'Unnamed Project',
      client: project.clientName || project.client || project.customer || `${resourceHours}h total`,
      actualHours: Number(project.actualHours ?? project.actual ?? 0),
      plannedHours: Number(project.plannedHours ?? project.planned ?? 0),
      pendingHours: Number(project.pendingHours ?? project.pending ?? 0),
      util,
      billable,
      nonBillable,
      internal,
      billableHours,
      nonBillableHours,
      internalHours,
      resourceHours,
      health: util >= 90 ? 'Optimal' : util >= 70 ? 'Warning' : 'Critical',
      severity: util >= 90 ? 'Low' : util >= 70 ? 'Warning' : 'Critical',
      breach: Number(project.pendingHours ?? project.pending ?? 0) > 0 ? 'Pending Hours' : 'None',
      isInternal: isInternalProject(project),
   };
};

const formatMetric = (value, suffix = '') => (
   typeof value === 'number' ? `${value}${suffix}` : '--'
);

const RESOURCE_DATABASE = [
   { id: 'E-004', name: 'Arun Kumar', role: 'Sr. Dev', util: 92.5, actual: 148, allocated: 160, billable: 140, nonBillable: 8, internal: 0, trend: 'up', lineage: 'TS-4421', confidence: 'High' },
   { id: 'E-221', name: 'Sarah Wing', role: 'QA Lead', util: 98.1, actual: 160, allocated: 163, billable: 150, nonBillable: 10, internal: 0, trend: 'volatile', lineage: 'TS-4452', confidence: 'Partial' },
   { id: 'E-056', name: 'Mike Ross', role: 'Backend', util: 42.5, actual: 68, allocated: 160, billable: 30, nonBillable: 20, internal: 18, trend: 'down', lineage: 'TS-4410', confidence: 'Low' },
   { id: 'E-334', name: 'Donna Paul', role: 'Designer', util: 87.5, actual: 140, allocated: 160, billable: 120, nonBillable: 10, internal: 10, trend: 'stable', lineage: 'TS-4433', confidence: 'High' },
];

const ALERT_INTELLIGENCE = [
   { id: 'AL-109', scope: 'Project Alpha-X', message: 'Sustained over-utilization (+18%) detected over 4 weeks.', stakeholder: 'Delivery Head', status: 'Pending', severity: 'Critical' },
   { id: 'AL-110', scope: 'Resource Mike Ross', message: 'Allocation exists (100%) but utilization is < 40%.', stakeholder: 'Resource Manager', status: 'Acknowledged', severity: 'Warning' },
];




const UtilizationPerformanceDashboard = () => {
   const PROJECTS_PER_PAGE = 5;
   const navigate = useNavigate();
   const location = useLocation();
   const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'portfolio');
   const [projectCategoryTab, setProjectCategoryTab] = useState('active');
   const [projectPage, setProjectPage] = useState(1);
   const [granularity, setGranularity] = useState('WEEKLY');
   const [selectedResourceId, setSelectedResourceId] = useState(null);
   const [OVERALL_CONFIDENCE_SCORE] = useState(94);
   const [operationalProjects, setOperationalProjects] = useState([]);
   const [projectsLoading, setProjectsLoading] = useState(true);
   const [projectsError, setProjectsError] = useState('');

   const [selectedResource, setSelectedResource] = useState(null);
   const [resourceProjectsData, setResourceProjectsData] = useState([]);
   const [isProjectsLoading, setIsProjectsLoading] = useState(false);
   const [projectsDrawerTab, setProjectsDrawerTab] = useState('overall'); // 'overall' or 'projects'

   const [searchQuery, setSearchQuery] = useState('');
   const [currentPage, setCurrentPage] = useState(1);
   const ITEMS_PER_PAGE = 8;
   const [liveData, setLiveData] = useState(null);
   const [allResources, setAllResources] = useState([]);
   const [rmsUsers, setRmsUsers] = useState([]);
   const [loading, setLoading] = useState(false);

   const [startDate, setStartDate] = useState(format(subWeeks(new Date(), 6), 'yyyy-MM-dd'));
   const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

   // STORY 1 & 2: Dynamic Live Ingestion
   useEffect(() => {
      const fetchLiveUtilization = async () => {
         setLoading(true);
         try {
            // Fetch global utilization summary
            const data = await utilizationService.getRMSSummary(
               startDate,
               endDate
            );
            setLiveData(data);
         } catch (err) {
            console.error('Failed to fetch live utilization:', err);
         } finally {
            setLoading(false);
         }
      };
      fetchLiveUtilization();
   }, [selectedResourceId, startDate, endDate]);

   // Fetch all resources for Capability Ledger
   useEffect(() => {
      const getAllResources = async () => {
         try {
            const response = await fetchResources();
            const resourceList = response.data;
            setAllResources(resourceList);
            if (resourceList && resourceList.length > 0) {
               // Auto-selection disabled to favor "Overall Resource" default view
            }
         } catch (err) {
            console.error('Failed to fetch resources:', err);
            setAllResources([]);
         }
      };
      getAllResources();
   }, []);

   // Fetch RMS Users utilization data
   useEffect(() => {
      const fetchRMSUsers = async () => {
         try {
            const data = await utilizationService.getRMSUsers(startDate, endDate);
            setRmsUsers(Array.isArray(data) ? data : []);
         } catch (err) {
            console.error('Failed to fetch RMS users:', err);
            setRmsUsers([]);
         }
      };
      fetchRMSUsers();
   }, [startDate, endDate]);

   const selectedResourceName = useMemo(() => {
      if (!selectedResourceId) return null;
      const user = rmsUsers.find(u => String(u.userId) === String(selectedResourceId));
      return user?.name || `User ${selectedResourceId}`;
   }, [selectedResourceId, rmsUsers]);

   const [resourceMetrics, setResourceMetrics] = useState([]);
   const [isResourceLoading, setIsResourceLoading] = useState(false);
   const [dateRange, setDateRange] = useState({
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
   });

   const filteredAndPaginatedResources = useMemo(() => {
      let filtered = Array.isArray(resourceMetrics) ? resourceMetrics : [];
      if (searchQuery) {
         const lowerQuery = searchQuery.toLowerCase();
         filtered = filtered.filter(res =>
            res.userName?.toLowerCase().includes(lowerQuery)
         );
      }

      const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

      return { paginated, totalPages };
   }, [resourceMetrics, searchQuery, currentPage]);

   useEffect(() => {
      const fetchResourceMetrics = async () => {
         if (!dateRange.startDate || !dateRange.endDate) return;
         if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) return;
         try {
            setIsResourceLoading(true);
            const data = await getBillNonBillable(dateRange.startDate, dateRange.endDate);
            console.log("Data from tms: ", data);
            setResourceMetrics(data);
         } catch (err) {
            console.error(err);
            setResourceMetrics([]);
         } finally {
            setIsResourceLoading(false);
         }
      };

      fetchResourceMetrics();
   }, [dateRange]);

   // REPORTING ENGINE STATES
   const [reportData, setReportData] = useState(null);
   const [isGenerating, setIsGenerating] = useState(false);
   const [reportError, setReportError] = useState(null);
   const [reportParams, setReportParams] = useState({
      startDate: '2025-05-01',
      endDate: '2026-03-31',
      reportType: 'SUMMARY',
      groupBy: 'WEEKLY',
      approvedOnly: true,
      includeTrends: true,
      includeAlerts: true,
      overUtilizationThreshold: 50,
      underUtilizationThreshold: 10,
      resourceIds: [17],
      projectIds: [],
      roles: [],
      clients: []
   });

   const handleGenerateReport = async () => {
      setIsGenerating(true);
      setReportError(null);

      // TELEMETRY: Print outgoing payload to console for verification
      console.log('[Utilization Engine] Dispatching Report Request:', reportParams);

      try {
         const data = await utilizationService.generateUtilizationReport(reportParams);
         setReportData(data);
         console.log('[Utilization Engine] Success Data Received:', data);
      } catch (err) {
         const detailedMsg = err.response?.data?.message || err.message || 'Failed to generate intelligence report.';
         setReportError(detailedMsg);
         console.error('[Utilization Engine] Request Failed:', err.response?.data || err);
      } finally {
         setIsGenerating(false);
      }
   };

   const handleExportCSV = async () => {
      try {
         await utilizationService.exportUtilizationCSV(reportParams);
      } catch (err) {
         console.error('CSV Export Error:', err);
      }
   };

   const handleExportExcel = async () => {
      try {
         await utilizationService.exportUtilizationExcel(reportParams);
      } catch (err) {
         console.error('Excel Export Error:', err);
      }
   };



   const activeChartData = useMemo(() => {
      if (liveData) {
         // The new backend response has 'daily', 'weekly', 'monthly' directly on the root object
         const key = granularity.toLowerCase();
         if (liveData[key]) {
            return liveData[key];
         }
         // Fallback if structured old way
         if (liveData.portfolioTrends && liveData.portfolioTrends[key]) {
            return liveData.portfolioTrends[key];
         }
      }
      return [];
   }, [granularity, liveData]);

   // STORY 3 & 4: Merged Resource Ledger (Directory + Live Metrics)
   const mergedResources = useMemo(() => {
      const base = (Array.isArray(allResources) && allResources.length > 0) ? allResources : [];

      // If we have live summaries, overlay them onto the base directory
      if (liveData?.resourceSummaries && Array.isArray(liveData.resourceSummaries)) {
         return base.map(res => {
            const summary = liveData.resourceSummaries.find(s => s.userId === (res.resourceId || res.id));
            if (summary) {
               return { ...res, ...summary }; // Merge summary metrics into directory record
            }
            return res;
         });
      }
      return base;
   }, [allResources, liveData]);

   // STORY 3 & 4: Dynamic Billing Yield Calculation
   const activeBillingData = useMemo(() => {
      const defaultState = [
         { name: 'Billable', value: 0, color: '#4f46e5' },
         { name: 'Non-Billable', value: 0, color: '#818cf8' },
         { name: 'Internal', value: 0, color: '#cbd5e1' },
      ];

      if (liveData) {
         // Priority 1: High-fidelity percentage mapping (consistent with newest reporting specs)
         if (liveData.billablePercentage !== undefined || liveData.internalNonBillablePercentage !== undefined) {
            const b = liveData.billablePercentage || 0;
            const nb = liveData.otherNonBillablePercentage || liveData.nonBillablePercentage || 0;
            const i = liveData.internalNonBillablePercentage || liveData.internalPercentage || 0;

            return [
               { name: 'Billable', value: Number(parseFloat(b).toFixed(2)), color: '#4f46e5' },
               { name: 'Non-Billable', value: Number(parseFloat(nb).toFixed(2)), color: '#818cf8' },
               { name: 'Internal', value: Number(parseFloat(i).toFixed(2)), color: '#cbd5e1' },
            ];
         }

         // Direct mapping for the new backend API response
         if (liveData.totalHours !== undefined && liveData.billableHours !== undefined) {
            const bHours = liveData.billableHours || 0;
            const nbHours = liveData.nonBillableHours || 0;
            const total = liveData.totalHours || (bHours + nbHours) || 1;

            const b = Math.round((bHours / total) * 100);
            const nb = Math.round((nbHours / total) * 100);
            const i = Math.max(0, 100 - b - nb);

            return [
               { name: 'Billable', value: b, color: '#4f46e5' },
               { name: 'Non-Billable', value: nb, color: '#818cf8' },
               { name: 'Internal', value: i, color: '#cbd5e1' },
            ];
         }

         // Priority 2: Traditional ratio mapping
         if (liveData.billableRatio !== undefined || liveData.totalPercentage !== undefined) {
            const b = liveData.billableRatio ?? 0;
            const nb = liveData.nonBillablePercentage ?? 0;
            const i = liveData.internalPercentage ?? 0;
            return [
               { name: 'Billable', value: Number(parseFloat(b).toFixed(2)), color: '#4f46e5' },
               { name: 'Non-Billable', value: Number(parseFloat(nb).toFixed(2)), color: '#818cf8' },
               { name: 'Internal', value: Number(parseFloat(i).toFixed(2)), color: '#cbd5e1' },
            ];
         }

         // Priority 2: Fallback to selected resource summary
         const resData = liveData.resourceSummaries && liveData.resourceSummaries.length > 0
            ? liveData.resourceSummaries[0]
            : null;

         if (resData) {
            if (resData.billablePercentage !== undefined || resData.internalNonBillablePercentage !== undefined || resData.internalPercentage !== undefined) {
               return [
                  { name: 'Billable', value: Number(Number(resData.billablePercentage || 0).toFixed(2)), color: '#4f46e5' },
                  { name: 'Non-Billable', value: Number(Number(resData.otherNonBillablePercentage || resData.nonBillablePercentage || 0).toFixed(2)), color: '#818cf8' },
                  { name: 'Internal', value: Number(Number(resData.internalNonBillablePercentage || resData.internalPercentage || 0).toFixed(2)), color: '#cbd5e1' },
               ];
            }

            if (resData.billableHours !== undefined || resData.nonBillableHours !== undefined) {
               const bHours = resData.billableHours || 0;
               const nbHours = resData.nonBillableHours || 0;
               const iHours = resData.internalHours || 0;
               const total = bHours + nbHours + iHours;

               if (total === 0) return defaultState;

               const b = Math.round((bHours / total) * 100);
               const nb = Math.round((nbHours / total) * 100);
               const i = 100 - b - nb;

               return [
                  { name: 'Billable', value: b, color: '#4f46e5' },
                  { name: 'Non-Billable', value: nb, color: '#818cf8' },
                  { name: 'Internal', value: i, color: '#cbd5e1' },
               ];
            }
         }
      }
      return defaultState;
   }, [liveData]);


   const dynamicKPIs = useMemo(() => {
      if (!liveData) return KPI_STATS;

      // Map from new API fields if present, with fallbacks to old names
      let utilVal = liveData.utilization ?? liveData.overallUtilizationPercentage ?? 0;
      if (!liveData.utilization && !liveData.overallUtilizationPercentage && liveData.monthly && liveData.monthly.length > 0) {
         const sumUtil = liveData.monthly.reduce((acc, m) => acc + m.util, 0);
         utilVal = sumUtil / liveData.monthly.length;
      }

      let billableRatio = liveData.billableRatio ?? liveData.billablePercentage ?? 0;
      if (!liveData.billableRatio && !liveData.billablePercentage && liveData.totalHours) {
         billableRatio = (liveData.billableHours / liveData.totalHours) * 100;
      }

      let confScore = liveData.confidenceScore ?? liveData.averageConfidenceScore ?? 100;
      let totalRes = liveData.totalResources ?? liveData.totalUsers ?? (liveData.resourceSummaries ? liveData.resourceSummaries.length : 0);

      // Parse from specific kpiStats payload if present (Legacy support)
      let utilTrend = 'Live';
      let billableTrend = '';
      let confTrend = 'Verified';

      if (liveData.kpiStats && Array.isArray(liveData.kpiStats)) {
         liveData.kpiStats.forEach(k => {
            if (k.label === 'Utilization') {
               utilVal = parseFloat(k.value) || utilVal;
               utilTrend = k.trend || utilTrend;
            }
            if (k.label === 'Billable Ratio') {
               billableRatio = parseFloat(k.value) || billableRatio;
               billableTrend = k.trend || billableTrend;
            }
            if (k.label === 'Confidence Score') {
               confScore = parseFloat(k.value) || confScore;
               confTrend = k.trend || confTrend;
            }
         });
      }

      return [
         {
            label: 'Total Resources',
            value: totalRes,
            trend: 'Active Pool',
            icon: <Users />,
            color: 'text-rose-600', bg: 'bg-rose-50'
         },
         {
            label: 'Utilization',
            value: `${parseFloat(utilVal).toFixed(2)}%`,
            trend: utilTrend === 'down' ? 'Declining' : utilTrend === 'up' ? 'Improving' : utilTrend,
            icon: <TrendingUpIcon />,
            color: utilTrend === 'down' ? 'text-amber-600' : 'text-indigo-600', bg: utilTrend === 'down' ? 'bg-amber-50' : 'bg-indigo-50'
         },
         {
            label: 'Billable Ratio',
            value: `${parseFloat(billableRatio).toFixed(2)}%`,
            trend: billableTrend === 'down' ? 'Declining' : billableTrend === 'up' ? 'Improving' : billableTrend,
            icon: <Award />,
            color: 'text-emerald-600', bg: 'bg-emerald-50'
         },
         {
            label: 'Confidence Score',
            value: `${parseFloat(confScore).toFixed(0)}%`,
            trend: confTrend === 'down' ? 'Declining' : confTrend === 'up' ? 'Improving' : confTrend,
            icon: <Fingerprint />,
            color: 'text-blue-600', bg: 'bg-blue-50'
         },
      ];
   }, [liveData]);

   const billablePercentage = useMemo(() => {
      const b = activeBillingData.find(d => d.name === 'Billable');
      return b ? b.value : 0;
   }, [activeBillingData]);
   return (
      <div className="min-h-screen bg-[#FDFDFE] p-6 font-sans select-none">

         {/* Confidence Banner */}
         {/* {OVERALL_CONFIDENCE_SCORE < 100 && (
            <div className="mb-6 flex items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-white text-amber-500 rounded-lg shadow-sm border border-amber-50">
                     <ShieldAlert size={18} />
                  </div>
                  <div>
                     <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none">Historical Data Confidence (Story 5 & 11)</span>
                     <p className="text-[11px] font-medium text-amber-600/80 mt-0.5 font-serif">Trend preservation active. Metrics based on 94% verified historical actuals.</p>
                  </div>
               </div>
               <div className="flex items-center gap-2 px-3 py-1 bg-white border border-rose-100 rounded-lg text-[9px] font-black text-rose-500 uppercase tracking-widest animate-pulse">
                  <ZapOff size={12} /> Sync Restricted
               </div>
            </div>
         )} */}

         {/* Header â€” Unified Command Strip */}
         <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
               {/* <button
                  onClick={() => navigate('/resource-management/bench')}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
               >
                  <ArrowLeft size={18} />
               </button> */}
               <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">Utilization Intelligence Hub</h1>

               </div>
            </div>

            <div className="flex items-center gap-3">
               <button
                  type="button"
                  onClick={() => navigate('/resource-management/bench/utilization-reporting')}
                  className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm h-[42px]"
               >
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  UTILIZATION REPORTING & DASHBOARDS
               </button>
               {/* Unified Calendar / Date Range Picker */}
               <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm h-[42px] hover:border-indigo-500 transition-all focus-within:ring-1 focus-within:ring-indigo-500 group">
                  <CalendarRange size={16} className="text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex items-center gap-1">
                     <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-[12px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer w-auto min-w-[125px]"
                     />
                     <span className="text-slate-300 mx-1">—</span>
                     <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="text-[12px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer w-auto min-w-[125px]"
                     />
                  </div>
               </div>


            </div>
         </div>
         {/* KPI Stats Grid */}
         <div className="flex flex-nowrap gap-4 overflow-x-auto no-scrollbar mb-6">
            {(liveData ? dynamicKPIs : KPI_STATS).map((stat, idx) => {
               const originalStat = KPI_STATS.find(s => s.label === stat.label) || KPI_STATS[idx % KPI_STATS.length];
               return (
                  <div key={stat.label} className="flex min-w-[240px] flex-1 items-center gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md group">
                     <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm ${originalStat.bg} ${originalStat.color} group-hover:scale-105 transition-transform`}>
                        {React.cloneElement(originalStat.icon, { size: 22, strokeWidth: 2.5 })}
                     </div>
                     <div className="min-w-0 flex-1">
                        <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                        <div className="flex items-center gap-2">
                           <p className="text-2xl font-black tracking-tight text-slate-900">{stat.value}</p>
                           <div className={`flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded ${stat.label === 'Active Breaches' || stat.trend === 'down' || stat.trend === 'Declining' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                              {stat.trend}
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>

         <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-white px-5 py-4">
               <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth">
                     {[
                        { id: 'portfolio', label: 'Portfolio Analytics', icon: PieIcon },
                        { id: 'resource', label: 'Resource Capability', icon: Users },
                        { id: 'projects', label: 'Operational Projects', icon: Monitor },
                        // { id: 'governance', label: 'Governance & Readiness', icon: ShieldAlert }
                     ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                           <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                 setActiveTab(tab.id);
                                 if (tab.id === 'portfolio') {
                                    setSelectedResourceId(null);
                                 }
                              }}
                              className={`group relative inline-flex items-center gap-2 whitespace-nowrap px-1 pb-4 pt-2 text-left transition-all ${isActive ? "text-indigo-600" : "text-slate-500 hover:text-indigo-600"
                                 }`}
                           >
                              <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500"}`} />
                              <span className={`text-[12px] font-bold tracking-tight lowercase ${isActive ? "text-slate-900" : "text-slate-500"}`}>
                                 {tab.label}
                              </span>
                              {isActive && (
                                 <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-indigo-600 shadow-[0_1px_4px_rgba(79,70,229,0.3)] animate-in slide-in-from-left-full duration-300" />
                              )}
                           </button>
                        );
                     })}
                  </div>
               </div>
            </div>



            {/* DASHBOARD CONTENT ENGINE */}
            <div className="p-4 bg-slate-50/50">
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">




                  {/* TAB 0: UTILIZATION REPORTING & DASHBOARDS */}
                  {activeTab === 'reporting' && (
                     <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Error Alert Display */}
                        {reportError && (
                           <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-top-2 duration-300 shadow-sm">
                              <div className="h-10 w-10 rounded-xl bg-white border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                                 <AlertTriangle size={20} spellCheck={false} />
                              </div>
                              <div className="flex-1">
                                 <h4 className="text-[11px] font-black text-rose-900 uppercase tracking-widest">Intelligence Request Error</h4>
                                 <p className="text-[12px] font-bold text-rose-600 leading-tight italic">{reportError}</p>
                              </div>
                              <button
                                 onClick={() => setReportError(null)}
                                 className="h-8 w-8 rounded-lg hover:bg-rose-100 flex items-center justify-center text-rose-400 hover:text-rose-600 transition-all active:scale-95"
                              >
                                 <ZapOff size={18} />
                              </button>
                           </div>
                        )}

                        {/* Report Config Panel */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative group">
                           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                              <Database size={120} />
                           </div>
                           <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Period Start</label>
                                    <div className="relative">
                                       <input
                                          type="date"
                                          value={reportParams.startDate}
                                          onChange={(e) => setReportParams({ ...reportParams, startDate: e.target.value })}
                                          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                       />
                                    </div>
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Period End</label>
                                    <div className="relative">
                                       <input
                                          type="date"
                                          value={reportParams.endDate}
                                          onChange={(e) => setReportParams({ ...reportParams, endDate: e.target.value })}
                                          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                       />
                                    </div>
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Report Type</label>
                                    <div className="relative">
                                       <select
                                          value={reportParams.reportType}
                                          onChange={(e) => setReportParams({ ...reportParams, reportType: e.target.value })}
                                          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none cursor-pointer"
                                       >
                                          <option value="SUMMARY">SUMMARY (Dimension Map)</option>
                                          <option value="RESOURCE">RESOURCE (Individual Performance)</option>
                                          <option value="PROJECT">PROJECT (Portfolio Analytics)</option>
                                          <option value="CLIENT">CLIENT (External Yield)</option>
                                          <option value="ROLE">ROLE (Capability Analysis)</option>
                                       </select>
                                       <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                                    </div>
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Grouping</label>
                                    <div className="relative">
                                       <select
                                          value={reportParams.groupBy}
                                          onChange={(e) => setReportParams({ ...reportParams, groupBy: e.target.value })}
                                          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none cursor-pointer"
                                       >
                                          <option value="WEEKLY">WEEKLY (Active Pattern)</option>
                                          <option value="DAILY" disabled>DAILY (Not Implemented)</option>
                                          <option value="MONTHLY" disabled>MONTHLY (Not Implemented)</option>
                                       </select>
                                       <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <button
                                    onClick={handleGenerateReport}
                                    disabled={isGenerating}
                                    className="h-10 px-6 rounded-xl bg-indigo-600 text-white text-[12px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                                 >
                                    {isGenerating ? <RefreshCcw size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                                    {isGenerating ? 'GENERATING...' : 'GENERATE REPORT'}
                                 </button>
                                 <div className="flex items-center gap-2">
                                    <button
                                       onClick={handleExportCSV}
                                       disabled={!reportData}
                                       className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                       title="Export to CSV"
                                    >
                                       <Download size={18} />
                                       <span className="text-[10px] font-black uppercase">CSV</span>
                                    </button>
                                    <button
                                       onClick={handleExportExcel}
                                       disabled={!reportData}
                                       className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                       title="Export to Excel"
                                    >
                                       <FileText size={18} />
                                       <span className="text-[10px] font-black uppercase">Excel</span>
                                    </button>
                                 </div>
                              </div>
                           </div>

                           {/* Dimensional Filters & Toggles */}
                           <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-slate-50 relative z-10">
                              <div className="md:col-span-1 space-y-4">
                                 <div className="flex flex-col gap-3">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                       <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${reportParams.approvedOnly ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                          <input
                                             type="checkbox"
                                             checked={reportParams.approvedOnly}
                                             onChange={(e) => setReportParams({ ...reportParams, approvedOnly: e.target.checked })}
                                             className="hidden"
                                          />
                                          {reportParams.approvedOnly && <CheckCircle2 size={12} className="text-white" />}
                                       </div>
                                       <div className="flex flex-col">
                                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Validated Data Only</span>
                                          <span className="text-[9px] font-bold text-slate-400 italic">Approved Timesheets Only</span>
                                       </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                       <input
                                          type="checkbox"
                                          checked={reportParams.includeTrends}
                                          onChange={(e) => setReportParams({ ...reportParams, includeTrends: e.target.checked })}
                                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                       />
                                       <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">Include Trends</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                       <input
                                          type="checkbox"
                                          checked={reportParams.includeAlerts}
                                          onChange={(e) => setReportParams({ ...reportParams, includeAlerts: e.target.checked })}
                                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                       />
                                       <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">Include Alerts</span>
                                    </label>
                                 </div>
                              </div>

                              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Resource IDs</label>
                                    <input
                                       type="text"
                                       value={reportParams.resourceIds.join(', ')}
                                       placeholder="17, 18, 19..."
                                       onChange={(e) => {
                                          const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                                          setReportParams({ ...reportParams, resourceIds: ids });
                                       }}
                                       className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                    />
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Project IDs</label>
                                    <input
                                       type="text"
                                       value={reportParams.projectIds.join(', ')}
                                       placeholder="101, 102..."
                                       onChange={(e) => {
                                          const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                                          setReportParams({ ...reportParams, projectIds: ids });
                                       }}
                                       className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                    />
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Roles (comma-sep)</label>
                                    <input
                                       type="text"
                                       value={reportParams.roles.join(', ')}
                                       placeholder="Dev, Manager..."
                                       onChange={(e) => {
                                          const roles = e.target.value.split(',').map(r => r.trim()).filter(r => r !== '');
                                          setReportParams({ ...reportParams, roles: roles });
                                       }}
                                       className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                    />
                                 </div>
                                 <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Clients (comma-sep)</label>
                                    <input
                                       type="text"
                                       value={reportParams.clients.join(', ')}
                                       placeholder="Client A, Client B..."
                                       onChange={(e) => {
                                          const clients = e.target.value.split(',').map(c => c.trim()).filter(c => c !== '');
                                          setReportParams({ ...reportParams, clients: clients });
                                       }}
                                       className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                    />
                                 </div>
                              </div>
                           </div>

                           <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-50 relative z-10">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Over Util Threshold</label>
                                 <input
                                    type="number"
                                    step="0.1"
                                    value={reportParams.overUtilizationThreshold}
                                    onChange={(e) => setReportParams({ ...reportParams, overUtilizationThreshold: parseFloat(e.target.value) || 0 })}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Under Util Threshold</label>
                                 <input
                                    type="number"
                                    step="0.1"
                                    value={reportParams.underUtilizationThreshold}
                                    onChange={(e) => setReportParams({ ...reportParams, underUtilizationThreshold: parseFloat(e.target.value) || 0 })}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                 />
                              </div>
                           </div>
                        </div>

                        {/* Report Output Content */}
                        {!reportData && !isGenerating && (
                           <div className="bg-white rounded-3xl border border-dotted border-slate-200 p-24 flex flex-col items-center justify-center text-center group">
                              <div className="h-20 w-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-8 border border-slate-100 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
                                 <TrendingUp size={40} />
                              </div>
                              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Intelligence Hub Reporting Engine</h3>
                              <p className="mt-3 text-[13px] font-medium text-slate-400 max-w-sm italic">Configure your parameters above to generate high-fidelity utilization analytics, performance alerts, and sustained trend signals.</p>
                           </div>
                        )}

                        {isGenerating && (
                           <div className="bg-white rounded-3xl border border-slate-100 p-24 flex flex-col items-center justify-center text-center">
                              <div className="relative">
                                 <div className="h-20 w-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-8 border border-indigo-100 animate-pulse">
                                    <RefreshCcw size={40} className="animate-spin" />
                                 </div>
                                 <div className="absolute -top-2 -right-2 h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center text-white border-2 border-white animate-bounce">
                                    <Zap size={12} fill="currentColor" />
                                 </div>
                              </div>
                              <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Compiling Intelligence Report</h3>
                              <p className="mt-3 text-[13px] font-medium text-slate-400 max-w-sm italic leading-relaxed">Aggregating timesheet actuals from validated workload registries and detecting sustained breach signals...</p>
                           </div>
                        )}

                        {reportData && (
                           <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
                              {/* 1. TOP SUMMARY KPIS */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                 {[
                                    { label: 'Total Actual Hours', value: reportData.totalHours || 0, icon: <Clock />, color: 'text-indigo-600' },
                                    { label: 'Utilization %', value: `${reportData.utilizationPercentage || 0}%`, icon: <TrendingUp />, color: 'text-emerald-600' },
                                    { label: 'Total Resources', value: reportData.totalResources || 0, icon: <Users />, color: 'text-blue-600' },
                                    { label: 'Confidence Score', value: `${reportData.confidenceScore || 0}%`, icon: <ShieldCheck />, color: 'text-amber-600' }
                                 ].map((kpi) => (
                                    <div key={kpi.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow cursor-default group">
                                       <div className={`h-14 w-14 rounded-2xl bg-white border border-slate-50 shadow-inner flex items-center justify-center ${kpi.color} group-hover:scale-110 transition-transform duration-500`}>
                                          {React.cloneElement(kpi.icon, { size: 28, strokeWidth: 2.5 })}
                                       </div>
                                       <div>
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{kpi.label}</p>
                                          <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                                       </div>
                                    </div>
                                 ))}
                              </div>

                              {/* 2. TRENDS & ALERTS (Governance Breaches) */}
                              {reportData.alerts && reportData.alerts.length > 0 && (
                                 <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                       <AlertTriangle size={80} />
                                    </div>
                                    <div className="bg-rose-50/50 px-8 py-5 border-b border-rose-100 flex items-center justify-between relative z-10">
                                       <div className="flex items-center gap-3">
                                          <div className="h-8 w-8 bg-rose-100 text-rose-500 rounded-lg flex items-center justify-center shadow-sm">
                                             <ShieldAlert size={20} strokeWidth={2.5} />
                                          </div>
                                          <div>
                                             <h4 className="text-[12px] font-black text-rose-900 uppercase tracking-[0.1em]">Active Governance Breaches ({reportData.alerts.length})</h4>
                                             <p className="text-[10px] font-bold text-rose-600 opacity-70 uppercase tracking-widest mt-0.5">Automated Intelligence Detection</p>
                                          </div>
                                       </div>
                                       <span className="px-3 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 animate-pulse">Action Required</span>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                       {reportData.alerts.map((alert, idx) => (
                                          <div key={idx} className="p-5 bg-slate-50/30 rounded-2xl border border-slate-100 flex flex-col gap-3 hover:bg-white hover:border-rose-200 hover:shadow-md transition-all cursor-default group">
                                             <div className="flex items-center justify-between mb-1">
                                                <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight group-hover:text-rose-600 transition-colors">{alert.resourceName || alert.resourceId || 'Signal Spike'}</span>
                                                <div className={`h-2.5 w-2.5 rounded-full animate-ping ${alert.severity === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                             </div>
                                             <p className="text-[12px] font-medium text-slate-500 leading-relaxed bg-white p-3 rounded-xl border border-slate-50 border-dashed">{alert.message}</p>
                                             <div className="mt-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className={`${alert.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}`}>
                                                   Severity: {alert.severity}
                                                </span>
                                                <span className="text-indigo-600 opacity-60">Status: OPEN</span>
                                             </div>
                                             <div className="mt-1 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                                <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest block mb-1">REC: Recommendation</span>
                                                <p className="text-[10px] font-bold text-rose-600 leading-tight italic">{alert.recommendation}</p>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {/* 3. PERFORMANCE REGISTRIES (Tables) */}
                              {/* --- RESOURCE REGISTRY --- */}
                              {(reportParams.reportType === 'RESOURCE' || reportParams.reportType === 'SUMMARY') && reportData.resourceUtilizations && (
                                 <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700">
                                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                       <div className="flex items-center gap-4">
                                          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                                             <Users size={22} strokeWidth={2.5} />
                                          </div>
                                          <div>
                                             <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.1em]">Resource Performance Registry</h4>
                                             <p className="text-[10px] font-bold text-slate-400 capitalize tracking-wide mt-0.5">Granular workload actuals and breach signals</p>
                                          </div>
                                       </div>
                                       <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-black text-indigo-600 uppercase tracking-widest shadow-sm">
                                          {reportData.resourceUtilizations.length} Entries
                                       </span>
                                    </div>
                                    <div className="overflow-x-auto no-scrollbar">
                                       <table className="w-full text-left">
                                          <thead>
                                             <tr className="bg-slate-50/30 border-b border-slate-100">
                                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] w-[25%]">Resource Profile</th>
                                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Actual Hours</th>
                                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Workload Utilization</th>
                                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Trend Signal</th>
                                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Score</th>
                                             </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                             {reportData.resourceUtilizations.map((res, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                                                   <td className="px-8 py-5">
                                                      <div className="flex items-center gap-3">
                                                         <div className="h-10 w-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 font-black text-xs uppercase group-hover:scale-110 transition-transform duration-300">
                                                            {res.resourceName.charAt(0)}
                                                         </div>
                                                         <div className="flex flex-col gap-0.5">
                                                            <span className="text-[13px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{res.resourceName}</span>
                                                            <span className="text-[11px] font-bold text-slate-400 opacity-80">{res.role}</span>
                                                         </div>
                                                      </div>
                                                   </td>
                                                   <td className="px-8 py-5 text-center">
                                                      <div className="inline-flex flex-col items-center gap-1 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner group-hover:bg-white transition-colors">
                                                         <span className="text-[13px] font-black text-slate-700 tracking-tight">{res.totalHours?.toFixed(1)}h</span>
                                                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Actual</span>
                                                      </div>
                                                   </td>
                                                   <td className="px-8 py-5">
                                                      <div className="flex flex-col gap-1.5 min-w-[180px]">
                                                         <div className="flex items-center justify-between mb-1">
                                                            <span className={`text-[11px] font-black tracking-[0.1em] uppercase ${res.utilizationBand === 'HIGH' || res.utilizationBand === 'CRITICAL' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                               {res.utilizationBand} — {res.utilizationPercentage}%
                                                            </span>
                                                            {res.utilizationBand === 'HIGH' && <Zap size={12} className="text-amber-500 animate-pulse" fill="currentColor" />}
                                                         </div>
                                                         <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                                                            <div
                                                               className={`h-full rounded-full transition-all duration-1000 ease-out ${res.utilizationBand === 'HIGH' || res.utilizationBand === 'CRITICAL' ? 'bg-gradient-to-r from-rose-400 to-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.3)]' : 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'}`}
                                                               style={{ width: `${Math.min(res.utilizationPercentage, 100)}%` }}
                                                            />
                                                         </div>
                                                      </div>
                                                   </td>
                                                   <td className="px-8 py-5 text-center">
                                                      <div className={`inline-flex items-center h-8 gap-2 text-[10px] font-black uppercase px-4 rounded-xl border-2 transition-all ${res.trendSignal === 'UP' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                                         {res.trendSignal === 'UP' ? <ArrowUpRight size={14} strokeWidth={3} className="text-rose-500" /> : <ArrowDownRight size={14} strokeWidth={3} className="text-emerald-500" />}
                                                         {res.trendSignal}
                                                      </div>
                                                   </td>
                                                   <td className="px-8 py-5">
                                                      <div className="flex items-center justify-center">
                                                         <div className="relative h-12 w-12 flex items-center justify-center">
                                                            <svg className="w-full h-full transform -rotate-90">
                                                               <circle
                                                                  cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                                                                  className="text-slate-100"
                                                               />
                                                               <circle
                                                                  cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                                                                  strokeDasharray={126}
                                                                  strokeDashoffset={126 - (126 * (res.confidenceScore || 0)) / 100}
                                                                  className="text-indigo-600 transition-all duration-1000 ease-out"
                                                               />
                                                            </svg>
                                                            <span className="absolute text-[11px] font-black text-indigo-900">{res.confidenceScore}%</span>
                                                         </div>
                                                      </div>
                                                   </td>
                                                </tr>
                                             ))}
                                          </tbody>
                                       </table>
                                    </div>
                                    <div className="px-8 py-5 bg-slate-900 flex items-center justify-between rounded-b-3xl">
                                       <div className="flex items-center gap-3">
                                          <ShieldCheck size={18} className="text-indigo-400" />
                                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">Validated performance registry synchronized with timesheet actuals</p>
                                       </div>
                                       <button className="text-[10px] font-black text-white px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors uppercase tracking-[0.1em]">View Audit Log</button>
                                    </div>
                                 </div>
                              )}

                              {/* --- PROJECT PERFORMANCE (Cards) --- */}
                              {(reportParams.reportType === 'PROJECT' || reportParams.reportType === 'SUMMARY') && reportData.projectUtilizations && (
                                 <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                       <div className="flex items-center gap-3">
                                          <div className="h-4 w-4 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                                          <h4 className="text-[14px] font-black text-[#081534] uppercase tracking-[0.2em]">Project Portfolio Yield Analysis</h4>
                                       </div>
                                       <div className="h-px flex-1 mx-8 bg-slate-200/50" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                       {reportData.projectUtilizations.map((proj, idx) => (
                                          <div key={idx} className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
                                             <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                             <div className="flex items-start justify-between mb-8">
                                                <div className="flex flex-col gap-1">
                                                   <h5 className="text-[15px] font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{proj.projectName}</h5>
                                                   <div className="flex items-center gap-2">
                                                      <Briefcase size={12} className="text-slate-400" />
                                                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{proj.clientName}</span>
                                                   </div>
                                                </div>
                                                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all duration-500">
                                                   <Monitor size={24} strokeWidth={2.5} />
                                                </div>
                                             </div>

                                             <div className="grid grid-cols-2 gap-8 mb-8">
                                                <div>
                                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Load Status</p>
                                                   <div className="flex items-center gap-2">
                                                      <span className={`text-2xl font-black tracking-tight ${proj.utilizationPercentage > 90 ? 'text-rose-600' : 'text-slate-900'}`}>{proj.utilizationPercentage}%</span>
                                                      <TrendingUpIcon size={14} className={proj.utilizationPercentage > 90 ? 'text-rose-600' : 'text-emerald-600'} />
                                                   </div>
                                                </div>
                                                <div>
                                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Billable Yield</p>
                                                   <p className="text-2xl font-black text-indigo-600 tracking-tight">{proj.billableRatio}%</p>
                                                </div>
                                             </div>

                                             <div className="space-y-4">
                                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                   <div
                                                      className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-1000`}
                                                      style={{ width: `${proj.billableRatio}%` }}
                                                   />
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-500 px-1">
                                                   <span className="flex items-center gap-1.5"><Users size={12} /> {proj.resourceCount} Resources</span>
                                                   <span className="flex items-center gap-1.5"><History size={12} /> {proj.totalHours}h Logged</span>
                                                </div>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {/* --- ROLE PERFORMANCE REGISTRY --- */}
                              {(reportParams.reportType === 'ROLE' || reportParams.reportType === 'SUMMARY') && reportData.roleUtilizations && (
                                 <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700 mt-8">
                                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/20">
                                       <div className="flex items-center gap-4">
                                          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                                             <Award size={22} strokeWidth={2.5} />
                                          </div>
                                          <div>
                                             <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.1em]">Role Performance Registry</h4>
                                             <p className="text-[10px] font-bold text-slate-400 capitalize tracking-wide mt-0.5">Capability-based workload analytics</p>
                                          </div>
                                       </div>
                                       <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-black text-emerald-600 uppercase tracking-widest shadow-sm">
                                          {reportData.roleUtilizations.length} Roles
                                       </span>
                                    </div>
                                    <div className="overflow-x-auto no-scrollbar">
                                       <table className="w-full text-left">
                                          <thead>
                                             <tr className="bg-slate-50/30 border-b border-slate-100">
                                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] w-[25%]">Capability Role</th>
                                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Pooled Hours</th>
                                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Unique Resources</th>
                                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Group Utilization</th>
                                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Yield</th>
                                             </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                             {reportData.roleUtilizations.map((role, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                                                   <td className="px-8 py-5">
                                                      <div className="flex items-center gap-3">
                                                         <div className="flex flex-col gap-0.5">
                                                            <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{role.roleName}</span>
                                                         </div>
                                                      </div>
                                                   </td>
                                                   <td className="px-8 py-5 text-center">
                                                      <span className="text-[13px] font-black text-slate-700">{role.totalHours?.toFixed(1)}h</span>
                                                   </td>
                                                   <td className="px-8 py-5 text-center">
                                                      <span className="text-[13px] font-black text-indigo-600">{role.resourceCount}</span>
                                                   </td>
                                                   <td className="px-8 py-5">
                                                      <div className="flex flex-col gap-1.5 min-w-[150px]">
                                                         <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                                            <div
                                                               className="h-full bg-emerald-500 rounded-full"
                                                               style={{ width: `${role.utilizationPercentage}%` }}
                                                            />
                                                         </div>
                                                         <span className="text-[10px] font-black text-slate-500">{role.utilizationPercentage}%</span>
                                                      </div>
                                                   </td>
                                                   <td className="px-8 py-5 text-center">
                                                      <span className="text-[13px] font-black text-emerald-600">{role.billableRatio || 0}%</span>
                                                   </td>
                                                </tr>
                                             ))}
                                          </tbody>
                                       </table>
                                    </div>
                                 </div>
                              )}

                              {/* --- CLIENT PERFORMANCE REGISTRY --- */}
                              {(reportParams.reportType === 'CLIENT' || reportParams.reportType === 'SUMMARY') && reportData.clientUtilizations && (
                                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700 mt-10">
                                    <div className="flex items-center justify-between px-2">
                                       <div className="flex items-center gap-3">
                                          <div className="h-4 w-4 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                                          <h4 className="text-[14px] font-black text-[#081534] uppercase tracking-[0.2em]">External Client Yield Analysis</h4>
                                       </div>
                                       <div className="h-px flex-1 mx-8 bg-slate-200/50" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                       {reportData.clientUtilizations.map((client, idx) => (
                                          <div key={idx} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-lg transition-all group overflow-hidden relative">
                                             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                                                <Briefcase size={60} />
                                             </div>
                                             <div className="flex flex-col gap-4">
                                                <div>
                                                   <h5 className="text-[14px] font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{client.clientName}</h5>
                                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{client.projectCount} Projects</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                   <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Hours</span>
                                                      <span className="text-[16px] font-black text-slate-900">{client.totalHours?.toFixed(0)}h</span>
                                                   </div>
                                                   <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                                                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">Billable Ratio</span>
                                                      <span className="text-[16px] font-black text-blue-600">{client.billableRatio || 0}%</span>
                                                   </div>
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-50 pt-4">
                                                   <span>Resources: {client.resourceCount}</span>
                                                   <span>Utilization: {client.utilizationPercentage}%</span>
                                                </div>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {/* --- STRATEGIC PATTERN DETECTION --- */}
                              {reportData.patterns && reportData.patterns.length > 0 && (
                                 <div className="bg-[#081534] rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden group mt-10">
                                    <div className="absolute top-0 right-0 opacity-[0.03] p-12 pointer-events-none">
                                       <Fingerprint size={200} />
                                    </div>
                                    <div className="flex items-center gap-4 mb-8">
                                       <div className="h-10 w-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30">
                                          <Target size={22} strokeWidth={2.5} />
                                       </div>
                                       <div>
                                          <h4 className="text-[14px] font-black text-white uppercase tracking-[0.2em]">Strategic Pattern Detection</h4>
                                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Sustained directional signals identified by intelligence engine</p>
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                       {reportData.patterns.map((pattern, idx) => (
                                          <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-all group">
                                             <div className="flex items-start justify-between mb-4">
                                                <div>
                                                   <h6 className="text-[13px] font-black text-white uppercase tracking-tight mb-1">{pattern.title}</h6>
                                                   <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${pattern.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                                                      {pattern.severity}
                                                   </span>
                                                </div>
                                                <div className="text-right">
                                                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Signal strength</p>
                                                   <p className="text-[18px] font-black text-indigo-400 leading-none">{pattern.averageUtilization}%</p>
                                                </div>
                                             </div>
                                             <p className="text-[11px] font-medium text-slate-400 italic leading-relaxed mb-4 border-l-2 border-indigo-500 pl-4 py-1">{pattern.description}</p>
                                             <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-slate-500">Duration: {pattern.durationWeeks} Weeks</span>
                                                <span className="text-indigo-400">Recommendation: {pattern.recommendation}</span>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                  )}
                  {activeTab === 'portfolio' && (
                     <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 overflow-hidden">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                              <div className="flex flex-col gap-2">
                                 <div className="flex items-center gap-3">
                                    <h3 className="text-[12px] font-black text-[#081534] uppercase tracking-[0.2em] leading-none">Strategic Performance Status</h3>
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${selectedResourceId ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                       {selectedResourceId ? `LIVE: ${selectedResourceName}` : 'REAL-TIME: OVERALL PORTFOLIO'}
                                    </span>
                                 </div>
                                 <p className="text-[11px] font-medium text-slate-400 italic">Historical directional signals from validated workload registries</p>
                              </div>
                              <div className="flex items-center gap-1.5 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 self-start sm:self-center">
                                 {['DAILY', 'WEEKLY', 'MONTHLY'].map(t => (
                                    <button
                                       key={t}
                                       onClick={() => setGranularity(t)}
                                       className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${granularity === t ? 'bg-white shadow-md text-indigo-600 border border-slate-100 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                       {t}
                                    </button>
                                 ))}
                              </div>
                           </div>
                           <div className="h-80 w-full overflow-x-auto no-scrollbar">
                              <div style={{ minWidth: activeChartData.length > 8 ? `${activeChartData.length * 80}px` : '100vw' }} className="h-full">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={activeChartData} margin={{ bottom: 30, right: 20 }}>
                                       <defs>
                                          <linearGradient id="utilGradient" x1="0" y1="0" x2="0" y2="1">
                                             <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                                             <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                          </linearGradient>
                                       </defs>
                                       <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f8fafc" />
                                       <XAxis
                                          dataKey="period"
                                          axisLine={false}
                                          tickLine={false}
                                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }}
                                          interval={0}
                                          angle={-30}
                                          textAnchor="end"
                                       />
                                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} domain={[0, 100]} />
                                       <RechartsTooltip content={<PerformanceTooltip />} />
                                       <Area type="monotone" dataKey="util" fill="url(#utilGradient)" stroke="#4f46e5" strokeWidth={4} name="Utilization %" animationDuration={1500} />
                                       <Line type="monotone" dataKey="actual" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" dot={false} name="Actual Hours" />
                                    </ComposedChart>
                                 </ResponsiveContainer>
                              </div>
                           </div>
                           <div className="mt-8 flex flex-wrap items-center justify-center gap-6 border-t border-slate-50 pt-6">
                              <div className="flex items-center gap-2.5">
                                 <History size={14} className="text-indigo-500" />
                                 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Trend Preservation Active</span>
                              </div>
                              <div className="flex items-center gap-2.5 border-l border-slate-200 pl-6">
                                 <Scale size={14} className="text-slate-400" />
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic opacity-70">Comparison: Planned vs Realized</span>
                              </div>
                           </div>
                        </div>

                        {/* QUICK-GLANCE BILLING BREAKDOWN */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col group overflow-hidden">
                           <div className="flex items-center justify-between mb-8">
                              <div className="flex flex-col gap-1.5">
                                 <h3 className="text-[12px] font-black text-[#081534] uppercase tracking-[0.2em] leading-none mb-1">Billing Yield Index</h3>
                                 <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit ${selectedResourceId ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                    {selectedResourceId ? `USER: ${selectedResourceName}` : 'REAL-TIME: PORTFOLIO'}
                                 </span>
                              </div>
                              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                                 <PieChartIcon size={20} />
                              </div>
                           </div>
                           <div className="flex-1 h-60 w-full mt-4 relative">
                              <ResponsiveContainer width="100%" height="100%">
                                 <PieChart>
                                    <Pie
                                       data={activeBillingData}
                                       cx="50%"
                                       cy="50%"
                                       innerRadius={60}
                                       outerRadius={80}
                                       paddingAngle={6}
                                       dataKey="value"
                                       stroke="none"
                                    >
                                       {activeBillingData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} cornerRadius={4} />
                                       ))}
                                    </Pie>
                                    <RechartsTooltip />
                                 </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none pt-1">
                                 <span className="text-[20px] font-black text-slate-900 leading-none">{activeBillingData.find(d => d.name === 'Billable')?.value || 0}%</span>
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Billable</span>
                              </div>
                           </div>
                           <div className="mt-4 space-y-2">
                              {activeBillingData.map((item) => (
                                 <div key={item.name} className="flex items-center justify-between p-2 bg-slate-50/50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-2">
                                       <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{item.name}</span>
                                    </div>
                                    <span className="text-[11px] font-black text-slate-900">{item.value}%</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  )}

                  {/* TAB 2: PROJECTS & BREACHES (Story 3, 4, 6) */}
                  {activeTab === 'projects' && (
                     <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-in">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                           <div>
                              <h3 className="text-[11px] font-black text-[#081534] uppercase tracking-widest leading-none">Project-Level Consumption Matrix</h3>
                           </div>
                        </div>
                        <div className="px-6 py-3 border-b border-slate-100 bg-white">
                           <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                              {[
                                 { id: 'active', label: 'Active Projects' },
                                 { id: 'internal', label: 'Internal Projects' },
                              ].map((tab) => (
                                 <button
                                    key={tab.id}
                                    onClick={() => setProjectCategoryTab(tab.id)}
                                    className={`rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${projectCategoryTab === tab.id
                                       ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                                       : 'text-slate-500 hover:text-slate-700'
                                       }`}
                                 >
                                    {tab.label}
                                 </button>
                              ))}
                           </div>
                        </div>
                        {projectsLoading && (
                           <div className="border-b border-slate-100 bg-white px-6 py-8">
                              <LoadingSpinner text="Projects Loading..." />
                           </div>
                        )}
                        {projectsError && (
                           <div className="px-6 py-4 text-[11px] font-semibold text-amber-700 border-b border-amber-100 bg-amber-50/60">
                              {projectsError}
                           </div>
                        )}
                        <div className="overflow-x-auto no-scrollbar">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="bg-slate-50/50 border-b border-slate-50">
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Project / Engagement</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Billing Strip</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Hours (Act / Plan)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Utilization %</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {!projectsLoading && visibleOperationalProjects.length === 0 && (
                                    <tr>
                                       <td colSpan="4" className="px-6 py-8 text-center text-[11px] font-semibold text-slate-500">
                                          {projectCategoryTab === 'internal'
                                             ? 'No internal projects were returned by the backend hours summary endpoint.'
                                             : 'No active client projects were returned by the backend hours summary endpoint.'}
                                       </td>
                                    </tr>
                                 )}
                                 {paginatedOperationalProjects.map((project) => (
                                    <tr
                                       key={project.id}
                                       className="hover:bg-slate-50/40 transition-colors group cursor-pointer"
                                       onClick={() => navigate(`/resource-management/bench/utilization-performance/projects/${project.id}`)}
                                    >
                                       <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                             <span className="text-[13px] font-bold text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-none">{project.name}</span>
                                             <span className="text-[10px] font-medium text-slate-400 mt-1.5 uppercase tracking-widest italic">
                                                {projectCategoryTab === 'internal' ? 'Internal Project' : project.client} | {project.id}
                                             </span>
                                             <span className="text-[9px] font-semibold text-slate-500 mt-2">
                                                Pending: {formatMetric(project.pendingHours, 'h')}
                                             </span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                          {project.resourceHours > 0 ? (
                                             <>
                                                <div className="flex items-center justify-center gap-0.5 max-w-[140px] mx-auto overflow-hidden rounded-full h-2 bg-slate-100 border border-slate-200">
                                                   <div className="h-full bg-indigo-600" style={{ width: `${project.billable}%` }} />
                                                   <div className="h-full bg-indigo-300" style={{ width: `${project.nonBillable}%` }} />
                                                   <div className="h-full bg-slate-300" style={{ width: `${project.internal}%` }} />
                                                </div>
                                                <div className="flex justify-center gap-3 mt-1.5">
                                                   <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-indigo-600" /><span className="text-[8px] font-black text-slate-400 uppercase">{formatMetric(project.billableHours, 'h')} B</span></div>
                                                   <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-indigo-300" /><span className="text-[8px] font-black text-slate-400 uppercase">{formatMetric(project.nonBillableHours, 'h')} NB</span></div>
                                                </div>
                                             </>
                                          ) : (
                                             <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-slate-500">
                                                No billed hours
                                             </span>
                                          )}
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                          <span className="text-[12px] font-bold text-slate-900">{formatMetric(project.actualHours)} / {formatMetric(project.plannedHours, 'h')}</span>
                                          <div className="h-1 w-12 bg-slate-100 rounded-full mt-2 mx-auto overflow-hidden">
                                             <div className="h-full bg-indigo-500" style={{ width: `${typeof project.util === 'number' ? project.util : 0}%` }} />
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                          <div className="flex flex-col items-end">
                                             <span className={`text-[16px] font-black ${project.health === 'Critical' ? 'text-rose-600' : 'text-slate-900'}`}>{formatMetric(project.util, '%')}</span>
                                             <span className={`inline-flex rounded-md border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest mt-1 ${project.severity === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                project.severity === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                   'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                }`}>
                                                {project.health}
                                             </span>
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                        {!projectsLoading && visibleOperationalProjects.length > 0 && (
                           <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/40">
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                 Showing {Math.min((projectPage - 1) * PROJECTS_PER_PAGE + 1, visibleOperationalProjects.length)}-
                                 {Math.min(projectPage * PROJECTS_PER_PAGE, visibleOperationalProjects.length)} of {visibleOperationalProjects.length}
                              </div>
                              <Pagination
                                 currentPage={projectPage}
                                 totalPages={totalProjectPages}
                                 onPrevious={() => setProjectPage((prev) => Math.max(prev - 1, 1))}
                                 onNext={() => setProjectPage((prev) => Math.min(prev + 1, totalProjectPages))}
                                 className="justify-end py-0"
                              />
                           </div>
                        )}
                     </div>
                  )}

                  {/* TAB 3: RESOURCE CAPABILITIES */}
                  {activeTab === 'resource' && (
                     <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                           <div className="flex flex-col gap-1.5">
                              <h3 className="text-[12px] font-black text-[#081534] uppercase tracking-[0.2em] leading-none">Capability & Performance Ledger</h3>
                              <p className="text-[11px] font-medium text-slate-400 italic">Granular resource workload analysis across billable cycles</p>
                           </div>
                           <div className="flex flex-col sm:flex-row items-center gap-4">
                              <div className="relative group w-full sm:w-auto">
                                 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                 <input
                                    type="text"
                                    placeholder="Search directory..."
                                    className="w-full sm:w-60 pl-10 pr-4 py-2.5 text-[12px] font-bold text-slate-700 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                 />
                              </div>
                              <div className="flex items-center gap-3 bg-white p-1.5 border border-slate-200 rounded-2xl w-full sm:w-auto">
                                 <input
                                    type="date"
                                    className="text-[11px] font-black uppercase text-slate-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer px-2"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                 />
                                 <div className="h-4 w-px bg-slate-200" />
                                 <input
                                    type="date"
                                    className="text-[11px] font-black uppercase text-slate-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer px-2"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                 />
                              </div>
                           </div>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                           <table className="w-full text-left border-collapse">
                              <thead>
                                 <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-100">Resource Profile</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center border-b border-slate-100">Hourly Split</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center border-b border-slate-100">Trend Signal</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-indigo-600 font-black text-right border-b border-slate-100">Utilization Rate</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {isResourceLoading ? (
                                    <tr>
                                       <td colSpan="4" className="px-8 py-16 text-center">
                                          <div className="flex flex-col items-center justify-center gap-4">
                                             <LoadingSpinner text='Compiling Resource Insights...' />
                                          </div>
                                       </td>
                                    </tr>
                                 ) : filteredAndPaginatedResources.paginated.length === 0 ? (
                                    <tr>
                                       <td colSpan="4" className="px-8 py-16 text-center">
                                          <div className="flex flex-col items-center gap-2 opacity-40">
                                             <Users size={32} className="text-slate-300" />
                                             <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">No matching profiles found</span>
                                          </div>
                                       </td>
                                    </tr>
                                 ) : (
                                    filteredAndPaginatedResources.paginated.map((res, idx) => (
                                       <tr key={res.userId || idx} className="hover:bg-indigo-50/30 transition-all group cursor-default cursor-pointer" onClick={() => handleRowClick(res)}>
                                          <td className="px-8 py-6">
                                             <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-[12px] transition-transform group-hover:scale-110 duration-300 uppercase">
                                                   {res.userName?.charAt(0) || 'R'}
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                   <span className="text-[14px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{res.userName}</span>
                                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Resource Hub Code: {res.userId || 'N/A'}</span>
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <div className="flex items-center justify-center gap-6">
                                                <div className="flex flex-col items-center">
                                                   <span className="text-[12px] font-black text-indigo-600">{res.billableHours}h</span>
                                                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Billable</span>
                                                </div>
                                                <div className="h-6 w-px bg-slate-100" />
                                                <div className="flex flex-col items-center">
                                                   <span className="text-[12px] font-black text-slate-500">{res.nonBillableHours}h</span>
                                                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Other</span>
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase border border-indigo-100 shadow-sm">
                                                   <Zap size={12} className="fill-indigo-700" /> Validated
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-8 py-6">
                                             <div className="flex flex-col items-end gap-2">
                                                <span className="text-[18px] font-black text-slate-900 leading-none">{res.billablePercentage}%</span>
                                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                                   <div
                                                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000 ease-out"
                                                      style={{ width: `${res.billablePercentage}%` }}
                                                   />
                                                </div>
                                             </div>
                                          </td>
                                       </tr>
                                    ))
                                 )}
                              </tbody>
                           </table>
                        </div>
                        {filteredAndPaginatedResources.totalPages > 1 && (
                           <div className="border-t border-slate-100 bg-white/50 backdrop-blur-md p-4">
                              <Pagination
                                 currentPage={currentPage}
                                 totalPages={filteredAndPaginatedResources.totalPages}
                                 onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))}
                                 onNext={() => setCurrentPage(p => Math.min(filteredAndPaginatedResources.totalPages, p + 1))}
                              />
                           </div>
                        )}
                     </div>
                  )}

                  {/* TAB 4: GOVERNANCE & READINESS */}
                  {/* {activeTab === 'governance' && (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center group overflow-hidden relative">
                           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                              <ShieldCheck size={120} />
                           </div>
                           <div className="h-24 w-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 mb-8 shadow-xl shadow-indigo-500/10 group-hover:rotate-12 transition-transform duration-500">
                              <LayoutGrid size={44} strokeWidth={2.5} />
                           </div>
                           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Threshold Governance</h3>
                           <p className="text-[13px] font-medium text-slate-400 italic mt-3 max-w-sm">System-enforced performance boundaries used to identify systemic workload deviations.</p>

                           <div className="mt-10 space-y-4 w-full">
                              {THRESHOLD_RULES.map((rule) => (
                                 <div key={rule.name} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                       <div className={`h-12 w-1.5 flex-shrink-0 rounded-full ${rule.color} shadow-sm`} />
                                       <div className="flex flex-col text-left gap-0.5">
                                          <span className="text-[12px] font-black text-slate-900 uppercase tracking-widest">{rule.name}</span>
                                          <span className="text-[10px] font-black text-slate-400 opacity-80">{rule.range}</span>
                                       </div>
                                    </div>
                                    <div className="text-left py-2 px-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                       <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.1em] leading-none block mb-1">Impact Logic</span>
                                       <p className="text-[10px] font-bold text-slate-500 italic opacity-80">{rule.note}</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                           <div className="mt-10 p-5 bg-rose-50/50 border border-rose-100 rounded-2xl w-full text-left flex items-start gap-4 active:scale-95 transition-transform cursor-default">
                              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                                 <History size={20} />
                              </div>
                              <div>
                                 <span className="text-[11px] font-black text-rose-700 uppercase tracking-widest">Breach Engine Persistence</span>
                                 <p className="text-[11px] font-medium text-rose-600 leading-relaxed mt-1 opacity-90">Sustained status is only triggered after 4 consecutive weekly cycles (W+4) of threshold deviation. Transient spikes are suppressed.</p>
                              </div>
                           </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col group overflow-hidden relative">
                           <div className="flex items-center justify-between mb-10">
                              <div className="flex flex-col gap-1.5">
                                 <h3 className="text-[12px] font-black text-[#081534] uppercase tracking-[0.2em] leading-none">Intelligence Alerts</h3>
                                 <span className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-widest w-fit">
                                    Story 7 Implementation
                                 </span>
                              </div>
                              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-rose-500 shadow-sm animate-pulse">
                                 <Bell size={20} />
                              </div>
                           </div>
                           <div className="space-y-4 flex-1">
                              {(liveData?.alerts || []).length === 0 ? (
                                 <div className="h-full flex flex-col items-center justify-center py-20 opacity-30 gap-3">
                                    <CheckCircle2 size={40} className="text-emerald-500" />
                                    <span className="text-[12px] font-black uppercase tracking-widest">No active governance breaches</span>
                                 </div>
                              ) : (
                                 (liveData?.alerts || []).map((alert) => (
                                    <div key={alert.id} className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl relative hover:bg-white hover:border-indigo-100 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                                       <div className="flex items-center justify-between mb-3 px-1">
                                          <h5 className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-none group-hover:text-indigo-600">
                                             {alert.scope ? `${alert.scope}: ` : ''}{alert.id}
                                          </h5>
                                          <div className={`h-2 w-2 rounded-full animate-ping ${alert.severity === 'high' || alert.severity === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                       </div>
                                       <p className="text-[12px] font-medium text-slate-500 mb-5 leading-relaxed bg-white/50 p-3 rounded-xl border border-white border-dashed">{alert.message}</p>
                                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                          <span className={`flex items-center gap-1.5 ${alert.severity === 'high' || alert.severity === 'Critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                                             <ShieldAlert size={12} /> Severity: {alert.severity}
                                          </span>
                                          <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Status: {alert.status}</span>
                                       </div>
                                    </div>
                                 ))
                              )}
                           </div>
                           <div className="mt-10 p-5 bg-slate-900 rounded-2xl flex items-center gap-5 shadow-2xl shadow-indigo-900/20">
                              <div className="h-12 w-12 flex items-center justify-center bg-white/10 rounded-xl text-indigo-400 shadow-inner">
                                 <ShieldCheck size={24} strokeWidth={2.5} />
                              </div>
                              <div>
                                 <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-none block mb-1.5">Downstream Readiness</span>
                                 <p className="text-[11px] font-medium text-slate-300 italic leading-snug opacity-90 italic">Direct integration enabled. Only sustained, non-volatile workload signals feed the Leveling Engine.</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  )} */}
               </div>
            </div>
         </div>

         {/* RESOURCE PROJECTS DRAWER */}
         <ResourceVisualizationDrawer
            selectedResource={selectedResource}
            onClose={() => setSelectedResource(null)}
            projectsDrawerTab={projectsDrawerTab}
            setProjectsDrawerTab={setProjectsDrawerTab}
            isProjectsLoading={isProjectsLoading}
            resourceProjectsData={resourceProjectsData}
         />
      </div>
   );
};



const PerformanceTooltip = ({ active, payload, label }) => {
   if (active && payload && payload.length) {
      const pointData = payload[0].payload;
      const planned = pointData.planned !== undefined ? pointData.planned : pointData.plannedHours;

      return (
         <div className="bg-[#081534]/95 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl p-5 flex flex-col gap-3 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2 mb-1">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label || 'Period'}</p>
               <Circle size={8} className="text-indigo-400 fill-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-3">
               {payload.map((p, idx) => (
                  <div key={`${p.name}-${idx}`} className="flex items-center justify-between gap-6 group">
                     <div className="flex items-center gap-2.5">
                        <div
                           className="h-2 w-2 rounded-full border border-white/20"
                           style={{
                              backgroundColor: p.color || p.payload?.fill || p.stroke || '#4f46e5',
                              boxShadow: `0 0 8px ${(p.color || p.payload?.fill || p.stroke || '#4f46e5')}66`
                           }}
                        />
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight group-hover:text-white transition-colors">{p.name}:</span>
                     </div>
                     <span className="text-[12px] font-black text-white tabular-nums">
                        {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{p.name.toLowerCase().includes('%') ? '%' : 'h'}
                     </span>
                  </div>
               ))}

               {planned !== undefined && (
                  <div className="flex items-center justify-between gap-6 pt-3 mt-1 border-t border-slate-700/30">
                     <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-slate-500 border border-white/10" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Planned Hours:</span>
                     </div>
                     <span className="text-[12px] font-black text-slate-300 tabular-nums">{Number(planned).toFixed(1)}h</span>
                  </div>
               )}
            </div>
            <div className="mt-2 flex items-center gap-2 opacity-50">
               <div className="h-px flex-1 bg-slate-700" />
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Validated</span>
               <div className="h-px flex-1 bg-slate-700" />
            </div>
         </div>
      );
   }
   return null;
};

export default UtilizationPerformanceDashboard;

