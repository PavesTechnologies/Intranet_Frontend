import React from "react";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { VENDORS } from "../../mocks/apFixtures";
import { VENDOR_STATUS } from "../../constants/vendorStatus";

/**
 * Small set of pass/fail rule checks, derived heuristically from the
 * invoice's own fields (no external validation service involved).
 */
const buildChecks = (invoice) => {
  const vendor = VENDORS.find((v) => v.id === invoice.vendorId);
  const amount = invoice.amount ?? 0;

  return [
    {
      key: "vendor-active",
      label: "Vendor is active",
      pass: vendor?.status === VENDOR_STATUS.ACTIVE,
      detail: vendor
        ? `Vendor status: ${vendor.status}`
        : "Vendor record not found",
    },
    {
      key: "po-present",
      label: "PO reference present",
      pass: Boolean(invoice.poNumber),
      detail: invoice.poNumber ? `Referenced PO: ${invoice.poNumber}` : "No purchase order referenced",
    },
    {
      key: "amount-tolerance",
      label: "Amount within tolerance",
      pass: amount > 0 && amount <= 75000,
      detail: amount > 75000 ? "Amount exceeds standard tolerance threshold ($75,000)" : `Invoice amount: ${amount}`,
    },
    {
      key: "tax-calc",
      label: "Tax calculation correct",
      pass: invoice.exceptionType !== "Tax Discrepancy",
      detail:
        invoice.exceptionType === "Tax Discrepancy"
          ? "Flagged tax discrepancy against jurisdiction tax rules"
          : "No tax discrepancy flagged",
    },
  ];
};

const ValidationChecklist = ({ invoice }) => {
  if (!invoice) return null;
  const checks = buildChecks(invoice);

  return (
    <div className="space-y-3">
      <h3 className={Fonts.subheading}>Validation Rules</h3>
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {checks.map((check) => (
          <li key={check.key} className="flex items-start gap-3 px-4 py-3">
            <span
              className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                check.pass ? "bg-emerald-500" : "bg-rose-500"
              }`}
              aria-hidden="true"
            />
            <div>
              <p className={`${Fonts.label} ${check.pass ? "text-slate-800" : "text-rose-700"}`}>
                {check.pass ? "✓" : "✗"} {check.label}
              </p>
              <p className={`${Fonts.smallText} mt-0.5`}>{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ValidationChecklist;
