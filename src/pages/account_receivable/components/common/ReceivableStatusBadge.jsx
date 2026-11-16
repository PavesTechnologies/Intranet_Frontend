import { getReceivableDueState } from "../../services/receivableService";

/**
 * Due-state badge for a receivable (Not Due → Due Today → Overdue). Same
 * shape as the global StatusBadge, which has no colours for these states.
 */
const TONE = {
  NOT_DUE: "bg-blue-100 text-blue-700",
  DUE_TODAY: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-rose-100 text-rose-700",
  PARTIALLY_PAID: "bg-sky-100 text-sky-700",
  NO_DUE_DATE: "bg-slate-100 text-slate-600",
  SETTLED: "bg-green-100 text-green-700",
};

export default function ReceivableStatusBadge({ receivable, size = "sm" }) {
  const state = getReceivableDueState(receivable);
  const sizeClass = size === "md" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";
  return (
    <span className={`inline-block whitespace-nowrap rounded-full font-medium ${sizeClass} ${TONE[state.key]}`}>
      {state.label}
    </span>
  );
}
