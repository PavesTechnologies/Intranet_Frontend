import { parseCriteriaPattern } from "../utils/criteriaPattern";

/**
 * Shared human-readable vocabulary for the Approval Engine admin screens (flow list, builder,
 * flow preview) - kept in one place so the list/builder/preview never drift into describing the
 * same backend enum two different ways.
 */

export const FIELD_LABELS = {
  AMOUNT: "Amount",
  CATEGORY: "Category",
  DEPARTMENT: "Department",
  COST_CENTER: "Cost Center",
};

export const OPERATOR_LABELS = {
  EQUALS: "=",
  NOT_EQUALS: "≠",
  GREATER_THAN: ">",
  GREATER_THAN_OR_EQUAL: "≥",
  LESS_THAN: "<",
  LESS_THAN_OR_EQUAL: "≤",
};

export const SOURCE_TYPE_LABELS = {
  NAMED_USER: "Named User",
  REPORTING_MANAGER: "Reporting Manager",
  DEPARTMENT_OWNER: "Department Owner",
  COST_CENTER_OWNER: "Cost Center Owner",
  FINANCE_OWNER: "Finance Owner (by Cost Center)",
};

export const QUORUM_LABELS = {
  SEQUENTIAL: "Sequential",
  ANY_OF: "Any Of",
  ALL_OF: "All Of",
};

export const LEVEL_TYPE_LABELS = {
  APPROVAL: "Approval",
  FINANCE_VERIFICATION: "Finance Verification",
};

export const formatMoney = (amount, currencyCode) =>
  amount === null || amount === undefined || amount === ""
    ? "—"
    : `${currencyCode || ""} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();

export const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

/**
 * Rewrites the one backend guard message that's genuinely confusing out of context: it fires when
 * an action is attempted on a report whose active level has moved on (e.g. into Finance
 * Verification) since the caller's queue was last fetched - a stale-row race, not a real mistake by
 * the approver. Every other backend error message is shown as-is (already written for end users).
 */
export const friendlyApprovalError = (rawMessage, fallback = "Action failed") => {
  if (rawMessage && rawMessage.includes("use the Finance Verification API")) {
    return "This report has already moved on to Finance Verification since your queue last refreshed - it's been removed from your list, no action needed.";
  }
  return rawMessage || fallback;
};

const describeCriterion = (c) => `${FIELD_LABELS[c.field] || c.field} ${OPERATOR_LABELS[c.operator] || c.operator} ${c.value}`;

/**
 * Turns { criteriaPattern, criteria } into "Amount > 50,000 AND Category = Travel" (OR-joined
 * across groups). Returns null when the pattern doesn't fit the DNF shape the visual builder
 * supports (parseCriteriaPattern already encodes that rule) - callers should fall back to
 * annotating the raw pattern instead of hiding it.
 */
export function describeCriteriaGroups(criteriaPattern, criteria) {
  const parsed = parseCriteriaPattern(criteriaPattern, criteria);
  if (!parsed) return null;
  if (!parsed.groups.length) return "Always (no conditions)";
  return parsed.groups
    .map((g) => g.criteria.map(describeCriterion).join(" AND "))
    .join("  OR  ");
}

/** Best-effort readable label for a single approver entry, given a resolved employee-name map. */
export function describeApprover(approver, employeeNameById) {
  if (approver.sourceType === "NAMED_USER") {
    const name = employeeNameById?.get(approver.sourceReference);
    return name || approver.sourceReference || "Named User";
  }
  return SOURCE_TYPE_LABELS[approver.sourceType] || approver.sourceType;
}

/** Readable label for a whole level: its name if set, else the approver chain within it. */
export function describeLevel(level, employeeNameById) {
  if (level.levelName?.trim()) return level.levelName.trim();
  const approvers = level.approvers || [];
  if (approvers.length === 1) return describeApprover(approvers[0], employeeNameById);
  return approvers.map((a) => describeApprover(a, employeeNameById)).join(` ${QUORUM_LABELS[level.quorum] || level.quorum} `);
}

/** "Manager → Department Owner → Finance" style chain across all levels of a flow. */
export function describeApprovalChain(levels, employeeNameById) {
  if (!levels?.length) return "No approval levels configured";
  return levels.map((l) => describeLevel(l, employeeNameById)).join(" → ");
}
