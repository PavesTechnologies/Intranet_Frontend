import React from "react";
import { ChevronDown, User, CheckCircle2 } from "lucide-react";
import { useEmployeeDirectory } from "../hooks/useEmployeeDirectory";
import { describeLevel, QUORUM_LABELS } from "../constants/approvalLabels";

const nameMap = (directory) => {
  const map = new Map();
  directory?.forEach((entry, id) => map.set(id, entry.name));
  return map;
};

function Chip({ icon, title, subtitle, tone = "bg-white border-gray-200" }) {
  return (
    <div className={`rounded-xl border ${tone} px-4 py-3 shadow-sm`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold text-gray-800">{title}</span>
      </div>
      {subtitle && <p className="mt-0.5 pl-6 text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}

const Arrow = () => (
  <div className="flex justify-center py-1">
    <ChevronDown className="h-4 w-4 text-gray-300" />
  </div>
);

/**
 * "Approval Path" preview (spec §9): renders Employee -> each configured level -> Approved so an
 * Admin can confirm how a flow will actually behave without saving/leaving the builder. Reads the
 * builder's own local `levels` shape (LevelsBuilder.jsx / ApprovalFlowBuilderPage.jsx state) so it
 * updates live as the admin edits, no save round-trip required.
 */
export default function FlowPreview({ whenLabel, levels }) {
  const { data: directory } = useEmployeeDirectory();
  const employeeNameById = nameMap(directory);
  const configuredLevels = (levels || []).filter((l) => l.approvers?.length);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Approval Path</h3>

      {whenLabel && (
        <>
          <Chip icon={null} title="When" subtitle={whenLabel} tone="bg-indigo-50 border-indigo-100" />
          <Arrow />
        </>
      )}

      <Chip icon={<User className="h-4 w-4 text-gray-400" />} title="Employee submits report" />
      <Arrow />

      {configuredLevels.length === 0 ? (
        <p className="py-2 text-center text-xs text-gray-400">Add an approval level to see the path.</p>
      ) : (
        configuredLevels.map((level, idx) => (
          <React.Fragment key={level.id || idx}>
            <Chip
              icon={<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A0082] text-[10px] font-bold text-white">{idx + 1}</span>}
              title={describeLevel(level, employeeNameById)}
              subtitle={level.approvers.length > 1 ? `${level.approvers.length} approvers · ${QUORUM_LABELS[level.quorum] || level.quorum}` : null}
            />
            <Arrow />
          </React.Fragment>
        ))
      )}

      <Chip icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} title="Approved" tone="bg-emerald-50 border-emerald-100" />
    </div>
  );
}
