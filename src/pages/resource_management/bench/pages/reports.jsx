// {activeTab === 'reporting' && (
//                      <div className="space-y-8 animate-in fade-in duration-500">
//                         {/* Error Alert Display */}
//                         {reportError && (
//                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-top-2 duration-300 shadow-sm">
//                               <div className="h-10 w-10 rounded-xl bg-white border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm shrink-0">
//                                  <AlertTriangle size={20} spellCheck={false} />
//                               </div>
//                               <div className="flex-1">
//                                  <h4 className="text-[11px] font-black text-rose-900 capitalize tracking-widest">Intelligence Request Error</h4>
//                                  <p className="text-[12px] font-bold text-rose-600 leading-tight italic">{reportError}</p>
//                               </div>
//                               <button
//                                  onClick={() => setReportError(null)}
//                                  className="h-8 w-8 rounded-lg hover:bg-rose-100 flex items-center justify-center text-rose-400 hover:text-rose-600 transition-all active:scale-95"
//                               >
//                                  <ZapOff size={18} />
//                               </button>
//                            </div>
//                         )}

//                         {/* Report Config Panel */}
//                         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative group">
//                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
//                               <Database size={120} />
//                            </div>
//                            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
//                               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
//                                  <div className="space-y-1.5">
//                                     <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest pl-1">Period Start</label>
//                                     <div className="relative">
//                                        <input
//                                           type="date"
//                                           value={reportParams.startDate}
//                                           onChange={(e) => setReportParams({ ...reportParams, startDate: e.target.value })}
//                                           className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//                                        />
//                                     </div>
//                                  </div>
//                                  <div className="space-y-1.5">
//                                     <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest pl-1">Period End</label>
//                                     <div className="relative">
//                                        <input
//                                           type="date"
//                                           value={reportParams.endDate}
//                                           onChange={(e) => setReportParams({ ...reportParams, endDate: e.target.value })}
//                                           className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//                                        />
//                                     </div>
//                                  </div>
//                                  <div className="space-y-1.5">
//                                     <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest pl-1">Report Type</label>
//                                     <div className="relative">
//                                        <select
//                                           value={reportParams.reportType}
//                                           onChange={(e) => setReportParams({ ...reportParams, reportType: e.target.value })}
//                                           className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none cursor-pointer"
//                                        >
//                                           <option value="SUMMARY">SUMMARY (Dimension Map)</option>
//                                           <option value="RESOURCE">RESOURCE (Individual Performance)</option>
//                                           <option value="PROJECT">PROJECT (Portfolio Analytics)</option>
//                                           <option value="CLIENT">CLIENT (External Yield)</option>
//                                           <option value="ROLE">ROLE (Capability Analysis)</option>
//                                        </select>
//                                        <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
//                                     </div>
//                                  </div>
//                                  <div className="space-y-1.5">
//                                     <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest pl-1">Grouping</label>
//                                     <div className="relative">
//                                        <select
//                                           value={reportParams.groupBy}
//                                           onChange={(e) => setReportParams({ ...reportParams, groupBy: e.target.value })}
//                                           className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none cursor-pointer"
//                                        >
//                                           <option value="WEEKLY">WEEKLY (Active Pattern)</option>
//                                           <option value="DAILY" disabled>DAILY (Not Implemented)</option>
//                                           <option value="MONTHLY" disabled>MONTHLY (Not Implemented)</option>
//                                        </select>
//                                        <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
//                                     </div>
//                                  </div>
//                               </div>
//                               <div className="flex items-center gap-3">
//                                  <button
//                                     onClick={handleGenerateReport}
//                                     disabled={isGenerating}
//                                     className="h-10 px-6 rounded-xl bg-indigo-600 text-white text-[12px] font-black capitalize tracking-widest hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-600/20"
//                                  >
//                                     {isGenerating ? <RefreshCcw size={16} className="animate-spin" /> : <TrendingUp size={16} />}
//                                     {isGenerating ? 'GENERATING...' : 'GENERATE REPORT'}
//                                  </button>
//                                  <div className="flex items-center gap-2">
//                                     <button
//                                        onClick={handleExportCSV}
//                                        disabled={!reportData}
//                                        className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
//                                        title="Export to CSV"
//                                     >
//                                        <Download size={18} />
//                                        <span className="text-[10px] font-black capitalize">CSV</span>
//                                     </button>
//                                     <button
//                                        onClick={handleExportExcel}
//                                        disabled={!reportData}
//                                        className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
//                                        title="Export to Excel"
//                                     >
//                                        <FileText size={18} />
//                                        <span className="text-[10px] font-black capitalize">Excel</span>
//                                     </button>
//                                  </div>
//                               </div>
//                            </div>

