import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PrevIcon, ProjectsIcon, TimeIcon, BillingIcon, EmployeeIcon, SearchIcon, AnalyticsIcon, BarChartIcon, HistoryIcon, ScaleIcon, CircleIcon } from "@/components/icons";
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Pagination from "../../../../components/Pagination/pagination";
import GenericTable from "../../../../components/Table/table";
import { getOperationalProjectDetail } from "../services/operationalProjectsService";

const ITEMS_PER_PAGE = 4;
const BILLING_COLORS = {
  billable: "#4f46e5",
  nonBillable: "#818cf8",
  internal: "#cbd5e1",
};

const formatMetric = (value, suffix = "") => {
  const number = Number(value);
  return Number.isFinite(number) ? `${number}${suffix}` : "--";
};

const getNumber = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null && item !== "");
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getArrayValue = (...values) => values.find((value) => Array.isArray(value)) || [];

const normalizeDetailPayload = (payload, projectId) => {
  const detail = payload?.data || payload;
  const project = detail?.project || detail?.projectInfo || detail?.projectDetails || detail || {};
  const resources = detail?.resources || detail?.projectResources || detail?.allocations || [];

  const billableHours = getNumber(project.billableHours, project.billable, project.billableHour);
  const nonBillableHours = getNumber(project.nonBillableHours, project.nonBillable, project.nonBillableHour);
  const resourceHours = getNumber(
    project.resourceHours ?? project.totalResourceHours ?? project.totalHours ?? billableHours + nonBillableHours,
  );
  const internalHours = Math.max(resourceHours - billableHours - nonBillableHours, 0);
  const totalBillingBase = billableHours + nonBillableHours + internalHours;
  const trend = getArrayValue(
    detail?.portfolioTrend,
    detail?.trend,
    detail?.trends,
    detail?.utilizationTrend,
    detail?.weeklySummary,
    project?.portfolioTrend,
    project?.trend,
    project?.trends,
    project?.utilizationTrend,
    project?.weeklySummary,
  );

  return {
    project: {
      id: project.projectId || project.pmsProjectId || projectId,
      name: project.projectName || project.project || project.name || "Unnamed Project",
      clientName: project.clientName || project.client?.client_name || project.client || "Client Project",
      plannedHours: getNumber(project.plannedHours, project.planned),
      actualHours: getNumber(project.actualHours, project.actual),
      pendingHours: getNumber(project.pendingHours, project.pending),
      utilization: getNumber(project.utilization, project.utilizationPercentage, project.utilizationPercent),
      billableHours,
      nonBillableHours,
      internalHours,
      billablePercentage: totalBillingBase > 0 ? Number(((billableHours / totalBillingBase) * 100).toFixed(1)) : 0,
      nonBillablePercentage: totalBillingBase > 0 ? Number(((nonBillableHours / totalBillingBase) * 100).toFixed(1)) : 0,
      internalPercentage: totalBillingBase > 0 ? Number(((internalHours / totalBillingBase) * 100).toFixed(1)) : 0,
    },
    resources: Array.isArray(resources) ? resources : [],
    trend,
  };
};

const getResourceName = (resource) =>
  resource.fullName || resource.resourceName || resource.employeeName || resource.name || `Resource ${resource.resourceId || ""}`.trim();

const getResourceEmail = (resource) => resource.email || resource.employeeEmail || resource.mail || "--";

const getBillableHours = (resource) =>
  resource.billableHours ?? resource.billableHour ?? resource.billable ?? resource.billableUtilization ?? null;

const getNonBillableHours = (resource) =>
  resource.nonBillableHours ?? resource.nonBillableHour ?? resource.nonBillable ?? resource.nonBillableUtilization ?? null;

