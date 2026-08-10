import { DollarSign, Receipt, CalendarClock, FileWarning, Copy } from "lucide-react";

/**
 * Exact enum values from the Policy & Compliance Engine backend contract.
 * Never add/rename/remove values here without the backend contract changing.
 */
export const RULE_TYPES = ["AMOUNT_LIMIT", "RECEIPT_REQUIRED", "BACKDATED_DAYS", "MISSING_DESCRIPTION", "DUPLICATE_EXPENSE"];
export const ENFORCEMENT_TYPES = ["WARN", "BLOCK"];
export const SEVERITIES = ["WARN", "INFO"];
export const OVERAGE_TIERS = ["MINOR", "MODERATE", "SEVERE"];
export const ASSIGNMENT_TYPES = ["INDIVIDUAL", "GROUP", "DEFAULT"];

export const RULE_TYPE_META = {
  AMOUNT_LIMIT: {
    label: "Amount Limit",
    description: "Cap spend per category, in one currency or several.",
    Icon: DollarSign,
  },
  RECEIPT_REQUIRED: {
    label: "Receipt Required",
    description: "Require a receipt attachment for this category.",
    Icon: Receipt,
  },
  BACKDATED_DAYS: {
    label: "Backdated Expense",
    description: "Flag expenses submitted more than N days after the fact.",
    Icon: CalendarClock,
  },
  MISSING_DESCRIPTION: {
    label: "Missing Description",
    description: "Flag expenses submitted without a description.",
    Icon: FileWarning,
  },
  DUPLICATE_EXPENSE: {
    label: "Duplicate Expense",
    description: "Flag expenses that look like duplicates of another.",
    Icon: Copy,
  },
};

// Rule-write access is intentionally ADMIN-only per the backend contract
// (Finance is excluded here even though it can manage every other Policy
// Engine resource — a documented, temporary backend inconsistency).
export const POLICY_ADMIN_ROLES = ["Admin", "Super_Admin"];
export const POLICY_MANAGE_ROLES = ["Admin", "Super_Admin", "Finance"];
export const POLICY_VIEW_ROLES = ["Admin", "Super_Admin", "Finance", "Manager"];
