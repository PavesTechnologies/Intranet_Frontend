import React, { useState, useEffect } from "react";
import api from "../../../api/axiosInstance";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { showStatusToast } from "../../../components/toastfy/toast.jsx";
import Button from "../../../components/Button/Button";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import { KPICard } from "../../../components/kpi/KPI";

import {
  Users,
  CheckCircle,
  Clock,
  FileText,
  ShieldCheck,
  Calendar,
  Activity,
  RefreshCw,
  TrendingDown,
  Building2,
  Download,
  AlertCircle,
  BarChart2,
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

// ─── Utilities ────────────────────────────────────────────────────────────────

const parseRate = (val) => {
  if (typeof val === "number") return Math.min(100, Math.max(0, val));
  if (typeof val === "string") return Math.min(100, Math.max(0, parseFloat(val.replace("%", "")) || 0));
  return 0;
};

const formatRate = (val) => {
  if (typeof val === "string" && val.includes("%")) return val;
  return `${parseRate(val).toFixed(1)}%`;
};

const fmtPct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "0%");

const DEPT_COLORS = ["#4F46E5", "#6366F1", "#818CF8", "#10B981", "#059669", "#F59E0B", "#EF4444", "#A855F7"];

// ─── Pipeline stage style map (static class strings for Tailwind purge safety) ─
const PIPELINE_STAGE_STYLE = {
  created:   { barColor: "#3B82F6", activeBg: "bg-blue-50",    activeBorder: "border-blue-200",    textColor: "text-blue-700",    numColor: "text-blue-600"    },
  offered:   { barColor: "#6366F1", activeBg: "bg-indigo-50",  activeBorder: "border-indigo-200",  textColor: "text-indigo-700",  numColor: "text-indigo-600"  },
  accepted:  { barColor: "#10B981", activeBg: "bg-emerald-50", activeBorder: "border-emerald-200", textColor: "text-emerald-700", numColor: "text-emerald-600" },
  submitted: { barColor: "#F59E0B", activeBg: "bg-amber-50",   activeBorder: "border-amber-200",   textColor: "text-amber-700",   numColor: "text-amber-600"   },
  verified:  { barColor: "#8B5CF6", activeBg: "bg-purple-50",  activeBorder: "border-purple-200",  textColor: "text-purple-700",  numColor: "text-purple-600"  },
  completed: { barColor: "#14B8A6", activeBg: "bg-teal-50",    activeBorder: "border-teal-200",    textColor: "text-teal-700",    numColor: "text-teal-600"    },
};

const DOC_TYPES = [
  { key: "personal",   label: "Personal",   color: "#4F46E5" },
  { key: "address",    label: "Address",    color: "#6366F1" },
  { key: "education",  label: "Education",  color: "#818CF8" },
  { key: "identity",   label: "Identity",   color: "#10B981" },
  { key: "experience", label: "Experience", color: "#F59E0B" },
  { key: "bank",       label: "Bank",       color: "#EF4444" },
  { key: "pf",         label: "PF",         color: "#A855F7" },
];

// ─── Local-only components (no global equivalent) ────────────────────────────

const PriorityBadge = ({ priority }) => {
  const cfg = {
    High:   "bg-rose-100 text-rose-700 border border-rose-200",
    Medium: "bg-amber-100 text-amber-700 border border-amber-200",
    Low:    "bg-blue-100 text-blue-700 border border-blue-200",
  }[priority] || "bg-slate-100 text-slate-600";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg}`}>
      Priority: {priority || "–"}
    </span>
  );
};

const MetricRateCard = ({ label, value, description, icon: Icon, goodWhenHigh, accentClass }) => {
  const numVal   = parseRate(value);
  const isGood   = goodWhenHigh ? numVal >= 60 : numVal <= 25;
  const barColor = isGood ? "#10B981" : numVal > (goodWhenHigh ? 30 : 40) ? "#F59E0B" : "#EF4444";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${accentClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-3xl font-extrabold text-slate-900 tabular-nums leading-none">{formatRate(value)}</p>
      <p className="text-sm font-semibold text-slate-700 mt-2">{label}</p>
      <p className="text-xs text-slate-400 mt-1 mb-4 flex-1">{description}</p>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${numVal}%`, backgroundColor: barColor }} />
      </div>
    </div>
  );
};

