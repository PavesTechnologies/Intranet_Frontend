"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { Target, Activity, Bug, AlertTriangle } from "lucide-react";

export default function Overview() {
  const executionData = [
    { name: "Pass", value: 45, color: "#10b981" }, // Emerald
    { name: "Fail", value: 12, color: "#ef4444" }, // Red
    { name: "Block", value: 5, color: "#f59e0b" }, // Amber
    { name: "Pending", value: 38, color: "#cbd5e1" }, // Slate
  ];

  const defectData = [
    { day: "Day 1", pass: 2, fail: 6 },
    { day: "Day 2", pass: 4, fail: 7 },
    { day: "Day 3", pass: 5, fail: 10 },
    { day: "Day 4", pass: 20, fail: 12 },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-[calc(100vh-80px)] text-slate-800">
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Key metrics and testing progress at a glance.</p>
      </div>

      {/* TOP METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Story Coverage */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-slate-500 tracking-wide uppercase">Story Coverage</p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Target size={18} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">78%</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Target: 85% by Friday</p>
          </div>
        </div>

        {/* Execution */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-slate-500 tracking-wide uppercase">Execution</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Activity size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">45%</p>
              <p className="text-xs font-medium text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">On Track</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: '45%' }}></div>
            </div>
          </div>
        </div>

        {/* Active Defects */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-slate-500 tracking-wide uppercase">Active Defects</p>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Bug size={18} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">12</p>
            <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
              <span>↑</span> +2 from yesterday
            </p>
          </div>
        </div>

        {/* Critical Risk */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-slate-500 tracking-wide uppercase">Critical Risk</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">2</p>
            <p className="text-xs text-slate-500 mt-1 font-medium bg-slate-100 inline-block px-2 py-0.5 rounded-md">
              US-103, US-108
            </p>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Execution Progress */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h2 className="text-base font-bold text-slate-800 mb-6">Execution Progress</h2>

          <div className="flex flex-col sm:flex-row gap-8 items-center justify-center flex-1">
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 500 }}
                  />
                  <Pie
                    data={executionData}
                    dataKey="value"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {executionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Centered Total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-800">100</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
              </div>
            </div>

            <div className="space-y-3 min-w-[120px]">
              {executionData.map((item, index) => (
                <div className="flex items-center justify-between gap-4 text-sm" key={index}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shadow-inner"
                      style={{ background: item.color }}
                    ></span>
                    <span className="font-medium text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Defect Status Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h2 className="text-base font-bold text-slate-800 mb-6">Defect Status Trend</h2>

          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defectData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}/>
                <Bar dataKey="fail" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="pass" name="Passed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}