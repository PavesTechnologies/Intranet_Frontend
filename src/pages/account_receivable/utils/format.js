/**
 * Indian digit grouping (lakh/crore) with 2 decimal places, no currency
 * symbol — e.g. 145000 -> "1,45,000.00". Returns "" for blank/non-numeric
 * input so callers can fall back to their own placeholder.
 */
export function formatIndianNumber(amount) {
  if (amount === "" || amount === null || amount === undefined) return "";
  const value = Number(amount);
  if (Number.isNaN(value)) return "";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrency(amount, currency = "INR") {
  const value = Number(amount) || 0;
  const normalizedCurrency = String(currency || "INR").toUpperCase();
  const isInr = normalizedCurrency === "INR";
  const symbol = isInr ? "₹" : `${normalizedCurrency} `;
  const locale = isInr ? "en-IN" : "en-US";
  return `${symbol}${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Accepts an ISO date string ("2026-10-01..."), a Java LocalDate
 * tuple ([year, month, day], 1-indexed month), a comma-separated
 * date string ("2026,10,1"), or a Date object.
 * Returns formatted string "DD MMM YYYY" (e.g. "01 Oct 2026")
 * without introducing any timezone shifts for local dates.
 */
export function formatDisplayDate(value) {
  if (value === null || value === undefined || value === "") return "—";

  let year;
  let month;
  let day;

  if (Array.isArray(value)) {
    [year, month, day] = value;
  } else if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "—";
    year = value.getFullYear();
    month = value.getMonth() + 1;
    day = value.getDate();
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";

    if (trimmed.includes(",")) {
      const parts = trimmed.split(",").map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p));
      if (parts.length >= 3) {
        [year, month, day] = parts;
      }
    } else {
      const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        year = Number(isoMatch[1]);
        month = Number(isoMatch[2]);
        day = Number(isoMatch[3]);
      } else {
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) return trimmed;
        year = parsed.getFullYear();
        month = parsed.getMonth() + 1;
        day = parsed.getDate();
      }
    }
  } else {
    return String(value);
  }

  if (
    year == null ||
    month == null ||
    day == null ||
    Number.isNaN(Number(year)) ||
    Number.isNaN(Number(month)) ||
    Number.isNaN(Number(day))
  ) {
    return String(value);
  }

  const monthIdx = Number(month) - 1;
  const monthName = SHORT_MONTHS[monthIdx];
  if (!monthName) return String(value);

  const dayStr = String(day).padStart(2, "0");
  return `${dayStr} ${monthName} ${year}`;
}

export function formatDisplayDateTime(value) {
  if (value === null || value === undefined || value === "") return "—";

  let date;
  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    if (year == null || month == null || day == null) return "—";
    date = new Date(year, month - 1, day, hour, minute, second);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.includes(",")) {
      const parts = trimmed.split(",").map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p));
      if (parts.length >= 3) {
        const [y, m, d, h = 0, min = 0, s = 0] = parts;
        date = new Date(y, m - 1, d, h, min, s);
      } else {
        date = new Date(trimmed);
      }
    } else {
      date = new Date(trimmed);
    }
  } else if (value instanceof Date) {
    date = value;
  } else {
    return String(value);
  }

  if (!date || Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// PMS formats project-duration dates as "09-Sep-2026" (see the
// /available-projects projectDuration string) — normalized to the
// application's "DD MMM YYYY"; anything else goes through formatDisplayDate.
const PMS_DURATION_DATE = /^(\d{1,2})[-\s/]([A-Za-z]{3})[A-Za-z]*[-\s/](\d{4})$/;

function formatDurationDate(value) {
  const match = String(value).trim().match(PMS_DURATION_DATE);
  if (!match) return formatDisplayDate(value);
  const [, day, month, year] = match;
  return `${day.padStart(2, "0")} ${month.charAt(0).toUpperCase()}${month.slice(1).toLowerCase()} ${year}`;
}

/**
 * Project Duration — the PMS project period (never billing/payment dates).
 * Prefers the project's own projectDuration string ("09-Sep-2026 to
 * 23-Dec-2026"), falling back to its startDate/endDate. Returns
 * "09 Sep 2026 – 23 Dec 2026", or "" when the project has no duration.
 */
export function formatProjectDuration(project = {}) {
  const { projectDuration, startDate, endDate } = project || {};
  if (typeof projectDuration === "string" && projectDuration.trim()) {
    const parts = projectDuration
      .split(/\s+to\s+|\s+[–-]\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length === 2
      ? `${formatDurationDate(parts[0])} – ${formatDurationDate(parts[1])}`
      : projectDuration.trim();
  }
  if (startDate || endDate) {
    return `${startDate ? formatDisplayDate(startDate) : "—"} – ${endDate ? formatDisplayDate(endDate) : "Ongoing"}`;
  }
  return "";
}
