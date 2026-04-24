import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Clock3,
  DollarSign,
  Users,
  Search,
  PieChart as PieChartIcon,
  BarChart3,
} from "lucide-react";
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
import { getOperationalProjectDetail } from "../services/operationalProjectsService";

const ITEMS_PER_PAGE = 5;
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
  }, [searchTerm]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFE] p-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <LoadingSpinner text="Projects Loading..." />
        </div>
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
    <div className="min-h-screen bg-[#FDFDFE] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/resource-management/bench/utilization-performance", { state: { activeTab: "projects" } })}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project?.name}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {project?.clientName}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Project Name", value: project?.name, icon: Briefcase },
            { label: "Hours (Act / Plan)", value: `${formatMetric(project?.actualHours)} / ${formatMetric(project?.plannedHours, "h")}`, icon: Clock3 },
            { label: "Utilization", value: formatMetric(project?.utilization, "%"), icon: Users },
            { label: "Billing Strip", value: `${formatMetric(project?.billableHours, "h")} B / ${formatMetric(project?.nonBillableHours, "h")} NB`, icon: DollarSign },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <card.icon size={18} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{card.value || "--"}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Project Utilization View</h2>
              <p className="text-sm text-slate-500">Switch between project portfolio analytics and resource-level contribution.</p>
            </div>
            <div className="inline-flex w-full items-center rounded-xl border border-slate-200 bg-slate-50 p-1 md:w-auto">
              {[
                { id: "portfolio", label: "Portfolio", icon: PieChartIcon },
                { id: "resources", label: "Resources", icon: Users },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => setActiveDetailView(view.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all md:flex-none ${
                    activeDetailView === view.id
                      ? "border border-slate-200 bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <view.icon size={14} />
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          {activeDetailView === "portfolio" && (
            <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50 lg:grid-cols-3 lg:divide-x lg:divide-slate-200">
              <div className="border-b border-slate-200 bg-white p-6 lg:col-span-2 lg:border-b-0">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-[#081534] opacity-60">Project Portfolio Trend</p>
                    <p className="mt-1 text-[10px] font-medium text-slate-400 italic">Utilization pattern from approved project timesheet actuals.</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
                    <BarChart3 size={16} />
                  </div>
                </div>
                <div className="h-72 w-full rounded-xl border border-slate-100 bg-slate-50/40 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={portfolioTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="util" fill="#EEF2FF" stroke="#4f46e5" strokeWidth={3} name="Utilization %" />
                      <Line type="monotone" dataKey="actual" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Actual Hours" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Overall Billing Strip</p>
                  <div className="mt-4 overflow-hidden rounded-full bg-slate-100">
                    <div className="flex h-3 w-full">
                      <div className="bg-indigo-600" style={{ width: `${project?.billablePercentage || 0}%` }} />
                      <div className="bg-indigo-300" style={{ width: `${project?.nonBillablePercentage || 0}%` }} />
                      <div className="bg-slate-300" style={{ width: `${project?.internalPercentage || 0}%` }} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-600">
                    <span>{formatMetric(project?.billableHours, "h")} Billable</span>
                    <span>{formatMetric(project?.nonBillableHours, "h")} Non-Billable</span>
                    <span>{formatMetric(project?.pendingHours, "h")} Pending</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#081534] opacity-60">Billing Yield Index</p>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
                    <PieChartIcon size={16} />
                  </div>
                </div>
                {billingPieData.length === 0 ? (
                  <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm font-medium text-slate-500">
                    No billing data available.
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
                      <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={billingPieData} innerRadius={54} outerRadius={78} paddingAngle={5} dataKey="value" stroke="#ffffff" strokeWidth={3}>
                            {billingPieData.map((entry, index) => (
                              <Cell key={`billing-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            cursor={false}
                            contentStyle={{
                              backgroundColor: "#081534",
                              border: "1px solid #1e293b",
                              borderRadius: "10px",
                              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.18)",
                              color: "#fff",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                            itemStyle={{ color: "#fff" }}
                            formatter={(value, name, item) => [
                              `${value}h (${formatMetric(item?.payload?.percent, "%")})`,
                              name,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      </div>
                      <div className="mt-2 flex items-center justify-center rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
                        <span className="text-[18px] font-black leading-none text-slate-900">{formatMetric(project?.billablePercentage, "%")}</span>
                        <span className="ml-2 text-[8px] font-black uppercase tracking-widest text-slate-400">Billable</span>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {billingPieData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">{item.name}</span>
                          </div>
                          <span className="text-[11px] font-black text-slate-900">{formatMetric(item.value, "h")} / {formatMetric(item.percent, "%")}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeDetailView === "resources" && (
            <div>
              <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search ${projectDetail?.resources?.length || 0} resources...`}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {filteredResources.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm font-medium text-slate-500">
                  No resources available for this project.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-bold">Resource</th>
                          <th className="px-4 py-3 font-bold text-center">Billable Hours</th>
                          <th className="px-4 py-3 font-bold text-center">Non-Billable Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedResources.map((resource, index) => (
                          <tr key={resource.resourceId || resource.id || `${getResourceName(resource)}-${index}`} className="hover:bg-slate-50/60">
                            <td className="px-4 py-4">
                              <div>
                                <p className="font-bold text-slate-900">{getResourceName(resource)}</p>
                                <p className="text-[11px] text-slate-500">{getResourceEmail(resource)}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center font-bold text-indigo-700">
                              {formatMetric(getBillableHours(resource), "h")}
                            </td>
                            <td className="px-4 py-4 text-center font-bold text-slate-700">
                              {formatMetric(getNonBillableHours(resource), "h")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPrevious={() => setPage((prev) => Math.max(prev - 1, 1))}
                      onNext={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                      className="justify-end py-0"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperationalProjectDetailPage;
