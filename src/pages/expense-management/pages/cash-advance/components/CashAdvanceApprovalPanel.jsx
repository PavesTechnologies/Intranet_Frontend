import React, { useState } from "react";
import { CheckCircle2, Circle, Clock, Landmark, XCircle } from "lucide-react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";

const MANAGER_STAGE = ["SUBMITTED", "PENDING", "PENDING_APPROVAL", "PENDING_MANAGER_APPROVAL"];
const COST_CENTER_STAGE = ["PENDING_COST_CENTER_APPROVAL", "PENDING_COST_CENTER"];
const FINANCE_STAGE = ["PENDING_FINANCE_APPROVAL", "PENDING_FINANCE"];

// Where the advance is in the chain: 0 draft, 1 manager, 2 cost center owner, 3 Finance, 4 approved or later.
const stageIndexOf = (status) => {
  const upper = (status || "").toUpperCase();
  if (upper === "DRAFT") return 0;
  if (MANAGER_STAGE.includes(upper)) return 1;
  if (COST_CENTER_STAGE.includes(upper)) return 2;
  if (FINANCE_STAGE.includes(upper)) return 3;
  return 4;
};

// Same node styling as the expense report's approval progress (ApprovalProgressLevels).
const NODE_META = {
  done: { Icon: CheckCircle2, dot: "bg-emerald-500 text-white", line: "bg-emerald-200", title: "text-emerald-800", note: "text-emerald-700" },
  current: { Icon: Clock, dot: "bg-[#0A0082] text-white ring-4 ring-[#0A0082]/15", line: "bg-gray-200", title: "text-[#0A0082]", note: "text-[#0A0082]" },
  upcoming: { Icon: Circle, dot: "bg-gray-200 text-gray-400", line: "bg-gray-200", title: "text-gray-500", note: "text-gray-400" },
  rejected: { Icon: XCircle, dot: "bg-rose-600 text-white", line: "bg-gray-200", title: "text-rose-700", note: "text-rose-700" },
};

const LEVELS = [
  { levelOrder: 1, roleLabel: "Reporting Manager" },
  { levelOrder: 2, roleLabel: "Cost Center Owner" },
  { levelOrder: 3, roleLabel: "Finance Executive" },
];

function LevelNode({ level, state, isLast, managerId }) {
  const meta = NODE_META[state] || NODE_META.upcoming;
  const { Icon } = meta;
  const note =
    state === "done" ? "Approved" : state === "current" ? "Awaiting decision" : "Not reached yet";

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
          <p className={`text-sm font-semibold ${meta.title}`}>{level.roleLabel}</p>
          <span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Level {level.levelOrder}
          </span>
        </div>
        {level.levelOrder === 1 && managerId && (
          <p className="mt-0.5 break-words text-xs text-gray-600">
            Approver: <span className="font-medium text-gray-800"><EmployeeLabel employeeId={managerId} /></span>
          </p>
        )}
        <p className={`mt-0.5 text-xs ${meta.note}`}>{note}</p>
      </div>
    </li>
  );
}

/**
 * Approval Progress for a cash advance, drawn exactly like the expense report's timeline (manager, cost center
 * owner, Finance), with the Approve and Reject actions below it.
 */
export default function CashAdvanceApprovalPanel({ advance, canAct, onChanged }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const status = (advance.status || "").toUpperCase();
  const rejected = status === "REJECTED";
  const current = stageIndexOf(status);
  const approved = !rejected && current === 4;

  const stateOf = (index) => {
    if (rejected || current === 0) return "upcoming";
    if (current > index) return "done";
    if (current === index) return "current";
    return "upcoming";
  };

  const approve = async () => {
    setBusy(true);
    try {
      await cashAdvanceApi.approve(advance.advanceId);
      showStatusToast("Cash advance approved", "success");
      onChanged();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to approve", "error");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      showStatusToast("Enter a reason for rejecting this request", "error");
      return;
    }
    setBusy(true);
    try {
      await cashAdvanceApi.reject(advance.advanceId, reason.trim());
      showStatusToast("Cash advance rejected", "success");
      setRejecting(false);
      setReason("");
      onChanged();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to reject", "error");
    } finally {
      setBusy(false);
    }
  };

  const finalNode = approved || rejected;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Landmark className="h-4 w-4 text-gray-400" />
          Approval Progress
        </div>
        <ul>
          {LEVELS.map((level, idx) => (
            <LevelNode
              key={level.levelOrder}
              level={level}
              state={stateOf(level.levelOrder)}
              isLast={!finalNode && idx === LEVELS.length - 1}
              managerId={advance.managerId}
            />
          ))}
          {finalNode && (
            <li className="flex gap-3">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${approved ? NODE_META.done.dot : NODE_META.rejected.dot}`}>
                {approved ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              </div>
              <p className={`pt-1 text-sm font-semibold ${approved ? "text-emerald-800" : "text-rose-700"}`}>
                {approved ? "Approved" : "Rejected"}
              </p>
            </li>
          )}
        </ul>
      </div>

      {canAct && !rejecting && (
        <div className="flex flex-wrap gap-2">
          <Button variant="success" disabled={busy} onClick={approve} className="text-xs">
            Approve
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => setRejecting(true)} className="text-xs">
            Reject
          </Button>
        </div>
      )}

      {canAct && rejecting && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700" htmlFor="ca-reject-reason">
            Reason for rejecting
          </label>
          <textarea
            id="ca-reject-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setRejecting(false)} className="text-xs">
              Cancel
            </Button>
            <Button variant="danger" disabled={busy} onClick={reject} className="text-xs">
              Confirm reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
