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
  Tooltip,
  Legend
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
    { name: "Ready", value: readyJds, color: "#2563EB" }, // Primary Blue
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
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            AI Screening Platform <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">AIRS Engine</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze job descriptions, map skill taxonomies, and build AI-backed candidate matching profiles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/airs/jds/create"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create JD
          </Link>
          <button
            onClick={() => navigate("/airs/jds")}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            View JD Library <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8"
      >
        {/* Total */}
        <motion.div variants={itemVariants} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total JDs</span>
            <div className="p-2 bg-slate-100 rounded-lg"><FileText className="h-5 w-5 text-slate-600" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-slate-900">{totalJds}</h3>
            <p className="text-xs text-slate-500 mt-1">Uploaded library items</p>
          </div>
        </motion.div>

        {/* Ready */}
        <motion.div variants={itemVariants} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Ready JDs</span>
            <div className="p-2 bg-blue-50 rounded-lg"><CheckCircle className="h-5 w-5 text-blue-600" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-blue-600">{readyJds}</h3>
            <p className="text-xs text-slate-500 mt-1">Validated & Campaign ready</p>
          </div>
        </motion.div>

        {/* Parsing */}
        <motion.div variants={itemVariants} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Parsing</span>
            <div className="p-2 bg-emerald-50 rounded-lg"><RefreshCw className="h-5 w-5 text-emerald-500 animate-spin-slow" style={{ animationDuration: '6s' }} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-emerald-600">{parsingJds}</h3>
            <p className="text-xs text-slate-500 mt-1">Extracting taxonomy...</p>
          </div>
        </motion.div>

        {/* Pending Review */}
        <motion.div variants={itemVariants} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Review Pending</span>
            <div className="p-2 bg-amber-50 rounded-lg"><Clock className="h-5 w-5 text-amber-500" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-amber-600">{pendingJds}</h3>
            <p className="text-xs text-slate-500 mt-1">Manual checklist audit</p>
          </div>
        </motion.div>

        {/* Closed */}
        <motion.div variants={itemVariants} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Closed</span>
            <div className="p-2 bg-slate-100 rounded-lg"><XCircle className="h-5 w-5 text-slate-500" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-slate-600">{closedJds}</h3>
            <p className="text-xs text-slate-500 mt-1">Archived descriptions</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Creation Trend Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" /> Monthly JD Intake Trend
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Volume of job descriptions created or parsed monthly</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">H1 2026</span>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0F172A", color: "#F8FAFC", borderRadius: 8, border: "none" }}
                  labelStyle={{ fontWeight: "bold", color: "#94A3B8" }}
                />
                <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" name="JDs Uploaded" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900">JD Status Distribution</h3>
            <p className="text-xs text-slate-500 mt-0.5">Summary of matching readiness</p>
          </div>

          <div className="h-[200px] relative flex justify-center items-center">
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
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F172A", color: "#F8FAFC", borderRadius: 8, border: "none" }}
                  itemStyle={{ color: "#F8FAFC" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-900">{totalJds}</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-100">
            {statusData.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs font-semibold text-slate-700">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Quick Actions & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activities */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Platform Activities</h3>
              <p className="text-xs text-slate-500 mt-0.5">Audit log of parsing and matching operations</p>
            </div>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition">View Logs</button>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-lg transition duration-150">
                <div className="mt-0.5 p-2 bg-slate-100 rounded-md shrink-0">
                  {getActivityIcon(act.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 leading-snug">{act.text}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold">{act.user}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">•</span>
                    <span className="text-[10px] text-slate-400 font-medium">{act.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Hiring Engine Shortcuts</h3>
            <p className="text-xs text-slate-500 mb-6">Trigger common AI and pipeline setups instantly</p>

            <div className="space-y-3">
              <Link
                to="/airs/jds/create?input=paste"
                className="flex items-center justify-between p-3.5 border border-slate-150 rounded-xl hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition"><FileText className="h-4.5 w-4.5" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Paste Raw JD Text</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Quickly type or copy textual parameters</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/airs/jds/create?input=upload"
                className="flex items-center justify-between p-3.5 border border-slate-150 rounded-xl hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition"><FileUp className="h-4.5 w-4.5" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Upload PDF / DOCX</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Drag-and-drop parsing extractor</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/airs/jds"
                className="flex items-center justify-between p-3.5 border border-slate-150 rounded-xl hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition"><Sparkles className="h-4.5 w-4.5" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Verify Skill Mappings</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Audit fuzzy and vector mappings</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-150 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AIRS Platform v1.2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