//                            {/* Dimensional Filters & Toggles */}
//                            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-slate-50 relative z-10">
//                               <div className="md:col-span-1 space-y-4">
//                                  <div className="flex flex-col gap-3">
//                                     <label className="flex items-center gap-3 cursor-pointer group">
//                                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${reportParams.approvedOnly ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
//                                           <input
//                                              type="checkbox"
//                                              checked={reportParams.approvedOnly}
//                                              onChange={(e) => setReportParams({ ...reportParams, approvedOnly: e.target.checked })}
//                                              className="hidden"
//                                           />
//                                           {reportParams.approvedOnly && <CheckCircle2 size={12} className="text-white" />}
//                                        </div>
//                                        <div className="flex flex-col">
//                                           <span className="text-[11px] font-black text-slate-700 capitalize tracking-tight">Validated Data Only</span>
//                                           <span className="text-[9px] font-bold text-slate-400 italic">Approved Timesheets Only</span>
//                                        </div>
//                                     </label>
//                                     <label className="flex items-center gap-3 cursor-pointer group">
//                                        <input
//                                           type="checkbox"
//                                           checked={reportParams.includeTrends}
//                                           onChange={(e) => setReportParams({ ...reportParams, includeTrends: e.target.checked })}
//                                           className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
//                                        />
//                                        <span className="text-[11px] font-bold text-slate-600 capitalize tracking-tight group-hover:text-indigo-600 transition-colors">Include Trends</span>
//                                     </label>
//                                     <label className="flex items-center gap-3 cursor-pointer group">
//                                        <input
//                                           type="checkbox"
//                                           checked={reportParams.includeAlerts}
//                                           onChange={(e) => setReportParams({ ...reportParams, includeAlerts: e.target.checked })}
//                                           className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
//                                        />
//                                        <span className="text-[11px] font-bold text-slate-600 capitalize tracking-tight group-hover:text-indigo-600 transition-colors">Include Alerts</span>
//                                     </label>
//                                  </div>
//                               </div>

//                               <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
//                                  <div className="space-y-1.5">
//                                     <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest pl-1">Resource IDs</label>
//                                     <input
//                                        type="text"
//                                        value={reportParams.resourceIds.join(', ')}
//                                        placeholder="17, 18, 19..."
//                                        onChange={(e) => {
//                                           const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
//                                           setReportParams({ ...reportParams, resourceIds: ids });
//                                        }}
//                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//                                     />
//                                  </div>
//                                  <div className="space-y-1.5">
//                                     <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest pl-1">Project IDs</label>
//                                     <input
//                                        type="text"
//                                        value={reportParams.projectIds.join(', ')}
//                                        placeholder="101, 102..."
//                                        onChange={(e) => {
//                                           const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
//                                           setReportParams({ ...reportParams, projectIds: ids });
//                                        }}
//                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//                                     />
//                                  </div>
//                                  <div className="space-y-1.5">
//                                     <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest pl-1">Roles (comma-sep)</label>
//                                     <input
//                                        type="text"
//                                        value={reportParams.roles.join(', ')}
//                                        placeholder="Dev, Manager..."
//                                        onChange={(e) => {
//                                           const roles = e.target.value.split(',').map(r => r.trim()).filter(r => r !== '');
//                                           setReportParams({ ...reportParams, roles: roles });
//                                        }}
//                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//                                     />
//                                  </div>
//                                  <div className="space-y-1.5">
//                                     <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest pl-1">Clients (comma-sep)</label>
//                                     <input
//                                        type="text"
//                                        value={reportParams.clients.join(', ')}
//                                        placeholder="Client A, Client B..."
//                                        onChange={(e) => {
//                                           const clients = e.target.value.split(',').map(c => c.trim()).filter(c => c !== '');
//                                           setReportParams({ ...reportParams, clients: clients });
//                                        }}
//                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//                                     />
//                                  </div>
//                               </div>
//                            </div>

