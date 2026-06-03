import React, { useState, useEffect, useMemo } from 'react';
import { ProjectsIcon, TargetIcon, TrendingUpIcon, BillingIcon, EmployeeIcon, BarChartIcon, PieChartIcon, LayoutGridIcon, DownloadIcon, ExportIcon, ChevronRightIcon, SuccessIcon, WarningIcon, DesktopIcon } from "@/components/icons";
import { 
   ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
   Tooltip as RechartsTooltip, Cell, Legend
} from 'recharts';
import utilizationService from '../../../../services/utilizationService';
import UtilizationNavbar from '../components/UtilizationNavbar';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import GenericTable from "../../../../components/Table/table";
import Pagination from '../../../../components/Pagination/pagination';

const PROJECTS_PER_PAGE = 10;

const extractRows = (payload, keys) => {
   if (Array.isArray(payload)) return payload;
   if (!payload || typeof payload !== 'object') return [];
   for (const key of keys) {
      if (Array.isArray(payload[key])) return payload[key];
   }
   if (Array.isArray(payload.content)) return payload.content;
   if (payload.data) return extractRows(payload.data, keys);
   return [];
};

const extractTotalPages = (payload) => {
   const source = payload?.page || payload?.data || payload || {};
   const totalElements = Number(source.totalElements ?? source.totalRecords ?? source.totalCount ?? 0);
   return Math.max(Number(source.totalPages ?? Math.ceil(totalElements / PROJECTS_PER_PAGE) ?? 1), 1);
};

