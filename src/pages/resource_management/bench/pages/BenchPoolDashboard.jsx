import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Sector
} from 'recharts';
import { 
  ArrowLeft, Download, Filter, TrendingUp, AlertCircle, 
  Clock, Users, ShieldAlert, Zap, Loader2, Activity, List, LayoutDashboard, Search, X
} from "lucide-react";
import { getBenchPoolReport, exportBenchPoolReport } from "../services/benchService";
import { toast } from "react-toastify";
import BenchFilters from "../components/BenchFilters";
import { FILTER_DEFAULTS, CATEGORY_OPTIONS } from "../constants/benchConstants";

const COLORS = ['#4f46e5', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4'];
const RISK_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444'
};

const BenchPoolDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filtering States
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [draftFilters, setDraftFilters] = useState(FILTER_DEFAULTS);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState(null);
  const filterButtonRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    fetchReportData();
  }, []);

  const updatePosition = () => {
    if (filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const popupHeight = 450;

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let align = 'down';
      if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
        align = 'up';
      }

      setDropdownPos({
        top: align === 'up' ? 'auto' : (rect.bottom + 8),
        bottom: align === 'up' ? (viewportHeight - rect.top + 8) : 'auto',
        right: viewportWidth - rect.right,
        align,
        maxHeight: Math.min(viewportHeight * 0.85, align === 'up' ? spaceAbove - 24 : spaceBelow - 24)
      });
    }
  };

  useEffect(() => {
    if (filterPanelOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      const handleClickOutside = (event) => {
        if (filterButtonRef.current && !filterButtonRef.current.contains(event.target)) {
          const portal = document.getElementById('bench-filter-portal');
          if (portal && !portal.contains(event.target)) {
            setFilterPanelOpen(false);
          }
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [filterPanelOpen]);

  const toggleFilters = () => {
    setFilterPanelOpen(!filterPanelOpen);
    if (!filterPanelOpen) {
      setDraftFilters(filters);
    }
  };

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const res = await getBenchPoolReport();
      setData(res?.data || {});
    } catch (err) {
      toast.error("Failed to fetch bench report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportBenchPoolReport();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bench-audit-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export successful");
    } catch (err) {
      toast.error("Failed to generate export");
    } finally {
      setIsExporting(false);
    }
  };

  const content = useMemo(() => data?.content || [], [data]);

  const filteredContent = useMemo(() => {
    return content.filter(resource => {
      if (filters.category) {
        const cat = String(resource.category || resource.subState || "").toLowerCase();
        if (cat !== String(filters.category).toLowerCase()) return false;
      }
      if (filters.location) {
        const loc = String(resource.region || resource.location || "").toLowerCase();
        if (loc !== String(filters.location).toLowerCase()) return false;
      }
      if (filters.availability) {
        const availability = Number(resource.availability || 0);
        if (filters.availability === "0-25" && !(availability <= 25)) return false;
        if (filters.availability === "26-50" && !(availability >= 26 && availability <= 50)) return false;
        if (filters.availability === "51-75" && !(availability >= 51 && availability <= 75)) return false;
        if (filters.availability === "76-100" && !(availability >= 76)) return false;
      }
      if (filters.experience) {
        const experience = Number(resource.experience || 0);
        if (filters.experience === "0-3" && !(experience <= 3)) return false;
        if (filters.experience === "4-7" && !(experience >= 4 && experience <= 7)) return false;
        if (filters.experience === "8-12" && !(experience >= 8 && experience <= 12)) return false;
        if (filters.experience === "13+" && !(experience >= 13)) return false;
      }
      if (filters.aging) {
        const agingDays = Number(resource.benchDays || 0);
        if (filters.aging === "0-15" && !(agingDays <= 15)) return false;
        if (filters.aging === "16-30" && !(agingDays >= 16 && agingDays <= 30)) return false;
        if (filters.aging === "31+" && !(agingDays >= 31)) return false;
      }
      if (filters.cost) {
        const cost = Number(resource.cost || resource.costPerDay || 0);
        if (filters.cost === "0-1500" && !(cost <= 1500)) return false;
        if (filters.cost === "1501-3000" && !(cost >= 1501 && cost <= 3000)) return false;
        if (filters.cost === "3001+" && !(cost >= 3001)) return false;
      }
      return true;
    });
  }, [content, filters]);
  
  const filterOptions = useMemo(() => ({
    categories: CATEGORY_OPTIONS,
    locations: Array.from(new Set(content.map(r => r.region || r.location).filter(Boolean))).sort()
  }), [content]);

  // Calculations
  const totalCost = useMemo(() => filteredContent.reduce((acc, curr) => acc + ((curr.cost || 0) * (curr.benchDays || 0)), 0), [filteredContent]);
  const avgBenchDays = useMemo(() => filteredContent.length > 0 ? (filteredContent.reduce((acc, curr) => acc + (curr.benchDays || 0), 0) / filteredContent.length).toFixed(1) : 0, [filteredContent]);
  const highRiskCount = useMemo(() => filteredContent.filter(r => r.riskLevel === 'HIGH').length, [filteredContent]);
  
  // Composition Data (Categories)
  const categoryGroups = useMemo(() => filteredContent.reduce((acc, curr) => {
    const cat = curr.category || curr.status || "Unknown";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {}), [filteredContent]);
  const categoryChartData = useMemo(() => Object.keys(categoryGroups).map(key => ({ name: key, value: categoryGroups[key] })), [categoryGroups]);

  const riskGroups = useMemo(() => filteredContent.reduce((acc, curr) => {
    acc[curr.riskLevel] = (acc[curr.riskLevel] || 0) + 1;
    return acc;
  }, {}), [filteredContent]);
  const riskChartData = useMemo(() => Object.keys(riskGroups).map(key => ({ name: key, value: riskGroups[key] })), [riskGroups]);

  const skillsChartData = useMemo(() => {
    const counts = content.reduce((acc, curr) => {
      (curr.skills || []).forEach(skill => {
        const normalized = skill.split(' (')[0];
        acc[normalized] = (acc[normalized] || 0) + 1;
      });
      return acc;
    }, {});
    return Object.keys(counts).map(name => ({ name, count: counts[name] })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [content]);

  const costChartData = useMemo(() => [...filteredContent]
    .sort((a, b) => ((b.cost || 0) * (b.benchDays || 0)) - ((a.cost || 0) * (a.benchDays || 0)))
    .slice(0, 10)
    .map(r => ({ name: r.name.split(' ')[0], value: Math.round((r.cost || 0) * (r.benchDays || 0)) })), [filteredContent]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-400 italic">Formatting Bench Analysis...</p>
      </div>
    );
  }

  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    return (
      <g>
        <text x={cx} y={cy} dy={-4} textAnchor="middle" fill="#0f172a" className="text-[13px] font-bold">{payload.name}</text>
        <text x={cx} y={cy} dy={14} textAnchor="middle" fill="#64748b" className="text-[10px] font-medium">{value} Resources</text>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 4} outerRadius={outerRadius + 6} fill={fill} className="opacity-20" />
      </g>
    );
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      {/* Header Area - Match Role-Off Dashboard Title Style */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/resource-management/bench')}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Bench Intelligence Hub</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium tracking-normal">Real-time cost & risk analytics for active bench resources</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-[12px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-all uppercase tracking-wider disabled:opacity-70"
          >
            <Download size={14} className="text-indigo-600" />
            {isExporting ? 'Exporting...' : 'Export Audit'}
          </button>
          
          <div className="relative">
            <button 
              ref={filterButtonRef}
              onClick={toggleFilters}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shadow-sm ${
                filterPanelOpen || activeFilterCount > 0
                  ? "bg-indigo-600 text-white border-indigo-600" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Filter size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Filters</span>
              {activeFilterCount > 0 && (
                <span className={`ml-1 px-1.5 rounded-sm text-[10px] font-bold ${filterPanelOpen ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterPanelOpen && dropdownPos && createPortal(
              <div
                id="bench-filter-portal"
                className={`fixed bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] w-[calc(100vw-3rem)] sm:w-[400px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
                  dropdownPos.align === 'up' ? "origin-bottom-right" : "origin-top-right"
                }`}
                style={{
                  top: dropdownPos.top === 'auto' ? 'auto' : `${dropdownPos.top}px`,
                  bottom: dropdownPos.bottom === 'auto' ? 'auto' : `${dropdownPos.bottom}px`,
                  right: `${dropdownPos.right}px`,
                  maxHeight: `${dropdownPos.maxHeight}px`,
                }}
              >
                <div className="shrink-0 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-indigo-500" />
                    <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-widest leading-none mt-0.5">Bench Analysis Filters</h3>
                  </div>
                  <button onClick={() => setFilterPanelOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-5">
                   <BenchFilters
                    open={filterPanelOpen}
                    filters={draftFilters}
                    filterOptions={filterOptions}
                    onChange={(key, value) => setDraftFilters((prev) => ({ ...prev, [key]: value }))}
                    onReset={() => {
                        setDraftFilters(FILTER_DEFAULTS);
                        setFilters(FILTER_DEFAULTS);
                        setFilterPanelOpen(false);
                    }}
                    onApply={() => {
                        setFilters(draftFilters);
                        setFilterPanelOpen(false);
                    }}
                    onClose={() => setFilterPanelOpen(false)}
                    isDashboardPortal={true}
                    />
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards - Match Role-Off Style */}
      <div className="flex flex-nowrap gap-3 overflow-x-auto mb-4 pb-1">
        <KPICard title="Total Bench" value={filteredContent.length} icon={<Users />} trend="Actual" subText="Resources on Bench" color="text-blue-700" bgColor="bg-blue-50" borderColor="border-blue-100" />
        <KPICard title="Accumulated Cost" value={`₹${Math.round(totalCost).toLocaleString()}`} icon={<TrendingUp />} trend="Exposure" subText="Financial Impact" color="text-rose-700" bgColor="bg-rose-50" borderColor="border-rose-100" />
        <KPICard title="Aging Avg" value={`${avgBenchDays}d`} icon={<Clock />} trend="Velocity" subText="Days on Bench" color="text-amber-700" bgColor="bg-amber-50" borderColor="border-amber-100" />
        <KPICard title="Risk Alerts" value={highRiskCount} icon={<ShieldAlert />} trend={highRiskCount > 0 ? "Alert" : "Stable"} subText="Action Required" color={highRiskCount > 0 ? "text-rose-700" : "text-emerald-700"} bgColor={highRiskCount > 0 ? "bg-rose-50" : "bg-emerald-50"} borderColor={highRiskCount > 0 ? "border-rose-100" : "border-emerald-100"} />
      </div>

      {/* Tabs - Match Role-Off Navigation Style */}
      <div className="mb-4 border-b border-slate-200">
        <div className="flex items-end gap-8 overflow-x-auto px-1">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'risk', label: 'Risk Analysis' },
            { id: 'log', label: 'Event Log' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative inline-flex items-center gap-2 whitespace-nowrap pb-3 pt-2 text-left transition-colors ${
                  isActive ? "text-[#081534]" : "text-slate-500 hover:text-[#081534]"
                }`}
              >
                <span className={`text-sm font-semibold tracking-tight ${isActive ? "text-[#081534]" : "text-slate-600"}`}>
                  {tab.label}
                </span>
                <span className={`absolute bottom-0 left-0 h-0.5 rounded-full bg-[#081534] transition-all ${isActive ? "w-full opacity-100" : "w-0 opacity-0"}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade duration-300">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
               {/* Resource Composition */}
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col items-center hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                <div className="flex items-center justify-between w-full mb-2">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Bench Composition</h3>
                  <Activity size={12} className="text-indigo-400" />
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={categoryChartData}
                        cx="50%" cy="50%"
                        innerRadius={50}
                        outerRadius={62}
                        paddingAngle={4}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                      >
                         {categoryChartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-white stroke-2 focus:outline-none" />
                         ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-50 pt-3">
                    {categoryChartData.slice(0, 4).map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2 overflow-hidden">
                        <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[9px] font-bold text-slate-600 truncate uppercase tracking-tighter w-full">
                          {entry.name}: <span className="text-slate-900 ml-0.5">{entry.value}</span>
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Skill Saturation */}
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2 flex flex-col group overflow-hidden">
                <div className="flex items-center justify-between w-full mb-6 relative">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Capability Saturation</h3>
                    <p className="text-[9px] font-medium text-slate-400 italic">Distribution across top technical skillsets</p>
                  </div>
                  <Zap size={14} className="text-amber-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {skillsChartData.map((skill) => (
                      <div key={skill.name} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                              <span className="uppercase tracking-tight truncate">{skill.name}</span>
                              <span className="text-slate-400 text-[10px]">{skill.count} Resources</span>
                          </div>
                          <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(skill.count / content.length) * 100}%` }} />
                          </div>
                      </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
               <h3 className="text-[10px] font-bold text-[#081534] mb-4 uppercase tracking-widest opacity-60">Bench Cost Impact per Resource</h3>
               <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                      <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                      <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="rounded-xl bg-orange-50/50 border border-orange-100 p-4 shadow-sm flex items-center gap-4">
               <div className="h-10 w-10 shrink-0 bg-white border border-orange-100 rounded-lg flex items-center justify-center text-orange-600 shadow-sm">
                  <ShieldAlert size={20} />
               </div>
               <div>
                  <p className="text-[11px] font-bold text-orange-800 uppercase tracking-widest">Active High Risk Units: {highRiskCount}</p>
                  <p className="text-[10px] font-medium text-orange-600 italic">Identified resources requiring immediate focus for allocation or upskilling.</p>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest leading-none">Bench Inventory Summary</h3>
              <span className="text-[10px] font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-full text-slate-600">{filteredContent.length} UNITS</span>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead>
                   <tr className="bg-slate-50/30 border-b border-slate-50">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Resource / Expertise</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Aging Period</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Risk Profile</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Action Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContent.map((row) => (
                    <tr key={row.resourceId} className="hover:bg-slate-50/40 transition-colors group cursor-pointer">
                       <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{row.name}</span>
                          <span className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">{row.role} | {row.region}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`text-[12px] font-bold ${row.benchDays > 30 ? 'text-rose-600' : 'text-slate-900'}`}>{row.benchDays} Days</span>
                          <span className="text-[9px] font-medium text-slate-400 italic">Impact: ₹{Math.round((row.cost || 0) * (row.benchDays || 0)).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-[9px] font-bold uppercase tracking-tighter ${
                          row.riskLevel === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                          row.riskLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                          'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {row.riskLevel} Level
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-medium text-slate-600 italic border-l-2 border-indigo-200 pl-2">
                           {row.recommendedAction || "Monitor allocation status"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, trend, subText, color, bgColor, borderColor }) => (
  <div className={`flex min-w-[200px] flex-1 items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:border-slate-200`}>
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${bgColor} ${color} ${borderColor} shadow-sm`}>
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <div className="min-w-0">
      <p className="mb-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">{title}</p>
      <p className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">{value}</p>
      <div className="flex items-center gap-1 mt-1 opacity-60">
         <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{trend}</span>
      </div>
    </div>
  </div>
);

export default BenchPoolDashboard;
