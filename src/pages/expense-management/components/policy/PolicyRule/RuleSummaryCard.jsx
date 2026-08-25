import React from "react";
import { RULE_TYPE_META } from "@/pages/expense-management/components/policy/common/policyEnums";

export default function RuleSummaryCard({ rules = [] }) {
  const counts = {};
  rules.forEach((r) => {
    counts[r.ruleType] = (counts[r.ruleType] || 0) + 1;
  });
  const entries = Object.keys(RULE_TYPE_META)
    .map((type) => ({ type, ...RULE_TYPE_META[type], count: counts[type] || 0 }))
    .filter((e) => e.count > 0);

  if (entries.length === 0) {
    return <p className="text-xs text-gray-400">No rules configured yet.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {entries.map((e) => {
        const Icon = e.Icon;
        return (
          <li key={e.type} className="flex items-center gap-2 text-xs">
            <Icon size={13} className="shrink-0 text-gray-400" />
            <span className="flex-1 text-gray-600">{e.label}</span>
            <span className="font-semibold text-gray-800">{e.count}</span>
          </li>
        );
      })}
    </ul>
  );
}
