import React, { useMemo, useState } from "react";
import Select from "react-select";
import { User, Users, Star } from "lucide-react";

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0.0625rem 0.125rem",
    minHeight: "36px",
    backgroundColor: "#ffffff",
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
};

const TIERS = [
  { key: "INDIVIDUAL", label: "Individual", Icon: User },
  { key: "GROUP", label: "Group", Icon: Users },
  { key: "DEFAULT", label: "Default", Icon: Star },
];

/**
 * Lets an admin pick any employee and see which assignment tier actually
 * governs them today, per the documented Individual > Group > Default
 * resolution precedence — resolved entirely from already-fetched real data.
 * Deliberately compact chrome-free content: embedded inside AssignmentList's
 * own left-panel card, not a standalone card of its own.
 */
export default function ResolutionPreview({ employeeOptions, assignments, groupIdByEmployeeId, groupNameById }) {
  const [employeeId, setEmployeeId] = useState("");

  const resolution = useMemo(() => {
    if (!employeeId) return null;
    const individual = assignments.find((a) => a.assignmentType === "INDIVIDUAL" && a.employeeId === employeeId);
    if (individual) return { tier: "INDIVIDUAL", policyName: individual.policyName };

    const groupId = groupIdByEmployeeId.get(employeeId);
    if (groupId) {
      const groupAssignment = assignments.find((a) => a.assignmentType === "GROUP" && a.groupId === groupId);
      if (groupAssignment) return { tier: "GROUP", policyName: groupAssignment.policyName, groupName: groupNameById.get(groupId) };
    }

    const defaultAssignment = assignments.find((a) => a.assignmentType === "DEFAULT");
    if (defaultAssignment) return { tier: "DEFAULT", policyName: defaultAssignment.policyName };
    return null;
  }, [employeeId, assignments, groupIdByEmployeeId, groupNameById]);

  const selectedEmployeeOption = employeeOptions.find((o) => o.value === employeeId) || null;

  return (
    <div>
      <Select
        options={employeeOptions}
        value={selectedEmployeeOption}
        onChange={(opt) => setEmployeeId(opt ? opt.value : "")}
        placeholder="Search employee..."
        isSearchable
        isClearable
        styles={customSelectStyles}
      />

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {TIERS.map((tier) => {
          const isActive = resolution?.tier === tier.key;
          const Icon = tier.Icon;
          return (
            <div
              key={tier.key}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                isActive ? "border-[#0A0082] bg-[#0A0082]/5 text-[#0A0082]" : "border-gray-200 text-gray-400"
              }`}
            >
              <Icon size={12} />
              {tier.label}
            </div>
          );
        })}
      </div>

      {resolution && <p className="mt-2 text-xs text-gray-600">Resolves to → <span className="font-semibold text-gray-800">{resolution.policyName}</span></p>}
      {employeeId && !resolution && <p className="mt-2 text-xs text-amber-600">No assignment resolves — not even an org default is set.</p>}
    </div>
  );
}