//                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-50 relative z-10">
//                               <div className="space-y-1.5">
//                                  <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest pl-1">Over Util Threshold</label>
//                                  <input
//                                     type="number"
//                                     step="0.1"
//                                     value={reportParams.overUtilizationThreshold}
//                                     onChange={(e) => setReportParams({ ...reportParams, overUtilizationThreshold: parseFloat(e.target.value) || 0 })}
//                                     className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//                                  />
//                               </div>
//                               <div className="space-y-1.5">
//                                  <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest pl-1">Under Util Threshold</label>
//                                  <input
//                                     type="number"
//                                     step="0.1"
//                                     value={reportParams.underUtilizationThreshold}
//                                     onChange={(e) => setReportParams({ ...reportParams, underUtilizationThreshold: parseFloat(e.target.value) || 0 })}
//                                     className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//                                  />
//                               </div>
//                            </div>
//                         </div>

//                         {/* Report Output Content */}
//                         {!reportData && !isGenerating && (
//                            <div className="bg-white rounded-3xl border border-dotted border-slate-200 p-24 flex flex-col items-center justify-center text-center group">
//                               <div className="h-20 w-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-8 border border-slate-100 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
//                                  <TrendingUp size={40} />
//                               </div>
//                               <h3 className="text-xl font-black text-slate-900 capitalize tracking-tight">Intelligence Hub Reporting Engine</h3>
//                               <p className="mt-3 text-[13px] font-medium text-slate-400 max-w-sm italic">Configure your parameters above to generate high-fidelity utilization analytics, performance alerts, and sustained trend signals.</p>
//                            </div>
//                         )}

//                         {isGenerating && (
//                            <div className="bg-white rounded-3xl border border-slate-100 p-24 flex flex-col items-center justify-center text-center">
//                               <div className="relative">
//                                  <div className="h-20 w-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-8 border border-indigo-100 animate-pulse">
//                                     <RefreshCcw size={40} className="animate-spin" />
//                                  </div>
//                                  <div className="absolute -top-2 -right-2 h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center text-white border-2 border-white animate-bounce">
//                                     <Zap size={12} fill="currentColor" />
//                                  </div>
//                               </div>
//                               <h3 className="text-xl font-black text-indigo-900 capitalize tracking-tight">Compiling Intelligence Report</h3>
//                               <p className="mt-3 text-[13px] font-medium text-slate-400 max-w-sm italic leading-relaxed">Aggregating timesheet actuals from validated workload registries and detecting sustained breach signals...</p>
//                            </div>
//                         )}

//                         {reportData && (
//                            <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
//                               {/* 1. TOP SUMMARY KPIS */}
//                               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//                                  {[
//                                     { label: 'Total Actual Hours', value: reportData.totalHours || 0, icon: <Clock />, color: 'text-indigo-600' },
//                                     { label: 'Utilization %', value: `${reportData.utilizationPercentage || 0}%`, icon: <TrendingUp />, color: 'text-emerald-600' },
//                                     { label: 'Total Resources', value: reportData.totalResources || 0, icon: <Users />, color: 'text-blue-600' },
//                                     { label: 'Confidence Score', value: `${reportData.confidenceScore || 0}%`, icon: <ShieldCheck />, color: 'text-amber-600' }
//                                  ].map((kpi) => (
//                                     <div key={kpi.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow cursor-default group">
//                                        <div className={`h-14 w-14 rounded-2xl bg-white border border-slate-50 shadow-inner flex items-center justify-center ${kpi.color} group-hover:scale-110 transition-transform duration-500`}>
//                                           {React.cloneElement(kpi.icon, { size: 28, strokeWidth: 2.5 })}
//                                        </div>
//                                        <div>
//                                           <p className="text-[10px] font-black text-slate-400 capitalize tracking-[0.2em] mb-1">{kpi.label}</p>
//                                           <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
//                                        </div>
//                                     </div>
//                                  ))}
//                               </div>

