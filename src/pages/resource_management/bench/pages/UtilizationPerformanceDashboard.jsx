import React, { useState, useMemo } from 'react';
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

// --- INTEGRATED MOCK DATA MODELS FOR ALL 12 STORIES ---

const KPI_STATS = [
  { label: 'Strategic Utilization', value: '86.4%', trend: 'Story 5: +2.1%', icon: <TrendingUpIcon />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Billable Yield', value: '72.1%', trend: 'Story 3', icon: <Award />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Historical Confidence', value: '94%', trend: 'Preserved', icon: <Fingerprint />, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Active Breaches', value: '3 Critical', trend: 'Prioritize', icon: <AlertTriangle />, color: 'text-rose-600', bg: 'bg-rose-50' },
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

const UtilizationPerformanceDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('portfolio');
  const [granularity, setGranularity] = useState('WEEKLY');
  const [OVERALL_CONFIDENCE_SCORE] = useState(94);

  const activeChartData = useMemo(() => {
    return PORTFOLIO_DATA[granularity] || [];
  }, [granularity]);

  return (
    <div className="min-h-screen bg-[#FDFDFE] p-6 font-sans select-none">
      
      {/* Confidence Banner */}
      {OVERALL_CONFIDENCE_SCORE < 100 && (
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
      )}

      {/* Header — Unified Command Strip */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/resource-management/bench')}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">Utilization Intelligence Hub</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 font-medium tracking-normal italic opacity-80 underline decoration-indigo-200 decoration-2 underline-offset-4 font-serif">
               Governed Command Hub — Identifying Directional Trends & Patterns (Story 5)
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg border border-slate-800 shadow-xl shadow-slate-900/10">
             <ShieldCheck size={14} className="text-emerald-400" />
             Readiness Gate: PASSED
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-slate-600 shadow-sm hover:bg-slate-50 transition-all">
            <Download size={14} className="text-indigo-600" />
            Full Audit Export
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="flex flex-nowrap gap-3 overflow-x-auto mb-6 pb-1 no-scrollbar">
        {KPI_STATS.map((stat) => (
          <div key={stat.label} className="min-w-[200px] flex-1 flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm hover:border-indigo-100 transition-all group">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${stat.bg} ${stat.color} shadow-sm border-white transition-transform group-hover:scale-105`}>
              {React.cloneElement(stat.icon, { size: 20 })}
            </div>
            <div className="min-w-0">
              <p className="mb-0.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">{stat.label}</p>
              <p className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">{stat.value}</p>
              <span className={`text-[8px] font-black uppercase tracking-widest ${stat.label === 'Strategic Utilization' ? 'text-indigo-500' : stat.label === 'Billable Yield' ? 'text-indigo-400' : stat.trend === 'Prioritize' ? 'text-rose-500' : 'text-slate-400 opacity-60'}`}>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* STRATEGIC COMMAND TABS */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex items-end gap-10 overflow-x-auto no-scrollbar">
          {[
            { id: 'portfolio', label: 'Portfolio Analytics', icon: <PieIcon size={14} /> },
            { id: 'projects', label: 'Operational Projects', icon: <Monitor size={14} /> },
            { id: 'resource', label: 'Resource Capability', icon: <BrainCircuit size={14} /> },
            { id: 'governance', label: 'Governance & Readiness', icon: <ShieldAlert size={14} /> }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center gap-2 pb-3.5 pt-2 whitespace-nowrap transition-all ${
                  isActive ? "text-[#081534]" : "text-slate-400 hover:text-slate-600"
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
      </div>

      {/* DASHBOARD CONTENT ENGINE */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* TAB 1: STRATEGIC PORTFOLIO (Story 3, 5, 8, 9) */}
        {activeTab === 'portfolio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6 overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col">
                    <h3 className="text-[11px] font-black text-[#081534] uppercase tracking-widest opacity-60">Story 5: Continuous Pattern Discovery</h3>
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
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={activeChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} domain={[0, 100]} />
                      <RechartsTooltip content={<PerformanceTooltip />} />
                      <Area type="monotone" dataKey="util" fill="#EEF2FF" stroke="#4f46e5" strokeWidth={3} name="Utilization %" />
                      <Line type="monotone" dataKey="actual" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" name="Actual Hours" />
                    </ComposedChart>
                  </ResponsiveContainer>
               </div>
               <div className="mt-4 flex items-center justify-center gap-8 border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-2">
                     <History size={12} className="text-indigo-500" />
                     <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Story 5: Trend Preservation Active</span>
                  </div>
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-8">
                     <Scale size={12} className="text-slate-400" />
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Comparing Planned Allocation vs Realized Log</span>
                  </div>
               </div>
            </div>

            {/* STORY 3 — DEDICATED BILLING CLASSIFICATION BREAKDOWN */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col group overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[11px] font-black text-[#081534] uppercase tracking-widest opacity-60">Portfolio Yield Index</h3>
                  <PieChartIcon size={14} className="text-indigo-400" />
                </div>
                <div className="flex-1 h-48 w-full mt-2">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={BILLING_PIE_DATA}
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                         >
                            {BILLING_PIE_DATA.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                         </Pie>
                         <RechartsTooltip />
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-x-0 top-36 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[18px] font-black text-slate-900 leading-none">72%</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Billable</span>
                   </div>
                </div>
                <div className="mt-4 space-y-2">
                   {BILLING_PIE_DATA.map((item) => (
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
                   <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest opacity-70 italic font-serif">Measuring billable yield against planned engagement targets (Story 3)</p>
                </div>
             </div>
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
                     {PROJECT_SQUAD.map((project) => (
                       <tr key={project.id} className="hover:bg-slate-50/40 transition-colors group">
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-none">{project.name}</span>
                                <span className="text-[10px] font-medium text-slate-400 mt-1.5 uppercase tracking-widest italic">{project.client} | {project.id}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <div className="flex items-center justify-center gap-0.5 max-w-[140px] mx-auto overflow-hidden rounded-full h-2 bg-slate-100 border border-slate-200">
                                <div className="h-full bg-indigo-600" style={{ width: `${project.billable}%` }} />
                                <div className="h-full bg-indigo-300" style={{ width: `${project.nonBillable}%` }} />
                                <div className="h-full bg-slate-300" style={{ width: `${project.internal}%` }} />
                             </div>
                             <div className="flex justify-center gap-3 mt-1.5">
                                <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-indigo-600"/><span className="text-[8px] font-black text-slate-400 uppercase">{project.billable}% B</span></div>
                                <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-indigo-300"/><span className="text-[8px] font-black text-slate-400 uppercase">{project.nonBillable}% NB</span></div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className="text-[12px] font-bold text-slate-900">{project.actualHours} / {project.plannedHours}h</span>
                             <div className="h-1 w-12 bg-slate-100 rounded-full mt-2 mx-auto overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${project.util}%` }} />
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex flex-col items-end">
                                <span className={`text-[16px] font-black ${project.health === 'Critical' ? 'text-rose-600' : 'text-slate-900'}`}>{project.util}%</span>
                                <span className={`inline-flex rounded-md border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest mt-1 ${
                                  project.severity === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-100' :
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
          </div>
        )}

        {/* TAB 3: RESOURCE CAPABILITIES (Story 3, 4, 5, 10) */}
        {activeTab === 'resource' && (
           <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-in">
             <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                   <h3 className="text-[11px] font-black text-[#081534] uppercase tracking-widest leading-none">Capability & Performance Ledger</h3>
                   <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest opacity-70 italic font-serif">Deep-dive into individual billable efficiency vs historical directional signals (Story 5)</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 text-white rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                   <ShieldCheck size={12} className="text-emerald-400" /> Source Verified
                </div>
             </div>
             <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left">
                  <thead>
                     <tr className="bg-slate-50/50 border-b border-slate-50">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Resource Registry</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Hourly Split (B / NB / I)</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Trend Signal (Story 5)</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-indigo-600 text-right">Overall Util %</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {RESOURCE_DATABASE.map((res) => (
                       <tr key={res.id} className="hover:bg-slate-50/40 transition-colors group">
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-none">{res.name}</span>
                                <span className="text-[10px] font-medium text-slate-400 mt-1.5 uppercase tracking-widest italic">{res.role}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <div className="flex items-center justify-center gap-3">
                                <div className="flex flex-col items-center"><span className="text-[11px] font-black text-indigo-600">{res.billable}h</span><span className="text-[8px] font-bold text-slate-400 uppercase">Billable</span></div>
                                <div className="h-6 w-px bg-slate-100" />
                                <div className="flex flex-col items-center"><span className="text-[11px] font-black text-slate-600">{res.nonBillable}h</span><span className="text-[8px] font-bold text-slate-400 uppercase">Non-Bill</span></div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {/* STORY 5: Individual Trend Signals */}
                            <div className="flex flex-col items-center gap-0.5">
                               {res.trend === 'up' && <div className="text-emerald-600 flex items-center gap-1 text-[10px] font-black uppercase"><ArrowUpRight size={14}/> Improving</div>}
                               {res.trend === 'down' && <div className="text-rose-600 flex items-center gap-1 text-[10px] font-black uppercase"><ArrowDownRight size={14}/> Declining</div>}
                               {res.trend === 'volatile' && <div className="text-amber-600 flex items-center gap-1 text-[10px] font-black uppercase"><Activity size={14}/> Volatile</div>}
                               {res.trend === 'stable' && <div className="text-indigo-600 flex items-center gap-1 text-[10px] font-black uppercase"><Zap size={14}/> Stable</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex flex-col items-end">
                                <span className="text-[16px] font-black text-slate-900">{res.util}%</span>
                                <div className="h-1 w-12 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                   <div className="h-full bg-indigo-500" style={{ width: `${res.util}%` }} />
                                </div>
                             </div>
                          </td>
                       </tr>
                     ))}
                  </tbody>
                </table>
             </div>
           </div>
        )}

        {/* TAB 4: GOVERNANCE & READINESS */}
        {activeTab === 'governance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center">
                <div className="h-20 w-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 mb-6 shadow-xl shadow-emerald-500/10">
                   <Verified size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Enterprise Readiness Gate</h3>
                <p className="text-[12px] font-medium text-slate-500 italic mt-2 max-w-sm font-serif">Validation of all Ingested (Approved) timesheet actuals against governed calendars and historical trend preservation rules is complete.</p>
                
                <div className="mt-10 grid grid-cols-1 gap-3 w-full">
                    {[
                      { label: 'Trend Preservation (Story 5)', value: 'Historical Integrity Active', status: 'PASS' },
                      { label: 'Ingestion Protocol (Story 1)', value: 'Approved Entries Only', status: 'PASS' },
                      { label: 'Confidence Mask (Story 11)', value: 'Threshold > 90% Complete', status: 'PASS' },
                    ].map((gate) => (
                      <div key={gate.label} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between">
                         <div className="flex flex-col text-left">
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight leading-none">{gate.label}</span>
                            <span className="text-[10px] font-medium text-slate-400 mt-2">{gate.value}</span>
                         </div>
                         <div className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 size={16} />
                            <span className="text-[10px] font-black">{gate.status}</span>
                         </div>
                      </div>
                    ))}
                </div>
             </div>

             <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-[11px] font-black text-[#081534] uppercase tracking-widest opacity-60">Threshold Intelligence</h3>
                   <Lock size={14} className="text-indigo-400" />
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-4 relative overflow-hidden">
                   <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2 block">Enterprise Standard Logic</span>
                   <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">Utilization is derived strictly from: (Total Actuals / Allocated Capacity) - Exclusions. Trend signals are calculated using 6-week rolling rolling averages.</p>
                </div>
                <div className="space-y-4 flex-1">
                   {ALERT_INTELLIGENCE.map((alert) => (
                     <div key={alert.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl relative hover:border-rose-100 transition-colors cursor-pointer group">
                        <h5 className="text-[12px] font-bold text-slate-900 uppercase tracking-tight pr-12 leading-none">{alert.scope}</h5>
                        <p className="text-[11px] font-medium text-slate-500 mt-2 leading-relaxed">{alert.message}</p>
                        <div className="mt-4 flex items-center justify-between border-t border-white/50 pt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <span>{alert.stakeholder}</span>
                           <span className="text-indigo-600">Story 7 Alert</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PerformanceTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
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
        </div>
      </div>
    );
  }
  return null;
};

export default UtilizationPerformanceDashboard;
