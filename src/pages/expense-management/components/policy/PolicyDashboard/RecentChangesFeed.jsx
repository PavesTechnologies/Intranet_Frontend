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
 * Renders only fields the /policy-bundles/{id}/versions endpoint actually
 * returns (versionNumber, activatedAt) — no changed-by/summary text, since
 * the backend contract doesn't provide that data.
 */
export default function RecentChangesFeed({ items = [], loading = false }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <PolicyEmptyState
        icon={<History className="h-8 w-8" />}
        title="No changes yet"
        description="Policy bundle edits will show up here as soon as a version is activated."
      />
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0A0082]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">
              {item.bundleName} <span className="font-normal text-gray-400">v{item.versionNumber}</span>
            </p>
          </div>
          <p className="shrink-0 text-xs text-gray-400">{formatDateTime(item.activatedAt)}</p>
        </li>
      ))}
    </ul>
  );
}