//                               {/* 2. TRENDS & ALERTS (Governance Breaches) */}
//                               {reportData.alerts && reportData.alerts.length > 0 && (
//                                  <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden relative">
//                                     <div className="absolute top-0 right-0 p-4 opacity-5">
//                                        <AlertTriangle size={80} />
//                                     </div>
//                                     <div className="bg-rose-50/50 px-8 py-5 border-b border-rose-100 flex items-center justify-between relative z-10">
//                                        <div className="flex items-center gap-3">
//                                           <div className="h-8 w-8 bg-rose-100 text-rose-500 rounded-lg flex items-center justify-center shadow-sm">
//                                              <ShieldAlert size={20} strokeWidth={2.5} />
//                                           </div>
//                                           <div>
//                                              <h4 className="text-[12px] font-black text-rose-900 capitalize tracking-[0.1em]">Active Governance Breaches ({reportData.alerts.length})</h4>
//                                              <p className="text-[10px] font-bold text-rose-600 opacity-70 capitalize tracking-widest mt-0.5">Automated Intelligence Detection</p>
//                                           </div>
//                                        </div>
//                                        <span className="px-3 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-black capitalize tracking-widest shadow-lg shadow-rose-200 animate-pulse">Action Required</span>
//                                     </div>
//                                     <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
//                                        {reportData.alerts.map((alert, idx) => (
//                                           <div key={idx} className="p-5 bg-slate-50/30 rounded-2xl border border-slate-100 flex flex-col gap-3 hover:bg-white hover:border-rose-200 hover:shadow-md transition-all cursor-default group">
//                                              <div className="flex items-center justify-between mb-1">
//                                                 <span className="text-[12px] font-black text-slate-900 capitalize tracking-tight group-hover:text-rose-600 transition-colors">{alert.resourceName || alert.resourceId || 'Signal Spike'}</span>
//                                                 <div className={`h-2.5 w-2.5 rounded-full animate-ping ${alert.severity === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'}`} />
//                                              </div>
//                                              <p className="text-[12px] font-medium text-slate-500 leading-relaxed bg-white p-3 rounded-xl border border-slate-50 border-dashed">{alert.message}</p>
//                                              <div className="mt-1 flex items-center justify-between text-[10px] font-black capitalize tracking-widest">
//                                                 <span className={`${alert.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}`}>
//                                                    Severity: {alert.severity}
//                                                 </span>
//                                                 <span className="text-indigo-600 opacity-60">Status: OPEN</span>
//                                              </div>
//                                              <div className="mt-1 p-3 bg-rose-50 border border-rose-100 rounded-xl">
//                                                 <span className="text-[9px] font-black text-rose-700 capitalize tracking-widest block mb-1">REC: Recommendation</span>
//                                                 <p className="text-[10px] font-bold text-rose-600 leading-tight italic">{alert.recommendation}</p>
//                                              </div>
//                                           </div>
//                                        ))}
//                                     </div>
//                                  </div>
//                               )}

