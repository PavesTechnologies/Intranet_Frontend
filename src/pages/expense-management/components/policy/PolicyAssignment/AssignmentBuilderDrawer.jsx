import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { User, Users, ShieldQuestion, Users as UsersIcon } from "lucide-react";
import Button from "@/components/Button/Button";
import PolicyDrawer, { DRAWER_WIDTH_CREATE } from "@/pages/expense-management/components/policy/common/PolicyDrawer";
import StepFlow from "@/pages/expense-management/components/policy/common/StepFlow";
import PolicyEmptyState from "@/pages/expense-management/components/policy/common/PolicyEmptyState";
import RuleCard from "@/pages/expense-management/components/policy/PolicyRule/RuleCard";

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0.125rem 0.25rem",
    minHeight: "42px",
    backgroundColor: "#ffffff",
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
};

/**
 * Create-only (the backend has no PUT for assignments — you delete and
 * recreate to change one). Visual flow: Assignment Type → Target →
 * Policy → Rule Preview → Member Preview.
 */
export default function AssignmentBuilderDrawer({
  open,
  onClose,
  employeeOptions = [],
  groupOptions = [],
  bundleOptions = [],
  rulesByBundle,
  membersForTarget,
  onSubmit,
  submitting,
}) {
  const [assignmentType, setAssignmentType] = useState("GROUP");
  const [employeeId, setEmployeeId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setAssignmentType("GROUP");
    setEmployeeId("");
    setGroupId("");
    setPolicyId("");
    setFormError("");
  }, [open]);

  const targetId = assignmentType === "INDIVIDUAL" ? employeeId : groupId;
  const selectedEmployee = employeeOptions.find((o) => o.value === employeeId) || null;
  const selectedGroup = groupOptions.find((o) => o.value === groupId) || null;
  const selectedBundle = bundleOptions.find((o) => o.value === policyId) || null;

  const previewRules = policyId ? rulesByBundle(policyId) : [];
  const previewMembers = targetId ? membersForTarget(assignmentType, targetId) : [];

  const handleSubmit = () => {
    if (!targetId) return setFormError(`Select a${assignmentType === "INDIVIDUAL" ? "n employee" : " group"} to continue.`);
    if (!policyId) return setFormError("Select a policy bundle to continue.");
    setFormError("");
    onSubmit({
      assignmentType,
      employeeId: assignmentType === "INDIVIDUAL" ? employeeId : null,
      groupId: assignmentType === "GROUP" ? groupId : null,
      policyId,
      status: "ACTIVE",
    });
  };

  const steps = [
    {
      title: "Assignment Type",
      description: "Assign this policy to one employee, or to an entire group.",
      content: (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAssignmentType("INDIVIDUAL")}
            disabled={submitting}
            className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition ${
              assignmentType === "INDIVIDUAL" ? "border-[#0A0082] bg-[#0A0082]/5 ring-1 ring-[#0A0082]/30" : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <User size={16} className={assignmentType === "INDIVIDUAL" ? "text-[#0A0082]" : "text-gray-400"} />
            <span className={`text-sm font-semibold ${assignmentType === "INDIVIDUAL" ? "text-[#0A0082]" : "text-gray-700"}`}>Individual</span>
          </button>
          <button
            type="button"
            onClick={() => setAssignmentType("GROUP")}
            disabled={submitting}
            className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition ${
              assignmentType === "GROUP" ? "border-[#0A0082] bg-[#0A0082]/5 ring-1 ring-[#0A0082]/30" : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Users size={16} className={assignmentType === "GROUP" ? "text-[#0A0082]" : "text-gray-400"} />
            <span className={`text-sm font-semibold ${assignmentType === "GROUP" ? "text-[#0A0082]" : "text-gray-700"}`}>Group</span>
          </button>
        </div>
      ),
    },
    {
      title: assignmentType === "INDIVIDUAL" ? "Employee" : "Group",
      description: assignmentType === "INDIVIDUAL" ? "Which employee should receive this policy?" : "Which group should receive this policy?",
      content:
        assignmentType === "INDIVIDUAL" ? (
          <Select
            options={employeeOptions}
            value={selectedEmployee}
            onChange={(opt) => setEmployeeId(opt ? opt.value : "")}
            placeholder="Search employee..."
            isSearchable
            styles={customSelectStyles}
            isDisabled={submitting}
          />
        ) : (
          <Select
            options={groupOptions}
            value={selectedGroup}
            onChange={(opt) => setGroupId(opt ? opt.value : "")}
            placeholder="Select policy group..."
            isSearchable
            styles={customSelectStyles}
            isDisabled={submitting}
          />
        ),
    },
    {
      title: "Policy",
      description: "Which policy bundle should apply?",
      content: (
        <Select
          options={bundleOptions}
          value={selectedBundle}
          onChange={(opt) => setPolicyId(opt ? opt.value : "")}
          placeholder="Select policy bundle..."
          isSearchable
          styles={customSelectStyles}
          isDisabled={submitting}
        />
      ),
    },
    {
      title: "Rule Preview",
      description: "Rules that will apply once this assignment is active.",
      content: !policyId ? (
        <p className="text-xs text-gray-400">Select a policy bundle to preview its rules.</p>
      ) : previewRules.length === 0 ? (
        <PolicyEmptyState icon={<ShieldQuestion className="h-7 w-7" />} title="This bundle has no rules yet" description="Add rules from the Bundle Workspace." />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {previewRules.map((r) => (
            <RuleCard key={r.policyId} rule={r} canManage={false} onEdit={() => {}} onDelete={() => {}} />
          ))}
        </div>
      ),
    },
    {
      title: "Member Preview",
      description: "Who will be affected by this assignment.",
      isLast: true,
      content: !targetId ? (
        <p className="text-xs text-gray-400">Select a target to preview affected members.</p>
      ) : previewMembers.length === 0 ? (
        <PolicyEmptyState icon={<UsersIcon className="h-7 w-7" />} title="No members yet" description="This target currently has no members." />
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {previewMembers.map((m) => (
            <li key={m.employeeId} className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs">
              <span className="font-medium text-gray-700">{m.name}</span>
              <span className="text-gray-400">{m.email}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <PolicyDrawer
      open={open}
      onClose={onClose}
      title="New Policy Assignment"
      subtitle="Map an employee or group to a policy bundle."
      widthClassName={DRAWER_WIDTH_CREATE}
      footer={
        <div className="flex flex-col gap-2">
          {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="button" variant="primary" loading={submitting} loadingText="Saving..." disabled={submitting} onClick={handleSubmit} className="w-full sm:w-auto">
              Create Assignment
            </Button>
          </div>
        </div>
      }
    >
      <StepFlow steps={steps} />
    </PolicyDrawer>
  );
}
