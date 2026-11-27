import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppCard from "../components/Cards/AppCard";
import UpcomingHolidays from "../pages/leave_management/charts/UpcomingHolidays";
import BirthdayAnniversaryPanel from "../components/Cards/BirthdayAnniversaryPanel";
import TodayOnLeavePanel from "../components/Cards/TodayOnLeavePanel";
import PriorityTasksPanel from "../components/Cards/PriorityTasksPanel";
import RequestLeaveModal from "../pages/leave_management/models/RequestLeaveModal";
import { timesheet, pmsSummary, leaveBalance, todayOnLeave, myLeaveRequests } from "../services/dashboard";
import { useAuth } from "../contexts/AuthContext";
import {
  CalendarPlus, Clock, ArrowRight, FolderKanban, Palmtree, Timer, ListChecks, Sun, Sunset, Moon, HeartPulse, Repeat2, Hourglass, Plane,
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

const fmt = (val) => Math.round((parseFloat(val) || 0) * 100) / 100;

/**
 * One leave type as a compact tile: icon, big "days left" number, total,
 * a thin progress line and the used count. Zero-balance types render muted.
 */
function LeaveTile({ label, icon: Icon, used, remaining, color }) {
  const u = parseFloat(used) || 0;
  const r = parseFloat(remaining) || 0;
  const total = u + r;
  const pct = total > 0 ? (r / total) * 100 : 0;
  const empty = total === 0;
  // start empty, then grow on mount so the line "fills" itself
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-14px_rgba(10,23,78,0.35)]"
      style={{
        borderColor: empty ? "#EEF0F7" : `${color}26`,
        background: empty ? "#FAFBFE" : `linear-gradient(160deg, ${color}0F 0%, #ffffff 65%)`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C]">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: empty ? "#F1F2F8" : `${color}14`, color: empty ? "#A8A29E" : color }}
        >
          <Icon size={14} />
        </span>
      </div>

      {empty ? (
        <>
          <p className="mt-3 font-heading text-2xl font-bold leading-none text-[#C4C0BC]">—</p>
          <p className="mt-1.5 text-[11px] text-[#A8A29E]">None accrued yet</p>
        </>
      ) : (
        <>
          <p className="mt-3 flex items-baseline gap-1 leading-none">
            <span className="font-heading text-2xl font-bold tabular-nums text-[#0A174E]">{fmt(r)}</span>
            <span className="text-xs font-medium text-[#A8A29E] tabular-nums">/ {fmt(total)} days</span>
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full" style={{ background: `${color}1F` }}>
            <div
              className="h-full rounded-full"
              style={{ width: drawn ? `${pct}%` : "0%", background: color, transition: "width 1.1s cubic-bezier(.16,1,.3,1)" }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[#78716C] tabular-nums">
            {u > 0 ? `${fmt(u)} used this year` : "Nothing used yet"}
          </p>
        </>
      )}
    </div>
  );
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—";

/** "L-SICK_LEAVE" / "SICK_LEAVE" → "Sick Leave" */
const prettyLeaveType = (name) =>
  !name
    ? "Leave"
    : String(name).replace(/^L-/, "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function InfoChip({ icon: Icon, tone, label, value, sub }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#EEF0F7] bg-white p-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={14} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[10.5px] font-medium text-[#78716C]">{label}</p>
        <p className="truncate text-[13px] font-bold text-[#0A174E] tabular-nums">{value}</p>
        {sub && <p className="truncate text-[10.5px] text-[#A8A29E]">{sub}</p>}
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  REJECTED: "bg-rose-50 text-rose-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

function StatusPill({ status }) {
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ") : "—";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status] || "bg-[#F1F2F8] text-[#4B5275]"}`}>
      {label}
    </span>
  );
}

function LeaveTileSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-[#EEF0F7] p-4">
      <div className="flex justify-between">
        <div className="h-3 w-20 rounded bg-[#EEF0F7]" />
        <div className="h-7 w-7 rounded-lg bg-[#EEF0F7]" />
      </div>
      <div className="mt-3 h-6 w-16 rounded bg-[#EEF0F7]" />
      <div className="mt-3 h-1 w-full rounded-full bg-[#EEF0F7]" />
    </div>
  );
}


// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [isRequestLeaveModalOpen, setIsRequestLeaveModalOpen] = useState(false);
  const [totalHours, setTotalHours] = useState("0.00");
  const [pmsData, setPmsData] = useState(null);
  const [leaveBalanceData, setLeaveBalanceData] = useState(null);
  const [leaveLoaded, setLeaveLoaded] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [onLeave, setOnLeave] = useState([]);
  const [onLeaveLoading, setOnLeaveLoading] = useState(true);
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
    // Balance and the employee's own requests change together, so refresh both.
    const [balRes, reqRes] = await Promise.allSettled([
      leaveBalance(userId, year),
      myLeaveRequests(userId, year),
    ]);
    if (balRes.status === "fulfilled") setLeaveBalanceData(balRes.value.data);
    else console.error("Failed to fetch leave balance data", balRes.reason);
    if (reqRes.status === "fulfilled") setMyRequests(reqRes.value);
    setLeaveLoaded(true);
  }, [userId, year]);

  // Fetched here (not inside the panel) so the welcome strip can show the
  // "everyone's in / N out" status from the same data.
  useEffect(() => {
    todayOnLeave()
      .then((res) => setOnLeave(res?.data ?? []))
      .catch(() => setOnLeave([]))
      .finally(() => setOnLeaveLoading(false));
  }, []);

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

  // ── Leave insights from the employee's own requests ──
  const statusOf = (l) => String(l.status || "").toUpperCase();
  const todayStart = new Date(new Date().toDateString());
  const pendingReqs = myRequests.filter((l) => statusOf(l) === "PENDING");
  const pendingDays = fmt(pendingReqs.reduce((a, l) => a + (parseFloat(l.daysRequested) || 0), 0));
  const nextLeave = myRequests
    .filter((l) => statusOf(l) === "APPROVED" && l.startDate && new Date(l.startDate) >= todayStart)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
  const takenDays = fmt((leaveBalanceData || []).reduce((a, l) => a + (parseFloat(l.usedLeaves) || 0), 0));
  const recentReqs = [...myRequests]
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    .slice(0, 3);

  return (
    <div className="relative min-h-screen font-sans bg-[#F4F6FC]">
      <DashboardIllustrationStyles />

      <main className="relative p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* ── Welcome strip: greeting, KPIs, quick actions, team status ── */}
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
                        {unit && <span className="ml-1 text-[11px] font-medium text-[#A8A29E]">{unit}</span>}
                      </p>
                      <p className="text-[10.5px] font-medium text-[#78716C] line-clamp-2 sm:line-clamp-1 sm:whitespace-nowrap">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions + who's-in status */}
            <div className="relative flex flex-col gap-3 border-t border-[#E3E6F2]/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex flex-wrap gap-2" data-tour="dash-quick-actions">
                {QUICK_ACTIONS.map(({ id, title, desc, icon: Icon, tint, onClick }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={onClick}
                    title={desc}
                    className="group flex items-center gap-2 rounded-lg border border-[#E3E6F2] bg-white py-1.5 pl-1.5 pr-3 text-xs font-semibold text-[#0A174E] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0A0082] hover:shadow-[0_0_0_3px_rgba(10,0,130,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082] focus-visible:ring-offset-1"
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-md ${tint} transition-colors duration-200 group-hover:bg-[#0A0082] group-hover:text-white`}>
                      <Icon size={13} />
                    </span>
                    {title}
                  </button>
                ))}
              </div>

              {onLeaveLoading ? (
                <div className="h-6 w-36 animate-pulse rounded-full bg-white/70" />
              ) : (
                <a
                  href="#dash-on-leave"
                  className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-semibold transition hover:brightness-95 sm:self-auto ${
                    onLeave.length === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${onLeave.length === 0 ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${onLeave.length === 0 ? "bg-emerald-500" : "bg-amber-500"}`} />
                  </span>
                  {onLeave.length === 0 ? "Everyone's in today" : `${onLeave.length} out today`}
                </a>
              )}
            </div>
          </motion.div>
        </section>

        {/* ── Body grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 xl:items-start">
          <motion.div className="xl:col-span-7 space-y-4 sm:space-y-6 min-w-0" initial="hidden" animate="show" variants={STAGGER}>

            <motion.div variants={ITEM} data-tour="dash-priority-tasks" className="hd-card">
              <PriorityTasksPanel userId={userId} />
            </motion.div>

            <motion.div variants={ITEM} data-tour="dash-leave-balance" className="hd-card">
              <AppCard
                density="comfortable"
                renderHeader={() => (
                  <div className="flex justify-between items-center gap-3">
                    <SectionTitle className="mb-0">Leave Balance</SectionTitle>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsRequestLeaveModalOpen(true)}
                        className="rounded-lg bg-[#0A0082] px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[#FF3D72]"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/leave-management")}
                        className="text-xs font-semibold text-[#0A0082] hover:text-[#FF3D72] flex gap-1 items-center transition-colors"
                      >
                        Explore <ArrowRight size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )}
              >
                {leaveLoaded && (
                  <p className="mb-3 text-xs text-[#78716C] tabular-nums">
                    <span className="font-heading text-base font-bold text-[#0A174E]">{totalLeaveLeft}</span> days available
                    <span className="mx-1.5 text-[#D6D3D1]">·</span>
                    <span className="font-semibold text-[#0A174E]">{takenDays}</span> taken in {year}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {!leaveLoaded
                    ? [0, 1, 2].map((i) => <LeaveTileSkeleton key={i} />)
                    : [
                        { label: "Earned Leave", data: getLeave("Earned Leave"), color: "#0A0082", icon: Palmtree },
                        { label: "Sick Leave", data: getLeave("Sick Leave"), color: "#FF3D72", icon: HeartPulse },
                        { label: "Comp Off", data: getLeave("Compensatory Leave"), color: "#5B66B8", icon: Repeat2 },
                      ].map(({ label, data, color, icon }) => (
                        <LeaveTile key={label} label={label} icon={icon} used={data.usedLeaves} remaining={data.remainingBalance} color={color} />
                      ))}
                </div>

                {leaveLoaded && (
                  <>
                    {/* Insight chips: pending and next (totals live in the summary line above the tiles) */}
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <InfoChip
                        icon={Hourglass}
                        tone="text-amber-700 bg-amber-50"
                        label="Awaiting approval"
                        value={pendingReqs.length ? `${pendingReqs.length} req · ${pendingDays} d` : "None"}
                      />
                      <InfoChip
                        icon={Plane}
                        tone="text-[#D6245A] bg-[#FFE4EC]"
                        label="Next leave"
                        value={nextLeave ? fmtDate(nextLeave.startDate) : "Not planned"}
                        sub={nextLeave ? `${fmt(nextLeave.daysRequested)} d · ${prettyLeaveType(nextLeave.leaveType)}` : null}
                      />
                    </div>

                    {/* Recent requests */}
                    <div className="mt-4 border-t border-[#F1F2F8] pt-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#A8A29E]">Recent requests</p>
                        {myRequests.length > 3 && (
                          <button
                            type="button"
                            onClick={() => navigate("/leave-management")}
                            className="text-[11px] font-semibold text-[#0A0082] hover:text-[#FF3D72]"
                          >
                            View all {myRequests.length}
                          </button>
                        )}
                      </div>
                      {recentReqs.length === 0 ? (
                        <p className="py-2 text-xs text-[#A8A29E]">No leave requests in {year} yet.</p>
                      ) : (
                        <ul className="divide-y divide-[#F7F8FC]">
                          {recentReqs.map((l, i) => (
                            <li key={l.leaveId ?? i} className="flex items-center gap-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-[#0A174E]">{prettyLeaveType(l.leaveType)}</p>
                                <p className="text-[11px] text-[#78716C] tabular-nums">
                                  {fmtDate(l.startDate)}
                                  {l.endDate && l.endDate !== l.startDate ? ` – ${fmtDate(l.endDate)}` : ""}
                                  {l.daysRequested != null ? ` · ${fmt(l.daysRequested)} day${fmt(l.daysRequested) === 1 ? "" : "s"}` : ""}
                                </p>
                              </div>
                              <StatusPill status={statusOf(l)} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </AppCard>
            </motion.div>

            <motion.div variants={ITEM} id="dash-on-leave" data-tour="dash-on-leave" className="hd-card scroll-mt-24">
              <TodayOnLeavePanel employees={onLeave} loading={onLeaveLoading} />
            </motion.div>
          </motion.div>

          {/* Right column stays in view while the left column scrolls */}
          <motion.div className="xl:col-span-5 space-y-4 sm:space-y-6 min-w-0 xl:sticky xl:top-6" initial="hidden" animate="show" variants={STAGGER}>
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
