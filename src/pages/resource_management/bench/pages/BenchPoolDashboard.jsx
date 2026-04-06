import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  ArrowLeft, Download, Filter, TrendingUp, AlertCircle, 
  DollarSign, Clock, Users, ShieldAlert, Zap, Loader2 
} from "lucide-react";
import { getBenchPoolReport, exportBenchPoolReport } from "../services/benchService";
import { toast } from "react-toastify";

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

  useEffect(() => {
    fetchReportData();
  }, []);

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
      toast.success("Benchmark audit exported successfully");
    } catch (err) {
      toast.error("Failed to generate export");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400 italic">Synthesizing Analytics...</p>
      </div>
    );
  }

  const content = data?.content || [];
  
  // Calculations
  const totalCost = content.reduce((acc, curr) => acc + (curr.cost || 0), 0);
  const avgBenchDays = content.length > 0 ? (content.reduce((acc, curr) => acc + (curr.benchDays || 0), 0) / content.length).toFixed(1) : 0;
  const highRiskCount = content.filter(r => r.riskLevel === 'HIGH').length;
  
  // Risk Distribution Data
  const riskGroups = content.reduce((acc, curr) => {
    acc[curr.riskLevel] = (acc[curr.riskLevel] || 0) + 1;
    return acc;
  }, {});
  const riskChartData = Object.keys(riskGroups).map(key => ({ name: key, value: riskGroups[key] }));

  // Skills Distribution Data
  const skillCounts = content.reduce((acc, curr) => {
    (curr.skills || []).forEach(skill => {
      acc[skill] = (acc[skill] || 0) + 1;
    });
    return acc;
  }, {});
  const skillsChartData = Object.keys(skillCounts)
    .map(name => ({ name, count: skillCounts[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top Cost Resources
  const costChartData = [...content]
    .sort((a, b) => (b.cost || 0) - (a.cost || 0))
    .slice(0, 8)
    .map(r => ({ name: r.name.split(' ')[0], cost: Math.round(r.cost) }));

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 font-sans">
      {/* Header Area */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate('/resource-management/bench')}
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:bg-slate-50 hover:border-indigo-200"
          >
            <ArrowLeft className="h-5 w-5 text-slate-500 transition-colors group-hover:text-indigo-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Bench Intelligence Hub</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 opacity-80 mt-0.5 italic">Real-time cost & risk analytics for bench resources</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-[11px] font-black tracking-widest text-slate-600 hover:bg-slate-50 uppercase transition-all shadow-sm disabled:opacity-70"
          >
            <Download className="h-3.5 w-3.5 text-indigo-600" />
            {isExporting ? 'Generating...' : 'Export Audit'}
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[11px] font-black tracking-widest text-white hover:bg-indigo-700 uppercase transition-all shadow-md shadow-indigo-600/20">
            <Filter className="h-3.5 w-3.5" />
            Advanced Filtering
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Bench Intensity" value={content.length} icon={<Users />} trend="+2% vs LW" subText="Active Resources" color="text-indigo-600" bgColor="bg-indigo-50" />
        <KPICard title="Financial Exposure" value={`₹${Math.round(totalCost).toLocaleString()}`} icon={<DollarSign />} trend="Strategic" subText="Accumulated Cost" color="text-rose-600" bgColor="bg-rose-50" />
        <KPICard title="Allocation Velocity" value={`${avgBenchDays}d`} icon={<Clock />} trend="Critical" subText="Avg. Aging Period" color="text-amber-600" bgColor="bg-amber-50" />
        <KPICard title="Risk Perimeter" value={highRiskCount} icon={<ShieldAlert />} trend={highRiskCount > 0 ? "Alert" : "Secure"} subText="High Risk Events" color={highRiskCount > 0 ? "text-rose-700" : "text-emerald-700"} bgColor={highRiskCount > 0 ? "bg-rose-50" : "bg-emerald-50"} />
      </div>

      {/* Analytics Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Risk Distribution */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">Risk Profile Distribution</h3>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskChartData}
                  cx="50%" cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Costs */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">Bench Cost Impact per Resource (Top 8)</h3>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} />
                <RechartsTooltip cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="cost" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Skill Analytics & Table Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 border border-slate-100 bg-white rounded-2xl p-6 shadow-sm overflow-hidden">
          <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Skills Saturation</h3>
          <div className="space-y-4">
            {skillsChartData.map((skill, idx) => (
                <div key={skill.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tight text-slate-600">
                        <span>{skill.name}</span>
                        <span className="text-slate-400">{skill.count} Resources</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${(skill.count / content.length) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
          </div>
        </div>

        {/* Extensive Event Log */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">Inventory Status Summary</h3>
            <span className="text-[10px] font-black bg-white border border-slate-200 px-2.5 py-1 rounded-full text-slate-600 tracking-widest">{content.length} UNITS</span>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30 border-b border-slate-50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Lead Consultant</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Aging</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Resource Level</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Matched Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {content.map((row) => (
                  <tr key={row.resourceId} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{row.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{row.role} | {row.region}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-[12px] font-black ${row.benchDays > 30 ? 'text-rose-600' : 'text-slate-900'}`}>{row.benchDays} Days</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Impact: ₹{Math.round(row.cost).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-md border px-2.5 py-1 text-[9px] font-black uppercase tracking-tighter ${
                        row.riskLevel === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                        row.riskLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {row.riskLevel} Risk
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-slate-700 italic border-l-2 border-indigo-400 pl-2 leading-tight">
                            {row.recommendedAction || "Monitor allocation"}
                        </span>
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer">
                            View Roadmap →
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, trend, subText, color, bgColor }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-slate-200">
    <div className="mb-3 flex items-center justify-between">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bgColor} ${color} shadow-sm border border-white`}>
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100`}>
        {trend}
      </span>
    </div>
    <div className="flex flex-col">
      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">{title}</p>
      <h2 className={`text-lg font-black ${color} tracking-tighter leading-none`}>{value}</h2>
      <p className="mt-1.5 text-[9px] font-bold text-slate-400 tracking-tight italic opacity-60 truncate">{subText}</p>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xl flex flex-col gap-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{payload[0].name}</p>
        <p className="text-sm font-black text-indigo-600">{payload[0].value} Resources</p>
      </div>
    );
  }
  return null;
};

export default BenchPoolDashboard;