//                               {/* 3. PERFORMANCE REGISTRIES (Tables) */}
//                               {/* --- RESOURCE REGISTRY --- */}
//                               {(reportParams.reportType === 'RESOURCE' || reportParams.reportType === 'SUMMARY') && reportData.resourceUtilizations && (
//                                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700">
//                                     <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
//                                        <div className="flex items-center gap-4">
//                                           <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
//                                              <Users size={22} strokeWidth={2.5} />
//                                           </div>
//                                           <div>
//                                              <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.1em]">Resource Performance Registry</h4>
//                                              <p className="text-[10px] font-bold text-slate-400 capitalize tracking-wide mt-0.5">Granular workload actuals and breach signals</p>
//                                           </div>
//                                        </div>
//                                        <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-black text-indigo-600 capitalize tracking-widest shadow-sm">
//                                           {reportData.resourceUtilizations.length} Entries
//                                        </span>
//                                     </div>
//                                     <div className="overflow-x-auto no-scrollbar">
//                                        <table className="w-full text-left">
//                                           <thead>
//                                              <tr className="bg-slate-50/30 border-b border-slate-100">
//                                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] w-[25%]">Resource Profile</th>
//                                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] text-center">Actual Hours</th>
//                                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em]">Workload Utilization</th>
//                                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] text-center">Trend Signal</th>
//                                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] text-center">Score</th>
//                                              </tr>
//                                           </thead>
//                                           <tbody className="divide-y divide-slate-50">
//                                              {reportData.resourceUtilizations.map((res, idx) => (
//                                                 <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
//                                                    <td className="px-8 py-5">
//                                                       <div className="flex items-center gap-3">
//                                                          <div className="h-10 w-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 font-black text-xs capitalize group-hover:scale-110 transition-transform duration-300">
//                                                             {res.resourceName.charAt(0)}
//                                                          </div>
//                                                          <div className="flex flex-col gap-0.5">
//                                                             <span className="text-[13px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors capitalize tracking-tight">{res.resourceName}</span>
//                                                             <span className="text-[11px] font-bold text-slate-400 opacity-80">{res.role}</span>
//                                                          </div>
//                                                       </div>
//                                                    </td>
//                                                    <td className="px-8 py-5 text-center">
//                                                       <div className="inline-flex flex-col items-center gap-1 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner group-hover:bg-white transition-colors">
//                                                          <span className="text-[13px] font-black text-slate-700 tracking-tight">{res.totalHours?.toFixed(1)}h</span>
//                                                          <span className="text-[9px] font-bold text-slate-400 capitalize tracking-widest leading-none">Actual</span>
//                                                       </div>
//                                                    </td>
//                                                    <td className="px-8 py-5">
//                                                       <div className="flex flex-col gap-1.5 min-w-[180px]">
//                                                          <div className="flex items-center justify-between mb-1">
//                                                             <span className={`text-[11px] font-black tracking-[0.1em] capitalize ${res.utilizationBand === 'HIGH' || res.utilizationBand === 'CRITICAL' ? 'text-rose-600' : 'text-emerald-600'}`}>
//                                                                {res.utilizationBand} — {res.utilizationPercentage}%
//                                                             </span>
//                                                             {res.utilizationBand === 'HIGH' && <Zap size={12} className="text-amber-500 animate-pulse" fill="currentColor" />}
//                                                          </div>
//                                                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
//                                                             <div
//                                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${res.utilizationBand === 'HIGH' || res.utilizationBand === 'CRITICAL' ? 'bg-gradient-to-r from-rose-400 to-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.3)]' : 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'}`}
//                                                                style={{ width: `${Math.min(res.utilizationPercentage, 100)}%` }}
//                                                             />
//                                                          </div>
//                                                       </div>
//                                                    </td>
//                                                    <td className="px-8 py-5 text-center">
//                                                       <div className={`inline-flex items-center h-8 gap-2 text-[10px] font-black capitalize px-4 rounded-xl border-2 transition-all ${res.trendSignal === 'UP' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
//                                                          {res.trendSignal === 'UP' ? <ArrowUpRight size={14} strokeWidth={3} className="text-rose-500" /> : <ArrowDownRight size={14} strokeWidth={3} className="text-emerald-500" />}
//                                                          {res.trendSignal}
//                                                       </div>
//                                                    </td>
//                                                    <td className="px-8 py-5">
//                                                       <div className="flex items-center justify-center">
//                                                          <div className="relative h-12 w-12 flex items-center justify-center">
//                                                             <svg className="w-full h-full transform -rotate-90">
//                                                                <circle
//                                                                   cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
//                                                                   className="text-slate-100"
//                                                                />
//                                                                <circle
//                                                                   cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
//                                                                   strokeDasharray={126}
//                                                                   strokeDashoffset={126 - (126 * (res.confidenceScore || 0)) / 100}
//                                                                   className="text-indigo-600 transition-all duration-1000 ease-out"
//                                                                />
//                                                             </svg>
//                                                             <span className="absolute text-[11px] font-black text-indigo-900">{res.confidenceScore}%</span>
//                                                          </div>
//                                                       </div>
//                                                    </td>
//                                                 </tr>
//                                              ))}
//                                           </tbody>
//                                        </table>
//                                     </div>
//                                     <div className="px-8 py-5 bg-slate-900 flex items-center justify-between rounded-b-3xl">
//                                        <div className="flex items-center gap-3">
//                                           <ShieldCheck size={18} className="text-indigo-400" />
//                                           <p className="text-[10px] font-black text-indigo-400 capitalize tracking-[0.2em] italic">Validated performance registry synchronized with timesheet actuals</p>
//                                        </div>
//                                        <button className="text-[10px] font-black text-white px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors capitalize tracking-[0.1em]">View Audit Log</button>
//                                     </div>
//                                  </div>
//                               )}

