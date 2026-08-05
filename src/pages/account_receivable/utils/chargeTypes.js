import { formatDisplayDate } from "./format";

export const CHARGE_TYPE_LABELS = {
  labor: "Labor",
  contract: "Contract",
  milestone: "Milestone",
  recurring: "Recurring",
  expense: "Expense",
  tool: "Tool",
};

export const SOURCE_SYSTEM_LABELS = {
  labor: "TMS",
  contract: "Contract Ledger",
  milestone: "Milestone Tracker",
  recurring: "Recurring Billing Engine",
  expense: "Expense Management",
  tool: "Tool Catalog",
};

export const CHARGE_TYPE_ORDER = ["labor", "contract", "milestone", "recurring", "expense", "tool"];

export function describeRecord(chargeType, record) {
  switch (chargeType) {
    case "labor":
      return `${record.employee} — ${formatDisplayDate(record.workDate)}`;
    case "contract":
      return record.schedule;
    case "milestone":
      return record.milestone;
    case "recurring":
      return record.plan && record.plan !== "Retainer" ? record.plan : `Retainer — ${record.billingPeriod}`;
    case "expense":
      return record.description;
    case "tool":
      return record.toolName;
    default:
      return record.id;
  }
}

export function quantityAndUnitPrice(chargeType, record) {
  if (chargeType === "labor") return { quantity: record.hours, unitPrice: record.rate };
  if (chargeType === "tool") return { quantity: record.quantity, unitPrice: record.unitPrice };
  return { quantity: 1, unitPrice: record.amount };
}

export function computeChargeTotals(acquisitionResults) {
  const subtotal = CHARGE_TYPE_ORDER.reduce((total, type) => total + (acquisitionResults?.[type]?.amount || 0), 0);
  return { subtotal };
}
