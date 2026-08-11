import React from "react";
import { ArrowDown, GitMerge, ShieldQuestion, Trash2, Users as UsersIcon } from "lucide-react";
import Button from "@/components/Button/Button";
import StatusBadge from "@/components/status/statusbadge";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";
import RuleCard from "@/pages/expense-management/components/policy/PolicyRule/RuleCard";

const ChainNode = ({ label, sublabel }) => (
  <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-center shadow-sm">
    <p className="text-sm font-bold text-gray-800">{label}</p>
    {sublabel && <p className="mt-0.5 text-xs text-gray-400">{sublabel}</p>}
  </div>
);

export default function AssignmentDetailPanel({ assignment, targetLabel, rules, members, canManage, onDelete }) {
  if (!assignment) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60">
        <PolicyEmptyState
          icon={<GitMerge className="h-8 w-8" />}
          title="Select an assignment"
          description="Choose a row from the list to see its full resolution chain."
        />
      </div>
    );
  }

  const isDefault = assignment.assignmentType === "DEFAULT";

  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {assignment.assignmentType}
          </span>
          <StatusBadge label={assignment.status || "ACTIVE"} size="sm" />
        </div>
        {canManage && !isDefault && (
          <Button type="button" variant="outline" size="small" className="text-red-600 hover:bg-red-50" onClick={() => onDelete(assignment)}>
            <Trash2 size={14} /> Delete Assignment
          </Button>
        )}
      </div>

      <div className="my-6 flex flex-col items-center gap-2">
        <ChainNode label={targetLabel} sublabel={isDefault ? "Everyone without a specific assignment" : assignment.assignmentType} />
        <ArrowDown size={16} className="text-gray-300" />
        <ChainNode label={assignment.policyName} sublabel="Policy Bundle" />
        <ArrowDown size={16} className="text-gray-300" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{rules.length} Rules</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {members.length} Member{members.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Rule Preview</h3>
          {rules.length === 0 ? (
            <PolicyEmptyState icon={<ShieldQuestion className="h-7 w-7" />} title="No rules on this bundle" description="Add rules from the Policy Bundle Workspace." />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {rules.map((r) => (
                <RuleCard key={r.policyId} rule={r} canManage={false} onEdit={() => {}} onDelete={() => {}} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Member Preview</h3>
          {members.length === 0 ? (
            <PolicyEmptyState icon={<UsersIcon className="h-7 w-7" />} title="No members yet" description="This target currently has no members." />
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {members.map((m) => (
                <li key={m.employeeId} className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs">
                  <span className="font-medium text-gray-700">{m.name}</span>
                  <span className="text-gray-400">{m.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
