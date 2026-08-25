import { formatDisplayDate } from "./format";
import { BILLING_BASIS_OPTIONS } from "../data/toolCatalogOptions";

const BILLING_BASIS_LABELS = BILLING_BASIS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

export const CHARGE_TYPE_LABELS = {
  labor: "Labor",
  contract: "Contract",
  milestone: "Milestone",
  recurring: "Recurring",
  expense: "Expense",
  tool: "Tool",
  software: "Software",
};

export const SOURCE_SYSTEM_LABELS = {
  labor: "TMS",
  contract: "Contract Ledger",
  milestone: "Milestone Tracker",
  recurring: "Recurring Billing Engine",
  expense: "Expense Management",
  tool: "Tool Catalog",
  software: "RMS / Tool Pricing",
};

// "software" (Epic 4 Phase 6 — Invoice Integration) carries generated software charge lines
// into the same charge-type taxonomy as every other invoice line, so they flow through
// ChargeGroup/computeChargeTotals unchanged rather than needing a parallel summary.
export const CHARGE_TYPE_ORDER = ["labor", "contract", "milestone", "recurring", "expense", "tool", "software"];

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
    case "tool": {
      // Billing Basis comes straight from the backend response (Epic 4 Tool Catalog enum on
      // real records; the legacy mock "chargeType" field as a fallback) — never computed here.
      const basisLabel = record.billingBasis
        ? BILLING_BASIS_LABELS[record.billingBasis] || record.billingBasis
        : record.chargeType;
      return basisLabel ? `${record.toolName} (${basisLabel})` : record.toolName;
    }
    case "software": {
      const basisLabel = record.billingBasis ? BILLING_BASIS_LABELS[record.billingBasis] || record.billingBasis : null;
      const name = record.assetName ? `${record.assetName} (${record.assetCode})` : record.assetCode;
      return basisLabel ? `${name} — ${basisLabel}` : name;
    }
    default:
      return record.id;
  }
}

export function quantityAndUnitPrice(chargeType, record) {
  if (chargeType === "labor") return { quantity: record.hours, unitPrice: record.rate };
  if (chargeType === "tool" || chargeType === "software") return { quantity: record.quantity, unitPrice: record.unitPrice };
  return { quantity: 1, unitPrice: record.amount };
}

export function computeChargeTotals(acquisitionResults) {
  const subtotal = CHARGE_TYPE_ORDER.reduce((total, type) => total + (acquisitionResults?.[type]?.amount || 0), 0);
  return { subtotal };
}
