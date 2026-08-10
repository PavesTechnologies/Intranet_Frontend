import React from "react";
import { Pencil, Trash2, CalendarRange } from "lucide-react";
import Button from "@/components/Button/Button";
import SeverityBadge from "@/pages/expense-management/components/policy/common/SeverityBadge";
import { RULE_TYPE_META } from "@/pages/expense-management/components/policy/common/policyEnums";

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const conditionSummary = (rule) => {
  switch (rule.ruleType) {
    case "AMOUNT_LIMIT": {
      if (Array.isArray(rule.limits) && rule.limits.length > 0) {
        return rule.limits.map((l) => `${l.limitAmount} ${l.currencyCode || l.currencyId}`).join("  ·  ");
      }
      return rule.ruleValue ? `Limit: ${rule.ruleValue}` : "No limit configured";
    }
    case "BACKDATED_DAYS":
      return rule.ruleValue ? `Flag if backdated more than ${rule.ruleValue} day${rule.ruleValue === "1" ? "" : "s"}` : "No threshold set";
    default:
      return RULE_TYPE_META[rule.ruleType]?.description || rule.ruleType;
  }
};

export default function RuleCard({ rule, onEdit, onDelete, canManage, bundleName }) {
  const meta = RULE_TYPE_META[rule.ruleType] || {};
  const Icon = meta.Icon;
  const effectiveFrom = formatDate(rule.effectiveFrom);
  const effectiveTo = formatDate(rule.effectiveTo);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon size={14} />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800">{rule.policyName || meta.label}</p>
              <p className="truncate text-xs text-gray-400">
                {rule.categoryName || "All categories"}
                {bundleName ? ` · ${bundleName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <SeverityBadge severity={rule.enforcementType} />
            {rule.severity === "INFO" && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">INFO</span>
            )}
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-600">{conditionSummary(rule)}</p>

        {(effectiveFrom || effectiveTo) && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400">
            <CalendarRange size={11} />
            {effectiveFrom || "—"} – {effectiveTo || "ongoing"}
          </p>
        )}
      </div>

      {canManage && (
        <div className="mt-3 flex justify-end gap-1 border-t border-gray-50 pt-2">
          <Button
            type="button"
            variant="link"
            size="icon"
            className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
            title="Edit rule"
            onClick={() => onEdit(rule)}
          >
            <Pencil size={14} />
          </Button>
          <Button
            type="button"
            variant="link"
            size="icon"
            className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
            title="Delete rule"
            onClick={() => onDelete(rule)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
