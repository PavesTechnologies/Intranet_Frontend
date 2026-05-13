import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeIcon, SearchIcon, FilterIcon, DownloadIcon, ZapIcon, TrendUpIcon, TrendDownIcon, CloseIcon, ProjectsIcon, HistoryIcon, AnalyticsIcon, PieChartIcon, SuccessIcon, EmailIcon, PhoneIcon, ChevronRightIcon, MoreHorizontalIcon } from "@/components/icons";
import { 
   ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
   LineChart, Line, CartesianGrid
} from 'recharts';
import utilizationService from '../../../../services/utilizationService';
import UtilizationNavbar from '../components/UtilizationNavbar';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import Pagination from '../../../../components/Pagination/pagination';
import GenericTable from "../../../../components/Table/table";

const UtilizationResourceDashboard = () => {
   const [loading, setLoading] = useState(true);
   const [resources, setResources] = useState([]);
   const [searchQuery, setSearchQuery] = useState('');
   const [currentPage, setCurrentPage] = useState(1);
   const [selectedResource, setSelectedResource] = useState(null);
   const [isDrawerOpen, setIsDrawerOpen] = useState(false);

   useEffect(() => {
      const fetchData = async () => {
         try {
            setLoading(true);
            const response = await utilizationService.getUtilizationSummary();
            setResources(response?.resources || []);
         } catch (error) {
            console.error('Error fetching resource data:', error);
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, []);

   const filteredResources = useMemo(() => {
      return resources.filter(res => 
         res.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         res.role?.toLowerCase().includes(searchQuery.toLowerCase())
      );
   }, [resources, searchQuery]);

   const itemsPerPage = 10;
   const paginatedResources = useMemo(() => {
      const start = (currentPage - 1) * itemsPerPage;
      return filteredResources.slice(start, start + itemsPerPage);
   }, [filteredResources, currentPage]);

   const totalPages = Math.ceil(filteredResources.length / itemsPerPage);

   const openDrawer = (res) => {
      setSelectedResource(res);
      setIsDrawerOpen(true);
   };

   if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner text="Compiling Resource Registry..." /></div>;

   return (
      <div className="min-h-screen bg-[#f8fafc] pb-20">
         <UtilizationNavbar />
         
         <div className="max-w-[1600px] mx-auto px-8 pt-8">
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
               <div className="flex flex-col gap-1">
                  <h2 className="text-[24px] font-black text-slate-900 capitalize tracking-tight">Resource Performance Registry</h2>
                  <p className="text-[12px] font-bold text-slate-400 italic">Granular workload actuals and talent allocation ledger</p>
               </div>
               
               <div className="flex flex-wrap items-center gap-4">
                  <div className="relative group">
                     <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                     <input 
                        type="text" 
                        placeholder="Search resource or role..."
                        className="pl-12 pr-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-[12px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all w-64 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                     />
                  </div>
                  <button className="h-11 w-11 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm">
                     <FilterIcon size={20} />
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black capitalize tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                     <DownloadIcon size={16} /> Export CSV
                  </button>
               </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
               <div className="overflow-x-auto no-scrollbar">
                  <GenericTable
                     headers={["Resource Profile", "Workload Util", "Billable Ratio", "Trend Signal", "Activity"]}
                     columns={["profile_info", "utilization_info", "ratio_info", "trend_info", "actions_info"]}
                     rows={paginatedResources.map((res, idx) => ({
                        ...res,
                        profile_info: (
                           <div className="flex items-center gap-4 text-left">
                              <div className="h-12 w-12 rounded-2xl bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 font-black text-sm capitalize group-hover:scale-110 transition-transform duration-500">
                                 {res.userName?.charAt(0)}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                 <span className="text-[14px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors capitalize tracking-tight">{res.userName}</span>
                                 <span className="text-[11px] font-bold text-slate-400 opacity-80">{res.role}</span>
                              </div>
                           </div>
                        ),
                        utilization_info: (
                           <div className="flex flex-col gap-1.5 min-w-[180px] text-left">
                              <div className="flex items-center justify-between">
                                 <span className={`text-[11px] font-black capitalize tracking-tight ${res.billablePercentage > 100 ? 'text-rose-600' : 'text-indigo-600'}`}>
                                    {res.billablePercentage}% Utilized
                                 </span>
                                 <span className="text-[10px] font-bold text-slate-400 italic">{res.billableHours}h Actual</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                 <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${res.billablePercentage > 100 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${Math.min(res.billablePercentage, 100)}%` }}
                                 />
                              </div>
                           </div>
                        ),
                        ratio_info: (
                           <div className="text-center">
                              <div className="inline-flex flex-col items-center gap-1 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                                 <span className="text-[14px] font-black text-emerald-700 tracking-tight">82.5%</span>
                                 <span className="text-[8px] font-black text-emerald-600 capitalize tracking-widest leading-none">Billable</span>
                              </div>
                           </div>
                        ),
                        trend_info: (
                           <div className="h-12 w-24 mx-auto flex items-center justify-center">
                              <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={[
                                    { v: 40 }, { v: 55 }, { v: 48 }, { v: 70 }, { v: 62 }, { v: 85 }
                                 ]}>
                                    <defs>
                                       <linearGradient id={`miniGradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                       </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} fill={`url(#miniGradient-${idx})`} />
                                 </AreaChart>
                              </ResponsiveContainer>
                           </div>
                        ),
                        actions_info: (
                           <div className="flex justify-end">
                              <button className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center border border-slate-100">
                                 <ChevronRight size={18} />
                              </button>
                           </div>
                        ),
                        onClick: () => openDrawer(res)
                     }))}
                  />
               </div>
               
               {/* PAGINATION */}
               <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <p className="text-[11px] font-black text-slate-400 capitalize tracking-widest italic">Showing {paginatedResources.length} of {filteredResources.length} talent profiles</p>
                  <Pagination 
                     currentPage={currentPage}
                     totalPages={totalPages}
                     onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))}
                     onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  />
               </div>
            </div>
         </div>

         {/* SIDE DRAWER */}
         {isDrawerOpen && selectedResource && (
            <div className="fixed inset-0 z-[100] flex justify-end">
               <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDrawerOpen(false)} />
               <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
                  <div className="p-10">
                     {/* DRAWER HEADER */}
                     <div className="flex items-start justify-between mb-12">
                        <div className="flex items-center gap-6">
                           <div className="h-24 w-24 rounded-[2rem] bg-indigo-50 border-4 border-white shadow-xl flex items-center justify-center text-indigo-600 font-black text-3xl capitalize">
                              {selectedResource.userName?.charAt(0)}
                           </div>
                           <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                 <h3 className="text-3xl font-black text-slate-900 capitalize tracking-tight">{selectedResource.userName}</h3>
                                 <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black capitalize tracking-widest rounded-lg border border-emerald-100">Active</div>
                              </div>
                              <p className="text-[14px] font-bold text-slate-400 capitalize tracking-widest flex items-center gap-2">
                                 <ProjectsIcon size={16} className="text-indigo-500" /> {selectedResource.role}
                              </p>
                           </div>
                        </div>
                        <button 
                           onClick={() => setIsDrawerOpen(false)}
                           className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center shadow-inner border border-slate-100"
                        >
                           <CloseIcon size={24} />
                        </button>
                     </div>

                     {/* PERFORMANCE STATS */}
                     <div className="grid grid-cols-2 gap-6 mb-12">
                        <div className="p-8 bg-[#081534] rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-125 transition-transform duration-700">
                              <ZapIcon size={80} />
                           </div>
                           <p className="text-[11px] font-black text-indigo-400 capitalize tracking-widest mb-2">Total Utilization</p>
                           <p className="text-4xl font-black text-white tracking-tight">{selectedResource.billablePercentage}%</p>
                           <div className="mt-4 flex items-center gap-2">
                              <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                                 <div className="h-full bg-indigo-500" style={{ width: `${selectedResource.billablePercentage}%` }} />
                              </div>
                              <span className="text-[10px] font-black text-slate-500">+{selectedResource.billablePercentage > 80 ? '8.2' : '2.1'}%</span>
                           </div>
                        </div>
                        <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-125 transition-transform duration-700">
                              <PieChartIcon size={80} />
                           </div>
                           <p className="text-[11px] font-black text-slate-400 capitalize tracking-widest mb-2">Billable Ratio</p>
                           <p className="text-4xl font-black text-slate-900 tracking-tight">85.0%</p>
                           <div className="mt-4 flex items-center gap-2">
                              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-emerald-500 w-[85%]" />
                              </div>
                              <span className="text-[10px] font-black text-emerald-600">Target Met</span>
                           </div>
                        </div>
                     </div>

                     {/* CONTACT & INFO */}
                     <div className="space-y-6 mb-12">
                        <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.2em] flex items-center gap-3">
                           Communication Profile <div className="h-px flex-1 bg-slate-100" />
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-5 bg-slate-50 rounded-2xl flex items-center gap-4 border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                              <div className="h-10 w-10 rounded-xl bg-white text-slate-400 group-hover:text-indigo-600 flex items-center justify-center shadow-inner border border-slate-100">
                                 <EmailIcon size={18} />
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[9px] font-black text-slate-400 capitalize tracking-widest">Enterprise Email</span>
                                 <span className="text-[12px] font-bold text-slate-700">{selectedResource.userName?.toLowerCase().replace(' ', '.')}@company.com</span>
                              </div>
                           </div>
                           <div className="p-5 bg-slate-50 rounded-2xl flex items-center gap-4 border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                              <div className="h-10 w-10 rounded-xl bg-white text-slate-400 group-hover:text-indigo-600 flex items-center justify-center shadow-inner border border-slate-100">
                                 <PhoneIcon size={18} />
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[9px] font-black text-slate-400 capitalize tracking-widest">Internal Extension</span>
                                 <span className="text-[12px] font-bold text-slate-700">+1-800-UTIL-42</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* TREND CHART */}
                     <div className="space-y-6">
                        <div className="flex items-center justify-between">
                           <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.2em] flex items-center gap-3 flex-1">
                              Performance Trend <div className="h-px flex-1 bg-slate-100" />
                           </h4>
                           <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 capitalize tracking-widest ml-4">
                              <HistoryIcon size={14} /> Last 30 Days
                           </div>
                        </div>
                        <div className="h-64 w-full bg-slate-50/50 rounded-3xl border border-slate-100 p-8">
                           <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={[
                                 { name: 'W1', u: 65 }, { name: 'W2', u: 82 }, { name: 'W3', u: 78 }, { name: 'W4', u: 95 }, { name: 'W5', u: 88 }
                              ]}>
                                 <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} domain={[0, 100]} />
                                 <RechartsTooltip />
                                 <Line type="monotone" dataKey="u" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                              </LineChart>
                           </ResponsiveContainer>
                        </div>
                     </div>

                     {/* FOOTER ACTION */}
                     <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <SuccessIcon size={20} className="text-emerald-500" />
                           <p className="text-[11px] font-black text-slate-400 capitalize tracking-widest italic">Validated capability profile synchronized with ERP</p>
                        </div>
                        <button className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[12px] font-black capitalize tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                           Generate Deep Dive
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default UtilizationResourceDashboard;