const buildProjectPortfolioTrend = (projectDetail) => {
  const trend = projectDetail?.trend || [];

  if (trend.length > 0) {
    return trend.map((item, index) => {
      const actual = getNumber(item.actualHours, item.actual, item.totalHours, item.hours);
      const planned = getNumber(item.plannedHours, item.planned, item.allocatedHours, item.capacityHours);
      const util = getNumber(
        item.utilization,
        item.utilizationPercentage,
        item.utilizationPercent,
        planned > 0 ? ((actual / planned) * 100).toFixed(1) : 0,
      );

      return {
        period: item.period || item.week || item.month || item.date || `P${index + 1}`,
        actual,
        planned,
        util,
      };
    });
  }

  const project = projectDetail?.project || {};
  return [
    {
      period: "Project",
      actual: project.actualHours || project.billableHours + project.nonBillableHours,
      planned: project.plannedHours,
      util: project.utilization,
    },
  ];
};

const PerformanceTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const pointData = payload[0].payload;
    const planned = pointData.planned !== undefined ? pointData.planned : pointData.plannedHours;

    return (
      <div className="bg-[#081534]/95 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl p-5 flex flex-col gap-3 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-2 mb-1">
          <p className="text-[10px] font-black text-slate-400 capitalize tracking-[0.2em]">{label || 'Period'}</p>
          <CircleIcon size={8} className="text-indigo-400 fill-indigo-400 animate-pulse" />
        </div>
        <div className="space-y-3">
          {payload.map((p, idx) => (
            <div key={`${p.name}-${idx}`} className="flex items-center justify-between gap-6 group">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-2 w-2 rounded-full border border-white/20"
                  style={{
                    backgroundColor: p.color || p.payload?.fill || p.stroke || '#4f46e5',
                    boxShadow: `0 0 8px ${(p.color || p.payload?.fill || p.stroke || '#4f46e5')}66`
                  }}
                />
                <span className="text-[11px] font-bold text-slate-300 capitalize tracking-tight group-hover:text-white transition-colors">{p.name}:</span>
              </div>
              <span className="text-[12px] font-black text-white tabular-nums">
                {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{p.name.toLowerCase().includes('%') ? '%' : 'h'}
              </span>
            </div>
          ))}

          {planned !== undefined && (
            <div className="flex items-center justify-between gap-6 pt-3 mt-1 border-t border-slate-700/30">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-slate-500 border border-white/10" />
                <span className="text-[11px] font-bold text-slate-400 capitalize tracking-tight">Planned Hours:</span>
              </div>
              <span className="text-[12px] font-black text-slate-300 tabular-nums">{Number(planned).toFixed(1)}h</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 opacity-50">
          <div className="h-px flex-1 bg-slate-700" />
          <span className="text-[8px] font-black text-slate-500 capitalize tracking-widest">Validated</span>
          <div className="h-px flex-1 bg-slate-700" />
        </div>
      </div>
    );
  }
  return null;
};

const OperationalProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [projectDetail, setProjectDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [activeDetailView, setActiveDetailView] = useState("portfolio");

  useEffect(() => {
    const loadProjectDetail = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getOperationalProjectDetail(projectId);
        setProjectDetail(normalizeDetailPayload(response, projectId));
      } catch (err) {
        console.error("Failed to fetch operational project detail", err);
        setError(err?.response?.data?.message || "Failed to fetch project detail.");
      } finally {
        setLoading(false);
      }
    };

    loadProjectDetail();
  }, [projectId]);

  const filteredResources = useMemo(() => {
    const resources = projectDetail?.resources || [];
    return resources.filter((resource) =>
      getResourceName(resource).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getResourceEmail(resource).toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [projectDetail?.resources, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / ITEMS_PER_PAGE));

  const paginatedResources = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredResources.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredResources, page]);

  const portfolioTrendData = useMemo(() => buildProjectPortfolioTrend(projectDetail), [projectDetail]);

  const billingPieData = useMemo(() => {
    const project = projectDetail?.project || {};
    return [
      { name: "Billable", value: project.billableHours || 0, percent: project.billablePercentage || 0, color: BILLING_COLORS.billable },
      { name: "Non-Billable", value: project.nonBillableHours || 0, percent: project.nonBillablePercentage || 0, color: BILLING_COLORS.nonBillable },
      { name: "Internal", value: project.internalHours || 0, percent: project.internalPercentage || 0, color: BILLING_COLORS.internal },
    ].filter((item) => item.value > 0 || item.percent > 0);
  }, [projectDetail]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, activeDetailView]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFE] flex items-center justify-center p-6">
        <LoadingSpinner text="Projects Loading..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFDFE] p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  const project = projectDetail?.project;

  return (
    <div className="min-h-screen bg-[#FDFDFE] p-6 font-sans select-none">
      {/* Header â€” Unified Command Strip */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/resource-management/bench/utilization-performance", { state: { activeTab: "projects" } })}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <PrevIcon size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">{project?.name}</h1>
            <p className="mt-1.5 text-xs font-semibold text-slate-400 capitalize tracking-widest">{project?.clientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/resource-management/bench/utilization-reporting')}
            className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm h-[42px]"
          >
            <BarChartIcon className="h-4 w-4 text-emerald-600" />
            REPORT & DASHBOARD
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="flex flex-nowrap gap-4 overflow-x-auto no-scrollbar mb-8">
        {[
          { label: "Project Health", value: project?.utilization >= 90 ? "Optimal" : project?.utilization >= 70 ? "Warning" : "Critical", icon: ProjectsIcon, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Hours (Act / Plan)", value: `${formatMetric(project?.actualHours)} / ${formatMetric(project?.plannedHours, "h")}`, icon: TimeIcon, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Utilization", value: formatMetric(project?.utilization, "%"), icon: EmployeeIcon, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Billable Strip", value: `${formatMetric(project?.billableHours, "h")} B / ${formatMetric(project?.nonBillableHours, "h")} NB`, icon: BillingIcon, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((card) => (
          <div key={card.label} className="flex min-w-[240px] flex-1 items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md group">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm ${card.bg} ${card.color} group-hover:scale-105 transition-transform`}>
              <card.icon size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[10px] font-bold capitalize tracking-wider text-slate-400">{card.label}</p>
              <p className="text-lg font-black tracking-tight text-slate-900 truncate">{card.value || "--"}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-end gap-10 overflow-x-auto no-scrollbar">
          {[
            { id: "portfolio", label: "Portfolio Analytics", icon: AnalyticsIcon },
            { id: "resources", label: "Resource Contributions", icon: EmployeeIcon },
          ].map((tab) => {
            const isActive = activeDetailView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveDetailView(tab.id)}
                className={`group relative flex items-center gap-2 pb-3.5 pt-2 whitespace-nowrap transition-all ${isActive ? "text-[#081534]" : "text-slate-400 hover:text-slate-600"
                  }`}
              >
                <tab.icon size={14} />
                <span className={`text-sm font-semibold tracking-tight ${isActive ? "text-[#081534]" : "text-slate-600"}`}>
                  {tab.label}
                </span>
                <span className={`absolute bottom-0 left-0 h-0.5 rounded-full bg-[#081534] transition-all ${isActive ? "w-full opacity-100" : "w-0 opacity-0"}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeDetailView === "portfolio" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[12px] font-black text-[#081534] capitalize tracking-[0.2em] leading-none">Project Performance Overview</h3>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full overflow-x-auto no-scrollbar">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={portfolioTrendData} margin={{ bottom: 30, right: 20 }}>
                    <defs>
                      <linearGradient id="utilGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f8fafc" />
                    <XAxis
                      dataKey="period"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }}
                      interval={0}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} domain={[0, 100]} />
                    <RechartsTooltip
                      content={<PerformanceTooltip />}
                    />
                    <Area type="monotone" dataKey="util" fill="url(#utilGradient)" stroke="#4f46e5" strokeWidth={4} name="Utilization %" animationDuration={1500} />
                    <Line type="monotone" dataKey="actual" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" dot={false} name="Actual Hours" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 border-t border-slate-50 pt-6">
                <div className="flex items-center gap-2.5">
                  <HistoryIcon size={14} className="text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-600 capitalize tracking-widest">Trend Preservation Active</span>
                </div>
                <div className="flex items-center gap-2.5 border-l border-slate-200 pl-6">
                  <ScaleIcon size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest italic opacity-70">Comparison: Planned vs Realized</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col group overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[12px] font-black text-[#081534] capitalize tracking-[0.2em] leading-none mb-1">Billing Yield Index</h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                  <AnalyticsIcon size={20} />
                </div>
              </div>

              {billingPieData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-slate-100">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                    <AnalyticsIcon className="text-slate-300" size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-400 capitalize tracking-widest">No Intelligence Data</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 h-60 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={billingPieData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                        >
                          {billingPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} cornerRadius={4} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none pt-1">
                      <span className="text-[20px] font-black text-slate-900 leading-none">{formatMetric(project?.billablePercentage, "%")}</span>
                      <span className="text-[9px] font-black text-slate-400 capitalize tracking-widest mt-0.5">Billable</span>
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    {billingPieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-50 bg-slate-50/30 p-3 hover:bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                          <span className="text-[10px] font-black capitalize tracking-widest text-slate-500">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-[#081534]">{item.value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeDetailView === "resources" && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[12px] font-black text-[#081534] capitalize tracking-[0.2em] leading-none">Resource Capability Ledger</h3>
                  <p className="text-[11px] font-medium text-slate-400 italic">Contribution breakdown of {projectDetail?.resources?.length || 0} active project members</p>
                </div>
                <div className="relative w-full md:w-80">
                  <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search resources..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-[12px] font-bold text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <GenericTable
                headers={["Resource Profile", "Billable Contribution", "Non-Billable Log", "Intensity"]}
                columns={["profile_info", "billable_info", "non_billable_info", "intensity_info"]}
                rows={paginatedResources.map((resource, index) => {
                  const bHours = getNumber(getBillableHours(resource));
                  const nbHours = getNumber(getNonBillableHours(resource));
                  const total = bHours + nbHours;
                  const intensity = total > 0 ? Math.min(100, (total / 40) * 100) : 0;

                  return {
                    ...resource,
                    profile_info: (
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs shadow-sm group-hover:scale-110 transition-transform">
                          {getResourceName(resource).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-[#081534] group-hover:text-indigo-600 transition-colors">{getResourceName(resource)}</p>
                          <p className="text-[11px] font-bold text-slate-400">{getResourceEmail(resource)}</p>
                        </div>
                      </div>
                    ),
                    billable_info: (
                      <div className="text-center">
                        <span className="inline-flex items-center justify-center h-8 min-w-[60px] rounded-lg bg-emerald-50 text-emerald-600 text-[12px] font-black border border-emerald-100">
                          {formatMetric(bHours, "h")}
                        </span>
                      </div>
                    ),
                    non_billable_info: (
                      <div className="text-center">
                        <span className="inline-flex items-center justify-center h-8 min-w-[60px] rounded-lg bg-slate-50 text-slate-500 text-[12px] font-black border border-slate-100">
                          {formatMetric(nbHours, "h")}
                        </span>
                      </div>
                    ),
                    intensity_info: (
                      <div className="flex flex-col items-end gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                          <div
                            className={`h-full transition-all duration-700 ${intensity > 90 ? 'bg-rose-500' : intensity > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                            style={{ width: `${intensity}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">{formatMetric(total, "h")} logged</span>
                      </div>
                    )
                  };
                })}
              />
            </div>

            {totalPages > 1 && (
              <div className="py-6 border-t border-slate-100">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPrevious={() => setPage((prev) => Math.max(prev - 1, 1))}
                  onNext={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationalProjectDetailPage;
