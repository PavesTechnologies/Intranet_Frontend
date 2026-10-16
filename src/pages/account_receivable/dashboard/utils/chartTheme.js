// Chart palette aligned to the site's slate/indigo theme. Each series is
// also distinguished by stroke style or a text label, never colour alone.
export const CHART_COLORS = {
  invoiced: "#4f46e5", // indigo-600
  collected: "#059669", // emerald-600
  projected: "#64748b", // slate-500, dashed
  grid: "#e2e8f0", // slate-200
  axis: "#475569", // slate-600
};

// Sequential low -> critical risk ramp for aging buckets.
export const AGING_RISK_COLORS = {
  low: "#10b981",
  watch: "#84cc16",
  elevated: "#f59e0b",
  high: "#f97316",
  critical: "#e11d48",
};

export const BILLING_MODEL_COLORS = {
  tm: "#3730a3", // indigo-800
  milestone: "#818cf8", // indigo-400
  retainer: "#10b981", // emerald-500
  tools: "#f59e0b", // amber-500
};

export const TOOLTIP_STYLE = {
  borderRadius: "0.5rem",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgb(15 23 42 / 0.08)",
  fontSize: "12px",
};
