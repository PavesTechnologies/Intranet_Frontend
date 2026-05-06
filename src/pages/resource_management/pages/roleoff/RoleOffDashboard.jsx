import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Sector
} from 'recharts';
import { Download, AlertTriangle, Zap, TrendingUp, Activity, Search, ArrowLeft, Filter, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { getFilteredRoleOffs, exportRoleOffsCsv } from "../../services/roleOffService";
import { searchClients } from "../../services/clientservice";
import { getProjects } from "../../services/projectService";
import Modal from "../../../../components/Modal/modal";

const COLORS = ['#4f46e5', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];

const RoleOffDashboard = () => {
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [data, setData] = useState({
    totalRoleOffs: 0,
    filteredEvents: [],
    reasonBreakdown: {},
    riskMetrics: {
      riskScore: 0,
      riskLevel: "LOW",
    },
    riskAlerts: [],
    hasHighRiskPatterns: false
  });

  const [activeTab, setActiveTab] = useState('overview');

  const getPresentMonthDates = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const pad = (n) => n.toString().padStart(2, '0');
    const formatDateLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    return {
      start: formatDateLocal(firstDay),
      end: formatDateLocal(lastDay)
    };
  };

  const defaultDates = getPresentMonthDates();

  const [filters, setFilters] = useState({
    startDate: defaultDates.start,
    endDate: defaultDates.end,
    project: "",
    client: "",
    reason: ""
  });

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [trendMode, setTrendMode] = useState('month');
  const [dropdownPos, setDropdownPos] = useState(null);
  const filterButtonRef = useRef(null);
  
  const [clientsList, setClientsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (filterButtonRef.current && showFilters) {
        const rect = filterButtonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const popupHeight = 480;
        const popupWidth = 480;

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        let align = 'down';
        if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
          align = 'up';
        }

        let horizontalPos = { right: viewportWidth - rect.right };
        if (rect.right < popupWidth) {
          horizontalPos = { left: rect.left };
          delete horizontalPos.right;
        }

        setDropdownPos({
          top: align === 'up' ? 'auto' : (rect.bottom + 8),
          bottom: align === 'up' ? (viewportHeight - rect.top + 8) : 'auto',
          ...horizontalPos,
          align,
          maxHeight: Math.min(viewportHeight * 0.85, align === 'up' ? spaceAbove - 24 : spaceBelow - 24)
        });
      }
    };

    if (showFilters) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showFilters]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterButtonRef.current && !filterButtonRef.current.contains(event.target)) {
        const portal = document.getElementById('roleoff-filter-portal');
        if (portal && !portal.contains(event.target)) {
          setShowFilters(false);
        }
      }
    };
    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchDropdownData = async () => {
    try {
      const [clientsData, projectsData] = await Promise.all([
        searchClients({ search: "", region: "", type: "", priority: "", status: "", startDate: "", endDate: "" }, 0, 1000),
        getProjects({ page: 0, size: 1000 })
      ]);
      
      const clients = Array.isArray(clientsData?.data?.records) ? clientsData.data.records : 
                     (Array.isArray(clientsData?.data) ? clientsData.data : (clientsData || []));
      
      const projects = Array.isArray(projectsData?.data?.content) ? projectsData.data.content : 
                      (Array.isArray(projectsData?.data) ? projectsData.data : (projectsData || []));
      
      setClientsList(clients);
      setProjectsList(projects);
    } catch (error) {
      console.error("Failed to load dropdown options", error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Build API payload
      const payload = {};
      if (filters.startDate) payload.startDate = filters.startDate;
      if (filters.endDate) payload.endDate = filters.endDate;
      if (filters.project) payload.projectIds = [parseInt(filters.project)]; // Mock ID handling
      if (filters.client) payload.clientIds = [filters.client];
      if (filters.reason) payload.reasons = [filters.reason];

      const response = await getFilteredRoleOffs(payload);
      setData(response);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch role-off report data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const payload = {};
      if (filters.startDate) payload.startDate = filters.startDate;
      if (filters.endDate) payload.endDate = filters.endDate;
      if (filters.project) payload.projectIds = [parseInt(filters.project)];
      if (filters.client) payload.clientIds = [filters.client];
      if (filters.reason) payload.reasons = [filters.reason];

      const blob = await exportRoleOffsCsv(payload);

      // Download blob
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `role-off-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export successful");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const mx = cx + (outerRadius + 10) * cos;
    const my = cy + (outerRadius + 10) * sin;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={-4} textAnchor="middle" fill="#081534" className="text-[13px] font-bold">
          {payload.name}
        </text>
        <text x={cx} y={cy} dy={14} textAnchor="middle" fill="#64748b" className="text-[10px] font-medium">
          {value} Events
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          className="transition-all duration-300"
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 4}
          outerRadius={outerRadius + 6}
          fill={fill}
          className="transition-all duration-300 opacity-20"
        />
      </g>
    );
  };

  const formatReasonData = (breakdown) => {
    if (!breakdown) return [];
    return Object.keys(breakdown).map(key => ({
      name: key,
      value: breakdown[key]
    }));
  };

  const getProjectData = (events) => {
    if (!events) return [];
    const projCount = {};
    events.forEach(e => {
      const p = e.projectName || 'Unknown';
      projCount[p] = (projCount[p] || 0) + 1;
    });
    return Object.keys(projCount).map(k => ({
      name: k,
      value: projCount[k]
    })).sort((a,b) => b.value - a.value).slice(0, 10);
  };

  const getTrendData = (events, startDateStr, endDateStr, mode = 'month') => {
    const start = startDateStr ? new Date(startDateStr) : new Date(new Date().setMonth(new Date().getMonth() - 11));
    const end = endDateStr ? new Date(endDateStr) : new Date();
    
    // Normalize start/end for comparison
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const dataPoints = [];
    let current = new Date(s);
    
    if (mode === 'month') {
      current = new Date(current.getFullYear(), current.getMonth(), 1);
      const endLimit = new Date(e.getFullYear(), e.getMonth(), 1);
      let safeGuard = 0;
      while(current <= endLimit && safeGuard < 60) {
        const monthStr = current.toLocaleString('en-US', { month: 'short' });
        const yearStr = current.getFullYear().toString().slice(-2);
        dataPoints.push({
          name: `${monthStr} ${yearStr}`,
          events: 0
        });
        current.setMonth(current.getMonth() + 1);
        safeGuard++;
      }
    } else {
      // Day mode
      let safeGuard = 0;
      while(current <= e && safeGuard < 120) { // Max 4 months of daily data
        const dayStr = current.toLocaleString('en-US', { month: 'short', day: 'numeric' });
        dataPoints.push({
          name: dayStr,
          events: 0
        });
        current.setDate(current.getDate() + 1);
        safeGuard++;
      }
    }
    
    if (events) {
      events.forEach(ev => {
        if (!ev.effectiveRoleOffDate) return;
        const evDate = new Date(ev.effectiveRoleOffDate);
        let key = "";
        if (mode === 'month') {
          key = `${evDate.toLocaleString('en-US', { month: 'short' })} ${evDate.getFullYear().toString().slice(-2)}`;
        } else {
          key = evDate.toLocaleString('en-US', { month: 'short', day: 'numeric' });
        }
        
        const found = dataPoints.find(dp => dp.name === key);
        if (found) {
          found.events += 1;
        }
      });
    }
    
    return dataPoints;
  };

  const pieData = formatReasonData(data.reasonBreakdown);
  const barData = getProjectData(data.filteredEvents);
  const trendData = getTrendData(data.filteredEvents, filters.startDate, filters.endDate, trendMode);

  // Calculate distinct projects affected
  const projectsAffected = barData.length;
  
  const getEntityName = (alert) => {
    if (alert.affectedProjects && alert.affectedProjects.length > 0) {
      return alert.affectedProjects.join(", ");
    }
    if (alert.affectedResources && alert.affectedResources.length > 0) {
      return alert.affectedResources.join(", ");
    }
    return null;
  };

  const displayedEvents = data.filteredEvents || [];

  const activeFilterCount = [
    filters.project !== "",
    filters.client !== "",
    filters.reason !== ""
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/resource-management/roleoff')}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm shrink-0"
            title="Back to Role-Off Operations"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Role-Off Reporting Dashboard</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">Strategic tracking and predictive analysis of resource role-off events</p>
          </div>
        </div>
        <div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[12px] font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? 'Exporting...' : 'EXPORT ANALYTICS'}
          </button>
        </div>
      </div>

      {/* KPI Cards - Compact version */}
      <div className="flex flex-nowrap gap-3 overflow-x-auto mb-4 pb-1">
        {/* Total Role-Offs */}
        <div className="flex min-w-[200px] flex-1 items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:border-slate-200">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 shadow-sm text-blue-700">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Total</p>
            <p className="text-xl font-extrabold tracking-tight text-slate-900">{data.totalRoleOffs || 0}</p>
          </div>
        </div>

        {/* High Risk Patterns */}
        <div className="flex min-w-[200px] flex-1 items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:border-slate-200">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-sm ${
            data.hasHighRiskPatterns 
              ? 'border-rose-100 bg-rose-50 text-rose-700' 
              : 'border-slate-100 bg-slate-50 text-slate-400'
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Risk Alerts</p>
            <p className={`text-xl font-extrabold tracking-tight ${data.hasHighRiskPatterns ? 'text-rose-700' : 'text-slate-900'}`}>
              {data.riskAlerts?.length || 0}
            </p>
          </div>
        </div>

        {/* Projects Affected */}
        <div className="flex min-w-[200px] flex-1 items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:border-slate-200">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 shadow-sm text-amber-700">
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Projects</p>
            <p className="text-xl font-extrabold tracking-tight text-slate-900">{projectsAffected}</p>
          </div>
        </div>

        {/* Risk Score */}
        <div className="flex min-w-[200px] flex-1 items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:border-slate-200">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-sm ${
            (data.riskMetrics?.riskLevel === 'HIGH' || data.riskMetrics?.riskLevel === 'CRITICAL') 
              ? 'border-rose-100 bg-rose-50 text-rose-700' 
              : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}>
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Risk Score</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">{data.riskMetrics?.riskScore || 0}</span>
              <span className="text-[10px] font-medium text-slate-400">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation & Filters toggle */}
      <div className="mb-4 border-b border-slate-200 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-end gap-8 overflow-x-auto px-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'risk', label: 'Risk Analysis' },
              { id: 'events', label: 'Event Log' }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative inline-flex items-center gap-2 whitespace-nowrap pb-3 pt-2 text-left transition-colors ${
                    isActive ? "text-[#081534]" : "text-slate-500 hover:text-[#081534]"
                  }`}
                >
                  <span className={`text-sm font-semibold tracking-tight ${isActive ? "text-[#081534]" : "text-slate-600"}`}>
                    {tab.label}
                  </span>
                  <span
                    className={`absolute bottom-0 left-0 h-0.5 rounded-full bg-[#081534] transition-all ${
                      isActive ? "w-full opacity-100" : "w-0 opacity-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <button
            ref={filterButtonRef}
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all mb-2 shadow-sm ${
              showFilters 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/10' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className={`h-3.5 w-3.5 ${showFilters ? 'fill-current' : ''}`} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Filters</span>
            {activeFilterCount > 0 && (
              <span className={`ml-1 px-1.5 rounded-sm text-[10px] font-bold ${showFilters ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Popup - Portal based */}
        {showFilters && dropdownPos && createPortal(
          <div 
            id="roleoff-filter-portal"
            className={`fixed bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] w-[calc(100vw-3rem)] sm:w-[400px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
              dropdownPos.align === 'up' ? "origin-bottom-right" : "origin-top-right"
            }`}
            style={{
              top: dropdownPos.top === 'auto' ? 'auto' : `${dropdownPos.top}px`,
              bottom: dropdownPos.bottom === 'auto' ? 'auto' : `${dropdownPos.bottom}px`,
              right: dropdownPos.right !== undefined ? `${dropdownPos.right}px` : 'auto',
              left: dropdownPos.left !== undefined ? `${dropdownPos.left}px` : 'auto',
              maxHeight: `${dropdownPos.maxHeight}px`,
            }}
          >
            {/* Popup Header */}
            <div className="shrink-0 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-indigo-500" />
                <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-widest leading-none mt-0.5">Report Analysis Filters</h3>
              </div>
              <button onClick={() => setShowFilters(false)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Popup Body - Scrollable */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Period Start</label>
                  <input
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                    className="w-full text-[11px] font-semibold border-slate-200 rounded-lg h-9 bg-slate-50/50 focus:ring-indigo-600 shadow-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Period End</label>
                  <input
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                    className="w-full text-[11px] font-semibold border-slate-200 rounded-lg h-9 bg-slate-50/50 focus:ring-indigo-600 shadow-sm transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Target Project</label>
                  <select 
                    name="project" 
                    value={filters.project} 
                    onChange={handleFilterChange} 
                    className="w-full text-[11px] font-semibold border-slate-200 rounded-lg h-9 bg-slate-50/50 focus:ring-indigo-600 shadow-sm transition-all"
                  >
                    <option value="">All Projects</option>
                    {projectsList.map((proj) => (
                      <option key={proj.pmsProjectId || proj.id} value={proj.pmsProjectId || proj.id}>{proj.projectName || proj.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Client Account</label>
                  <select 
                    name="client" 
                    value={filters.client} 
                    onChange={handleFilterChange} 
                    className="w-full text-[11px] font-semibold border-slate-200 rounded-lg h-9 bg-slate-50/50 focus:ring-indigo-600 shadow-sm transition-all"
                  >
                    <option value="">All Clients</option>
                    {clientsList.map((c) => (
                      <option key={c.clientId || c.id} value={c.clientId || c.id}>{c.clientName || c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2 space-y-1.5 pt-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Primary Role-Off Reason</label>
                  <select 
                    name="reason" 
                    value={filters.reason} 
                    onChange={handleFilterChange} 
                    className="w-full text-[11px] font-semibold border-slate-200 rounded-lg h-10 bg-slate-50/50 focus:ring-indigo-600 shadow-sm transition-all"
                  >
                    <option value="">All Reasons</option>
                    <option value="PROJECT_END">Project End</option>
                    <option value="PERFORMANCE">Performance Issues</option>
                    <option value="CLIENT_REQUEST">Specific Client Request</option>
                    <option value="ATTRITION">Attrition / Resignation</option>
                    <option value="INTERNAL_TRANSFER">Internal Movement</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Popup Footer - Sticky Action bar */}
            <div className="shrink-0 p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button 
                type="button"
                onClick={() => {
                  setFilters({ ...defaultDates, project: "", client: "", reason: "" });
                }}
                className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-lg text-[11px] font-bold hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-[0.98] shadow-sm"
              >
                Clear All
              </button>
              <div className="flex-[2] flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="flex-[1.5] bg-indigo-600 text-white py-2 rounded-lg text-[11px] font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col items-center hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
              <div className="flex items-center justify-between w-full mb-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Role-Off Reasons</h3>
                <Activity size={12} className="text-indigo-400" />
              </div>
              
              <div className="h-44 w-full">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={62}
                        paddingAngle={4}
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                        animationBegin={0}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-white stroke-2 focus:outline-none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-medium italic">No events recorded</div>
                )}
              </div>
              
              <div className="w-full mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-50 pt-3">
                {pieData.slice(0, 4).map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 overflow-hidden">
                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[9px] font-bold text-slate-600 truncate uppercase tracking-tighter w-full">
                      {entry.name}: <span className="text-slate-900 ml-0.5">{entry.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
              <div className="flex items-center justify-between w-full mb-6">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Role-Off Trend</h3>
                  <p className="text-[9px] font-medium text-slate-400 italic">Timeline trajectory of resource movements</p>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-inner">
                  <button 
                    onClick={() => setTrendMode('month')}
                    className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${trendMode === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    MONTHLY
                  </button>
                  <button 
                    onClick={() => setTrendMode('day')}
                    className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${trendMode === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    DAILY
                  </button>
                </div>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        fontSize: '11px',
                        fontWeight: '600'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="events" 
                      stroke="#4f46e5" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-[10px] font-bold text-[#081534] mb-4 uppercase tracking-widest opacity-60">Top Projects by Role-Offs</h3>
            <div className="h-52 w-full">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-[10px]">No data available</div>
              )}
            </div>
          </div>

          {data.riskAlerts && data.riskAlerts.length > 0 && (
            <div className="rounded-xl bg-red-50/50 border border-red-100 p-4 shadow-sm">
              <h3 className="text-[10px] font-bold text-red-800 flex items-center gap-2 mb-4 uppercase tracking-wider opacity-80">
                <AlertTriangle className="h-3 w-3" /> Systemic Risk Alerts Detected
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.riskAlerts.map((alert, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-red-600 text-[11px] uppercase tracking-tighter">
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold uppercase">{alert.severity}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2">
                       {getEntityName(alert) && <span className="font-bold text-gray-800">{getEntityName(alert)} - </span>}
                       {alert.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="rounded-xl border border-slate-100 bg-white p-0 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <h3 className="text-[10px] font-bold text-[#081534] uppercase tracking-widest opacity-60">Event History</h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{displayedEvents.length} Totals</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 whitespace-nowrap">Resource</th>
                  <th className="px-5 py-3 whitespace-nowrap">Project</th>
                  <th className="px-5 py-3 whitespace-nowrap">Performance</th>
                  <th className="px-5 py-3 whitespace-nowrap">Reason</th>
                  <th className="px-5 py-3 whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan="6" className="p-10 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#081534]"></div>
                      <span>Syncing...</span>
                    </div>
                  </td></tr>
                ) : displayedEvents.length === 0 ? (
                  <tr><td colSpan="6" className="p-10 text-center text-slate-500">No events matched.</td></tr>
                ) : (
                  displayedEvents.slice(0, 15).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 bg-white transition-colors">
                      <td className="px-5 py-2.5 whitespace-nowrap text-slate-500">
                        {row.effectiveRoleOffDate ? new Date(row.effectiveRoleOffDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-5 py-2.5 whitespace-nowrap font-bold text-[#081534]">
                        {row.resourceName || '-'}
                      </td>
                      <td className="px-5 py-2.5 whitespace-nowrap text-slate-600">
                        {row.projectName || '-'}
                      </td>
                      <td className="px-5 py-2.5 whitespace-nowrap font-medium">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          !row.resourcePerformance ? 'bg-slate-50 text-slate-400' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          {row.resourcePerformance || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold">
                          {row.roleOffReason?.replace(/_/g, ' ') || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 whitespace-nowrap text-right font-medium">
                        <button
                          onClick={() => setSelectedEvent(row)}
                          className="text-[#081534] bg-slate-100 px-3 py-1 rounded-md text-[10px] font-bold hover:bg-[#081534] hover:text-white transition-all"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role-Off Details Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Role-Off Details"
        className="max-w-md"
      >
        {selectedEvent && (() => {
          const getEventRiskLevel = (reason) => {
            switch(reason) {
              case 'PERFORMANCE': return { label: 'High Risk', class: 'bg-red-50 text-red-600 border-red-200' };
              case 'CLIENT_REQUEST': return { label: 'High Risk', class: 'bg-orange-50 text-orange-600 border-orange-200' };
              case 'ATTRITION': return { label: 'Medium Risk', class: 'bg-amber-50 text-amber-600 border-amber-200' };
              case 'PROJECT_END': return { label: 'Low Risk', class: 'bg-green-50 text-green-600 border-green-200' };
              default: return { label: 'Normal', class: 'bg-gray-50 text-gray-600 border-gray-200' };
            }
          };
          const risk = getEventRiskLevel(selectedEvent.roleOffReason);

          return (
          <div className="space-y-5 px-1 py-2">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.resourceName || 'Unknown Resource'}</h2>
                {/* <p className="text-gray-500 mt-1">{selectedEvent.clientName ? `Client: ${selectedEvent.clientName}` : 'Client: -'}</p> */}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${risk.class}`}>
                {risk.label}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Related Project</span>
                <span className="text-sm text-gray-900 font-semibold text-right flex items-center">
                  {selectedEvent.projectName || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 font-medium">Reason</span>
                <span className="text-sm text-gray-900 font-semibold">{selectedEvent.roleOffReason ? selectedEvent.roleOffReason.replace(/_/g, ' ') : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 font-medium">Date</span>
                <span className="text-sm text-gray-900 font-semibold">
                  {selectedEvent.effectiveRoleOffDate ? new Date(selectedEvent.effectiveRoleOffDate).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 font-medium">Initiated By</span>
                <span className="text-sm text-gray-900 font-semibold">
                  {selectedEvent.roleInitiatedBy || '-'}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-2">
              <button 
                onClick={() => setSelectedEvent(null)} 
                className="w-full bg-[#18181b] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-black transition-colors"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
          );
        })()}
      </Modal>

    </div>
  );
};

export default RoleOffDashboard;
