import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAirsStore } from "./airsStore";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import {
  Briefcase,
  CheckCircle,
  RefreshCw,
  Clock,
  XCircle,
  Plus,
  FileUp,
  FileText,
  Activity,
  ArrowRight,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import Button from "../../../components/Button/Button";
import { KPICard } from "../../../components/kpi/KPI";

// Custom Tooltip components for Recharts
const CustomAreaTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <p className="text-xs font-semibold text-slate-100">
            JDs Created: <span className="font-extrabold text-white text-sm">{payload[0].value}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-xl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
          <p className="text-xs font-semibold text-slate-100">
            {data.name}: <span className="font-extrabold text-white text-sm">{data.value}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Activity styling utility
const getActivityStyle = (type) => {
  switch (type) {
    case "parse_success":
      return { border: "border-emerald-100 bg-emerald-50/50", text: "text-emerald-600" };
    case "parse_failed":
      return { border: "border-rose-100 bg-rose-50/50", text: "text-rose-600" };
    case "skill_verified":
      return { border: "border-indigo-100 bg-indigo-50/50", text: "text-indigo-600" };
    case "campaign_linked":
      return { border: "border-blue-100 bg-blue-50/50", text: "text-blue-600" };
    case "version_restore":
    case "version_created":
      return { border: "border-amber-100 bg-amber-50/50", text: "text-amber-600" };
    default:
      return { border: "border-slate-200 bg-slate-50", text: "text-slate-500" };
  }
};

export default function AirsDashboard() {
  const { jds, recentActivities } = useAirsStore();
  const navigate = useNavigate();

  // 1. Compute KPIs
  const totalJds = jds.length;
  const readyJds = jds.filter((j) => j.status === "Ready").length;
  const parsingJds = jds.filter((j) => j.status === "Parsing" || j.parseStatus === "In_Progress").length;
  const pendingJds = jds.filter((j) => j.status === "Pending Review").length;
  const closedJds = jds.filter((j) => j.status === "Closed").length;

  // 2. Prepare chart data
  // Status pie chart
  const statusData = [
    { name: "Ready", value: readyJds, color: "#6366F1" }, // Modern Indigo
    { name: "Draft/Pending", value: jds.filter((j) => j.status === "Draft" || j.status === "Pending Review").length, color: "#F59E0B" }, // Amber
    { name: "Parsing", value: parsingJds, color: "#10B981" }, // Emerald
    { name: "Closed", value: closedJds, color: "#64748B" } // Slate
  ].filter(item => item.value > 0);

  // Monthly JD Creation (group by month from createdDate)
  // Since dates are staggered from Jan-June 2026:
  const monthlyCounts = jds.reduce((acc, jd) => {
    if (!jd.createdDate) return acc;
    const date = new Date(jd.createdDate);
    const monthName = date.toLocaleString("default", { month: "short" });
    acc[monthName] = (acc[monthName] || 0) + 1;
    return acc;
  }, {});

  const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendData = monthOrder
    .filter((m) => monthlyCounts[m] !== undefined)
    .map((m) => ({
      month: m,
      count: monthlyCounts[m]
    }));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  // Recent activity icons mapping
  const getActivityIcon = (type) => {
    switch (type) {
      case "parse_success":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "parse_failed":
        return <XCircle className="h-4 w-4 text-rose-500" />;
      case "skill_verified":
        return <Sparkles className="h-4 w-4 text-indigo-500" />;
      case "campaign_linked":
        return <Briefcase className="h-4 w-4 text-blue-500" />;
      case "version_restore":
      case "version_created":
        return <RefreshCw className="h-4 w-4 text-amber-500" />;
      default:
        return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative min-h-screen p-8 bg-slate-50/40 text-slate-800 font-sans overflow-hidden">
      {/* Soft background glows for enterprise premium aesthetic */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-gradient-to-br from-indigo-200/20 to-blue-200/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[550px] h-[550px] bg-gradient-to-br from-emerald-100/15 to-teal-100/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 z-10">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            AIRS Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Analyze job descriptions, map skill taxonomies, and build AI-backed candidate matching profiles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* <Link
            to="/airs/jds/create"
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-[0_4px_14px_rgba(79,70,229,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.35)] transform hover:-translate-y-0.5"
          >
            <Plus className="h-4.5 w-4.5" /> Create JD
          </Link> */}
          <Button
            variant="primary"
            size="medium"
            onClick={() => navigate("/airs/jds/create")}
          >
            <Plus className="h-4 w-4" /> Create JD
          </Button>
          <Button
            variant="secondary"
            size="medium"
            onClick={() => navigate("/airs/jds")}
          // className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-slate-200/80 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
          >
            View JD Library <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10 relative z-10">
        {/* Total */}
        <KPICard
          label="Total JDs"
          value={totalJds}
          icon={<FileText className="h-5 w-5" />}
          color="bg-slate-100 text-slate-600"
        />

        {/* Ready */}
        <KPICard
          label="Ready JDs"
          value={readyJds}
          icon={<CheckCircle className="h-5 w-5" />}
          color="bg-indigo-50 text-indigo-600"
        />

        {/* Parsing */}
        <KPICard
          label="Parsing"
          value={parsingJds}
          icon={<RefreshCw className="h-5 w-5" />}
          color="bg-emerald-50 text-emerald-600"
        />

        {/* Pending Review */}
        <KPICard
          label="Pending Review"
          value={pendingJds}
          icon={<Clock className="h-5 w-5" />}
          color="bg-amber-50 text-amber-600"
        />

        {/* Closed */}
        <KPICard
          label="Closed"
          value={closedJds}
          icon={<XCircle className="h-5 w-5" />}
          color="bg-slate-100 text-slate-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10 relative z-10">
        {/* Creation Trend Chart */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-600" /> Monthly JD Intake Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Volume of job descriptions created or parsed monthly</p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg uppercase tracking-wider">H1 2026</span>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} fontWeight={500} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94A3B8" fontSize={11} fontWeight={500} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" name="JDs Uploaded" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown Chart */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">JD Status Distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Summary of matching readiness</p>
          </div>

          <div className="h-[200px] relative flex justify-center items-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-slate-800 leading-none">{totalJds}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1.5">Total</span>
            </div>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            {statusData.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100/50 rounded-xl transition duration-150">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{s.name}</p>
                  <p className="text-xs font-extrabold text-slate-700 mt-1">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Quick Actions & Recent Activities */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Recent Platform Activities
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] font-bold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Log
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Audit log of parsing and matching operations</p>
            </div>
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition">View Logs</button>
          </div>

          <div className="relative pl-4 space-y-6 max-h-[350px] overflow-y-auto pr-1">
            <div className="absolute left-4 top-2 bottom-6 w-[2px] bg-slate-100" />

            {recentActivities.map((act) => {
              const { border, text } = getActivityStyle(act.type);
              return (
                <div key={act.id} className="relative pl-8 group">
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-white border ${border} shadow-sm group-hover:scale-115 transition-transform duration-200 z-10`}>
                    {getActivityIcon(act.type)}
                  </div>
                  <div className="p-4 bg-slate-50/40 hover:bg-slate-50 border border-slate-100 rounded-2xl transition duration-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-950 transition duration-150">{act.text}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{act.user}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0 bg-slate-100/50 px-2 py-0.5 rounded border border-slate-200/20">{act.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Hiring Engine Shortcuts</h3>
            <p className="text-xs text-slate-400 mb-6">Trigger common AI and pipeline setups instantly</p>

            <div className="space-y-4">
              <Link
                to="/airs/jds/create?input=paste"
                className="flex items-center justify-between p-4 border border-slate-200/50 rounded-2xl bg-white/50 hover:bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition">Paste Raw JD Text</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Quickly type or copy textual parameters</p>
                  </div>
                </div>
                <ArrowRight className="h-4.5 w-4.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/airs/jds/create?input=upload"
                className="flex items-center justify-between p-4 border border-slate-200/50 rounded-2xl bg-white/50 hover:bg-white hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <FileUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition">Upload PDF / DOCX</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Drag-and-drop parsing extractor</p>
                  </div>
                </div>
                <ArrowRight className="h-4.5 w-4.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/airs/jds"
                className="flex items-center justify-between p-4 border border-slate-200/50 rounded-2xl bg-white/50 hover:bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition">Verify Skill Mappings</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Audit fuzzy and vector mappings</p>
                  </div>
                </div>
                <ArrowRight className="h-4.5 w-4.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">AIRS Platform v1.2</span>
          </div>
        </div>
      </div> */}
    </div>
  );
}
