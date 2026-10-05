/**
 * Compact status pill for the Pre-Screen cards.
 *
 * Deliberately not the shared components/status/statusbadge.jsx: that one infers its colour
 * from keywords in the label, which misreads the labels used here ("Not Blocked" contains
 * "blocked", "Incomplete" contains "complete"). Tone is passed in explicitly instead, and the
 * caller always derives it from a backend value.
 */
const TONE_CLASSES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  neutral: "border-gray-200 bg-gray-50 text-gray-600",
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

export default function PreScreenStatusBadge({ label, tone = "neutral", size = "sm" }) {
  if (!label) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border font-semibold ${
        TONE_CLASSES[tone] || TONE_CLASSES.neutral
      } ${SIZE_CLASSES[size] || SIZE_CLASSES.sm}`}
    >
      {label}
    </span>
  );
}
