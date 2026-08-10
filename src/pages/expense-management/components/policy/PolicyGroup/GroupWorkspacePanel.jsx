import React from "react";
import { Pencil, Trash2, Users2, Save, Layers } from "lucide-react";
import Button from "@/components/Button/Button";
import StatusBadge from "@/components/status/statusbadge";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";
import MemberManagement from "@/pages/expense-management/components/policy/PolicyGroup/MemberManagement";

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const StatBox = ({ label, value, accent = "text-gray-800" }) => (
  <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <p className={`mt-0.5 truncate text-lg font-bold ${accent}`}>{value}</p>
  </div>
);

export default function GroupWorkspacePanel({
  group,
  assignedPolicyLabel,
  employees,
  memberIds,
  membersLoading,
  membersDirty,
  onMemberIdsChange,
  onSaveMembers,
  savingMembers,
  onEditGroup,
  onDeleteGroup,
  canManage,
}) {
  if (!group) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60">
        <PolicyEmptyState
          icon={<Layers className="h-8 w-8" />}
          title="Select a policy group"
          description="Choose a group from the list to manage its members and see which policy it's assigned."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-[#0a174e]">{group.groupName}</h2>
              <StatusBadge label={group.status || "ACTIVE"} size="sm" />
            </div>
            {group.description && <p className="mt-1 text-sm text-gray-500">{group.description}</p>}
          </div>

          {canManage && (
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" size="small" onClick={() => onEditGroup(group)}>
                <Pencil size={14} /> Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="small"
                className="text-red-600 hover:bg-red-50"
                onClick={() => onDeleteGroup(group)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <StatBox label="Members" value={memberIds.length} accent="text-emerald-600" />
          <StatBox label="Assigned Policy" value={assignedPolicyLabel || "Not assigned"} />
          <StatBox label="Last Updated" value={formatDate(group.updatedAt)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
            <Users2 size={15} /> Members
          </h3>
          {canManage && (
            <Button type="button" variant="primary" size="small" onClick={onSaveMembers} disabled={!membersDirty} loading={savingMembers} loadingText="Saving...">
              <Save size={14} /> Save Members
            </Button>
          )}
        </div>
        {membersLoading ? (
          <div className="h-96 animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <MemberManagement employees={employees} memberIds={memberIds} onChange={onMemberIdsChange} disabled={savingMembers || !canManage} />
        )}
      </div>
    </div>
  );
}
