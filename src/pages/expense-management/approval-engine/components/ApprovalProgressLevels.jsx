import React from "react";
import { AlertTriangle, CheckCircle2, Circle, Clock, MinusCircle, XCircle } from "lucide-react";
import { useEmployeeDirectory, resolveEmployeeName } from "../hooks/useEmployeeDirectory";
import { formatDateTime } from "../constants/approvalLabels";

const NODE_META = {
  done: { Icon: CheckCircle2, dot: "bg-emerald-500 text-white", line: "bg-emerald-200", title: "text-emerald-800", note: "text-emerald-700" },
  current: { Icon: Clock, dot: "bg-[#0A0082] text-white ring-4 ring-[#0A0082]/15", line: "bg-gray-200", title: "text-[#0A0082]", note: "text-[#0A0082]" },
  attention: { Icon: AlertTriangle, dot: "bg-orange-500 text-white", line: "bg-gray-200", title: "text-orange-800", note: "text-orange-700" },
  rejected: { Icon: XCircle, dot: "bg-rose-600 text-white", line: "bg-gray-200", title: "text-rose-700", note: "text-rose-700" },
  skipped: { Icon: MinusCircle, dot: "bg-gray-200 text-gray-400", line: "bg-gray-200", title: "text-gray-400", note: "text-gray-400" },
  upcoming: { Icon: Circle, dot: "bg-gray-200 text-gray-400", line: "bg-gray-200", title: "text-gray-500", note: "text-gray-400" },
};

const DECISION_VERB = {
  APPROVED: "Approved",
  VERIFIED: "Verified",
  NEEDS_CORRECTION: "Sent back for correction",
  QUERIED: "Sent back for correction",
  REJECTED: "Rejected",
};

const isGenericName = (name) => !name || /^level\s*\d+$/i.test(name.trim());

/** Node state for one level, from the level's own status plus the report's. */
const stateOf = (level, reportStatus) => {
  if (reportStatus === "APPROVED" || reportStatus === "CLOSED") return "done";
  switch (level.status) {
    case "COMPLETED":
      return "done";
    case "ACTIVE":
      return level.decision === "NEEDS_CORRECTION" || level.decision === "QUERIED" ? "attention" : "current";
    case "CANCELLED":
      return level.decision === "REJECTED" ? "rejected" : "skipped";
    default:
      return "upcoming";
  }
};

function LevelNode({ level, state, isLast, directory }) {
  const meta = NODE_META[state] || NODE_META.upcoming;
  const { Icon } = meta;
  const approvers = (level.approverIds || []).map((id) => resolveEmployeeName(directory, id));
  const decidedBy = level.decidedBy ? resolveEmployeeName(directory, level.decidedBy) : null;
  const showLevelName = !isGenericName(level.levelName) && level.levelName !== level.roleLabel;

  let note;
  if (level.decision && DECISION_VERB[level.decision] && state !== "upcoming") {
    note = [DECISION_VERB[level.decision], decidedBy && `by ${decidedBy}`, level.decidedAt && `· ${formatDateTime(level.decidedAt)}`]
      .filter(Boolean)
      .join(" ");
  } else if (state === "current") {
    note = "Awaiting decision";
  } else if (state === "done") {
    note = "Approved";
  } else if (state === "skipped") {
    note = "Not needed";
  } else {
    note = "Not reached yet";
  }

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.dot}`}>
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className={`mt-1 w-px flex-1 ${meta.line}`} />}
      </div>
      <div className="min-w-0 flex-1 pb-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className={`text-sm font-semibold ${meta.title}`}>{level.roleLabel || level.levelName || `Level ${level.levelOrder}`}</p>
          <span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Level {level.levelOrder}
          </span>
        </div>
        {showLevelName && <p className="mt-0.5 text-xs text-gray-500">{level.levelName}</p>}
        {approvers.length > 0 && (
          <p className="mt-0.5 break-words text-xs text-gray-600">
            {approvers.length > 1 ? "Approvers" : "Approver"}: <span className="font-medium text-gray-800">{approvers.join(", ")}</span>
          </p>
        )}
        <p className={`mt-0.5 text-xs ${meta.note}`}>{note}</p>
      </div>
    </li>
  );
}

/**
 * Approval Progress built from ApprovalStatusResponse.levels: each level named by who approves it
 * (Reporting Manager, Cost Center Owner, Finance Verification ...), its approver(s), and who
 * decided and when. Shared by the approver's and Finance's review panels.
 */
export default function ApprovalProgressLevels({ levels, reportStatus }) {
  const { data: directory } = useEmployeeDirectory();
  const isApproved = reportStatus === "APPROVED" || reportStatus === "CLOSED";
  const isRejected = reportStatus === "REJECTED";
  const finalNode = isApproved || isRejected;

  return (
    <ul>
      {levels.map((level, idx) => (
        <LevelNode
          key={level.levelOrder}
          level={level}
          state={stateOf(level, reportStatus)}
          isLast={!finalNode && idx === levels.length - 1}
          directory={directory}
        />
      ))}
      {finalNode && (
        <li className="flex gap-3">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isApproved ? NODE_META.done.dot : NODE_META.rejected.dot}`}>
            {isApproved ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          </div>
          <p className={`pt-1 text-sm font-semibold ${isApproved ? "text-emerald-800" : "text-rose-700"}`}>
            {isApproved ? "Approved" : "Rejected"}
          </p>
        </li>
      )}
    </ul>
  );
}
