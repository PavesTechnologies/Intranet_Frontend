import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart
} from 'recharts';
import {
  Download, Filter, Search, Users, Activity,
  Briefcase, FileText, ChevronRight, TrendingUp, AlertTriangle, RefreshCcw, Monitor, ShieldCheck, Clock, Award, ShieldAlert, ArrowUpRight, ArrowDownRight, Zap
} from 'lucide-react';
import { utilizationService } from '../../services/utilizationService';
import toast from 'react-hot-toast';

const MOCK_REPORT_DATA = {
  totalHours: 12450.5,
  utilizationPercentage: 82.4,
  totalResources: 145,
  confidenceScore: 98,
  alerts: [
    { severity: 'CRITICAL', resourceName: 'Alex Mercer', message: 'Sustained over-utilization (110%) for 3 consecutive weeks.', recommendation: 'Redistribute workload immediately.' },
    { severity: 'WARNING', resourceName: 'Sarah Chen', message: 'Under-utilization (45%) detected this month.', recommendation: 'Assign to pending internal projects.' }
  ],
  resourceUtilizations: [
    { resourceName: 'Alex Mercer', role: 'Senior Developer', totalHours: 180, utilizationPercentage: 110, utilizationBand: 'CRITICAL', trendSignal: 'UP', confidenceScore: 100 },
    { resourceName: 'Sarah Chen', role: 'UX Designer', totalHours: 72, utilizationPercentage: 45, utilizationBand: 'LOW', trendSignal: 'DOWN', confidenceScore: 100 },
    { resourceName: 'Michael Chang', role: 'Project Manager', totalHours: 160, utilizationPercentage: 100, utilizationBand: 'OPTIMAL', trendSignal: 'UP', confidenceScore: 95 },
    { resourceName: 'Emma Watson', role: 'Frontend Engineer', totalHours: 140, utilizationPercentage: 87, utilizationBand: 'OPTIMAL', trendSignal: 'UP', confidenceScore: 98 },
    { resourceName: 'James Rodriguez', role: 'Backend Engineer', totalHours: 155, utilizationPercentage: 96, utilizationBand: 'HIGH', trendSignal: 'UP', confidenceScore: 100 }
  ],
  projectUtilizations: [
    { projectName: 'Project Phoenix', clientName: 'Acme Corp', utilizationPercentage: 92, billableRatio: 90, resourceCount: 12, totalHours: 1840 },
    { projectName: 'Project Titan', clientName: 'Stark Ind.', utilizationPercentage: 105, billableRatio: 98, resourceCount: 8, totalHours: 1350 },
    { projectName: 'Internal Tools', clientName: 'Internal', utilizationPercentage: 65, billableRatio: 0, resourceCount: 5, totalHours: 600 }
  ],
  roleUtilizations: [
    { roleName: 'Frontend Engineer', totalHours: 4200, resourceCount: 35, utilizationPercentage: 85, billableRatio: 80 },
    { roleName: 'Backend Engineer', totalHours: 3800, resourceCount: 30, utilizationPercentage: 88, billableRatio: 85 },
    { roleName: 'UX Designer', totalHours: 1200, resourceCount: 15, utilizationPercentage: 70, billableRatio: 65 }
  ],
  clientUtilizations: [
    { clientName: 'Acme Corp', activeProjects: 3, totalHours: 2400, utilizationPercentage: 88, revenueYield: 92, status: 'Healthy' },
    { clientName: 'Stark Ind.', activeProjects: 2, totalHours: 1800, utilizationPercentage: 95, revenueYield: 98, status: 'Over-Serviced' }
  ]
};

const getTodayStr = () => new Date().toISOString().split('T')[0];
const getLastYearStr = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
};

