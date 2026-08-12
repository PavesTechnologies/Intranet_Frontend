import React from "react";
import { ArrowRight, Trash2, User, Users, Star } from "lucide-react";
import Button from "@/components/Button/Button";
import StatusBadge from "@/components/status/statusbadge";

export default function AssignmentCard({ assignment, targetLabel, active, onSelect, onDelete, canManage }) {
  const isDefault = assignment.assignmentType === "DEFAULT";
  const Icon = assignment.assignmentType === "INDIVIDUAL" ? User : assignment.assignmentType === "GROUP" ? Users : Star;

  return (
    <button
      type="button"
      onClick={() => onSelect(assignment)}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
        active ? "border-[#0A0082]/30 bg-[#0A0082]/5 ring-1 ring-[#0A0082]/30" : "border-transparent hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          <Icon size={12} /> {assignment.assignmentType}
        </span>
        <div className="flex items-center gap-1">
          <StatusBadge label={assignment.status || "ACTIVE"} size="sm" />
          {canManage && !isDefault && (
            <Button
              type="button"
              variant="link"
              size="icon"
              className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
              title="Delete assignment"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(assignment);
              }}
            >
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-sm">
        <span className="min-w-0 truncate font-medium text-gray-800">{targetLabel}</span>
        <ArrowRight size={13} className="shrink-0 text-gray-300" />
        <span className="min-w-0 truncate font-semibold text-[#0A0082]">{assignment.policyName}</span>
      </div>
    </button>
  );
}
