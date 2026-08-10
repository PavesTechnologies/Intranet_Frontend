import React from "react";
import { Search, History } from "lucide-react";
import FormSelect from "@/components/forms/FormSelect";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

export default function VersionNavList({ versions, selectedId, onSelect, loading, searchTerm, onSearchChange, bundleFilter, onBundleFilterChange, bundleOptions }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="space-y-2.5 border-b border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-800">Version List</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by bundle..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
          />
        </div>
        <FormSelect
          name="bundleFilter"
          value={bundleFilter}
          onChange={(e) => onBundleFilterChange(e.target.value)}
          options={[{ label: "All Bundles", value: "" }, ...bundleOptions]}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <PolicyEmptyState icon={<History className="h-8 w-8" />} title="No versions found" description="Activated bundle versions will show up here." />
        ) : (
          <ul className="space-y-1">
            {versions.map((v) => {
              const active = v.versionId === selectedId;
              return (
                <li key={v.versionId}>
                  <button
                    type="button"
                    onClick={() => onSelect(v)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition ${
                      active ? "bg-[#0A0082]/5 ring-1 ring-[#0A0082]/30" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${active ? "text-[#0A0082]" : "text-gray-800"}`}>{v.bundleName}</p>
                      <p className="text-xs text-gray-400">v{v.versionNumber}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{formatDate(v.activatedAt)}</span>
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