const UtilizationReportingDashboard = () => {
  const [reportParams, setReportParams] = useState({
    startDate: getLastYearStr(),
    endDate: getTodayStr(),
    reportType: 'SUMMARY',
    groupBy: 'WEEKLY',
    approvedOnly: true,
    includeTrends: true,
    includeAlerts: true,
    overUtilizationThreshold: 95,
    underUtilizationThreshold: 50,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ANOMALIES');

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await utilizationService.generateUtilizationReport(reportParams);
      setReportData(data);
    } catch (err) {
      console.error(err);
      setError('Failed to generate report. Please try again.');
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickReport = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await utilizationService.getQuickUtilizationReport();
      setReportData(data);
      toast.success('Quick report loaded');
    } catch (err) {
      console.error(err);
      setError('Failed to load quick report.');
      toast.error('Failed to load quick report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      toast.loading('Exporting CSV...', { id: 'csv-export' });
      await utilizationService.exportUtilizationCSV(reportParams);
      toast.success('Export successful', { id: 'csv-export' });
    } catch (err) {
      toast.error('Export failed', { id: 'csv-export' });
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.loading('Exporting Excel...', { id: 'excel-export' });
      await utilizationService.exportUtilizationExcel(reportParams);
      toast.success('Export successful', { id: 'excel-export' });
    } catch (err) {
      toast.error('Export failed', { id: 'excel-export' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans select-none selection:bg-indigo-100 selection:text-indigo-900">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-none">Utilization Reporting & Dashboards</h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 capitalize tracking-normal flex items-center gap-2">
            <Activity size={14} className="text-emerald-600" /> Comprehensive utilization analytics by dimension
          </p>
        </div>
      </div>

      {/* Report Config Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative group mb-6">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
          <FileText size={120} />
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 flex-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Period Start</label>
              <input
                type="date"
                value={reportParams.startDate}
                max={reportParams.endDate}
                min={
                  reportParams.endDate
                    ? new Date(new Date(reportParams.endDate).setFullYear(new Date(reportParams.endDate).getFullYear() - 1)).toISOString().split('T')[0]
                    : undefined
                }
                onChange={(e) => setReportParams({ ...reportParams, startDate: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all tracking-tight"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Period End</label>
              <input
                type="date"
                value={reportParams.endDate}
                min={reportParams.startDate}
                max={
                  reportParams.startDate
                    ? new Date(new Date(reportParams.startDate).setFullYear(new Date(reportParams.startDate).getFullYear() + 1)).toISOString().split('T')[0]
                    : undefined
                }
                onChange={(e) => setReportParams({ ...reportParams, endDate: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all tracking-tight"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Report Type</label>
              <div className="relative">
                <select
                  value={reportParams.reportType}
                  onChange={(e) => {
                    const type = e.target.value;
                    setReportParams({ ...reportParams, reportType: type });
                    if (type === 'SUMMARY') {
                      setActiveTab('ANOMALIES');
                    } else {
                      setActiveTab(type);
                    }
                  }}
                  className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer tracking-tight truncate"
                >
                  <option value="SUMMARY">SUMMARY (Overview)</option>
                  <option value="RESOURCE">RESOURCE</option>
                  <option value="PROJECT">PROJECT</option>
                  <option value="CLIENT">CLIENT</option>
                  <option value="ROLE">ROLE</option>
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Grouping</label>
              <div className="relative">
                <select
                  value={reportParams.groupBy}
                  onChange={(e) => setReportParams({ ...reportParams, groupBy: e.target.value })}
                  className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer tracking-tight truncate"
                >
                  <option value="WEEKLY">WEEKLY</option>
                  <option value="MONTHLY">MONTHLY</option>
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="h-10 px-6 rounded-xl bg-emerald-600 text-white text-[12px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              {isGenerating ? <RefreshCcw size={16} className="animate-spin" /> : <TrendingUp size={16} />}
              {isGenerating ? 'GENERATING...' : 'GENERATE'}
            </button>
            <button
              onClick={handleQuickReport}
              disabled={isGenerating}
              className="h-10 px-4 rounded-xl bg-slate-100 text-slate-700 text-[12px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              title="Quick Report"
            >
              <Zap size={16} className="text-amber-500" /> Quick
            </button>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <button
                onClick={handleExportCSV}
                disabled={!reportData}
                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <Download size={18} />
                <span className="text-[10px] font-black uppercase">CSV</span>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={!reportData}
                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <FileText size={18} />
                <span className="text-[10px] font-black uppercase">Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-4 mb-6 shadow-sm">
          <AlertTriangle size={20} className="text-rose-500" />
          <div>
            <h4 className="text-[11px] font-black text-rose-900 uppercase">Error</h4>
            <p className="text-[12px] font-bold text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {!reportData && !isGenerating && !error && (
        <div className="bg-white rounded-3xl border border-dotted border-slate-200 p-24 flex flex-col items-center justify-center text-center group">
          <div className="h-20 w-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-8 border border-emerald-100 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
            <BarChart className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Utilization Reporting Engine</h3>
          <p className="mt-3 text-[13px] font-medium text-slate-400 max-w-sm italic">Configure your parameters above to generate utilization analytics across multiple dimensions.</p>
        </div>
      )}

      {isGenerating && (
        <div className="bg-white rounded-3xl border border-slate-100 p-24 flex flex-col items-center justify-center text-center">
          <div className="h-20 w-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-8 border border-emerald-100 animate-pulse">
            <RefreshCcw size={40} className="animate-spin" />
          </div>
          <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tight">Compiling Intelligence Report</h3>
          <p className="mt-3 text-[13px] font-medium text-slate-400 max-w-sm italic leading-relaxed">Aggregating timesheet actuals...</p>
        </div>
      )}

      {reportData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Actual Hours', value: reportData.totalHours, icon: <Clock />, color: 'text-indigo-600' },
              { label: 'Utilization %', value: `${reportData.utilizationPercentage}%`, icon: <TrendingUp />, color: 'text-emerald-600' },
              { label: 'Total Resources', value: reportData.totalResources, icon: <Users />, color: 'text-blue-600' },
              { label: 'Confidence Score', value: `${reportData.confidenceScore}%`, icon: <ShieldCheck />, color: 'text-amber-600' }
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                <div className={`h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner flex items-center justify-center ${kpi.color}`}>
                  {React.cloneElement(kpi.icon, { size: 28, strokeWidth: 2.5 })}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{kpi.label}</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
             {['ANOMALIES', 'RESOURCE', 'PROJECT', 'ROLE', 'CLIENT'].map(tab => (
                <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 flex-1 ${activeTab === tab ? 'text-emerald-600 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'}`}
                >
                   {tab === 'ANOMALIES' ? 'UTILIZATION ANOMALIES' : `${tab} UTILIZATION REPORT`}
                </button>
             ))}
          </div>

          {/* Alerts */}
          {activeTab === 'ANOMALIES' && reportParams.includeAlerts && reportData.alerts?.length >= 0 && (
            <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden relative">
              <div className="bg-rose-50/50 px-8 py-5 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-rose-100 text-rose-500 rounded-lg flex items-center justify-center shadow-sm">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-rose-900 uppercase tracking-[0.1em]">Utilization Anomalies ({reportData.alerts?.length || 0})</h4>
                  </div>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                {(reportData.alerts || []).map((alert, idx) => (
                  <div key={idx} className="p-5 bg-slate-50/30 rounded-2xl border border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-black text-slate-900 uppercase">{alert.resourceName}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{alert.severity}</span>
                    </div>
                    <p className="text-[12px] font-medium text-slate-500">{alert.message}</p>
                    <p className="text-[11px] font-bold text-indigo-600 mt-2">Action: {alert.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resource Breakdown */}
          {activeTab === 'RESOURCE' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <Users className="text-indigo-600" />
                  <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.1em]">Resource Utilization Report</h4>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100">
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase">Resource</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Hours</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Billable %</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase">Utilization</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Status</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Trend</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {(Array.isArray(reportData) ? reportData : reportData.resourceUtilizations || []).map((res, idx) => (
                           <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-8 py-4">
                                 <div className="flex flex-col">
                                    <span className="text-[13px] font-black text-slate-900">{res.resourceName}</span>
                                    <span className="text-[11px] text-slate-500">{res.role}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-4 text-center font-bold">{res.totalHours}h</td>
                              <td className="px-8 py-4 text-center text-[12px] font-medium text-slate-600">{res.billableRatio}%</td>
                              <td className="px-8 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                       <div
                                          className={`h-full rounded-full ${res.utilizationPercentage > 100 ? 'bg-rose-500' : res.utilizationPercentage < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                          style={{ width: `${Math.min(res.utilizationPercentage, 100)}%` }}
                                       />
                                    </div>
                                    <span className="text-[11px] font-bold">{res.utilizationPercentage}%</span>
                                 </div>
                              </td>
                              <td className="px-8 py-4 text-center">
                                 <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${res.utilizationBand === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : res.utilizationBand === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{res.utilizationBand || 'HEALTHY'}</span>
                              </td>
                              <td className="px-8 py-4 text-center">
                                 {res.trendSignal === 'UP' ? <ArrowUpRight className="inline text-emerald-500" size={16} /> : res.trendSignal === 'DOWN' ? <ArrowDownRight className="inline text-rose-500" size={16} /> : <span className="text-slate-400 font-bold">-</span>}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

           {/* Project Breakdown */}
           {activeTab === 'PROJECT' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-6">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <Monitor className="text-blue-600" />
                  <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.1em]">Project Utilization Report</h4>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100">
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase">Project</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Client</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Resources</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Hours</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase">Utilization</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {(Array.isArray(reportData) ? reportData : reportData.projectUtilizations || []).map((proj, idx) => (
                           <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-8 py-4 font-black text-[13px] text-slate-900">{proj.projectName}</td>
                              <td className="px-8 py-4 text-center text-[12px] text-slate-600">{proj.clientName}</td>
                              <td className="px-8 py-4 text-center text-[12px] text-slate-600">{proj.uniqueResources}</td>
                              <td className="px-8 py-4 text-center font-bold">{proj.totalHours}h</td>
                              <td className="px-8 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                       <div
                                          className={`h-full rounded-full bg-blue-500`}
                                          style={{ width: `${Math.min(proj.utilizationPercentage, 100)}%` }}
                                       />
                                    </div>
                                    <span className="text-[11px] font-bold">{proj.utilizationPercentage}%</span>
                                 </div>
                              </td>
                              <td className="px-8 py-4 text-center">
                                 <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${proj.utilizationBand === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : proj.utilizationBand === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{proj.utilizationBand || 'HEALTHY'}</span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

           {/* Role Breakdown */}
           {activeTab === 'ROLE' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-6">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <Award className="text-amber-600" />
                  <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.1em]">Role Utilization Report</h4>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100">
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase">Role</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Resources</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Hours</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase">Utilization</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {(Array.isArray(reportData) ? reportData : reportData.roleUtilizations || []).map((role, idx) => (
                           <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-8 py-4 font-black text-[13px] text-slate-900">{role.roleName}</td>
                              <td className="px-8 py-4 text-center text-[12px] text-slate-600">{role.uniqueResources}</td>
                              <td className="px-8 py-4 text-center font-bold">{role.totalHours}h</td>
                              <td className="px-8 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                       <div
                                          className={`h-full rounded-full bg-amber-500`}
                                          style={{ width: `${Math.min(role.utilizationPercentage, 100)}%` }}
                                       />
                                    </div>
                                    <span className="text-[11px] font-bold">{role.utilizationPercentage}%</span>
                                 </div>
                              </td>
                              <td className="px-8 py-4 text-center">
                                 <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${role.utilizationBand === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : role.utilizationBand === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{role.utilizationBand || 'HEALTHY'}</span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

           {/* Client Breakdown */}
           {activeTab === 'CLIENT' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-6">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                  <Briefcase className="text-purple-600" />
                  <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.1em]">Client Utilization Report</h4>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100">
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase">Client</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Active Projects</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Hours</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase">Utilization</th>
                           <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase text-center">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {(Array.isArray(reportData) ? reportData : reportData.clientUtilizations || []).map((client, idx) => (
                           <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-8 py-4 font-black text-[13px] text-slate-900">{client.clientName}</td>
                              <td className="px-8 py-4 text-center text-[12px] text-slate-600">{client.uniqueProjects}</td>
                              <td className="px-8 py-4 text-center font-bold">{client.totalHours}h</td>
                              <td className="px-8 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                       <div
                                          className={`h-full rounded-full bg-purple-500`}
                                          style={{ width: `${Math.min(client.utilizationPercentage, 100)}%` }}
                                       />
                                    </div>
                                    <span className="text-[11px] font-bold">{client.utilizationPercentage}%</span>
                                 </div>
                              </td>
                              <td className="px-8 py-4 text-center">
                                 <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${client.utilizationBand === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : client.utilizationBand === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{client.utilizationBand || 'HEALTHY'}</span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default UtilizationReportingDashboard;
