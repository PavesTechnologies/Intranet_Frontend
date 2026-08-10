import React from "react";
import { Trophy } from "lucide-react";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";

export default function TopPoliciesCard({ items = [], loading = false }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <PolicyEmptyState
        icon={<Trophy className="h-8 w-8" />}
        title="No assignments yet"
        description="Assign a bundle to a group or employee to see it ranked here."
      />
    );
  }

  const maxCount = Math.max(...items.map((i) => i.assignmentCount), 1);

  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={item.policyId} className="flex items-center gap-3">
          <span className="w-4 shrink-0 text-xs font-semibold text-gray-400">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-gray-800">{item.policyName}</span>
              <span className="shrink-0 text-xs font-semibold text-gray-500">
                {item.assignmentCount} assignment{item.assignmentCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#0A0082]"
                style={{ width: `${(item.assignmentCount / maxCount) * 100}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