//                               {/* --- PROJECT PERFORMANCE (Cards) --- */}
//                               {(reportParams.reportType === 'PROJECT' || reportParams.reportType === 'SUMMARY') && reportData.projectUtilizations && (
//                                  <div className="space-y-6">
//                                     <div className="flex items-center justify-between px-2">
//                                        <div className="flex items-center gap-3">
//                                           <div className="h-4 w-4 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
//                                           <h4 className="text-[14px] font-black text-[#081534] capitalize tracking-[0.2em]">Project Portfolio Yield Analysis</h4>
//                                        </div>
//                                        <div className="h-px flex-1 mx-8 bg-slate-200/50" />
//                                     </div>
//                                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
//                                        {reportData.projectUtilizations.map((proj, idx) => (
//                                           <div key={idx} className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
//                                              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
//                                              <div className="flex items-start justify-between mb-8">
//                                                 <div className="flex flex-col gap-1">
//                                                    <h5 className="text-[15px] font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors capitalize tracking-tight">{proj.projectName}</h5>
//                                                    <div className="flex items-center gap-2">
//                                                       <Briefcase size={12} className="text-slate-400" />
//                                                       <span className="text-[11px] font-black text-slate-400 capitalize tracking-widest">{proj.clientName}</span>
//                                                    </div>
//                                                 </div>
//                                                 <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all duration-500">
//                                                    <Monitor size={24} strokeWidth={2.5} />
//                                                 </div>
//                                              </div>

//                                              <div className="grid grid-cols-2 gap-8 mb-8">
//                                                 <div>
//                                                    <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1.5">Load Status</p>
//                                                    <div className="flex items-center gap-2">
//                                                       <span className={`text-2xl font-black tracking-tight ${proj.utilizationPercentage > 90 ? 'text-rose-600' : 'text-slate-900'}`}>{proj.utilizationPercentage}%</span>
//                                                       <TrendingUpIcon size={14} className={proj.utilizationPercentage > 90 ? 'text-rose-600' : 'text-emerald-600'} />
//                                                    </div>
//                                                 </div>
//                                                 <div>
//                                                    <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1.5">Billable Yield</p>
//                                                    <p className="text-2xl font-black text-indigo-600 tracking-tight">{proj.billableRatio}%</p>
//                                                 </div>
//                                              </div>

//                                              <div className="space-y-4">
//                                                 <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
//                                                    <div
//                                                       className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-1000`}
//                                                       style={{ width: `${proj.billableRatio}%` }}
//                                                    />
//                                                 </div>
//                                                 <div className="flex items-center justify-between text-[11px] font-black capitalize tracking-widest text-slate-500 px-1">
//                                                    <span className="flex items-center gap-1.5"><Users size={12} /> {proj.resourceCount} Resources</span>
//                                                    <span className="flex items-center gap-1.5"><History size={12} /> {proj.totalHours}h Logged</span>
//                                                 </div>
//                                              </div>
//                                           </div>
//                                        ))}
//                                     </div>
//                                  </div>
//                               )}

