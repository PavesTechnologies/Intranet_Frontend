import React, { useState, useEffect } from "react";
import axios from "axios";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { showStatusToast } from "../../../components/toastfy/toast.jsx";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/ui/Modal";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import {
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  ShieldCheck,
  Calendar,
  Activity,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { KPICard } from "../../../components/kpi/KPI";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
        <p className="font-semibold text-slate-800 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div
            key={index}
            className="flex justify-between items-center text-sm gap-4"
          >
            <span className="flex items-center text-slate-600">
              <span
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: entry.color || "#4F46E5" }}
              />
              {entry.name || "Count"}
            </span>
            <span className="font-semibold text-slate-800">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function OnboardingSummary() {
  const [userRole] = useState("Admin"); // Mock role for access control
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const normalizedCounts = {};
  if (summaryData?.status_counts) {
    Object.entries(summaryData.status_counts).forEach(([key, val]) => {
      normalizedCounts[key.toLowerCase().replace(/\s+/g, "_")] = val;
    });
  }

  const statusToFieldMap = {
    total_candidates:"total_candidates",
    created: "offers_created",
    offered: "offers_offered",
    accepted: "offers_accepted",
    submitted: "offers_submitted",
    verified: "offers_verified",
    completed: "offers_completed",
    rescheduled: "offers_rescheduled",
    joining_pending: "offers_joining_pending",
    joining: "offers_joining",
    rejected: "offers_rejected",
  };

  const totalCandidates = summaryData?.overview?.total_candidates || 0;
  const completedCandidates = (normalizedCounts["completed"] !== undefined)
    ? normalizedCounts["completed"]
    : (summaryData?.overview?.offers_completed !== undefined ? summaryData.overview.offers_completed : 0);

  const computedCompletionRate = totalCandidates > 0
    ? `${((completedCandidates / totalCandidates) * 100).toFixed(1)}%`
    : "0%";

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/dashboard/onboarding-summary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setSummaryData(res.data);
    } catch {
      showStatusToast("Failed to load onboarding summary", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!summaryData) return;

    const headers = ["Metric", "Value"];
    const rows = [
      ["Total Candidates", summaryData.overview?.total_candidates],
      ["Offers Created", summaryData.overview?.offers_created],
      ["Offers Offered", summaryData.overview?.offers_offered],
      ["Offers Accepted", summaryData.overview?.offers_accepted],
      ["Acceptance Rate", summaryData.metrics?.acceptance_rate],
      ["Completion Rate", computedCompletionRate],
    ];

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `onboarding_summary_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showStatusToast("Report exported successfully", "success");
  };

  useEffect(() => {
    fetchSummaryData();
  }, []);

  if (userRole !== "Admin" && userRole !== "HR") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Access Denied
          </h2>
          <p className="text-slate-500 mb-6">
            Unauthorized: Only users with Admin or HR roles can access the
            onboarding summary dashboard.
          </p>
          <Button size="medium">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  if (loading && !summaryData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingSpinner text="Loading summary data..." />
      </div>
    );
  }

  if (!summaryData) return null;

  const statusOrder = [
    "total_candidates",
    "Created",
    "Offered",
    "Accepted",
    "Submitted",
    "Verified",
    "Completed",
    "Rescheduled",
    "Joining Pending",
    "Joining",
    "Rejected",
  ];

  const statusConfig = {
    total_candidates: {
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    created: {
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    offered: {
      icon: Activity,
      color: "text-indigo-600",
      bg: "bg-indigo-100",
    },
    accepted: {
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    submitted: {
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    verified: {
      icon: ShieldCheck,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    completed: {
      icon: CheckCircle,
      color: "text-teal-600",
      bg: "bg-teal-100",
    },
    rescheduled: {
      icon: RefreshCw,
      color: "text-sky-600",
      bg: "bg-sky-100",
    },
    joining_pending: {
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    joining: {
      icon: Calendar,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    rejected: {
      icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-100",
    },
  };

  const kpiCardsData = statusOrder.map((status) => {
    const normalizedKey = status.toLowerCase().replace(/\s+/g, "_");
    const fieldKey = statusToFieldMap[normalizedKey] || `offers_${normalizedKey}`;
    
    const count = (normalizedCounts[normalizedKey] !== undefined)
      ? normalizedCounts[normalizedKey]
      : (summaryData?.overview?.[fieldKey] !== undefined ? summaryData.overview[fieldKey] : 0);

    const config = statusConfig[normalizedKey] || {
      icon: Users,
      color: "text-slate-600",
      bg: "bg-slate-100",
    };
    return {
      title: status,
      value: count,
      icon: config.icon,
      color: config.color,
      bg: config.bg,
    };
  });


  const pending_actions = [
    {
      action: "Pending Verification",
      count: summaryData?.pending_actions?.pending_verification || 0,
      urgency: "high",
      icon: ShieldCheck,
      color: "text-rose-600",
      bg: "bg-rose-100",
    },
    {
      action: "Pending Joining",
      count: summaryData?.pending_actions?.pending_joining || 0,
      urgency: "medium",
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      action: "Pending Documents by Candidate",
      count: summaryData?.pending_actions?.pending_documents || 0,
      urgency: "high",
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ];

  const metrics = [
    {
      label: "Acceptance Rate",
      value: summaryData?.metrics?.acceptance_rate || "0%",
      trend: "+0%",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      icon: CheckCircle,
    },
    {
      label: "Completion Rate",
      value: computedCompletionRate,
      trend: "+0%",
      color: "text-blue-600",
      bg: "bg-blue-50",
      icon: ShieldCheck,
    },
    {
      label: "Drop-off Rate",
      value: summaryData?.metrics?.drop_off_rate || "0%",
      trend: "-0%",
      color: "text-rose-600",
      bg: "bg-rose-50",
      icon: XCircle,
    },
  ];

  const agingData = [
    {
      label: "Pending > 3 Days",
      count: summaryData?.aging?.pending_3_days || 0,
      color: "text-amber-600",
      bg: "bg-amber-100",
      icon: Clock,
    },
    {
      label: "Pending > 7 Days",
      count: summaryData?.aging?.pending_7_days || 0,
      color: "text-rose-600",
      bg: "bg-rose-100",
      icon: AlertCircle,
    },
  ];

  const pipelineData = [
    { stage: "Created", count: summaryData?.pipeline?.created || 0 },
    { stage: "Offered", count: summaryData?.pipeline?.offered || 0 },
    { stage: "Accepted", count: summaryData?.pipeline?.accepted || 0 },
    { stage: "Submitted", count: summaryData?.pipeline?.submitted || 0 },
    { stage: "Verified", count: summaryData?.pipeline?.verified || 0 },
  ];

  const docTypeColors = {
    personal: "#4F46E5",
    address: "#6366F1",
    education: "#818CF8",
    identity: "#10B981",
    experience: "#F59E0B",
    bank: "#EF4444",
    pf: "#A855F7",
  };

  const docProgressData = Object.entries(summaryData?.documents || {}).map(
    ([key, val]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      completed: val?.completed || 0,
      total: val?.total || 0,
      color: docTypeColors[key.toLowerCase()] || "#94a3b8",
    }),
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 lg:p-8 font-sans">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Onboarding Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            HR & Admin Personnel Summary Overview
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={fetchSummaryData}
            disabled={loading}
            loading={loading}
            loadingText="Refreshing..."
            variant="outline"
            size="medium"
            className="border-slate-200 text-slate-700"
          >
            {!loading && <RefreshCw className="w-4 h-4" />}
            <span>Refresh</span>
          </Button>
          <Button
            onClick={handleExport}
            variant="primary"
            size="medium"
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* 1. Overview Section - Column Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mb-8">
        {kpiCardsData.map((metric, i) => (
          <KPICard
            key={i}
            label={metric.title}
            value={metric.value}
            icon={<metric.icon className="h-5 w-5" />}
            color={`${metric.bg} ${metric.color}`}
            className="bg-white border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1"
          />
        ))}
      </div>

      {/* 2. Key Metrics (Rates) Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric, i) => (
          <div
            key={i}
            className={`rounded-xl border border-slate-200 shadow-sm ${metric.bg}`}
          >
            <div className="relative">
              <KPICard
                label={metric.label}
                value={metric.value}
                icon={<metric.icon className="h-5 w-5" />}
                color={`${metric.bg} ${metric.color}`}
                className="border-0 bg-transparent shadow-none pr-16"
              />
              <span
                className={`absolute right-4 top-4 text-xs font-bold px-2 py-1 rounded-full ${metric.trend.startsWith("+") ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
              >
                {metric.trend}
              </span>
            </div>
            <div className="mx-4 mb-4 h-1 w-[calc(100%-2rem)] bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${metric.color.replace("text", "bg")}`}
                style={{ width: metric.value }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        {/* 3. Pipeline Funnel */}
        <PageCard className="xl:col-span-2 rounded-2xl border-slate-200">
          <PageCardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Onboarding Pipeline
              </h3>
              <div className="flex gap-2">
                <Button
                  size="small"
                  variant="outline"
                  className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100"
                >
                  Weekly
                </Button>
                <Button
                  size="small"
                  variant="ghost"
                  className="border-transparent text-slate-400 shadow-none hover:bg-transparent hover:text-slate-500"
                >
                  Monthly
                </Button>
              </div>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={pipelineData}
                  margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#F1F5F9"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="stage"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 13, fontWeight: 500 }}
                    width={100}
                  />
                  <RechartsTooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "#F8FAFC" }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#4F46E5"
                    radius={[0, 8, 8, 0]}
                    barSize={34}
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fillOpacity={1 - index * 0.15}
                        fill="#4F46E5"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PageCardContent>
        </PageCard>

        {/* 4. Aging & Recent Activity Column */}
        <div className="space-y-6">
          {/* Aging Card */}
          <PageCard className="rounded-2xl border-slate-200">
            <PageCardContent className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Pending Status Duration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {agingData.map((age, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-100 bg-white p-5 min-w-0"
                  >
                    <div className="flex flex-col gap-4 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${age.bg} ${age.color}`}
                        >
                          <age.icon className="h-5 w-5" />
                        </div>
                        <p className="min-w-0 text-right text-sm font-medium text-slate-500 break-words">
                          {age.label}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xl md:text-3xl font-bold leading-none text-slate-900 tabular-nums">
                          {age.count}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-600 break-words">
                          Candidates
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PageCardContent>
          </PageCard>

          {/* Pending Verification Summary */}
          <PageCard className="rounded-2xl border-0 !bg-indigo-900 !text-white shadow-lg shadow-indigo-200">
            <PageCardContent className="p-6">
              <h3 className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-4">
                Urgent Actions
              </h3>
              <div className="space-y-4">
                {pending_actions.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center border-b border-indigo-800 pb-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                      <span className="text-sm font-medium">{item.action}</span>
                    </div>
                    <span className="text-lg font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </PageCardContent>
          </PageCard>
        </div>
      </div>

      {/* Row 3 - Documents & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 5. Document Completion Status */}
        <PageCard className="rounded-2xl border-slate-200 overflow-hidden">
          <PageCardContent className="p-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Document Completion
            </h3>
            <div className="space-y-6 mt-6">
              {docProgressData.map((doc, i) => {
                const percentage = Math.round((doc.completed / doc.total) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <span className="text-sm font-bold text-slate-700">
                          {doc.name}
                        </span>
                        <p className="text-xs text-slate-400 font-medium">
                          {doc.completed} of {doc.total} verified
                        </p>
                      </div>
                      <span className="text-sm font-black text-slate-600">
                        {percentage}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: doc.color,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </PageCardContent>
        </PageCard>

        {/* 6. Recent Activity */}
        <PageCard className="lg:col-span-2 rounded-2xl border-slate-200">
          <PageCardContent className="p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Recent Activity
              </h3>
              <Button
                size="small"
                variant="outline"
                className="border-slate-200 text-slate-700"
                onClick={() => setIsActivityModalOpen(true)}
              >
                View All
              </Button>
            </div>
            <div className="space-y-1">
              {(summaryData?.recent_activity || []).map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 group-hover:bg-indigo-100">
                      {activity?.name ? activity.name.charAt(0) : "U"}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {activity?.name || "Unknown Candidate"}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {" "}
                        Action:{" "}
                        <span className="text-indigo-600 font-semibold">
                          {activity?.action || "Performed an action"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" />{" "}
                      {activity?.timestamp
                        ? new Date(activity.timestamp).toLocaleString()
                        : "Just now"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </PageCardContent>
        </PageCard>
      </div>

      {/* Activity Logs Modal */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="All Activity Logs"
        width="min(800px, calc(100vw - 2rem))"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-4">
            {(summaryData?.recent_activity || []).map((activity, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-indigo-600 border border-slate-100">
                    {activity?.name ? activity.name.charAt(0) : "U"}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      {activity?.name || "Unknown Candidate"}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {" "}
                      Action:{" "}
                      <span className="text-indigo-600 font-semibold">
                        {activity?.action || "Performed an action"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-medium italic">
                    <Clock className="w-3 h-3" />{" "}
                    {activity?.timestamp
                      ? new Date(activity.timestamp).toLocaleString()
                      : "Just now"}
                  </span>
                </div>
              </div>
            ))}
            {(!summaryData?.recent_activity ||
              summaryData.recent_activity.length === 0) && (
                <div className="text-center py-12 text-slate-400">
                  No activity logs found.
                </div>
              )}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => setIsActivityModalOpen(false)}
            variant="outline"
            size="medium"
            className="border-slate-200 text-slate-700"
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
