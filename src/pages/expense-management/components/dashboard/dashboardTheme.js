// Chart colors for the Expense dashboards. Validated with the dataviz skill's validate_palette.js
// against the white card surface: categorical (adjacent CVD ΔE >= 9.1, normal-vision >= 19.6),
// ordinal blue ramp (monotone, light end 2.06:1). Slots 3-5 sit under 3:1 on white, so every
// categorical use ships visible labels (the breakdown legend lists each slice with its count).

/** Categorical, in fixed order - assign by entity, never cycle. */
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];

/** Ordered stages / buckets: light -> dark blue (validated as an ordinal ramp). */
export const ORDINAL_BLUE = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];

/** Single-series accent (magnitude, one measure). */
export const ACCENT = "#2a78d6";

/** Reserved status colors - always shown with an icon + label, never color alone. */
export const STATUS = { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" };

/** Recessive chart chrome. */
export const CHROME = { grid: "#e1e0d9", axis: "#c3c2b7", muted: "#898781", surface: "#ffffff" };

/** Money in the base currency. `compact` for axis ticks (₹12K). */
export const formatMoney = (value, currency = "INR", { compact = false } = {}) => {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }
};

export const formatKpiValue = (kpi, currency) => {
  if (kpi.format === "money") return formatMoney(kpi.value, currency);
  if (kpi.format === "days") return `${Number(kpi.value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 })} d`;
  return Number(kpi.value || 0).toLocaleString("en-IN");
};

export const timeAgo = (value) => {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};
