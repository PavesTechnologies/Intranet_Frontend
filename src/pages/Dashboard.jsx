import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppCard from "../components/Cards/AppCard";
import DynamicCardGrid from "../components/Cards/DynamicCardGrid";
import UpcomingHolidays from "../pages/leave_management/charts/UpcomingHolidays";
import BirthdayAnniversaryPanel from "../components/Cards/BirthdayAnniversaryPanel";
import TodayOnLeavePanel from "../components/Cards/TodayOnLeavePanel";
import RequestLeaveModal from "../pages/leave_management/models/RequestLeaveModal";
import { KPICard } from "../components/kpi/KPI";
import { timesheet, pmsSummary, leaveBalance } from "../services/dashboard";
import { useAuth } from "../contexts/AuthContext";
import { CalendarPlus, Clock, ArrowRight } from "lucide-react";
import Button from "../components/Button/Button";
import { useLeaveWebSocket } from "../pages/leave_management/websockets/useLeaveWebSocket";

// ── Data ────────────────────────────────────────────────────────────────────



const MODULES = [
  {
    id: "project",
    name: "Project Management",
    desc: "Track tasks, milestones, and project progress across teams.",
    meta: "8 active projects",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "leave",
    name: "Leave Management",
    desc: "Apply for leaves, check balances, and view team availability.",
    meta: "1 pending request",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="14" x2="8" y2="14" strokeLinecap="round" strokeWidth={2.5} />
        <line x1="12" y1="14" x2="12" y2="14" strokeLinecap="round" strokeWidth={2.5} />
        <line x1="8" y1="18" x2="8" y2="18" strokeLinecap="round" strokeWidth={2.5} />
      </svg>
    ),
  },
  {
    id: "resource",
    name: "Resource Management",
    desc: "Manage allocations, capacity, and resource utilisation.",
    meta: "14 resources tracked",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" />
        <line x1="12" y1="11" x2="7" y2="15" /><line x1="12" y1="11" x2="17" y2="15" />
        <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
  {
    id: "user",
    name: "User Management",
    desc: "Manage profiles, access levels, and team directories.",
    meta: "42 team members",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "timesheet",
    name: "Timesheets",
    desc: "Log daily hours, submit weekly timesheets, and view history.",
    meta: "Submit by Friday",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
      </svg>
    ),
  },
  {
    id: "onboarding",
    name: "Employee Onboarding",
    desc: "Guide new hires through documents, tasks, and orientation.",
    meta: "2 joiners this month",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
      </svg>
    ),
  },
];

const ACTIVITY = [
  { dot: "bg-blue-400", text: "Riya Sharma updated the Q2 Website Redesign milestone to 'Completed'", time: "10 min ago" },
  { dot: "bg-teal-400", text: "Your leave request for May 20–22 was approved", time: "1 hr ago" },
  { dot: "bg-amber-400", text: "Timesheet for Week 19 is pending submission", time: "3 hrs ago" },
  { dot: "bg-violet-400", text: "Arjun Mehta has been added to the Backend team", time: "Yesterday" },
  { dot: "bg-orange-400", text: "New onboarding checklist assigned to Priya Nair", time: "Yesterday" },
];


// ── Sub-components ───────────────────────────────────────────────────────────

function DonutChart({ label, used, remaining, color }) {
  const u = parseFloat(used) || 0;
  const r = parseFloat(remaining) || 0;
  const total = u + r;
  // Chart shows remaining balance (reduced from total)
  const pct = total > 0 ? (r / total) * 100 : 0;
  const size = 80;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

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
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-gray-800 leading-none">{formatValue(r)}</span>
          <span className="text-[10px] text-gray-400 mt-0.5">/ {formatValue(total)}</span>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-tight text-center">{label}</span>
    </div>
  );
}