//                               {/* --- ROLE PERFORMANCE REGISTRY --- */}
//                               {(reportParams.reportType === 'ROLE' || reportParams.reportType === 'SUMMARY') && reportData.roleUtilizations && (
//                                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700 mt-8">
//                                     <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/20">
//                                        <div className="flex items-center gap-4">
//                                           <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
//                                              <Award size={22} strokeWidth={2.5} />
//                                           </div>
//                                           <div>
//                                              <h4 className="text-[13px] font-black text-slate-900 capitalize tracking-[0.1em]">Role Performance Registry</h4>
//                                              <p className="text-[10px] font-bold text-slate-400 capitalize tracking-wide mt-0.5">Capability-based workload analytics</p>
//                                           </div>
//                                        </div>
//                                        <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-black text-emerald-600 capitalize tracking-widest shadow-sm">
//                                           {reportData.roleUtilizations.length} Roles
//                                        </span>
//                                     </div>
//                                     <div className="overflow-x-auto no-scrollbar">
//                                        <table className="w-full text-left">
//                                           <thead>
//                                              <tr className="bg-slate-50/30 border-b border-slate-100">
//                                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] w-[25%]">Capability Role</th>
//                                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] text-center">Pooled Hours</th>
//                                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] text-center">Unique Resources</th>
//                                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em]">Group Utilization</th>
//                                                 <th className="px-8 py-5 text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] text-center">Yield</th>
//                                              </tr>
//                                           </thead>
//                                           <tbody className="divide-y divide-slate-50">
//                                              {reportData.roleUtilizations.map((role, idx) => (
//                                                 <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
//                                                    <td className="px-8 py-5">
//                                                       <div className="flex items-center gap-3">
//                                                          <div className="flex flex-col gap-0.5">
//                                                             <span className="text-[13px] font-black text-slate-900 capitalize tracking-tight">{role.roleName}</span>
//                                                          </div>
//                                                       </div>
//                                                    </td>
//                                                    <td className="px-8 py-5 text-center">
//                                                       <span className="text-[13px] font-black text-slate-700">{role.totalHours?.toFixed(1)}h</span>
//                                                    </td>
//                                                    <td className="px-8 py-5 text-center">
//                                                       <span className="text-[13px] font-black text-indigo-600">{role.resourceCount}</span>
//                                                    </td>
//                                                    <td className="px-8 py-5">
//                                                       <div className="flex flex-col gap-1.5 min-w-[150px]">
//                                                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
//                                                             <div
//                                                                className="h-full bg-emerald-500 rounded-full"
//                                                                style={{ width: `${role.utilizationPercentage}%` }}
//                                                             />
//                                                          </div>
//                                                          <span className="text-[10px] font-black text-slate-500">{role.utilizationPercentage}%</span>
//                                                       </div>
//                                                    </td>
//                                                    <td className="px-8 py-5 text-center">
//                                                       <span className="text-[13px] font-black text-emerald-600">{role.billableRatio || 0}%</span>
//                                                    </td>
//                                                 </tr>
//                                              ))}
//                                           </tbody>
//                                        </table>
//                                     </div>
//                                  </div>
//                               )}

