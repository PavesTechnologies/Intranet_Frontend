import React, { useState } from "react";
import { Plus, Search, GitMerge, ChevronDown, ChevronUp, Compass } from "lucide-react";
import Button from "@/components/Button/Button";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";
import AssignmentCard from "@/pages/expense-management/components/policy/PolicyAssignment/AssignmentCard";

export default function AssignmentList({
  assignments,
  selectedId,
  onSelect,
  loading,
  searchTerm,
  onSearchChange,
  onCreateClick,
  onDelete,
  canManage,
  resolveTargetLabel,
  resolutionPreview,
}) {
  const [showResolution, setShowResolution] = useState(false);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Assignments</h2>
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
            placeholder="Search assignments..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
          />
        </div>
      </div>

      {resolutionPreview && (
        <div className="border-b border-gray-100">
          <button
            type="button"
            onClick={() => setShowResolution((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            <span className="flex items-center gap-1.5">
              <Compass size={13} /> Resolution Preview
            </span>
            {showResolution ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showResolution && <div className="px-4 pb-3">{resolutionPreview}</div>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <PolicyEmptyState
            icon={<GitMerge className="h-8 w-8" />}
            title="No assignments yet"
            description="Map a group or employee to a policy bundle to start enforcing rules."
          />
        ) : (
          <ul className="space-y-1.5">
            {assignments.map((a) => (
              <li key={a.assignmentId}>
                <AssignmentCard
                  assignment={a}
                  targetLabel={resolveTargetLabel(a)}
                  active={a.assignmentId === selectedId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  canManage={canManage}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
