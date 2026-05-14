import React, { useState, useEffect, useMemo } from 'react';
import { AwardIcon, ProjectsIcon, PieChartIcon, BarChartIcon, EmployeeIcon, TrendingUpIcon, ZapIcon, TargetIcon, DownloadIcon, ShareIcon, ChevronRightIcon, MoreHorizontalIcon, SecurityIcon } from "@/components/icons";
import { 
   ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
   Tooltip as RechartsTooltip, Cell, PieChart, Pie, Legend
} from 'recharts';
import utilizationService from '../../../../services/utilizationService';
import UtilizationNavbar from '../components/UtilizationNavbar';
import LoadingSpinner from '../../../../components/LoadingSpinner';

const UtilizationProjectsDashboard = () => {
   const [loading, setLoading] = useState(true);
   const [data, setData] = useState(null);

   useEffect(() => {
      const fetchData = async () => {
         try {
            setLoading(true);
            const response = await utilizationService.generateReport({ reportType: 'SUMMARY' });
            setData(response);
         } catch (error) {
            console.error('Error fetching data:', error);
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, []);

   if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner text="Mapping Capability Yield..." /></div>;

   const roleData = (data?.roleUtilizations || []).map(r => ({ name: r.roleName, util: r.utilizationPercentage, yield: r.billableRatio || 0 }));
   const clientData = (data?.clientUtilizations || []).map(c => ({ name: c.clientName, yield: c.billableRatio || 0, hours: c.totalHours }));

   return (
      <div className="min-h-screen bg-[#f8fafc] pb-20">
         <UtilizationNavbar />
         
         <div className="max-w-[1600px] mx-auto px-8 pt-8">
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
               <div className="flex flex-col gap-1">
                  <h2 className="text-[24px] font-black text-slate-900 capitalize tracking-tight">Role Performance & Client Yield</h2>
                  <p className="text-[12px] font-bold text-slate-400 italic">Capability-based workload analytics and client profitability index</p>
               </div>
               <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-600 capitalize tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                     <ShareIcon size={16} /> Share Analytics
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black capitalize tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                     <DownloadIcon size={16} /> Capability Report
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               {/* LEFT: ROLE PERFORMANCE */}
               <div className="space-y-8">
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 flex flex-col group relative overflow-hidden">
                     <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm">
                              <AwardIcon size={26} strokeWidth={2.5} />
                           </div>
                           <div>
                              <h3 className="text-[16px] font-black text-slate-900 capitalize tracking-widest">Role Performance Matrix</h3>
                              <p className="text-[11px] font-bold text-slate-400 italic">Capability-based avg utilization</p>
                           </div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">
                           <BarChartIcon size={20} />
                        </div>
                     </div>

                     <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={roleData}>
                              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                 dataKey="name" 
                                 axisLine={false} 
                                 tickLine={false} 
                                 tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                 angle={-45}
                                 textAnchor="end"
                                 height={80}
                              />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                              <RechartsTooltip cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
                              <Bar dataKey="util" radius={[8, 8, 0, 0]} barSize={40}>
                                 {roleData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.util > 90 ? '#f43f5e' : '#10b981'} />
                                 ))}
                              </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     </div>

                     <div className="mt-10 grid grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1">Peak Capability</p>
                           <p className="text-[18px] font-black text-slate-900">Engineering</p>
                           <span className="text-[11px] font-black text-emerald-600">94.2% Load</span>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1">Yield Leader</p>
                           <p className="text-[18px] font-black text-slate-900">Design</p>
                           <span className="text-[11px] font-black text-indigo-600">88.5% Billable</span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* RIGHT: CLIENT YIELD ANALYSIS */}
               <div className="space-y-8">
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 flex flex-col group relative overflow-hidden">
                     <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm">
                              <PieChartIcon size={26} strokeWidth={2.5} />
                           </div>
                           <div>
                              <h3 className="text-[16px] font-black text-slate-900 capitalize tracking-widest">Client Yield Analysis</h3>
                              <p className="text-[11px] font-bold text-slate-400 italic">Profitability index per engagement</p>
                           </div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">
                           <TargetIcon size={20} />
                        </div>
                     </div>

                     <div className="h-[400px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={clientData}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={80}
                                 outerRadius={120}
                                 paddingAngle={5}
                                 dataKey="yield"
                                 stroke="none"
                              >
                                 {clientData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'][index % 5]} cornerRadius={8} />
                                 ))}
                              </Pie>
                              <RechartsTooltip />
                              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'capitalize', letterSpacing: '0.1em' }} />
                           </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[20px] text-center pointer-events-none">
                           <p className="text-3xl font-black text-slate-900 tracking-tight">82%</p>
                           <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest">Avg Yield</p>
                        </div>
                     </div>

                     <div className="mt-10 space-y-4">
                        {clientData.slice(0, 3).map((client, idx) => (
                           <div key={idx} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                              <div className="flex items-center gap-4">
                                 <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm font-black text-xs">
                                    {client.name.charAt(0)}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-[13px] font-black text-slate-900 capitalize tracking-tight">{client.name}</span>
                                    <span className="text-[10px] font-bold text-slate-400">{client.hours?.toFixed(0)}h Active Log</span>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <span className="text-[14px] font-black text-indigo-600 block">{client.yield}%</span>
                                 <span className="text-[9px] font-black text-slate-300 capitalize tracking-widest">Billable</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* STRATEGIC INSIGHTS FOOTER */}
            <div className="mt-10 bg-[#081534] rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl relative overflow-hidden group">
               <div className="flex items-center gap-6 mb-8">
                  <div className="h-12 w-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                     <SecurityIcon size={26} strokeWidth={2.5} />
                  </div>
                  <div>
                     <h4 className="text-[16px] font-black text-white capitalize tracking-[0.2em]">Capability Intelligence Footer</h4>
                     <p className="text-[10px] font-bold text-slate-500 capitalize tracking-widest mt-1">Cross-capability synergy identification engine active</p>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                     { title: 'Resource Fluidity', val: 'High', color: 'text-emerald-400' },
                     { title: 'Talent Retention', val: '98.2%', color: 'text-indigo-400' },
                     { title: 'Yield Volatility', val: 'Low', color: 'text-blue-400' },
                  ].map((item) => (
                     <div key={item.title} className="p-6 bg-white/5 border border-white/10 rounded-3xl flex flex-col gap-2">
                        <span className="text-[10px] font-black text-slate-500 capitalize tracking-widest">{item.title}</span>
                        <span className={`text-[20px] font-black ${item.color}`}>{item.val}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
};

export default UtilizationProjectsDashboard;
