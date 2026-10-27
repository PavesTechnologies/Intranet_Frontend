// Chart palette aligned to the site's slate/indigo theme. Series are also
// distinguished by text labels, never colour alone.
export const CHART_COLORS = {
  invoiced: "#4f46e5", // indigo-600
  grid: "#e2e8f0", // slate-200
  axis: "#475569", // slate-600
};

// Low -> critical risk ramp, keyed by the API's aging bucket keys.
export const AGING_BUCKET_COLORS = {
  current: "#10b981",
  d60: "#84cc16",
  d90: "#f59e0b",
  d120: "#f97316",
  d120plus: "#e11d48",
};

// Billing types come from master data, so colours are assigned by position.
export const BILLING_MODEL_PALETTE = ["#3730a3", "#818cf8", "#10b981", "#f59e0b", "#0ea5e9", "#e11d48", "#64748b"];

export const TOOLTIP_STYLE = {
  borderRadius: "0.5rem",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgb(15 23 42 / 0.08)",
  fontSize: "12px",
};
