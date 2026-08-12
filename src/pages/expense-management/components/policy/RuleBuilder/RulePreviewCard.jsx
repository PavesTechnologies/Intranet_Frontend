import React from "react";
import { Eye } from "lucide-react";
import SeverityBadge from "@/pages/expense-management/components/policy/common/SeverityBadge";

const buildSentence = ({ ruleType, categoryLabel, ruleValue, limits, bundleLabel }) => {
  const category = categoryLabel ? <span className="font-semibold">{categoryLabel}</span> : "this category's";
  const scope = bundleLabel ? <span className="font-semibold">{bundleLabel}</span> : "this policy's";

  switch (ruleType) {
    case "AMOUNT_LIMIT": {
      const validLimits = (limits || []).filter((l) => l.currencyLabel && l.limitAmount !== "" && l.limitAmount != null);
      if (validLimits.length > 0) {
        return (
          <>
            when {scope} {category} expenses exceed{" "}
            {validLimits.map((l, i) => (
              <span key={i} className="font-semibold">
                {l.limitAmount} {l.currencyLabel}
                {i < validLimits.length - 1 ? " / " : ""}
              </span>
            ))}
          </>
        );
      }
      if (ruleValue) {
        return (
          <>
            when {scope} {category} expenses exceed <span className="font-semibold">{ruleValue}</span> (converted to base currency)
          </>
        );
      }
      return null;
    }
    case "RECEIPT_REQUIRED":
      return (
        <>
          when {scope} {category} expenses are submitted without a receipt attached
        </>
      );
    case "BACKDATED_DAYS":
      return ruleValue ? (
        <>
          when {scope} {category} expenses are submitted more than <span className="font-semibold">{ruleValue}</span> day
          {ruleValue === "1" ? "" : "s"} after the expense date
        </>
      ) : null;
    case "MISSING_DESCRIPTION":
      return (
        <>
          when {scope} {category} expenses are submitted without a description
        </>
      );
    case "DUPLICATE_EXPENSE":
      return (
        <>
          when a {scope} {category} expense looks like a duplicate of another submission
        </>
      );
    default:
      return null;
  }
};

export default function RulePreviewCard({ ruleType, categoryLabel, ruleValue, limits = [], enforcementType, severity, bundleLabel }) {
  const sentence = buildSentence({ ruleType, categoryLabel, ruleValue, limits, bundleLabel });

  return (
    <div className="rounded-xl border border-dashed border-[#0A0082]/30 bg-[#0A0082]/[0.03] p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#0A0082]">
        <Eye size={13} /> Live Preview
      </div>
      {!ruleType || !categoryLabel || !sentence ? (
        <p className="text-sm text-gray-400">Fill in the category and conditions above to see a preview.</p>
      ) : (
        <p className="text-sm leading-relaxed text-gray-800">
          <SeverityBadge severity={enforcementType} size="md" />
          {severity === "INFO" && (
            <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">INFO</span>
          )}
          <span className="ml-1.5">{sentence}</span>
        </p>
      )}
    </div>
  );
}
