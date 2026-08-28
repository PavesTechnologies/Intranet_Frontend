import React from "react";
import { ChevronDown, User, CheckCircle2, Landmark } from "lucide-react";
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

/** A Finance Verification level gets a distinct icon/tone in the chain so it still reads clearly as "the Finance step" - but it's real configured level data, not a fixed stage bolted on afterward. */
const levelBadge = (level, idx) =>
  level.levelType === "FINANCE_VERIFICATION" ? (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
      <Landmark className="h-3 w-3" />
    </span>
  ) : (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A0082] text-[10px] font-bold text-white">{idx + 1}</span>
  );

/**
 * "Approval Path" preview (spec §9): renders Employee -> every configured level, in order, exactly
 * as the backend will materialize them (including a Finance Verification level if one is
 * configured) -> Approved. Reads the builder's own local `levels` shape (LevelsBuilder.jsx /
 * ApprovalFlowBuilderPage.jsx state, each carrying its own `levelType`) so it updates live as the
 * admin edits, no save round-trip required.
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
              icon={levelBadge(level, idx)}
              title={describeLevel(level, employeeNameById)}
              subtitle={level.approvers.length > 1 ? `${level.approvers.length} approvers · ${QUORUM_LABELS[level.quorum] || level.quorum}` : null}
              tone={level.levelType === "FINANCE_VERIFICATION" ? "bg-blue-50 border-blue-100" : "bg-white border-gray-200"}
            />
            <Arrow />
          </React.Fragment>
        ))
      )}

      <Chip icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} title="Approved" tone="bg-emerald-50 border-emerald-100" />
    </div>
  );
}
