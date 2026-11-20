import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppCard from "../components/Cards/AppCard";
import UpcomingHolidays from "../pages/leave_management/charts/UpcomingHolidays";
import BirthdayAnniversaryPanel from "../components/Cards/BirthdayAnniversaryPanel";
import TodayOnLeavePanel from "../components/Cards/TodayOnLeavePanel";
import RequestLeaveModal from "../pages/leave_management/models/RequestLeaveModal";
import { timesheet, pmsSummary, leaveBalance } from "../services/dashboard";
import { useAuth } from "../contexts/AuthContext";
import {
  CalendarPlus, Clock, ArrowRight, FolderKanban, Palmtree, Timer, ListChecks, Sun, Sunset, Moon,
} from "lucide-react";
import { useLeaveWebSocket } from "../pages/leave_management/websockets/useLeaveWebSocket";
import {
  DashboardIllustrationStyles,
} from "../components/illustrations/DashboardIllustrations";

// Section entrance: cards fade up one after another.
const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const ITEM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

// ── Sub-components ───────────────────────────────────────────────────────────

function DonutChart({ label, used, remaining, color }) {
  const u = parseFloat(used) || 0;
  const r = parseFloat(remaining) || 0;
  const total = u + r;
  // Chart shows remaining balance (reduced from total)
  const pct = total > 0 ? (r / total) * 100 : 0;
  const size = 76;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  // start empty, then fill on mount so the ring "draws" itself
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const formatValue = (val) => {
    return Math.round(val * 100) / 100;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Background circle represents the total capacity */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            className="opacity-10"
          />
          {/* Foreground circle represents the remaining balance */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={drawn ? offset : circ}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-base font-bold text-[#0A174E] leading-none">{formatValue(r)}</span>
          <span className="text-[10px] text-gray-400 mt-0.5">/ {formatValue(total)}</span>
        </div>
      </div>
      <div className="text-center leading-tight">
        <span className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-tight">{label}</span>
        <span className="block text-[10px] text-[#A8A29E] mt-0.5">{formatValue(u)} used</span>
      </div>
    </div>
  );
}


// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [isRequestLeaveModalOpen, setIsRequestLeaveModalOpen] = useState(false);
  const [totalHours, setTotalHours] = useState("0.00");
  const [pmsData, setPmsData] = useState(null);
  const [leaveBalanceData, setLeaveBalanceData] = useState(null);
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const { user } = useAuth();
  const userId = user.user_id;
  const fetchTimesheetData = async () => {
    try {
      const res = await timesheet();
      if (res.success && res.data) {
        setTotalHours(res.data.totalHours);
      }
    } catch (err) {
      console.error("Failed to fetch timesheet data", err);
    }
  };

  const fetchPMSData = async () => {
    try {
      const res = await pmsSummary(userId);
      setPmsData(res);
    } catch (err) {
      console.error("Failed to fetch PMS data", err);
    }
  };

  // ✅ Wrapped in useCallback with a stable identity based on [userId, year] —
  // useLeaveWebSocket puts the onEvent callback in its effect dependency
  // array, so an unstable (re-created every render) function would cause
  // it to unsubscribe/resubscribe on every render.
  const fetchLeaveBalanceData = useCallback(async () => {
    try {
      const res = await leaveBalance(userId, year);
      setLeaveBalanceData(res.data);
    } catch (err) {
      console.error("Failed to fetch leave balance data", err);
    }
  }, [userId, year]);

  useEffect(() => {
    fetchTimesheetData();
    fetchPMSData();
    fetchLeaveBalanceData();
  }, [userId, fetchLeaveBalanceData]);

  // ✅ Live update: when the manager approves, rejects, or edits this
  // employee's leave request, the backend pushes an event on
  // /user/queue/data-updated ("employee-update" channel). Re-fetch the
  // leave balance so the donut charts and KPI reflect the new balance
  // without the user needing to refresh the page.
  //
  // LEAVE_UPDATED is included because manager-side edits (e.g. changing
  // dates or leave type) can change days consumed, same as approve/reject.
  const handleLeaveBalanceUpdate = useCallback(
    (data) => {
      // console.log("🔄 Leave balance affected by:", data?.type, "— refetching");
      fetchLeaveBalanceData();
    },
    [fetchLeaveBalanceData],
  );

  useLeaveWebSocket(
    "employee-update",
    ["LEAVE_APPROVED", "LEAVE_REJECTED", "LEAVE_UPDATED"],
    handleLeaveBalanceUpdate,
  );

  // ── Derived view data ──────────────────────────────────────────────────────
  const firstName = (user?.name || user?.email || "there").split(/[\s@]/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const GreetIcon = hour < 12 ? Sun : hour < 17 ? Sunset : Moon;
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });
  const totalLeaveLeft = leaveBalanceData
    ? Math.round(leaveBalanceData.reduce((acc, l) => acc + (parseFloat(l.remainingBalance) || 0), 0) * 100) / 100
    : 0;

  const HERO_STATS = [
    { id: "projects", label: "Active Projects", value: pmsData?.activeProjectCount || 0, unit: "", icon: FolderKanban, tone: "text-[#0A0082] bg-[#E6E5F7]" },
    { id: "hours", label: "Hours This Month", value: totalHours, unit: "hrs", icon: Clock, tone: "text-[#FF3D72] bg-[#FFE4EC]" },
    { id: "leave", label: "Leave Days Left", value: totalLeaveLeft, unit: "days", icon: Palmtree, tone: "text-emerald-600 bg-emerald-50" },
  ];

  const QUICK_ACTIONS = [
    { id: "leave", title: "Apply Leave", desc: "Plan your time off in seconds", icon: CalendarPlus, tint: "bg-[#E6E5F7] text-[#0A0082]", onClick: () => setIsRequestLeaveModalOpen(true) },
    { id: "timesheet", title: "Enter Timesheets", desc: "Log today's hours with ease", icon: Timer, tint: "bg-[#FFE4EC] text-[#FF3D72]", onClick: () => navigate("/timesheets") },
    { id: "tasks", title: "Manage Tasks", desc: "Pick up where you left off", icon: ListChecks, tint: "bg-emerald-50 text-emerald-600", onClick: () => navigate("/my-work") },
  ];

  const getLeave = (name) =>
    leaveBalanceData?.find((l) => l.leaveName === name) || { usedLeaves: 0, remainingBalance: 0 };

  return (
    <div className="relative min-h-screen font-sans bg-[#F4F6FC]">
      <DashboardIllustrationStyles />

      <main className="relative p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* ── Compact welcome strip ── */}
        <section className="relative">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
            className="group/strip hd-grad-bg relative rounded-2xl border border-[#E3E6F2] shadow-[0_10px_28px_-18px_rgba(10,23,78,0.35)]"
          >
            {/* cursor spotlight: a soft brand glow that follows the mouse */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover/strip:opacity-100"
              style={{
                background:
                  "radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), rgba(255,61,114,0.13), rgba(10,0,130,0.06) 45%, transparent 70%)",
              }}
            />
            {/* thin brand accent along the top edge */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] overflow-hidden rounded-t-2xl">
              <div className="h-full w-full bg-gradient-to-r from-[#0A0082] via-[#5B66B8] to-[#FF3D72]" />
            </div>

            <div className="relative flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <div className="min-w-0 break-words">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[#78716C]">
                  <GreetIcon size={13} className="text-amber-500" /> {todayLabel}
                </p>
                <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#0A174E]">
                  {greeting}, <span className="capitalize text-[#FF3D72]">{firstName}</span>
                </h1>
                <p className="mt-1 text-sm text-[#78716C]">Here&apos;s your day at a glance.</p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-2.5" data-tour="dash-kpis">
                {HERO_STATS.map(({ id, label, value, unit, icon: Icon, tone }) => (
                  <div
                    key={id}
                    title={label}
                    className="flex min-w-0 flex-col items-start gap-1.5 rounded-xl border border-[#E3E6F2] bg-white/90 p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:gap-2.5 sm:py-2 sm:pl-2 sm:pr-4"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 w-full leading-tight">
                      <p className="font-heading text-base font-bold tabular-nums text-[#0A174E] truncate">
                        <CountUp value={value} />
                        {unit &&<span className="ml-1 text-[11px] font-medium text-[#A8A29E]">{unit}</span>}
                      </p>
                      <p className="text-[10.5px] font-medium text-[#78716C] line-clamp-2 sm:line-clamp-1 sm:whitespace-nowrap">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </section>

        {/* ── Body grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
          <motion.div className="xl:col-span-7 space-y-4 sm:space-y-6 min-w-0" initial="hidden" animate="show" variants={STAGGER}>

            {/* Quick actions — styled like the login page service tiles */}
            <motion.section variants={ITEM} data-tour="dash-quick-actions" className="rounded-2xl border border-[#E3E6F2] bg-white p-5 shadow-[0_8px_24px_-16px_rgba(10,23,78,0.25)]">
              <SectionTitle>Quick Actions</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {QUICK_ACTIONS.map(({ id, title, desc, icon: Icon, tint, onClick }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={onClick}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-[#E7E5E4] bg-white p-3 pr-9 text-left sm:block sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#0A0082] hover:shadow-[0_0_0_4px_rgba(10,0,130,0.08),0_10px_22px_-10px_rgba(10,0,130,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082] focus-visible:ring-offset-2"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tint} transition-colors duration-300 group-hover:bg-[#0A0082] group-hover:text-white`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 sm:mt-3">
                      <p className="font-heading text-sm font-semibold text-[#0A174E]">{title}</p>
                      <p className="mt-0.5 text-xs text-[#78716C]">{desc}</p>
                    </div>
                    <ArrowRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 sm:top-4 sm:translate-y-0 text-[#C4C0BC] transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[#FF3D72]" />
                    <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-[#FF3D72] transition-transform duration-500 group-hover:scale-x-100" />
                  </button>
                ))}
              </div>
            </motion.section>

            <motion.div variants={ITEM} data-tour="dash-on-leave" className="hd-card">
              <TodayOnLeavePanel />
            </motion.div>

            <motion.div variants={ITEM} data-tour="dash-leave-balance" className="hd-card">
              <AppCard
                density="comfortable"
                renderHeader={() => (
                  <div className="flex justify-between items-center">
                    <SectionTitle className="mb-0">Leave Balance Overview</SectionTitle>
                    <button
                      onClick={() => navigate("/leave-management")}
                      className="text-xs font-semibold text-[#0A0082] hover:text-[#FF3D72] flex gap-1 items-center transition-colors"
                    >
                      Explore <ArrowRight size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              >
                <div className="grid grid-cols-3 gap-2 sm:gap-3 py-1">
                  {[
                    { label: "Earned Leave", data: getLeave("Earned Leave"), color: "#0A0082" },
                    { label: "Sick Leave", data: getLeave("Sick Leave"), color: "#FF3D72" },
                    { label: "Comp Off", data: getLeave("Compensatory Leave"), color: "#5B66B8" },
                  ].map(({ label, data, color }) => (
                    <div key={label} className="min-w-0 rounded-xl bg-[#F4F6FC] px-1 py-3 sm:py-4 transition hover:bg-[#EEF0FB]">
                      <DonutChart label={label} used={data.usedLeaves} remaining={data.remainingBalance} color={color} />
                    </div>
                  ))}
                </div>
              </AppCard>
            </motion.div>
          </motion.div>

          <motion.div className="xl:col-span-5 space-y-4 sm:space-y-6 min-w-0" initial="hidden" animate="show" variants={STAGGER}>
            <motion.div variants={ITEM} data-tour="dash-holidays" className="hd-card">
              <UpcomingHolidays year={year} />
            </motion.div>
            <motion.div variants={ITEM} data-tour="dash-celebrations" className="hd-card">
              <BirthdayAnniversaryPanel />
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Unified card chrome for the existing panels (matches login page cards) */}
      <style>{`
        .hd-card > div { border-radius: 1rem; border-color: #E3E6F2; box-shadow: 0 8px 24px -16px rgba(10, 23, 78, .25); transition: box-shadow .25s ease; }
        .hd-card > div:hover { box-shadow: 0 14px 32px -16px rgba(10, 23, 78, .35); }
      `}</style>

      <RequestLeaveModal
        isOpen={isRequestLeaveModalOpen}
        onClose={() => setIsRequestLeaveModalOpen(false)}
        year={year}
        onSuccess={() => { setIsRequestLeaveModalOpen(false); fetchLeaveBalanceData(); }}
      />
    </div>
  );
}

/**
 * Animates a number from its previous value to the new one (ease-out, ~0.9s).
 * Keeps the decimal places of the incoming value, e.g. "23.75" or "0.00".
 */
function CountUp({ value, duration = 900 }) {
  const target = parseFloat(value) || 0;
  const decimals = String(value).includes(".") ? String(value).split(".")[1].length : 0;
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDisplay(target); fromRef.current = target; return; }
    const from = fromRef.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return <>{display.toFixed(decimals)}</>;
}

/** Login-page style heading: indigo→pink accent bar + Poppins navy title. */
function SectionTitle({ children, className = "mb-4" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="h-1 w-6 rounded bg-gradient-to-r from-[#0A0082] to-[#FF3D72]" />
      <h2 className="font-heading text-sm font-semibold text-[#0A174E]">{children}</h2>
    </div>
  );
}