//                               {/* --- CLIENT PERFORMANCE REGISTRY --- */}
//                               {(reportParams.reportType === 'CLIENT' || reportParams.reportType === 'SUMMARY') && reportData.clientUtilizations && (
//                                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700 mt-10">
//                                     <div className="flex items-center justify-between px-2">
//                                        <div className="flex items-center gap-3">
//                                           <div className="h-4 w-4 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
//                                           <h4 className="text-[14px] font-black text-[#081534] capitalize tracking-[0.2em]">External Client Yield Analysis</h4>
//                                        </div>
//                                        <div className="h-px flex-1 mx-8 bg-slate-200/50" />
//                                     </div>
//                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                                        {reportData.clientUtilizations.map((client, idx) => (
//                                           <div key={idx} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-lg transition-all group overflow-hidden relative">
//                                              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
//                                                 <Briefcase size={60} />
//                                              </div>
//                                              <div className="flex flex-col gap-4">
//                                                 <div>
//                                                    <h5 className="text-[14px] font-black text-slate-900 capitalize tracking-tight group-hover:text-blue-600 transition-colors">{client.clientName}</h5>
//                                                    <p className="text-[10px] font-bold text-slate-400 capitalize tracking-widest">{client.projectCount} Projects</p>
//                                                 </div>
//                                                 <div className="grid grid-cols-2 gap-4">
//                                                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
//                                                       <span className="text-[9px] font-black text-slate-400 capitalize tracking-widest block mb-1">Total Hours</span>
//                                                       <span className="text-[16px] font-black text-slate-900">{client.totalHours?.toFixed(0)}h</span>
//                                                    </div>
//                                                    <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
//                                                       <span className="text-[9px] font-black text-blue-400 capitalize tracking-widest block mb-1">Billable Ratio</span>
//                                                       <span className="text-[16px] font-black text-blue-600">{client.billableRatio || 0}%</span>
//                                                    </div>
//                                                 </div>
//                                                 <div className="flex items-center gap-4 text-[10px] font-black capitalize tracking-widest text-slate-400 border-t border-slate-50 pt-4">
//                                                    <span>Resources: {client.resourceCount}</span>
//                                                    <span>Utilization: {client.utilizationPercentage}%</span>
//                                                 </div>
//                                              </div>
//                                           </div>
//                                        ))}
//                                     </div>
//                                  </div>
//                               )}

//                               {/* --- STRATEGIC PATTERN DETECTION --- */}
//                               {reportData.patterns && reportData.patterns.length > 0 && (
//                                  <div className="bg-[#081534] rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden group mt-10">
//                                     <div className="absolute top-0 right-0 opacity-[0.03] p-12 pointer-events-none">
//                                        <Fingerprint size={200} />
//                                     </div>
//                                     <div className="flex items-center gap-4 mb-8">
//                                        <div className="h-10 w-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30">
//                                           <Target size={22} strokeWidth={2.5} />
//                                        </div>
//                                        <div>
//                                           <h4 className="text-[14px] font-black text-white capitalize tracking-[0.2em]">Strategic Pattern Detection</h4>
//                                           <p className="text-[10px] font-bold text-slate-500 capitalize tracking-widest mt-0.5">Sustained directional signals identified by intelligence engine</p>
//                                        </div>
//                                     </div>
//                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                        {reportData.patterns.map((pattern, idx) => (
//                                           <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-all group">
//                                              <div className="flex items-start justify-between mb-4">
//                                                 <div>
//                                                    <h6 className="text-[13px] font-black text-white capitalize tracking-tight mb-1">{pattern.title}</h6>
//                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black capitalize tracking-widest ${pattern.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
//                                                       {pattern.severity}
//                                                    </span>
//                                                 </div>
//                                                 <div className="text-right">
//                                                    <p className="text-[10px] font-black text-slate-500 capitalize tracking-widest mb-1">Signal strength</p>
//                                                    <p className="text-[18px] font-black text-indigo-400 leading-none">{pattern.averageUtilization}%</p>
//                                                 </div>
//                                              </div>
//                                              <p className="text-[11px] font-medium text-slate-400 italic leading-relaxed mb-4 border-l-2 border-indigo-500 pl-4 py-1">{pattern.description}</p>
//                                              <div className="flex items-center justify-between text-[10px] font-black capitalize tracking-widest">
//                                                 <span className="text-slate-500">Duration: {pattern.durationWeeks} Weeks</span>
//                                                 <span className="text-indigo-400">Recommendation: {pattern.recommendation}</span>
//                                              </div>
//                                           </div>
//                                        ))}
//                                     </div>
//                                  </div>
//                               )}
//                            </div>
//                         )}
//                      </div>
//                   )}
