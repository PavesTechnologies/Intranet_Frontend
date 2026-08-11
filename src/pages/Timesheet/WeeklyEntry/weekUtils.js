// Helpers for the weekly (whole-week) timesheet entry flow.
//
// Every rule here mirrors what the existing daily flow already enforces, so the
// weekly screen can't offer a date the backend would reject:
//   • current month only        — TimeSheetController.createTimeSheet
//   • no future dates           — the daily date picker caps at maxDate={today}
//   • weekends blocked unless a holiday record sets submitTimesheet === true
//   • holidays with submitTimesheet === false are blocked
//   • a day must reach the configured minimum hours before it can be saved

export const toISO = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export const parseISO = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0);
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const shortDay = (iso) => {
  const d = parseISO(iso);
  return d ? `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}` : "";
};
export const dayMonth = (iso) => {
  const d = parseISO(iso);
  return d ? `${d.getDate()} ${MON[d.getMonth()]}` : "";
};
export const weekdayShort = (iso) => {
  const d = parseISO(iso);
  return d ? DOW[d.getDay()] : "";
};
export const isWeekendISO = (iso) => {
  const d = parseISO(iso);
  if (!d) return false;
  const g = d.getDay();
  return g === 0 || g === 6;
};

/**
 * Monday–Sunday weeks of one month, clipped to that month.
 * A week that straddles a month boundary keeps only its in-month dates, so no
 * foreign-month date is ever offered for entry.
 */
export const buildMonthWeeks = (year, monthIndex) => {
  const lastOfMonth = new Date(year, monthIndex + 1, 0);
  const cursor = new Date(year, monthIndex, 1);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)); // back to Monday

  const weeks = [];
  while (cursor <= lastOfMonth) {
    const dates = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(cursor);
      d.setDate(d.getDate() + i);
      if (d.getFullYear() === year && d.getMonth() === monthIndex) dates.push(toISO(d));
    }
    if (dates.length) {
      weeks.push({
        weekNo: weeks.length + 1,
        dates,
        start: dates[0],
        end: dates[dates.length - 1],
      });
    }
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
};

// ---- time maths -----------------------------------------------------------
export const timeToMinutes = (value) => {
  const [h, m] = String(value || "").split(":");
  return (Number(h) || 0) * 60 + (Number(m) || 0);
};
export const minutesToHM = (total) => {
  if (!total || total <= 0) return "0:00";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
};
export const entryMinutes = (entry) => {
  const a = timeToMinutes(entry?.fromTime);
  const b = timeToMinutes(entry?.toTime);
  return b > a ? b - a : 0;
};
export const sumMinutes = (entries = []) =>
  entries.reduce((total, entry) => total + entryMinutes(entry), 0);

/**
 * Hour settings come back in the backend's HH.MM-literal convention
 * (8.30 means 8h30m, not 8.5h) — the same reading HourSettingsModal uses.
 */
export const hourSettingToMinutes = (value) => {
  if (value == null || Number.isNaN(Number(value))) return 0;
  const cents = Math.round(Number(value) * 100);
  const h = Math.floor(cents / 100);
  const m = cents % 100;
  return h * 60 + m;
};

// ---- what a day is allowed to do ----------------------------------------
export const LOCKED_DAY_STATUSES = ["approved", "partially approved"];
export const isStatusLocked = (status) =>
  LOCKED_DAY_STATUSES.includes(String(status || "").toLowerCase().replace(/_/g, " "));

/** Week statuses a user may still open and edit. */
export const isWeekSelectable = (weeklyStatus) => !isStatusLocked(weeklyStatus);

/**
 * Why a date cannot take entries — a short label, or null when it can.
 * Order matters: the most specific reason wins.
 */
export const blockedReason = (iso, { todayISO, holidaysMap = {}, year, monthIndex }) => {
  const date = parseISO(iso);
  if (!date) return "Invalid date";

  if (year != null && monthIndex != null &&
      (date.getFullYear() !== year || date.getMonth() !== monthIndex)) {
    return "Other month";
  }
  if (todayISO && iso > todayISO) return "Future date";

  const holiday = holidaysMap[iso];
  const weekend = isWeekendISO(iso);
  if (weekend && (!holiday || holiday.submitTimesheet === false)) return "Weekend";
  if (holiday && holiday.submitTimesheet === false) {
    return holiday.holidayName || "Holiday";
  }
  return null;
};

/** Minimum minutes a day must reach before the backend accepts it. */
export const requiredMinutes = (iso, settings) =>
  isWeekendISO(iso) ? settings.weekendMinutes : settings.regularMinutes;

/**
 * Backend times arrive as UTC datetimes (sometimes without the trailing Z) and
 * sometimes as a bare HH:mm:ss. Normalise either to a local "HH:mm" suitable for
 * <input type="time"> — the same reading EntriesTable already applies.
 */
export const utcToLocalHM = (value) => {
  if (!value) return "";
  try {
    if (/^\d{2}:\d{2}/.test(value)) return String(value).slice(0, 5);
    const date = new Date(String(value).endsWith("Z") ? value : `${value}Z`);
    if (Number.isNaN(date.getTime())) return "";
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;
  } catch {
    return "";
  }
};