function ActivityFeed() {
  return (
    <AppCard
      density="comfortable"
      renderHeader={() => (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Recent activity</h2>
          <button className="text-xs text-blue-600 hover:underline">View all</button>
        </div>
      )}
    >
      <ul className="divide-y divide-gray-50">
        {ACTIVITY.map((item, i) => (
          <li key={i} className="flex gap-3 items-start py-3 first:pt-0 last:pb-0">
            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
            <div>
              <p className="text-xs text-gray-700 leading-relaxed">{item.text}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </AppCard>
  );
}


// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState(null);
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
      console.log("🔄 Leave balance affected by:", data?.type, "— refetching");
      fetchLeaveBalanceData();
    },
    [fetchLeaveBalanceData],
  );

  useLeaveWebSocket(
    "employee-update",
    ["LEAVE_APPROVED", "LEAVE_REJECTED", "LEAVE_UPDATED"],
    handleLeaveBalanceUpdate,
  );

  const STATS = [
    {
      id: "projects",
      label: "Active Projects",
      value: pmsData?.activeProjectCount || 0,
      accentBar: "bg-blue-400",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      badgeColor: "bg-blue-50 text-blue-700",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: "hours",
      label: "Hours This Month",
      value: totalHours,
      // valueSuffix: "/ 40 hrs",
      sub: "Timesheet this month",
      accentBar: "bg-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-700",
      badgeColor: "bg-amber-50 text-amber-700",
      // progress: 65,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15.5 14" />
        </svg>
      ),
    },
    // {
    //   id: "leave",
    //   label: "Leave Balance",
    //   value: leaveBalanceData
    //     ? Math.round(leaveBalanceData.reduce((acc, curr) => acc + (curr.remainingBalance || 0), 0) * 100) / 100
    //     : "0",
    //   // valueSuffix: " days left",
    //   sub: "Available balance",
    //   accentBar: "bg-teal-500",
    //   iconBg: "bg-teal-50",
    //   iconColor: "text-teal-700",
    //   badgeColor: "bg-amber-50 text-amber-700",
    //   icon: (
    //     <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    //       <rect x="3" y="4" width="18" height="18" rx="2" />
    //       <line x1="16" y1="2" x2="16" y2="6" />
    //       <line x1="8" y1="2" x2="8" y2="6" />
    //       <line x1="3" y1="10" x2="21" y2="10" />
    //     </svg>
    //   ),
    // },
    // {
    //   id: "tasks",
    //   label: "My Tasks",
    //   value: pmsData?.pendingTasksCount || 0,
    //   // valueSuffix: "open",
    //   // sub: "2 due today",
    //   accentBar: "bg-orange-500",
    //   iconBg: "bg-orange-50",
    //   iconColor: "text-orange-700",
    //   badgeColor: "bg-orange-50 text-orange-700",
    //   icon: (
    //     <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    //       <polyline points="9 11 12 14 22 4" />
    //       <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    //     </svg>
    //   ),
    // },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Main content */}
      <main className="p-8 max-w-6xl">

        {/* Modules */}
        <div className="grid grid-cols-8 gap-3">
          {/* <div className="col-span-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">modules</p>
            <DynamicCardGrid
              data={MODULES}
              getKey={(m) => m.id}
              renderCard={(m) => (
                <AppCard
                  icon={m.icon}
                  iconBg={m.iconBg}
                  iconColor={m.iconColor}
                  title={m.name}
                  subtitle={m.desc}
                  onClick={() => setActiveModule(m.id)}
                  density="comfortable"
                  className="mb-0"
                >
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{m.meta}</span>
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </AppCard>
              )}
              cardsPerRow={2}
              showPagination={false}
              gapClassName="gap-3"
              wrapperClassName="mb-8"
            />
          </div> */}
          <div className="col-span-4">
            {/* <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Holidays & Leave</p> */}
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((s) => (
                <KPICard
                  key={s.id}
                  label={s.label}
                  value={s.value}
                  suffix={s.valueSuffix}
                  icon={s.icon}
                  color={`${s.iconBg} ${s.iconColor}`}
                />
              ))}
            </div>

            <AppCard
              className="mt-4"
              density="comfortable"
              renderHeader={() => (
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-indigo-800" />
                  <span className="text-sm font-semibold text-gray-800">Quick Actions</span>
                </div>
              )}
            >
              <div className="flex items-center gap-4">
                <Button
                  variant="primary"
                  size="medium"
                  onClick={() => setIsRequestLeaveModalOpen(true)}
                >
                  Apply Leave
                </Button>

                <Button
                  variant="secondary"
                  size="medium"
                  onClick={() => navigate("/timesheets")}
                >
                  Enter Timesheets
                </Button>

                <Button
                  variant="success"
                  size="medium"
                  onClick={() => navigate("/my-work")}
                >
                  Manage Tasks
                </Button>
              </div>
            </AppCard>
            <div className="mt-4">
              <TodayOnLeavePanel />
            </div>
            <div className="mt-4">
              <AppCard
                density="comfortable"
                renderHeader={() => (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-pink-500" />
                      <span className="text-sm font-semibold text-gray-800">Leave Balance Overview</span>
                    </div>
                    <button onClick={() => navigate("/leave-management")}
                      className="text-xs text-blue-600 hover:text-blue-800 flex gap-1 items-center">Explore <ArrowRight size={10} strokeWidth={3} /></button>
                  </div>
                )}
              >
                <div className="flex justify-around items-center py-4">
                  {(() => {
                    const getLeave = (name) => leaveBalanceData?.find(l => l.leaveName === name) || { totalBalance: 0, remainingBalance: 0 };
                    const earned = getLeave("Earned Leave");
                    const sick = getLeave("Sick Leave");
                    const comp = getLeave("Compensatory Leave");

                    return (
                      <>
                        <DonutChart
                          label="Earned Leave"
                          used={earned.usedLeaves}
                          remaining={earned.remainingBalance}
                          color="#10b981"
                        />
                        <DonutChart
                          label="Sick Leave"
                          used={sick.usedLeaves}
                          remaining={sick.remainingBalance}
                          color="#f43f5e"
                        />
                        <DonutChart
                          label="Comp Off"
                          used={comp.usedLeaves}
                          remaining={comp.remainingBalance}
                          color="#3b82f6"
                        />
                      </>
                    );
                  })()}
                </div>
              </AppCard>
            </div>
          </div>
          <div className="col-span-4">
            {/* <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Quick Updates</p> */}
            <div>
              <UpcomingHolidays year={year} />
            </div>
            <div className="mt-4">
              <BirthdayAnniversaryPanel />
            </div>
          </div>
        </div>

      </main>

      {/* Modals */}
      <RequestLeaveModal
        isOpen={isRequestLeaveModalOpen}
        onClose={() => setIsRequestLeaveModalOpen(false)}
        year={year}
        onSuccess={() => { setIsRequestLeaveModalOpen(false); fetchLeaveBalanceData() }
        }
      />

      {/* Active module toast */}
      {activeModule && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 z-50">
          <span>Navigating to <strong>{MODULES.find((m) => m.id === activeModule)?.name}</strong></span>
          <button onClick={() => setActiveModule(null)} className="text-gray-400 hover:text-white ml-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}