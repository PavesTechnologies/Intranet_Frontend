import React, { useEffect, useState, useMemo } from 'react';

import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
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
   ZapOff, Database, Clock, X, User, BarChart2, BrainCircuit
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
   const PROJECTS_PER_PAGE = 4;
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

   // Fetch Operational Projects (Story 4 & 5)
   useEffect(() => {
      const fetchProjects = async () => {
         try {
            setProjectsLoading(true);
            const response = await getOperationalProjects();
            const projectList = extractOperationalProjects(response);
            setOperationalProjects(projectList.map(mapProjectCatalogEntry));
            setProjectsError('');
         } catch (err) {
            console.error('Failed to fetch operational projects:', err);
            setProjectsError('Failed to load operational projects from command hub.');
            setOperationalProjects([]);
         } finally {
            setProjectsLoading(false);
         }
      };
      fetchProjects();
   }, []);

   const visibleOperationalProjects = useMemo(() => {
      return operationalProjects.filter(p => {
         if (projectCategoryTab === 'internal') return p.isInternal;
         return !p.isInternal;
      });
   }, [operationalProjects, projectCategoryTab]);
   
   // Reset project page when switching categories (Active vs Internal)
   useEffect(() => {
      setProjectPage(1);
   }, [projectCategoryTab]);

   // Reset resource registry page when searching
   useEffect(() => {
      setCurrentPage(1);
   }, [searchQuery]);

   const totalProjectPages = Math.ceil(visibleOperationalProjects.length / PROJECTS_PER_PAGE) || 1;

   const paginatedOperationalProjects = useMemo(() => {
      const startIndex = (projectPage - 1) * PROJECTS_PER_PAGE;
      return visibleOperationalProjects.slice(startIndex, startIndex + PROJECTS_PER_PAGE);
   }, [visibleOperationalProjects, projectPage, PROJECTS_PER_PAGE]);

   const selectedResourceName = useMemo(() => {
      if (!selectedResourceId) return null;
      const user = rmsUsers.find(u => String(u.userId) === String(selectedResourceId));
      return user?.name || `User ${selectedResourceId}`;
   }, [selectedResourceId, rmsUsers]);

   const [resourceMetrics, setResourceMetrics] = useState([]);
   const [isResourceLoading, setIsResourceLoading] = useState(false);

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

   const handleRowClick = async (res) => {
      setSelectedResource(res);
      setProjectsDrawerTab('overall');
      setIsProjectsLoading(true);
      try {
         const data = await getResourceProjects(res.userId);
         setResourceProjectsData(data);
      } catch (err) {
         console.error(err);
         setResourceProjectsData([]);
      } finally {
         setIsProjectsLoading(false);
      }
   };

   useEffect(() => {
      const fetchResourceMetrics = async () => {
         if (!startDate || !endDate) return;
         if (new Date(startDate) > new Date(endDate)) return;
         try {
            setIsResourceLoading(true);
            const data = await getBillNonBillable(startDate, endDate);
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
   }, [startDate, endDate]);

   useEffect(() => {
      const fetchProjects = async () => {
         try {
            setProjectsLoading(true);
            setProjectsError('');
            const data = await getOperationalProjects(startDate, endDate);
            const extracted = extractOperationalProjects(data);
            const mapped = extracted.map(mapProjectCatalogEntry);
            setOperationalProjects(mapped);
         } catch (err) {
            console.error('Failed to fetch operational projects:', err);
            setProjectsError('Failed to load operational projects');
         } finally {
            setProjectsLoading(false);
         }
      };

      if (activeTab === 'projects') {
         fetchProjects();
      }
   }, [activeTab, startDate, endDate]);

   // const visibleOperationalProjects = useMemo(() => {
   //    if (projectCategoryTab === 'internal') {
   //       return operationalProjects.filter(p => p.isInternal);
   //    }
   //    return operationalProjects.filter(p => !p.isInternal);
   // }, [operationalProjects, projectCategoryTab]);

   // const totalProjectPages = Math.ceil(visibleOperationalProjects.length / PROJECTS_PER_PAGE) || 1;

   // const paginatedOperationalProjects = useMemo(() => {
   //    const start = (projectPage - 1) * PROJECTS_PER_PAGE;
   //    return visibleOperationalProjects.slice(start, start + PROJECTS_PER_PAGE);
   // }, [visibleOperationalProjects, projectPage]);

   // const handleRowClick = async (resource) => {
   //    setSelectedResource(resource);
   //    setIsProjectsLoading(true);
   //    try {
   //       const data = await getResourceProjects(resource.userId, dateRange.startDate, dateRange.endDate);
   //       setResourceProjectsData(data);
   //    } catch (err) {
   //       console.error(err);
   //       setResourceProjectsData([]);
   //    } finally {
   //       setIsProjectsLoading(false);
   //    }
   // };

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
                  REPORT & DASHBOARD
               </button>
            </div>
         </div>
         {/* KPI Stats Grid */}
         <div className="flex flex-nowrap gap-4 overflow-x-auto no-scrollbar mb-6">
            {(liveData ? dynamicKPIs : KPI_STATS).map((stat, idx) => {
               const originalStat = KPI_STATS.find(s => s.label === stat.label) || KPI_STATS[idx % KPI_STATS.length];
               return (
                  <div key={stat.label} className="flex min-w-[200px] flex-1 items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md group">
                     <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm ${originalStat.bg} ${originalStat.color} group-hover:scale-105 transition-transform`}>
                        {React.cloneElement(originalStat.icon, { size: 18, strokeWidth: 2.5 })}
                     </div>
                     <div className="min-w-0 flex-1">
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                        <div className="flex items-center gap-2">
                           <p className="text-xl font-black tracking-tight text-slate-900">{stat.value}</p>
                           <div className={`flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded ${stat.label === 'Active Breaches' || stat.trend === 'down' || stat.trend === 'Declining' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                              {stat.trend}
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>

         <div className="mb-6 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-end gap-10 overflow-x-auto no-scrollbar">
               {[
                  { id: 'portfolio', label: 'Portfolio Analytics', icon: <PieIcon size={14} /> },
                  { id: 'projects', label: 'Operational Projects', icon: <Monitor size={14} /> },
                  { id: 'resource', label: 'Resource Capability', icon: <BrainCircuit size={14} /> },
                  // { id: 'governance', label: 'Governance & Readiness', icon: <ShieldAlert size={14} /> }
               ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`group relative flex items-center gap-2 pb-3.5 pt-2 whitespace-nowrap transition-all ${isActive ? "text-[#081534]" : "text-slate-400 hover:text-slate-600"
                           }`}
                     >
                        {tab.icon}
                        <span className={`text-sm font-semibold tracking-tight ${isActive ? "text-[#081534]" : "text-slate-600"}`}>
                           {tab.label}
                        </span>
                        <span className={`absolute bottom-0 left-0 h-0.5 rounded-full bg-[#081534] transition-all ${isActive ? "w-full opacity-100" : "w-0 opacity-0"}`} />
                     </button>
                  );
               })}
            </div>

               {/* Unified Calendar / Date Range Picker */}
               <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm h-[38px] mb-2 hover:border-indigo-500 transition-all focus-within:ring-1 focus-within:ring-indigo-500 group">
                  <CalendarRange size={14} className="text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex items-center gap-1">
                     <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        onClick={(e) => e.target.showPicker()}
                     className="text-[11px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer w-auto min-w-[110px]"
                  />
                  <span className="text-slate-300 mx-0.5">—</span>
                  <input
                     type="date"
                     value={endDate}
                     onChange={(e) => setEndDate(e.target.value)}
                        onClick={(e) => e.target.showPicker()}
                        className="text-[11px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer w-auto min-w-[110px]"
                     />
                  </div>
               </div>
            </div>
 
            {/* DASHBOARD CONTENT ENGINE */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               {/* TAB 0: UTILIZATION REPORTING & DASHBOARDS */}
               {activeTab === 'portfolio' && (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                     <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                           <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                 <h3 className="text-[12px] font-black text-[#081534] uppercase tracking-[0.2em] leading-none">Portfolio Performance Overview</h3>
                              </div>
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
                           ) : (filteredAndPaginatedResources.paginated.length === 0 ? (
                              <tr>
                                 <td colSpan="4" className="px-6 py-8 text-center">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">No Resource Data Available</span>
                                 </td>
                              </tr>
                           ) : (
                              filteredAndPaginatedResources.paginated.map((res, idx) => (
                                 <tr key={res.userId || idx} className="hover:bg-slate-50/40 transition-colors group cursor-pointer" onClick={() => handleRowClick(res)}>
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
                              ))))}
                           </tbody>
                        </table>
                     </div>
                     {!projectsLoading && totalProjectPages > 1 && (
                        <div className="border-t border-slate-100 py-6">
                           <Pagination
                              currentPage={projectPage}
                              totalPages={totalProjectPages}
                              onPrevious={() => setProjectPage((prev) => Math.max(prev - 1, 1))}
                              onNext={() => setProjectPage((prev) => Math.min(prev + 1, totalProjectPages))}
                           />
                        </div>
                     )}
                  </div>
               )}

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

