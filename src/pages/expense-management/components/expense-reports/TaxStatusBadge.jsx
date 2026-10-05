import React from "react";

// Line tax validation status (server TaxValidationStatus) -> short label and colour.
// CALCULATED / NOT_APPLICABLE are the quiet defaults and render nothing.
const STATUS = {
  MATCHED: { label: "Matches receipt", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  WARNING: { label: "Tax override", className: "bg-amber-50 text-amber-700 border-amber-200" },
  MISMATCH: { label: "Differs from receipt", className: "bg-rose-50 text-rose-700 border-rose-200" },
  CONFIGURATION_MISSING: { label: "No tax code", className: "bg-amber-50 text-amber-700 border-amber-200" },
  REQUIRES_FINANCE_REVIEW: { label: "Finance review", className: "bg-rose-50 text-rose-700 border-rose-200" },
  FINANCE_VERIFIED: { label: "Tax verified", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FINANCE_ADJUSTED: { label: "Tax adjusted", className: "bg-blue-50 text-blue-700 border-blue-200" },
  LEGACY: { label: "Before tax codes", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const REASON_TEXT = {
  OVERRIDE: "Tax differs from the tax code",
  CONFIG_MISMATCH: "Receipt agrees with the entered tax, not the tax code",
  OCR_MISMATCH: "Tax differs from what OCR read on the receipt",
  NO_TAX_CODE: "Tax entered for a category with no tax code",
  LOW_OCR_CONFIDENCE: "OCR reading too uncertain to compare",
};

/** Small pill for a line's tax status; the title lists the reasons behind it. */
export default function TaxStatusBadge({ tax }) {
  const style = STATUS[tax?.validationStatus];
  if (!style) return null;
  const reasons = (tax.validationReasons || []).map((r) => REASON_TEXT[r]).filter(Boolean);
  return (
    <span
      title={reasons.join("\n") || style.label}
      className={`inline-block whitespace-nowrap rounded-full border px-1.5 py-px text-[10px] font-semibold ${style.className}`}
    >
      {style.label}
    </span>
  );
}
