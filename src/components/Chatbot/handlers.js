/**
 * Turns a matched intent into a bot reply, pulling live data from the same
 * services the dashboard uses. Each handler returns a message object:
 *   { text, items?: [{ primary, secondary }], actions?: [{ label, to } | { label, tour: true }] }
 */
import api from "../../api/axiosInstance";
import { celebrations, leaveBalance, pmsSummary, timesheet, todayOnLeave } from "../../services/dashboard";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const round2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100;

/** "DD/MM/YY" → days until the next occurrence (0 = today), or null. */
function daysUntilDayMonth(dateStr) {
  const [d, m] = String(dateStr || "").split("/").map((x) => parseInt(x, 10));
  if (!d || !m) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next - today) / 86400000);
}

const fmtDayMonth = (dateStr) => {
  const [d, m] = String(dateStr || "").split("/").map((x) => parseInt(x, 10));
  return d && m ? `${d} ${MONTHS[m - 1]}` : dateStr;
};

const OPEN = {
  leave: { label: "Open Leave Management", to: "/leave-management" },
  timesheets: { label: "Open Timesheets", to: "/timesheets" },
  tasks: { label: "Open My Work", to: "/my-work" },
  projects: { label: "Open Projects", to: "/projects" },
  profile: { label: "Open My Profile", to: "/profile" },
};

export const HELP_REPLY = {
  text: "I can help you with things around the intranet. Try asking:",
  items: [
    { primary: "Leave", secondary: "Your balance, who's off today, applying for leave" },
    { primary: "Timesheets", secondary: "Hours logged this month, where to log time" },
    { primary: "Projects & tasks", secondary: "Your active projects and My Work" },
    { primary: "Company", secondary: "Upcoming holidays, birthdays and anniversaries" },
    { primary: "Getting around", secondary: "Open your profile or take a guided tour" },
  ],
};

export async function runIntent(intent, ctx) {
  const { userId, firstName } = ctx;
  const year = new Date().getFullYear();

  switch (intent) {
    case "greet":
      return { text: `Hi ${firstName || "there"}! 👋 How can I help you today?` };

    case "thanks":
      return { text: "You're welcome! Anything else I can help with?" };

    case "help":
      return HELP_REPLY;

    case "tour":
      return { text: "Sure! The guided tour walks you through the main parts of the intranet.", actions: [{ label: "Start the tour", tour: true }] };

    case "leaveBalance": {
      const res = await leaveBalance(userId, year);
      const rows = (res?.data || []).filter((l) => l?.leaveName);
      if (!rows.length) return { text: "I couldn't find any leave balance for you this year.", actions: [OPEN.leave] };
      const total = round2(rows.reduce((a, l) => a + (parseFloat(l.remainingBalance) || 0), 0));
      return {
        text: `You have ${total} leave day${total === 1 ? "" : "s"} available in ${year}:`,
        items: rows.map((l) => ({
          primary: l.leaveName,
          secondary: `${round2(l.remainingBalance)} left · ${round2(l.usedLeaves)} used`,
        })),
        actions: [{ label: "Apply for leave", to: "/leave-management" }],
      };
    }

    case "applyLeave":
      return {
        text: "You can apply for leave from Leave Management: choose the leave type, pick your dates and submit. Your manager is notified automatically.",
        actions: [OPEN.leave],
      };

    case "leavePage":
      return { text: "Leave Management has your balances, requests and history.", actions: [OPEN.leave] };

    case "onLeaveToday": {
      const res = await todayOnLeave();
      const people = res?.data || [];
      if (!people.length) return { text: "Nobody is on leave today. The whole team is in! 🎉" };
      return {
        text: `${people.length} ${people.length === 1 ? "person is" : "people are"} on leave today:`,
        items: people.map((p) => ({ primary: p.employeeName, secondary: p.session || "" })),
      };
    }

    case "holidays": {
      const res = await api.get(`${window.__APP_CONFIG__.BASE_URL}/api/holidays/year/${year}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = (res?.data || [])
        .filter((h) => new Date(h.holidayDate) >= today)
        .sort((a, b) => new Date(a.holidayDate) - new Date(b.holidayDate))
        .slice(0, 5);
      if (!upcoming.length) return { text: `There are no more holidays left in ${year}.` };
      return {
        text: "Here are the next holidays:",
        items: upcoming.map((h) => ({
          primary: h.holidayName,
          secondary: new Date(h.holidayDate).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
        })),
      };
    }

    case "celebrations": {
      const res = await celebrations();
      const tagged = [
        ...(res?.birthdays || []).map((x) => ({ ...x, kind: "🎂 Birthday" })),
        ...(res?.workAnniversaries || []).map((x) => ({ ...x, kind: `🏆 ${x.anniversaryYear ? `${x.anniversaryYear}-year ` : ""}anniversary` })),
        ...(res?.newJoinees || []).map((x) => ({ ...x, kind: "👋 Joining" })),
      ]
        .map((x) => ({ ...x, days: daysUntilDayMonth(x.date) }))
        .filter((x) => x.days !== null)
        .sort((a, b) => a.days - b.days)
        .slice(0, 6);
      if (!tagged.length) return { text: "No celebrations coming up right now." };
      return {
        text: "Here's what's coming up:",
        items: tagged.map((x) => ({
          primary: x.name,
          secondary: `${x.kind} · ${x.days === 0 ? "Today 🎉" : x.days === 1 ? "Tomorrow" : fmtDayMonth(x.date)}`,
        })),
      };
    }

    case "hours": {
      const res = await timesheet();
      const hours = res?.data?.totalHours ?? 0;
      return { text: `You've logged ${hours} hours this month.`, actions: [OPEN.timesheets] };
    }

    case "timesheet":
      return { text: "You can log your daily hours and submit your weekly timesheet from Timesheets.", actions: [OPEN.timesheets] };

    case "projects": {
      const res = await pmsSummary(userId);
      const count = res?.activeProjectCount ?? 0;
      return { text: `You're on ${count} active project${count === 1 ? "" : "s"}.`, actions: [OPEN.projects] };
    }

    case "tasks":
      return { text: "Your tasks are in My Work, where you can update status and pick up where you left off.", actions: [OPEN.tasks] };

    case "profile":
      return { text: "You can view and update your details on your profile page.", actions: [OPEN.profile] };

    default:
      return null;
  }
}
