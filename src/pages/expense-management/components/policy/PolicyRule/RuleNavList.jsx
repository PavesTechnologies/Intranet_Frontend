import React from "react";
import { Plus, Search, ShieldQuestion } from "lucide-react";
import Button from "@/components/Button/Button";
import FormSelect from "@/components/forms/FormSelect";
import SeverityBadge from "@/pages/expense-management/components/policy/common/SeverityBadge";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";
import { RULE_TYPES, RULE_TYPE_META } from "@/pages/expense-management/components/policy/common/policyEnums";

export default function RuleNavList({
  rules,
  selectedId,
  onSelect,
  loading,
  searchTerm,
  onSearchChange,
  bundleFilter,
  onBundleFilterChange,
  bundleOptions,
  ruleTypeFilter,
  onRuleTypeFilterChange,
  onCreateClick,
  canManage,
  resolveBundleName,
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="space-y-2.5 border-b border-gray-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Rules</h2>
          {canManage && (
            <Button type="button" variant="primary" size="small" onClick={onCreateClick}>
              <Plus size={14} /> New
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search rules..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormSelect
            name="bundleFilter"
            value={bundleFilter}
            onChange={(e) => onBundleFilterChange(e.target.value)}
            options={[{ label: "All Bundles", value: "" }, ...bundleOptions]}
          />
          <FormSelect
            name="ruleTypeFilter"
            value={ruleTypeFilter}
            onChange={(e) => onRuleTypeFilterChange(e.target.value)}
            options={[{ label: "All Types", value: "" }, ...RULE_TYPES.map((t) => ({ label: RULE_TYPE_META[t].label, value: t }))]}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <PolicyEmptyState icon={<ShieldQuestion className="h-8 w-8" />} title="No rules match your filters" description="Adjust the filters above, or create a new rule." />
        ) : (
          <ul className="space-y-1">
            {rules.map((r) => {
              const meta = RULE_TYPE_META[r.ruleType] || {};
              const Icon = meta.Icon;
              const active = r.policyId === selectedId;
              return (
                <li key={r.policyId}>
                  <button
                    type="button"
                    onClick={() => onSelect(r)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition ${
                      active ? "bg-[#0A0082]/5 ring-1 ring-[#0A0082]/30" : "hover:bg-gray-50"
                    }`}
                  >
                    {Icon && (
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? "bg-[#0A0082] text-white" : "bg-gray-100 text-gray-500"}`}>
                        <Icon size={13} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${active ? "text-[#0A0082]" : "text-gray-800"}`}>{r.policyName || meta.label}</p>
                      <p className="truncate text-xs text-gray-400">
                        {r.categoryName || "All categories"} · {resolveBundleName(r)}
                      </p>
                    </div>
                    <SeverityBadge severity={r.enforcementType} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