const UtilizationPortfolioDashboard = () => {
   const [loading, setLoading] = useState(true);
   const [portfolioData, setPortfolioData] = useState(null);
   const [currentPage, setCurrentPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);
   const [error, setError] = useState('');

   useEffect(() => {
      const fetchData = async () => {
         try {
            setLoading(true);
            setError('');
            const response = await utilizationService.getUtilizationProjects({
               page: currentPage - 1,
               size: PROJECTS_PER_PAGE,
               sortBy: 'utilizationPercentage',
               sortDirection: 'desc',
            });
            setPortfolioData({
               projectUtilizations: extractRows(response, ['projectUtilizations', 'projects']),
            });
            setTotalPages(extractTotalPages(response));
         } catch (error) {
            console.error('Error fetching portfolio data:', error);
            setError('Failed to load project utilization.');
            setPortfolioData({ projectUtilizations: [] });
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, [currentPage]);

   if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner text="Analyzing Portfolio Yield..." /></div>;

   const projects = portfolioData?.projectUtilizations || [];

   return (
      <div className="min-h-screen bg-[#f8fafc] pb-20">
         <UtilizationNavbar />
         
         <div className="max-w-[1600px] mx-auto px-8 pt-8">
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
               <div className="flex flex-col gap-1">
                  <h2 className="text-[24px] font-black text-slate-900 capitalize tracking-tight">Project Portfolio Yield Analysis</h2>
                  <p className="text-[12px] font-bold text-slate-400 italic">Financial efficiency and resource allocation optimization matrix</p>
               </div>
               <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-600 capitalize tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                     <DownloadIcon size={16} /> Portfolio Report
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-[#081534] text-white rounded-2xl text-[11px] font-black capitalize tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                     <LayoutGridIcon size={16} /> Grid View
                  </button>
               </div>
            </div>

            {/* PORTFOLIO KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
               {[
                  { label: 'Avg Project Yield', value: '84.2%', icon: <TrendingUpIcon />, color: 'text-emerald-600', bg: 'bg-emerald-50', note: 'Higher than last Q' },
                  { label: 'Allocation Efficiency', value: '91.5%', icon: <EmployeeIcon />, color: 'text-indigo-600', bg: 'bg-indigo-50', note: 'Optimal boundary' },
                  { label: 'Resource Density', value: '8.4', icon: <DesktopIcon />, color: 'text-blue-600', bg: 'bg-blue-50', note: 'Avg per project' },
                  { label: 'Revenue/Hour', value: '$142', icon: <BillingIcon />, color: 'text-amber-600', bg: 'bg-amber-50', note: 'Blended rate' },
               ].map((kpi) => (
                  <div key={kpi.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all duration-500">
                     <div className="flex items-center justify-between">
                        <div className={`h-12 w-12 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                           {React.cloneElement(kpi.icon, { size: 24, strokeWidth: 2.5 })}
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 capitalize tracking-widest">{kpi.note}</span>
                     </div>
                     <div>
                        <p className="text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] mb-0.5">{kpi.label}</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                     </div>
                  </div>
               ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
               {/* HORIZONTAL BAR CHART -> PROJECT VS UTILIZATION */}
               <div className="xl:col-span-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 flex flex-col group relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex flex-col">
                        <h3 className="text-[13px] font-black text-[#081534] capitalize tracking-[0.2em] leading-none mb-1.5">Utilization by Project</h3>
                        <span className="text-[10px] font-bold text-slate-400 italic">Workload intensity distribution</span>
                     </div>
                     <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                        <BarChartIcon size={20} />
                     </div>
                  </div>
                  <div className="flex-1 h-[500px] w-full relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                           layout="vertical" 
                           data={projects.slice(0, 10).map(p => ({ name: p.projectName, util: p.utilizationPercentage }))}
                           margin={{ left: 20, right: 30 }}
                        >
                           <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
                           <XAxis type="number" domain={[0, 100]} hide />
                           <YAxis 
                              dataKey="name" 
                              type="category" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                              width={100}
                           />
                           <RechartsTooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                           <Bar dataKey="util" radius={[0, 8, 8, 0]} barSize={20}>
                              {projects.slice(0, 10).map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.utilizationPercentage > 90 ? '#f43f5e' : '#6366f1'} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* DETAILED PROJECT TABLE */}
               <div className="xl:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
                           <ProjectsIcon size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                           <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-widest">Project Performance Ledger</h4>
                           <p className="text-[10px] font-bold text-slate-400 capitalize tracking-wide mt-0.5">Yield and efficiency metrics per engagement</p>
                        </div>
                     </div>
                     <span className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-black text-emerald-600 capitalize tracking-widest shadow-sm">
                        Live Analytics
                     </span>
                  </div>
                  <div className="overflow-x-auto no-scrollbar flex-1">
                     {error && (
                        <div className="mx-8 mt-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-700">
                           {error}
                        </div>
                     )}
                     <GenericTable
                        headers={["Project / Client", "Project Yield", "Efficiency", "Cost vs Util", "Status"]}
                        columns={["project_info", "yield_info", "efficiency_info", "burn_info", "actions_info"]}
                        rows={projects.map((proj, idx) => ({
                           ...proj,
                           project_info: (
                              <div className="flex flex-col gap-0.5 text-left">
                                 <span className="text-[14px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors capitalize tracking-tight leading-tight">{proj.projectName}</span>
                                 <span className="text-[11px] font-bold text-slate-400 capitalize tracking-widest opacity-70 italic">{proj.clientName}</span>
                              </div>
                           ),
                           yield_info: (
                              <div className="text-center">
                                 <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <span className="text-[14px] font-black text-emerald-700">{proj.billableRatio}%</span>
                                 </div>
                              </div>
                           ),
                           efficiency_info: (
                              <div className="flex flex-col items-center gap-1.5">
                                 <span className="text-[13px] font-black text-slate-700">92.4%</span>
                                 <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-[92%]" />
                                 </div>
                              </div>
                           ),
                           burn_info: (
                              <div className="text-center">
                                 <div className={`inline-flex items-center gap-1 text-[11px] font-black capitalize ${proj.utilizationPercentage > 90 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {proj.utilizationPercentage > 90 ? <WarningIcon size={12} /> : <SuccessIcon size={12} />}
                                    {proj.utilizationPercentage > 90 ? 'High Burn' : 'Healthy'}
                                 </div>
                              </div>
                           ),
                           actions_info: (
                              <div className="flex justify-end">
                                 <button className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center border border-slate-100">
                                    <ExportIcon size={18} />
                                 </button>
                              </div>
                           )
                        }))}
                     />
                  </div>
                  {totalPages > 1 && (
                     <div className="border-t border-slate-100 px-8 py-5 bg-slate-50/40">
                        <Pagination
                           currentPage={currentPage}
                           totalPages={totalPages}
                           onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                           onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                           className="justify-end py-0"
                        />
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default UtilizationPortfolioDashboard;
