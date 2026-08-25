import React from "react";
import { Plus, Search, Users2 } from "lucide-react";
import Button from "@/components/Button/Button";
import StatusBadge from "@/components/status/statusbadge";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

export default function GroupList({ groups, selectedId, onSelect, loading, searchTerm, onSearchChange, onCreateClick, canManage, resolveAssignedPolicy }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Policy Groups</h2>
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
            placeholder="Search groups..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <PolicyEmptyState
            icon={<Users2 className="h-8 w-8" />}
            title="No policy groups"
            description="Create your first group to start organizing employees."
          />
        ) : (
          <ul className="space-y-1.5">
            {groups.map((g) => {
              const active = g.groupId === selectedId;
              return (
                <li key={g.groupId}>
                  <button
                    type="button"
                    onClick={() => onSelect(g)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                      active ? "border-[#0A0082]/30 bg-[#0A0082]/5 ring-1 ring-[#0A0082]/30" : "border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm font-semibold ${active ? "text-[#0A0082]" : "text-gray-800"}`}>{g.groupName}</p>
                      <StatusBadge label={g.status || "ACTIVE"} size="sm" />
                    </div>
                    {g.description && <p className="mt-0.5 truncate text-xs text-gray-400">{g.description}</p>}
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400">
                      <span>
                        {g.memberCount ?? 0} member{g.memberCount === 1 ? "" : "s"} · {resolveAssignedPolicy(g) || "No policy"}
                      </span>
                      <span>{formatDate(g.updatedAt)}</span>
                    </div>
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
