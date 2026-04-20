import React, { useState, useMemo, useEffect } from 'react';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
   BarChart, Bar, Cell, PieChart, Pie, Sector, Legend, LineChart, Line, ComposedChart
} from 'recharts';
import {
   ArrowLeft, TrendingUp, BarChart3, Users, Zap, Target, Activity,
   Download, Filter, Search, Award, Monitor, PieChart as PieIcon,
   ChevronRight, BrainCircuit, Timer, Star, Briefcase, FileText, ShieldCheck,
   AlertTriangle, ArrowUpRight, ArrowDownRight, History, Bell, CheckCircle2,
   Share2, RefreshCcw, Info, Database, Fingerprint, Lock, ShieldAlert,
   Verified, ZapOff, Scale, LayoutGrid, CalendarRange, Clock, PieChart as PieChartIcon,
   TrendingUp as TrendingUpIcon, MoveUpRight
} from 'lucide-react';
import { getBillNonBillable } from '../../services/utilizationService';
import Pagination from '../../../../components/Pagination/pagination';
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { utilizationService } from '../../../../services/utilizationService';
import { fetchResources } from '../../services/resource';

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

const PROJECT_SQUAD = [
   { id: 'P-101', name: 'Alpha-X Cloud', client: 'Nexus Corp', actualHours: 320, plannedHours: 350, util: 91.4, billable: 90, nonBillable: 5, internal: 5, health: 'Optimal', severity: 'Low', breach: 'None' },
   { id: 'P-102', name: 'E-Commerce', client: 'RetailFlow', actualHours: 410, plannedHours: 430, util: 95.3, billable: 80, nonBillable: 15, internal: 5, health: 'Warning', severity: 'Critical', breach: 'Sustained (4w)' },
   { id: 'P-103', name: 'FinServe AI', client: 'FinServe', actualHours: 140, plannedHours: 350, util: 40.0, billable: 40, nonBillable: 50, internal: 10, health: 'Critical', severity: 'Critical', breach: 'Sustained (6w)' },
   { id: 'P-104', name: 'Search Engine', client: 'Visionary', actualHours: 392, plannedHours: 400, util: 98.0, billable: 95, nonBillable: 0, internal: 5, health: 'Optimal', severity: 'Low', breach: 'None' },
];

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

const THRESHOLD_RULES = [
   { name: 'Optimal', range: '75% - 90%', color: 'bg-emerald-500', note: 'Standard Performance' },
   { name: 'Warning', range: '90% - 95%', color: 'bg-amber-500', note: 'Approaching Breach' },
   { name: 'Critical', range: '> 95% or < 40%', color: 'bg-rose-500', note: 'Requires Intervention' },
];

