import React from "react";
import { History } from "lucide-react";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Chronological version timeline — reused both scoped to a single bundle
 * (Bundle Explorer's Versions tab) and globally across all bundles
 * (standalone Policy Versions page).
 */
export default function Timeline({ versions, loading, showBundleName = false, highlightId }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <PolicyEmptyState
        icon={<History className="h-8 w-8" />}
        title="No version history"
        description="Published changes will appear here as a chronological timeline."
      />
    );
  }

  return (
    <ul>
      {versions.map((v, index) => {
        const isLast = index === versions.length - 1;
        const isHighlighted = highlightId && v.versionId === highlightId;
        return (
          <li key={v.versionId} className={`flex gap-4 ${isHighlighted ? "-mx-2 rounded-lg bg-[#0A0082]/5 px-2" : ""}`}>
            <div className="flex flex-col items-center">
              <div className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 bg-white ${isHighlighted ? "border-[#0A0082] ring-4 ring-[#0A0082]/15" : "border-[#0A0082]"}`} />
              {!isLast && <div className="mt-1 w-px flex-1 bg-gray-200" />}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-semibold ${isHighlighted ? "text-[#0A0082]" : "text-gray-800"}`}>v{v.versionNumber}</span>
                {showBundleName && v.bundleName && <span className="text-xs text-gray-400">· {v.bundleName}</span>}
              </div>
              <p className="mt-0.5 text-xs text-gray-400">Activated {formatDateTime(v.activatedAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
