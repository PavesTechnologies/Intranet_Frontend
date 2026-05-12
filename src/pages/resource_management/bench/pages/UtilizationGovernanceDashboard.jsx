import React, { useState, useEffect } from 'react';
import { SecurityAlertIcon, WarningIcon, HistoryIcon, SuccessIcon, BarChartIcon, IntelligenceIcon, SecurityIcon, ZapIcon, DownloadIcon, FilterIcon, TargetIcon } from "@/components/icons";
import { 
   ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, 
   CartesianGrid, Tooltip as RechartsTooltip, Cell
} from 'recharts';
import utilizationService from '../../../../services/utilizationService';
import UtilizationNavbar from '../components/UtilizationNavbar';
import LoadingSpinner from '../../../../components/LoadingSpinner';

const UtilizationGovernanceDashboard = () => {
   const [loading, setLoading] = useState(true);
   const [liveData, setLiveData] = useState(null);

   useEffect(() => {
      const fetchData = async () => {
         try {
            setLoading(true);
            const response = await utilizationService.getUtilizationSummary();
            setLiveData(response);
         } catch (error) {
            console.error('Error fetching governance data:', error);
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, []);

   if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner text="Compiling Governance Breaches..." /></div>;

   const alerts = liveData?.alerts || [];
   const criticalCount = alerts.filter(a => a.severity?.toLowerCase() === 'critical' || a.severity?.toLowerCase() === 'high').length;
   const warningCount = alerts.filter(a => a.severity?.toLowerCase() === 'warning' || a.severity?.toLowerCase() === 'medium').length;

   return (
      <div className="min-h-screen bg-[#f8fafc] pb-20">
         <UtilizationNavbar />
         
         <div className="max-w-[1600px] mx-auto px-8 pt-8">
            <div className="flex items-center justify-between mb-8">
               <div className="flex flex-col gap-1">
                  <h2 className="text-[24px] font-black text-slate-900 capitalize tracking-tight">Active Governance Breaches</h2>
                  <p className="text-[12px] font-bold text-slate-400 italic">Operational risk monitor & performance deviation registry</p>
               </div>
               <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 capitalize tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                     <DownloadIcon size={14} /> Export Audit
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black capitalize tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
                     <FilterIcon size={14} /> Filter Registry
                  </button>
               </div>
            </div>

            <div className="space-y-8">
               {/* BREACH SUMMARY KPIs */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                     { label: 'Critical Breaches', value: criticalCount, icon: <SecurityAlertIcon />, color: 'text-rose-600', bg: 'bg-rose-50' },
                     { label: 'Warning Signals', value: warningCount, icon: <WarningIcon />, color: 'text-amber-600', bg: 'bg-amber-50' },
                     { label: 'Avg Breach Duration', value: '3.2 Weeks', icon: <HistoryIcon />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                     { label: 'Resolution Rate', value: '94%', icon: <SuccessIcon />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  ].map((kpi) => (
                     <div key={kpi.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-xl transition-all duration-500">
                        <div className={`h-14 w-14 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                           {React.cloneElement(kpi.icon, { size: 28, strokeWidth: 2.5 })}
                        </div>
                        <div>
                           <p className="text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] mb-1">{kpi.label}</p>
                           <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                        </div>
                     </div>
                  ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* SEVERITY CHART */}
                  <div className="lg:col-span-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 flex flex-col group relative overflow-hidden">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex flex-col">
                           <h3 className="text-[13px] font-black text-[#081534] capitalize tracking-[0.2em] leading-none mb-1.5">Severity Distribution</h3>
                           <span className="text-[10px] font-bold text-slate-400 italic">Directional workload risk index</span>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                           <BarChartIcon size={20} />
                        </div>
                     </div>
                     <div className="flex-1 h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                           <RechartsBarChart data={[
                              { name: 'Critical', count: criticalCount, fill: '#f43f5e' },
                              { name: 'Warning', count: warningCount, fill: '#f59e0b' },
                              { name: 'Optimal', count: 12, fill: '#10b981' }
                           ]}>
                              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                              <YAxis hide />
                              <RechartsTooltip cursor={{ fill: 'transparent' }} />
                              <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={50}>
                                 { [0, 1, 2].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : index === 1 ? '#f59e0b' : '#10b981'} />
                                 ))}
                              </Bar>
                           </RechartsBarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* DETAILED BREACH TABLE */}
                  <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                     <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-4">
                           <div className="h-10 w-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center border border-rose-100 shadow-sm">
                              <SecurityAlertIcon size={22} strokeWidth={2.5} />
                           </div>
                           <div>
                              <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-widest">Active Breach Registry</h4>
                              <p className="text-[10px] font-bold text-slate-400 capitalize tracking-wide mt-0.5">Real-time performance deviation logs</p>
                           </div>
                        </div>
                        <span className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-black text-indigo-600 capitalize tracking-widest shadow-sm">
                           Live Monitor
                        </span>
                     </div>
                     <div className="overflow-x-auto no-scrollbar flex-1">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-slate-50/50 border-b border-slate-50">
                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em]">Resource / Project</th>
                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em]">Breach Type</th>
                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] text-center">Utilization</th>
                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {alerts.length === 0 ? (
                                 <tr>
                                    <td colSpan="4" className="px-8 py-20 text-center">
                                       <div className="flex flex-col items-center gap-3 opacity-30">
                                          <SuccessIcon size={48} className="text-emerald-500" />
                                          <span className="text-[14px] font-black capitalize tracking-widest text-slate-500">No active governance breaches identified</span>
                                       </div>
                                    </td>
                                 </tr>
                              ) : (
                                 alerts.map((alert, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                                       <td className="px-8 py-6">
                                          <div className="flex flex-col gap-0.5">
                                             <span className="text-[14px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors capitalize tracking-tight">{alert.scope || 'General'}</span>
                                             <span className="text-[11px] font-bold text-slate-400 capitalize tracking-widest opacity-70 italic">{alert.id || 'N/A'}</span>
                                          </div>
                                       </td>
                                       <td className="px-8 py-6">
                                          <div className={`inline-flex items-center h-7 px-4 rounded-full text-[10px] font-black capitalize tracking-widest border shadow-sm ${
                                             alert.severity?.toLowerCase() === 'critical' || alert.severity?.toLowerCase() === 'high' 
                                             ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                             : 'bg-amber-50 text-amber-600 border-amber-100'
                                          }`}>
                                             {alert.severity || 'Warning'} Breach
                                          </div>
                                       </td>
                                       <td className="px-8 py-6 text-center">
                                          <div className="flex flex-col items-center gap-1.5">
                                             <span className="text-[14px] font-black text-slate-900 tracking-tight">85.4%</span>
                                             <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                                <div className="h-full bg-rose-500 w-[85%]" />
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-8 py-6 text-right">
                                          <div className="flex items-center justify-end gap-3">
                                             <button className="h-9 px-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black capitalize tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95">Resolve</button>
                                             <button className="h-9 px-4 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black capitalize tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95">Escalate</button>
                                          </div>
                                       </td>
                                    </tr>
                                 ))
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>

               {/* THRESHOLD GOVERNANCE (Secondary Info) */}
               <div className="bg-[#081534] rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 opacity-[0.03] p-16 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                     <IntelligenceIcon size={240} />
                  </div>
                  <div className="flex items-center gap-6 mb-10">
                     <div className="h-14 w-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-inner">
                        <SecurityIcon size={32} strokeWidth={2.5} />
                     </div>
                     <div>
                        <h4 className="text-[18px] font-black text-white capitalize tracking-[0.2em]">Downstream Readiness Registry</h4>
                        <p className="text-[11px] font-bold text-slate-500 capitalize tracking-[0.2em] mt-1.5">Sustained directional signals identified by intelligence engine</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-3xl hover:bg-slate-800/60 transition-all duration-500 group/item">
                        <div className="flex items-center gap-3 mb-4">
                           <TargetIcon size={18} className="text-indigo-400" />
                           <span className="text-[12px] font-black text-indigo-400 capitalize tracking-widest block">Automated Compliance Detection</span>
                        </div>
                        <p className="text-[14px] font-medium text-slate-400 leading-relaxed italic border-l-2 border-indigo-500 pl-6 py-1">
                           Sustained status is only triggered after 4 consecutive weekly cycles (W+4) of threshold deviation. 
                           Transient spikes are suppressed to maintain operational integrity and prevent engine volatility.
                        </p>
                     </div>
                     <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-3xl flex items-center gap-8 hover:bg-slate-800/60 transition-all duration-500">
                        <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner border border-white/10 group-hover:rotate-12 transition-transform duration-500">
                           <ZapIcon size={32} />
                        </div>
                        <div>
                           <span className="text-[12px] font-black text-white capitalize tracking-widest block mb-2">Direct Engine Integration</span>
                           <p className="text-[11px] font-bold text-slate-500 capitalize tracking-widest leading-loose">
                              Verified breach signals are automatically dispatched to the capacity leveling module for resource re-allocation.
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default UtilizationGovernanceDashboard;
