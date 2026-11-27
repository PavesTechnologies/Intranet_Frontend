import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Clock, Landmark, MinusCircle, XCircle } from "lucide-react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
import ManagerDecisionSummary, { payoutOf } from "@/pages/expense-management/pages/cash-advance/components/ManagerDecisionSummary";
import { formatDateTime, formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";

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
  skipped: { Icon: MinusCircle, dot: "bg-gray-200 text-gray-400", line: "bg-emerald-200", title: "text-gray-400", note: "text-gray-400" },
  attention: { Icon: AlertTriangle, dot: "bg-orange-500 text-white", line: "bg-gray-200", title: "text-orange-800", note: "text-orange-700" },
  rejected: { Icon: XCircle, dot: "bg-rose-600 text-white", line: "bg-gray-200", title: "text-rose-700", note: "text-rose-700" },
};

const LEVELS = [
  { levelOrder: 1, roleLabel: "Reporting Manager" },
  { levelOrder: 2, roleLabel: "Cost Center Owner" },
  { levelOrder: 3, roleLabel: "Finance Executive" },
];

// Statuses an advance can only reach after Finance's final approval.
const PRE_APPROVAL_OR_CLOSED_EARLY = ["DRAFT", "REJECTED", "DEFERRED", "CANCELLED", ...MANAGER_STAGE, ...COST_CENTER_STAGE, ...FINANCE_STAGE];

const DECISION_VERB = { APPROVED: "Approved", REJECTED: "Rejected", DEFERRED: "Deferred" };

/** Latest decision recorded at one level, from the approval trail (the level is the status the advance was in). */
const decisionAt = (trail, levelOrder) =>
  [...trail]
    .reverse()
    .find((step) => DECISION_VERB[step.action] && stageIndexOf(step.fromStatus) === levelOrder) || null;

/**
 * Each level's real state. A decision recorded in the audit trail wins; a level the advance went past without a
 * decision was not needed (the cost center step is skipped when the owner is the employee, manager or the approver).
 * Advances older than the trail (no records at all) fall back to the status alone.
 */
const levelStateOf = ({ levelOrder, decision, current, status, hasTrail }) => {
  if (decision) {
    if (decision.action === "APPROVED") return "done";
    if (decision.action === "REJECTED") return "rejected";
    return "attention";
  }
  if (["REJECTED", "DEFERRED", "CANCELLED"].includes(status)) return "upcoming";
  if (current === levelOrder) return "current";
  if (current > levelOrder) return hasTrail ? "skipped" : "done";
  return "upcoming";
};

function LevelNode({ level, state, isLast, approverId, decision }) {
  const meta = NODE_META[state] || NODE_META.upcoming;
  const { Icon } = meta;

  let note;
  if (decision) {
    note = [DECISION_VERB[decision.action], decision.performedAt && `· ${formatDateTime(decision.performedAt)}`]
      .filter(Boolean)
      .join(" ");
  } else if (state === "done") {
    note = "Approved";
  } else if (state === "current") {
    note = "Awaiting decision";
  } else if (state === "skipped") {
    note = "Not needed for this request";
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
          <p className={`text-sm font-semibold ${meta.title}`}>{level.roleLabel}</p>
          <span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Level {level.levelOrder}
          </span>
        </div>
        {decision?.performedBy ? (
          <p className="mt-0.5 break-words text-xs text-gray-600">
            {DECISION_VERB[decision.action]} by:{" "}
            <span className="font-medium text-gray-800"><EmployeeLabel employeeId={decision.performedBy} /></span>
          </p>
        ) : (
          approverId && state !== "skipped" && (
            <p className="mt-0.5 break-words text-xs text-gray-600">
              Approver: <span className="font-medium text-gray-800"><EmployeeLabel employeeId={approverId} /></span>
            </p>
          )
        )}
        {decision?.reason && decision.action !== "APPROVED" && (
          <p className="mt-0.5 break-words text-xs text-gray-500">Reason: {decision.reason}</p>
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

  const [trail, setTrail] = useState([]);

  const status = (advance.status || "").toUpperCase();
  const rejected = status === "REJECTED";
  const current = stageIndexOf(status);
  const hasTrail = trail.length > 0;

  // Reload the recorded decisions whenever the advance moves (an approval here or elsewhere changes its status).
  useEffect(() => {
    if (!advance.advanceId) return undefined;
    let cancelled = false;
    cashAdvanceApi
      .getApprovalTrail(advance.advanceId)
      .then((res) => {
        if (!cancelled) setTrail(Array.isArray(res?.data?.data) ? res.data.data : []);
      })
      .catch(() => {
        if (!cancelled) setTrail([]);
      });
    return () => {
      cancelled = true;
    };
  }, [advance.advanceId, advance.status]);

  const levels = LEVELS.map((level) => {
    const decision = decisionAt(trail, level.levelOrder);
    return {
      level,
      decision,
      state: levelStateOf({ levelOrder: level.levelOrder, decision, current, status, hasTrail }),
      // Only the manager is known up front; the other levels name whoever actually decided.
      approverId: level.levelOrder === 1 ? advance.managerId : null,
    };
  });
  const financeApproved = levels[2].decision?.action === "APPROVED";
  const approved = hasTrail ? financeApproved && !rejected : current === 4 && !PRE_APPROVAL_OR_CLOSED_EARLY.includes(status);

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
  // At Finance's step the Approve button names the cash it releases. A Cash Advance + Outstanding request is approved
  // through its allocation form instead, so it keeps the plain label.
  const financeCash =
    current === 3 && advance.requestType !== "ADVANCE_PLUS_OUTSTANDING" && advance.amount != null
      ? payoutOf(advance, null).cash
      : null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Landmark className="h-4 w-4 text-gray-400" />
          Approval Progress
        </div>
        <ul>
          {levels.map(({ level, decision, state, approverId }, idx) => (
            <LevelNode
              key={level.levelOrder}
              level={level}
              state={state}
              decision={decision}
              approverId={approverId}
              isLast={!finalNode && idx === levels.length - 1}
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

      {canAct && !rejected && current >= 3 && (
        <ManagerDecisionSummary advance={advance} canAct={canAct} onChanged={onChanged} />
      )}

      {canAct && !rejecting && (
        <div className="flex flex-wrap gap-2">
          <Button variant="success" disabled={busy} onClick={approve} className="text-xs">
            {financeCash !== null ? `Approve & pay ${formatMoney(financeCash, advance.currencyCode || "INR")}` : "Approve"}
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
