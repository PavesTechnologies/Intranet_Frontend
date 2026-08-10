import React from "react";
import { Plus, Search, ShieldCheck } from "lucide-react";
import Button from "@/components/Button/Button";
import StatusBadge from "@/components/status/statusbadge";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";

export default function BundleList({
  bundles,
  selectedId,
  onSelect,
  loading,
  searchTerm,
  onSearchChange,
  onCreateClick,
  canManage,
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Policy Bundles</h2>
          {canManage && (
            <Button type="button" variant="primary" size="small" onClick={onCreateClick}>
              <Plus size={14} /> New
            </Button>
          )}
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search bundles..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : bundles.length === 0 ? (
          <PolicyEmptyState
            icon={<ShieldCheck className="h-8 w-8" />}
            title="No policy bundles"
            description="Create your first bundle to start defining expense rules."
          />
        ) : (
          <ul className="space-y-1">
            {bundles.map((b) => {
              const active = b.policyId === selectedId;
              return (
                <li key={b.policyId}>
                  <button
                    type="button"
                    onClick={() => onSelect(b)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                      active ? "bg-[#0A0082]/5 ring-1 ring-[#0A0082]/30" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm font-medium ${active ? "text-[#0A0082]" : "text-gray-800"}`}>
                        {b.policyName}
                      </p>
                      <StatusBadge label={b.status || "DRAFT"} size="sm" />
                    </div>
                    {b.description && <p className="mt-0.5 truncate text-xs text-gray-400">{b.description}</p>}
                    <p className="mt-1 text-[11px] text-gray-400">v{b.currentVersion ?? 1}</p>
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