const ActionCard = ({ action, count, priority, description }) => {
  const cfg = {
    High:   { border: "border-rose-200",   bg: "bg-rose-50",   iconBg: "bg-rose-100",   iconColor: "text-rose-600",   head: "text-rose-800"   },
    Medium: { border: "border-amber-200",  bg: "bg-amber-50",  iconBg: "bg-amber-100",  iconColor: "text-amber-600",  head: "text-amber-800"  },
    Low:    { border: "border-blue-200",   bg: "bg-blue-50",   iconBg: "bg-blue-100",   iconColor: "text-blue-600",   head: "text-blue-800"   },
  }[priority] || { border: "border-slate-200", bg: "bg-slate-50", iconBg: "bg-slate-100", iconColor: "text-slate-500", head: "text-slate-700" };

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
          <AlertCircle className={`w-4 h-4 ${cfg.iconColor}`} />
        </div>
        <p className={`flex-1 text-sm font-bold leading-snug ${cfg.head}`}>{action}</p>
        <span className={`text-2xl font-extrabold tabular-nums shrink-0 ${cfg.head}`}>{count ?? 0}</span>
      </div>
      {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
        <PriorityBadge priority={priority} />
        <span className={`text-xs font-semibold ${cfg.head}`}>
          {count ?? 0} {(count ?? 0) === 1 ? "Candidate" : "Candidates"}
        </span>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingSummary() {
  const [userRole]    = useState("Admin");
  const [summaryData, setSummaryData] = useState(null);
  const [loading,     setLoading]     = useState(true);

  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${BASE_URL}/dashboard/onboarding-summary`, {
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
    const ds = summaryData.dashboard_summary || {};
    const m  = summaryData.metrics || {};
    const rows = [
      ["Metric", "Value"],
      ["Total Candidates",    ds.total_candidates     ?? 0],
      ["Active Candidates",   ds.active_candidates    ?? 0],
      ["Completed Candidates",ds.completed_candidates ?? 0],
      ["Pending Candidates",  ds.pending_candidates   ?? 0],
      ["Acceptance Rate",     m.offer_acceptance_success_rate?.value       ?? "0%"],
      ["Completion Rate",     m.employee_onboarding_completion_rate?.value ?? "0%"],
      ["Attrition Rate",      m.candidate_attrition_rate?.value            ?? "0%"],
    ];
    const csv  = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `onboarding_summary_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showStatusToast("Report exported successfully", "success");
  };

  useEffect(() => { fetchSummaryData(); }, []);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (userRole !== "Admin" && userRole !== "HR") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-6">Only Admin or HR roles can access this dashboard.</p>
          <Button size="medium">Return to Home</Button>
        </div>
      </div>
    );
  }

  if (loading && !summaryData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingSpinner text="Loading dashboard…" />
      </div>
    );
  }

  if (!summaryData) return null;

  // ══ Destructure API response ══════════════════════════════════════════════
  const ds     = summaryData.dashboard_summary           || {};
  const om     = summaryData.overview?.offer_management    || {};
  const eo     = summaryData.overview?.employee_onboarding || {};
  const jp     = summaryData.overview?.joining_process     || {};
  const pipeline = summaryData.pipeline                  || {};
  const pa     = summaryData.pending_actions             || {};
  const metrics  = summaryData.metrics                   || {};
  const docs   = summaryData.documents                   || {};
  const docSum = summaryData.document_summary            || {};
  const deptRaw  = summaryData.department_summary        || [];
  const activityRaw = summaryData.recent_activity        || [];

  // ── Section 1 – Executive KPIs (uses global KPICard) ─────────────────────
  const execKPIs = [
    { label: "Total Candidates",    value: ds.total_candidates     ?? 0, icon: <Users      className="h-5 w-5" />, color: "bg-indigo-100 text-indigo-600" },
    { label: "Active Candidates",   value: ds.active_candidates    ?? 0, icon: <Activity   className="h-5 w-5" />, color: "bg-blue-100 text-blue-600"     },
    { label: "Completed",           value: ds.completed_candidates ?? 0, icon: <CheckCircle className="h-5 w-5" />, color: "bg-emerald-100 text-emerald-600"},
    { label: "Pending",             value: ds.pending_candidates   ?? 0, icon: <Clock      className="h-5 w-5" />, color: "bg-amber-100 text-amber-600"   },
  ];

  // ── Section 2 – Workflow stats (uses global StatCard) ─────────────────────
  const offerStats = [
    { label: "Created",  count: om.created  ?? 0 },
    { label: "Offered",  count: om.offered  ?? 0 },
    { label: "Accepted", count: om.accepted ?? 0 },
    { label: "Rejected", count: om.rejected ?? 0 },
  ];
  const offerTotal    = om.offered  ?? 0;
  const offerAccepted = om.accepted ?? 0;

  const onboardingStats = [
    { label: "Docs Submitted", count: eo.submitted ?? 0 },
    { label: "Verified",       count: eo.verified  ?? 0 },
    { label: "Completed",      count: eo.completed ?? 0 },
  ];

  const joiningStats = [
    { label: "Joining Pending", count: jp.joining_pending ?? 0 },
    { label: "Joining",         count: jp.joining         ?? 0 },
    { label: "Rescheduled",     count: jp.rescheduled     ?? 0 },
  ];

  // ── Section 3 – Metric rate cards ─────────────────────────────────────────
  const metricCards = [
    {
      label:       "Offer Acceptance Rate",
      value:       metrics.offer_acceptance_success_rate?.value       ?? "0%",
      description: metrics.offer_acceptance_success_rate?.description ?? "Percentage of candidates who accepted the offer",
      icon:        CheckCircle,
      goodWhenHigh:true,
      accentClass: "bg-emerald-50 text-emerald-700",
    },
    {
      label:       "Onboarding Completion Rate",
      value:       metrics.employee_onboarding_completion_rate?.value       ?? "0%",
      description: metrics.employee_onboarding_completion_rate?.description ?? "Candidates who completed the full onboarding process",
      icon:        ShieldCheck,
      goodWhenHigh:true,
      accentClass: "bg-blue-50 text-blue-700",
    },
    {
      label:       "Candidate Attrition Rate",
      value:       metrics.candidate_attrition_rate?.value       ?? "0%",
      description: metrics.candidate_attrition_rate?.description ?? "Candidates who dropped out of the process",
      icon:        TrendingDown,
      goodWhenHigh:false,
      accentClass: "bg-rose-50 text-rose-700",
    },
  ];

  // ── Section 4 – Pipeline (all 6 stages, always shown) ────────────────────
  const PIPELINE_KEYS = ["created", "offered", "accepted", "submitted", "verified", "completed"];
  const pipelineStages = PIPELINE_KEYS.map((key) => {
    const raw   = pipeline[key] || {};
    const style = PIPELINE_STAGE_STYLE[key];
    return {
      key,
      label:       raw.label       || key.charAt(0).toUpperCase() + key.slice(1),
      count:       raw.count       ?? 0,
      description: raw.description || "",
      ...style,
    };
  });
  const maxPipelineCount = Math.max(...pipelineStages.map((s) => s.count), 1);

  // ── Section 5 – Action required ───────────────────────────────────────────
  const actionItems = [
    {
      action:      "Documents Pending Verification",
      count:       pa.documents_pending_verification?.count       ?? 0,
      priority:    pa.documents_pending_verification?.priority    ?? "Low",
      description: pa.documents_pending_verification?.description ?? "",
    },
    {
      action:      "Candidates Awaiting Joining",
      count:       pa.candidates_awaiting_joining?.count       ?? 0,
      priority:    pa.candidates_awaiting_joining?.priority    ?? "Low",
      description: pa.candidates_awaiting_joining?.description ?? "",
    },
    {
      action:      "Candidates Yet To Submit Documents",
      count:       pa.candidates_yet_to_submit?.count       ?? 0,
      priority:    pa.candidates_yet_to_submit?.priority    ?? "Low",
      description: pa.candidates_yet_to_submit?.description ?? "",
    },
  ];
  const totalActivePendingActions = summaryData.action_required_summary?.total_pending_actions ?? 0;

  // ── Section 6 – Document verification ────────────────────────────────────
  const totalDocVerified = docSum.verified_documents ?? 0;
  const totalDocPending  = docSum.pending_documents  ?? 0;
  const totalDocRejected = docSum.rejected_documents ?? 0;
  const totalDocs        = docSum.total_documents    ?? 0;

  const docTypeRows = DOC_TYPES.map(({ key, label }) => {
    const d       = docs[key] || {};
    const verified = d.verified_count ?? 0;
    const total    = d.total          ?? 0;
    const pct      = d.completion_percentage != null
      ? Math.round(d.completion_percentage)
      : (total > 0 ? Math.round((verified / total) * 100) : 0);
    return { key, label, verified, total, pct };
  });

  // ── Section 7 – Department distribution ──────────────────────────────────
  const deptData = deptRaw.map((d, i) => ({
    name:  d.department || "–",
    count: d.count      ?? 0,
    pct:   d.percentage ?? 0,
    color: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  // ── Section 8 – Recent activity (latest 5 only) ──────────────────────────
  const recentActivity = activityRaw.slice(0, 5);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 lg:p-8 font-sans">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Onboarding Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">HR &amp; Admin · Workforce Management Overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={fetchSummaryData}
            disabled={loading}
            loading={loading}
            loadingText="Refreshing…"
            variant="outline"
            size="medium"
            className="border-slate-200 text-slate-700"
          >
            {!loading && <RefreshCw className="w-4 h-4" />}
            <span>Refresh</span>
          </Button>
          <Button onClick={handleExport} variant="primary" size="medium">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* ══ Section 1: Executive Summary — global KPICard ═══════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {execKPIs.map((kpi, i) => (
          <KPICard
            key={i}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            className="hover:shadow-md hover:-translate-y-0.5 transition-all"
          />
        ))}
      </div>

      {/* ══ Section 2: Business Process Workflow Cards — global StatCard ════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

        {/* Offer Management */}
        <PageCard className="rounded-2xl border-blue-200 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2 mb-0.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-blue-800">Offer Management</h3>
            </div>
            <p className="text-xs text-blue-500">Offer letter lifecycle tracking</p>
          </div>
          <PageCardContent className="p-4">
            <div className="flex items-start divide-x divide-slate-100">
              {offerStats.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center px-2 py-1 first:pl-0 last:pr-0">
                  <span className="text-2xl font-bold text-slate-800 tabular-nums leading-none">{s.count}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-2 text-center leading-tight">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full"
                style={{ width: offerTotal > 0 ? `${(offerAccepted / offerTotal) * 100}%` : "0%" }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5 text-right">
              {offerTotal > 0 ? `${fmtPct(offerAccepted, offerTotal)} acceptance` : "No offers yet"}
            </p>
          </PageCardContent>
        </PageCard>

        {/* Employee Onboarding */}
        <PageCard className="rounded-2xl border-emerald-200 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex items-center gap-2 mb-0.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-emerald-800">Employee Onboarding</h3>
            </div>
            <p className="text-xs text-emerald-500">Document submission &amp; verification</p>
          </div>
          <PageCardContent className="p-4">
            <div className="flex items-start divide-x divide-slate-100">
              {onboardingStats.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center px-2 py-1 first:pl-0 last:pr-0">
                  <span className="text-2xl font-bold text-slate-800 tabular-nums leading-none">{s.count}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-2 text-center leading-tight">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{
                  width: onboardingStats[0].count > 0
                    ? `${(onboardingStats[2].count / onboardingStats[0].count) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5 text-right">
              {onboardingStats[0].count > 0
                ? `${fmtPct(onboardingStats[2].count, onboardingStats[0].count)} completed`
                : "No submissions yet"}
            </p>
          </PageCardContent>
        </PageCard>

        {/* Joining Process */}
        <PageCard className="rounded-2xl border-purple-200 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50">
            <div className="flex items-center gap-2 mb-0.5">
              <Calendar className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-purple-800">Joining Process</h3>
            </div>
            <p className="text-xs text-purple-500">Date scheduling &amp; confirmations</p>
          </div>
          <PageCardContent className="p-4">
            <div className="flex items-start divide-x divide-slate-100">
              {joiningStats.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center px-2 py-1 first:pl-0 last:pr-0">
                  <span className="text-2xl font-bold text-slate-800 tabular-nums leading-none">{s.count}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-2 text-center leading-tight">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full"
                style={{
                  width: (joiningStats[0].count + joiningStats[1].count) > 0
                    ? `${(joiningStats[1].count / (joiningStats[0].count + joiningStats[1].count)) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5 text-right">
              {joiningStats[2].count > 0 ? `${joiningStats[2].count} rescheduled` : "No reschedules"}
            </p>
          </PageCardContent>
        </PageCard>
      </div>

      {/* ══ Section 3: Professional Metrics ════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {metricCards.map((m, i) => (
          <MetricRateCard key={i} {...m} />
        ))}
      </div>

      {/* ══ Section 4: Onboarding Pipeline — full width ═════════════════════ */}
      <PageCard className="rounded-2xl border-slate-200 mb-6">
        <PageCardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Onboarding Pipeline
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">All 6 stages — shows 0 when no candidates are present</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {pipelineStages.map((stage, i) => {
              const isEmpty  = stage.count === 0;
              const barWidth = Math.max(6, (stage.count / maxPipelineCount) * 100);
              return (
                <div
                  key={stage.key}
                  className={`rounded-xl border-2 p-4 transition-all
                    ${isEmpty
                      ? "border-dashed border-slate-200 bg-white"
                      : `${stage.activeBorder} ${stage.activeBg}`}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold uppercase tracking-wide
                        ${isEmpty ? "text-slate-400" : stage.textColor}`}>
                        Stage {i + 1}
                      </span>
                      <p className={`text-sm font-bold mt-0.5
                        ${isEmpty ? "text-slate-400" : stage.textColor}`}>
                        {stage.label}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xl font-extrabold tabular-nums leading-none
                        ${isEmpty ? "text-slate-300" : stage.numColor}`}>
                        {stage.count}
                      </p>
                      <p className={`text-xs mt-0.5 ${isEmpty ? "text-slate-300" : "text-slate-500"}`}>
                        {stage.count === 1 ? "candidate" : "candidates"}
                      </p>
                    </div>
                  </div>
                  <p className={`text-xs leading-relaxed mb-3 line-clamp-2
                    ${isEmpty ? "text-slate-300" : "text-slate-500"}`}>
                    {isEmpty ? "No candidates in this stage" : stage.description}
                  </p>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barWidth}%`, backgroundColor: isEmpty ? "#CBD5E1" : stage.barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </PageCardContent>
      </PageCard>

      {/* ══ Section 5: Action Required ══════════════════════════════════════ */}
      <PageCard className="rounded-2xl border-slate-200 mb-6">
        <PageCardContent className="p-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            Action Required
            <span className="ml-1 text-xs font-semibold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
              {totalActivePendingActions} active
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {actionItems.map((item, i) => (
              <ActionCard key={i} {...item} />
            ))}
          </div>
        </PageCardContent>
      </PageCard>

      {/* ══ Section 7: Department Distribution (full width, unchanged) ════════ */}
      <PageCard className="rounded-2xl border-slate-200 mb-6">
        <PageCardContent className="p-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
            <Building2 className="w-5 h-5 text-indigo-500" />
            Department-wise Candidate Distribution
          </h3>
          {deptData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={deptData} margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748B", fontSize: 12, fontWeight: 600 }}
                      width={120}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "#F8FAFC" }}
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
                            <p className="font-bold text-slate-800">{payload[0]?.payload?.name}</p>
                            <p className="text-indigo-600 font-bold mt-1">
                              {payload[0]?.value} candidates
                              <span className="text-slate-400 font-normal ml-2">
                                ({payload[0]?.payload?.pct?.toFixed(1)}%)
                              </span>
                            </p>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={26}>
                      {deptData.map((_, index) => (
                        <Cell key={index} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {deptData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-sm font-semibold text-slate-700 truncate">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-sm font-extrabold text-slate-800 tabular-nums">{d.count}</span>
                      <span className="text-xs text-slate-400">({d.pct?.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex flex-col items-center justify-center text-slate-400 gap-2">
              <BarChart2 className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No department data available</p>
            </div>
          )}
        </PageCardContent>
      </PageCard>

      {/* ══ Document Completion + Recent Activity — side by side ════════════ */}
      <div className="grid grid-cols-5 gap-5 mb-6">

        {/* Document Completion — 2/5 */}
        <PageCard className="col-span-2 rounded-2xl border-slate-200">
          <PageCardContent className="p-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Document Completion
            </h3>
            <div>
              {docTypeRows.map((row) => (
                <div key={row.key} className="py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{row.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {row.verified} of {row.total} verified
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-600 tabular-nums ml-4 shrink-0">
                      {row.pct}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full transition-all duration-700"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </PageCardContent>
        </PageCard>

        {/* Recent Activity — 3/5 */}
        <PageCard className="col-span-3 rounded-2xl border-slate-200">
          <PageCardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Recent Activity
              </h3>
              <button className="text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                View All
              </button>
            </div>

            {recentActivity.length > 0 ? (
              <div>
                {recentActivity.map((a, i) => (
                  <div
                    key={a.user_uuid || i}
                    className="flex items-center justify-between py-3.5 border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0 select-none">
                        {(a.candidate_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {a.candidate_name || "–"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Action:{" "}
                          <span className="text-indigo-500 font-medium">
                            {a.activity_action || "–"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0 ml-4">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">
                        {a.activity_timestamp
                          ? new Date(a.activity_timestamp).toLocaleString("en-US", {
                              month: "numeric", day: "numeric", year: "numeric",
                              hour: "numeric", minute: "2-digit", second: "2-digit",
                            })
                          : "–"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No recent activity found</p>
              </div>
            )}
          </PageCardContent>
        </PageCard>

      </div>

    </div>
  );
}
