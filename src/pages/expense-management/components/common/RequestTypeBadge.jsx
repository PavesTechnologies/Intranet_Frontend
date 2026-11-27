import React from "react";

/**
 * The kinds of request that move through Expense Management, defined once so every table labels them the same way.
 *
 *  - EXPENSE     an expense report claiming money the employee spent (paid back to them)
 *  - SETTLEMENT  an expense report that settles a cash advance (its total is set against that advance; any
 *                excess is paid to the employee)
 *  - ADVANCE     a cash advance request (money paid to the employee before the trip)
 */
export const REQUEST_TYPES = {
  EXPENSE: {
    label: "Expense",
    description: "Expense report - money the employee spent, paid back to them",
    className: "bg-indigo-100 text-indigo-800",
  },
  SETTLEMENT: {
    label: "Advance settlement",
    description: "Expense report that settles a cash advance - set against that advance on approval",
    className: "bg-sky-100 text-sky-800",
  },
  ADVANCE: {
    label: "Cash advance",
    description: "Cash advance request - money paid to the employee before the trip",
    className: "bg-emerald-100 text-emerald-800",
  },
};

/** Type of an expense report: a settlement when it is linked to a cash advance, otherwise a plain expense. */
export const reportTypeOf = (report) => (report?.cashAdvanceId ? "SETTLEMENT" : "EXPENSE");

// `label` / `description` override the wording on one page only. My Expenses calls a settlement report "Cash advance",
// because advance requests never appear there; pages that list both (e.g. Finance) keep the two names apart.
export default function RequestTypeBadge({ type, label, description }) {
  const t = REQUEST_TYPES[type] || REQUEST_TYPES.EXPENSE;
  return (
    <span
      title={description || t.description}
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.className}`}
    >
      {label || t.label}
    </span>
  );
}
