import { TONE_BADGE, TONE_DOT } from "../utils/dashboardFormatters";

/** Pill badge: tone colour plus a dot and text label, so meaning never relies on colour alone. */
export default function StatusBadge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONE_BADGE[tone] || TONE_BADGE.neutral} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone] || TONE_DOT.neutral}`} aria-hidden="true" />
      {children}
    </span>
  );
}