const UtilizationPerformanceDashboard = () => {
   const navigate = useNavigate();
   const [activeTab, setActiveTab] = useState('portfolio');
   const [granularity, setGranularity] = useState('WEEKLY');
   const [selectedResourceId, setSelectedResourceId] = useState(null);
   const [OVERALL_CONFIDENCE_SCORE] = useState(94);
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
            // Fetch specific resource if selected, otherwise fetch global payload
            const data = await utilizationService.getRMSSummary(
               selectedResourceId || '',
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
            if (resourceList && resourceList.length > 0 && !selectedResourceId) {
               setSelectedResourceId(resourceList[0].resourceId);
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

   const [searchQuery, setSearchQuery] = useState('');
   const [currentPage, setCurrentPage] = useState(1);
   const ITEMS_PER_PAGE = 8;

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
   }, [dateRange.startDate, dateRange.endDate]);

   const activeChartData = useMemo(() => {
      if (liveData && liveData.portfolioTrends) {
         const key = granularity.toLowerCase();
         return liveData.portfolioTrends[key] || [];
      }
      return PORTFOLIO_DATA[granularity] || [];
   }, [granularity, liveData]);

   // STORY 3 & 4: Merged Resource Ledger (Directory + Live Metrics)
   const mergedResources = useMemo(() => {
      const base = (Array.isArray(allResources) && allResources.length > 0) ? allResources : RESOURCE_DATABASE;

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
      if (liveData) {
         // Priority 1: Use global portfolio percentage fields if they exist
         if (liveData.totalPercentage !== undefined) {
            const b = liveData.billablePercentage || 0;
            const nb = liveData.otherNonBillablePercentage ?? liveData.nonBillablePercentage ?? 0;
            const i = liveData.internalNonBillablePercentage ?? liveData.internalPercentage ?? 0;
            return [
               { name: 'Billable', value: Number(Number(b).toFixed(2)), color: '#4f46e5' },
               { name: 'Non-Billable', value: Number(Number(nb).toFixed(2)), color: '#818cf8' },
               { name: 'Internal', value: Number(Number(i).toFixed(2)), color: '#cbd5e1' },
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

               if (total === 0) return BILLING_PIE_DATA;

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
      return BILLING_PIE_DATA;
   }, [liveData]);

   const dynamicKPIs = useMemo(() => {
      if (!liveData) return KPI_STATS;

      let utilVal = liveData.overallUtilizationPercentage ?? 0;
      let billableRatio = liveData.billablePercentage ?? 0;
      let confScore = liveData.averageConfidenceScore ?? 100;
      let totalRes = liveData.totalResources ?? (liveData.resourceSummaries ? liveData.resourceSummaries.length : 0);

      // Parse from specific kpiStats payload if present
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



         {/* Header — Unified Command Strip */}
         <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <button
                  onClick={() => navigate('/resource-management/bench')}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm shrink-0"
               >
                  <ArrowLeft size={18} />
               </button>
               <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-none">Utilization Intelligence Hub</h1>
                  <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
                     Governed Command Hub — Detecting Sustained Breaches
                  </p>
               </div>
            </div>

            <div className="flex items-center gap-3">
               {/* Unified Calendar / Date Range Picker */}
               <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm h-[42px]">
                  <CalendarRange size={16} className="text-indigo-600 shrink-0" />
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
         <div className="flex flex-nowrap gap-4 overflow-x-auto mb-6">
            {(liveData ? dynamicKPIs : KPI_STATS).map((stat, idx) => {
               // Find original icon if available, otherwise use default
               const originalStat = KPI_STATS.find(s => s.label === stat.label) || KPI_STATS[idx % KPI_STATS.length];
               return (
                  <div key={stat.label} className="flex min-w-[220px] flex-1 items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-slate-200 hover:shadow-md">
                     <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-sm ${originalStat.bg} ${originalStat.color} transition-transform`}>
                        {React.cloneElement(originalStat.icon, { size: 20 })}
                     </div>
                     <div className="min-w-0">
                        <p className="mb-0.5 text-xs font-medium tracking-tight text-slate-500">{stat.label}</p>
                        <div className="flex items-end gap-2">
                           <p className="text-2xl font-bold tracking-tight text-slate-900 leading-none">{stat.value}</p>
                           <span className={`text-[10px] font-bold pb-0.5 ${stat.label === 'Active Breaches' || stat.trend === 'down' ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {stat.trend}
                           </span>
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>

         <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-white px-5 py-4">
               <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-6 overflow-x-auto px-1">
                     {[
                        { id: 'portfolio', label: 'Portfolio Analytics', icon: PieIcon },
                        { id: 'resource', label: 'Resource Capability', icon: Users },
                        { id: 'projects', label: 'Operational Projects', icon: Monitor },
                        { id: 'governance', label: 'Governance & Readiness', icon: ShieldAlert }
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
                                 <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-indigo-600 shadow-[0_1px_4px_rgba(79,70,229,0.3)]" />
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

                  {/* TAB 1: STRATEGIC PORTFOLIO (Story 3, 5, 8, 9) */}
                  {activeTab === 'portfolio' && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6 overflow-hidden">
                           <div className="flex items-center justify-between mb-8">
                              <div className="flex flex-col">
                                 <div className="flex items-center gap-2 mb-1.5">
                                    <h3 className="text-[11px] font-black text-[#081534] uppercase tracking-widest leading-none">Strategic Performance Trends</h3>
                                    <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${selectedResourceId ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                       {selectedResourceId ? `LIVE DATA IS ${selectedResourceName}` : 'LIVE DATA IS OVERALL RESOURCE'}
                                    </span>
                                 </div>
                                 <p className="text-[10px] font-medium text-slate-400 italic font-serif">Generating historical trend lines from approved timesheets (Planned vs Actual)</p>
                              </div>
                              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                                 {['DAILY', 'WEEKLY', 'MONTHLY'].map(t => (
                                    <button
                                       key={t}
                                       onClick={() => setGranularity(t)}
                                       className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${granularity === t ? 'bg-white shadow-sm text-indigo-600 border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                       {t}
                                    </button>
                                 ))}
                              </div>
                           </div>
                           <div className="h-72 w-full overflow-x-auto no-scrollbar">
                              <div style={{ minWidth: activeChartData.length > 8 ? `${activeChartData.length * 70}px` : '100%' }} className="h-full">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={activeChartData} margin={{ bottom: 30 }}>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                       <XAxis
                                          dataKey="period"
                                          axisLine={false}
                                          tickLine={false}
                                          tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                                          interval={0}
                                          angle={-40}
                                          textAnchor="end"
                                       />
                                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} domain={[0, 100]} />
                                       <RechartsTooltip content={<PerformanceTooltip />} />
                                       <Area type="monotone" dataKey="util" fill="#EEF2FF" stroke="#4f46e5" strokeWidth={3} name="Utilization %" />
                                       <Line type="monotone" dataKey="actual" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" name="Actual Hours" />
                                    </ComposedChart>
                                 </ResponsiveContainer>
                              </div>
                           </div>
                           <div className="mt-4 flex items-center justify-center gap-8 border-t border-slate-50 pt-4">
                              <div className="flex items-center gap-2">
                                 <History size={12} className="text-indigo-500" />
                                 <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Trend Preservation Active</span>
                              </div>
                              <div className="flex items-center gap-2 border-l border-slate-200 pl-8">
                                 <Scale size={12} className="text-slate-400" />
                                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Comparing Planned Allocation vs Realized Log</span>
                              </div>
                           </div>
                        </div>

                        {/* QUICK-GLANCE BILLING BREAKDOWN */}
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col group overflow-hidden">
                           <div className="flex items-center justify-between mb-6">
                              <div className="flex flex-col">
                                 <h3 className="text-[11px] font-black text-[#081534] uppercase tracking-widest leading-none mb-1.5">Billing Yield Index</h3>
                                 <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest w-fit ${selectedResourceId ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {selectedResourceId ? `LIVE DATA IS ${selectedResourceName}` : 'LIVE DATA IS OVERALL RESOURCE'}
                                 </span>
                              </div>
                              <PieChartIcon size={14} className="text-indigo-400" />
                           </div>
                           <div className="flex-1 h-52 w-full mt-2 relative">
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
                              <div className="flex items-center gap-2 mb-1.5">
                                 <h3 className="text-[11px] font-black text-[#081534] uppercase tracking-widest leading-none">Operational Performance Registry</h3>
                                 <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${selectedResourceId ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {selectedResourceId ? `LIVE DATA IS ${selectedResourceName}` : 'LIVE DATA IS OVERALL RESOURCE'}
                                 </span>
                              </div>
                              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest opacity-70 italic font-serif">Detecting sustained breaches across project engagements</p>
                           </div>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="bg-slate-50/50 border-b border-slate-50">
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Project / Engagement</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Billing Strip</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Health Signal (Threshold)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-rose-600 text-right">Breach Status</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {(liveData?.projects?.length > 0 ? liveData.projects : PROJECT_SQUAD).map((proj) => (
                                    <tr key={proj.id || proj.projectId} className="hover:bg-slate-50/40 transition-colors group">
                                       <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                             <span className="text-[13px] font-bold text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-none">{proj.name}</span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                          <div className="flex items-center justify-center gap-3">
                                             <div className="flex flex-col items-center"><span className="text-[11px] font-black text-indigo-600">{Number(proj.billable).toFixed(2)}%</span><span className="text-[8px] font-bold text-slate-400 uppercase">Billable</span></div>
                                             <div className="h-6 w-px bg-slate-100" />
                                             <div className="flex flex-col items-center"><span className="text-[11px] font-black text-slate-600">{Number(proj.nonBillable).toFixed(2)}%</span><span className="text-[8px] font-bold text-slate-400 uppercase">Non-Bill</span></div>
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                          <div className={`flex items-center justify-center gap-1 text-[10px] font-black uppercase ${proj.health === 'Optimal' ? 'text-emerald-600' : proj.health === 'Warning' ? 'text-amber-600' : 'text-rose-600'}`}>
                                             {proj.health === 'Optimal' && <CheckCircle2 size={14} />}
                                             {proj.health === 'Warning' && <AlertTriangle size={14} />}
                                             {proj.health === 'Critical' && <AlertTriangle size={14} />}
                                             {proj.healthSignal || `${proj.health} (${Number(proj.util || proj.utilizationPercentage || 0).toFixed(2)}%)`}
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                          <span className={`text-[11px] font-black uppercase tracking-tight ${proj.breach === 'None' || !proj.breach ? 'text-slate-400' : 'text-rose-600'}`}>
                                             {proj.breach || 'None'}
                                          </span>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  )}

                  {/* TAB 3: RESOURCE CAPABILITIES (Story 3, 4, 5, 10) */}
                  {activeTab === 'resource' && (
                     <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-in">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                           <div>
                              <h3 className="text-[11px] font-black text-[#081534] uppercase tracking-widest leading-none">Capability & Performance Ledger</h3>
                              {/* <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest opacity-70 italic font-serif">Deep-dive into individual billable efficiency vs historical directional signals</p> */}
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="relative">
                                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                 <input
                                    type="text"
                                    placeholder="Search Resource..."
                                    className="pl-7 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-indigo-500 w-40"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                 />
                              </div>
                              <div className="flex items-center gap-2">
                                 <input
                                    type="date"
                                    className="text-[10px] uppercase font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-indigo-500"
                                    value={dateRange.startDate}
                                    max={dateRange.endDate || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                 />
                                 <span className="text-[10px] font-bold text-slate-400 uppercase">to</span>
                                 <input
                                    type="date"
                                    className="text-[10px] uppercase font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-indigo-500"
                                    value={dateRange.endDate}
                                    min={dateRange.startDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                 />
                              </div>
                              {/* <div className="flex items-center gap-2 bg-slate-900 text-white rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                           <ShieldCheck size={12} className="text-emerald-400" /> Source Verified
                        </div> */}
                           </div>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="bg-slate-50/50 border-b border-slate-50">
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Resource Registry</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Hourly Split (B / NB)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Trend Signal</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-indigo-600 text-right">Overall Util %</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {isResourceLoading ? (
                                    <tr>
                                       <td colSpan="4" className="px-6 py-8 text-center">
                                          <div className="flex flex-col items-center justify-center gap-2">
                                             {/* <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> */}
                                             {/* <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Loading Resources...</span> */}
                                             <LoadingSpinner text='Loading Resources...' />
                                          </div>
                                       </td>
                                    </tr>
                                 ) : filteredAndPaginatedResources.paginated.length === 0 ? (
                                    <tr>
                                       <td colSpan="4" className="px-6 py-8 text-center">
                                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">No Resource Data Available</span>
                                       </td>
                                    </tr>
                                 ) : (
                                    filteredAndPaginatedResources.paginated.map((res, idx) => (
                                       <tr key={res.userId || idx} className="hover:bg-slate-50/40 transition-colors group">
                                          <td className="px-6 py-4">
                                             <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-none">{res.userName}</span>
                                                <span className="text-[10px] font-medium text-slate-400 mt-1.5 uppercase tracking-widest italic">Resource</span>
                                             </div>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                             <div className="flex items-center justify-center gap-3">
                                                <div className="flex flex-col items-center"><span className="text-[11px] font-black text-indigo-600">{res.billableHours}h</span><span className="text-[8px] font-bold text-slate-400 uppercase">Billable</span></div>
                                                <div className="h-6 w-px bg-slate-100" />
                                                <div className="flex flex-col items-center"><span className="text-[11px] font-black text-slate-600">{res.nonBillableHours}h</span><span className="text-[8px] font-bold text-slate-400 uppercase">Non-Bill</span></div>
                                             </div>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                             {/* STORY 5: Individual Trend Signals */}
                                             <div className="flex flex-col items-center gap-0.5">
                                                <div className="text-indigo-600 flex items-center gap-1 text-[10px] font-black uppercase"><Zap size={14} /> Stable</div>
                                             </div>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                             <div className="flex flex-col items-end">
                                                <span className="text-[16px] font-black text-slate-900">{res.billablePercentage}%</span>
                                                <div className="h-1 w-12 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                                   <div className="h-full bg-indigo-500" style={{ width: `${res.billablePercentage}%` }} />
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
                           <div className="border-t border-slate-100 bg-white p-3">
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

                  {/* TAB 4: GOVERNANCE & READINESS (Story 6, 7, 11, 12) */}
                  {activeTab === 'governance' && (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center">
                           <div className="h-20 w-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 mb-6 shadow-xl shadow-indigo-500/10">
                              <Gauge size={40} />
                           </div>
                           <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Story 6: Threshold Governance</h3>
                           <p className="text-[12px] font-medium text-slate-500 italic mt-2 max-w-sm font-serif">System-enforced performance boundaries used to identify systemic sustained breaches.</p>

                           <div className="mt-10 space-y-3 w-full">
                              {THRESHOLD_RULES.map((rule) => (
                                 <div key={rule.name} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-100 transition-all">
                                    <div className="flex items-center gap-4">
                                       <div className={`h-10 w-1 flex-shrink-0 rounded-full ${rule.color}`} />
                                       <div className="flex flex-col text-left">
                                          <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{rule.name}</span>
                                          <span className="text-[10px] font-bold text-slate-400">{rule.range}</span>
                                       </div>
                                    </div>
                                    <div className="text-left py-1 px-3 bg-white border border-slate-50 rounded-lg">
                                       <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none">Logic</span>
                                       <p className="text-[9px] font-medium text-slate-400 italic">{rule.note}</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                           <div className="mt-8 p-4 bg-rose-50 border border-rose-100 rounded-xl w-full text-left flex items-start gap-4">
                              <History size={18} className="text-rose-500 mt-1 shrink-0" />
                              <div>
                                 <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Breach Engine Config (Story 6)</span>
                                 <p className="text-[10px] font-medium text-rose-600 leading-relaxed italic">Sustained status is only triggered after 4 consecutive cycles (W+4) of threshold deviation. Spikes are automatically suppressed.</p>
                              </div>
                           </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col">
                           <div className="flex items-center justify-between mb-8">
                              <h3 className="text-[11px] font-black text-[#081534] uppercase tracking-widest opacity-60">Intelligence Alerts (Story 7)</h3>
                              <Bell size={14} className="text-rose-400" />
                           </div>
                           <div className="space-y-4 flex-1">
                              {(liveData?.alerts || ALERT_INTELLIGENCE).map((alert) => (
                                 <div key={alert.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl relative hover:border-indigo-100 transition-colors cursor-pointer group">
                                    <h5 className="text-[12px] font-bold text-slate-900 uppercase tracking-tight pr-12 leading-none">
                                       {alert.scope ? `${alert.scope}: ` : ''}{alert.id}
                                    </h5>
                                    <p className="text-[11px] font-medium text-slate-500 mt-2 leading-relaxed">{alert.message}</p>
                                    <div className="mt-4 flex items-center justify-between border-t border-white/50 pt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                       <span className={alert.severity === 'high' || alert.severity === 'Critical' ? 'text-rose-500' : ''}>
                                          Severity: {alert.severity}
                                       </span>
                                       <span className="text-indigo-600">Status: {alert.status}</span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                           <div className="mt-6 p-4 bg-slate-900 rounded-xl flex items-center gap-4">
                              <div className="h-10 w-10 flex items-center justify-center bg-slate-800 rounded-lg text-indigo-400 shadow-inner">
                                 <ShieldCheck size={20} />
                              </div>
                              <div>
                                 <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none block mb-1">Downstream Readiness</span>
                                 <p className="text-[11px] font-medium text-white/70 italic leading-tight">Only validated, non-spiky signals feed the Leveling Engine.</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

const PerformanceTooltip = ({ active, payload, label }) => {
   if (active && payload && payload.length) {
      const pointData = payload[0].payload;
      const planned = pointData.planned !== undefined ? pointData.planned : pointData.plannedHours;

      return (
         <div className="bg-[#081534] border border-slate-800 rounded-lg shadow-2xl p-4 flex flex-col gap-2 min-w-[170px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label} Pattern</p>
            <div className="space-y-2.5">
               {payload.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-6">
                     <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color || p.stroke }} />
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">{p.name}:</span>
                     </div>
                     <span className="text-[11px] font-black text-white">{p.value}{p.name.includes('%') ? '' : 'h'}</span>
                  </div>
               ))}

               {planned !== undefined && (
                  <div className="flex items-center justify-between gap-6 pt-1 mt-1 border-t border-slate-700/50">
                     <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Planned Hours:</span>
                     </div>
                     <span className="text-[11px] font-black text-white">{planned}h</span>
                  </div>
               )}
            </div>
         </div>
      );
   }
   return null;
};

export default UtilizationPerformanceDashboard;
