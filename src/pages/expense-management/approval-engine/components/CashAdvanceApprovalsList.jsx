import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Eye, DollarSign, Calendar, RefreshCw, Send, AlertCircle, ChevronRight } from "lucide-react";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { lookupService } from "@/pages/expense-management/api/expenseReportsApi";
import { useAuth } from "@/contexts/AuthContext";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
import RowActionButton, { RowActions } from "@/pages/expense-management/approval-engine/components/RowActionButton";
import { formatTripDates } from "@/pages/expense-management/pages/cash-advance/cashAdvanceDisplay";
import { carryForwardRequest } from "@/pages/expense-management/pages/cash-advance/carryForwardRequest";
import { useApprovalWebSocket } from "@/pages/expense-management/approval-engine/websocket/ApprovalWebSocketProvider";

const formatMoney = (amount, currencyCode = "INR") => {
  const num = Number(amount) || 0;
  return `${currencyCode} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatAdvanceNumber = (adv) => {
  if (!adv) return "ADV-—";
  const raw = adv.advanceNumber || adv.reportNumber || adv.referenceNumber || adv.advance_number || adv.reference_number;
  if (raw && typeof raw === "string" && raw.toUpperCase().startsWith("ADV-")) {
    return raw.toUpperCase();
  }
  const idVal = raw || adv.advanceId || adv.id || "";
  const str = String(idVal).toUpperCase();
  if (!str) return "ADV-—";
  return str.startsWith("ADV-") ? str : `ADV-${str}`;
};

// Only a real needed-by date (the server already falls back to the settlement due date). The creation date used to be
// shown here as "Needed by", which was wrong; it is now shown as "Requested on" instead.
const getNeededByDateValue = (adv) => (adv ? adv.neededByDate || adv.needed_by_date || adv.settlementDueDate || null : null);

const PENDING_STATUSES = [
  "SUBMITTED",
  "PENDING",
  "PENDING_APPROVAL",
  "PENDING_MANAGER_APPROVAL",
  "PENDING_COST_CENTER_APPROVAL",
  "PENDING_COST_CENTER",
  "PENDING_FINANCE_APPROVAL",
  "PENDING_FINANCE",
];

/**
 * Requested vs approved for one advance. Requested is what the employee asked for. Approved is the frozen
 * approvedAmount after Finance's final approval, or the manager's approved amount while later stages are pending.
 */
export const advanceAmounts = (adv) => {
  // Cash Advance + Carry Forward: the request covers new cash + the carried-forward balance. Before Finance's final
  // approval the carry-forward is not in `amount` yet, so it is added here; after, approvedAmount already includes it.
  const cf = carryForwardRequest(adv);
  const pendingCarry = cf && !cf.moved ? cf.carry : 0;
  const amount = (Number(adv?.amount) || 0) + pendingCarry;
  const requested = adv?.requestedAmount != null ? Number(adv.requestedAmount) + (cf ? cf.carry : 0) : amount;
  const status = String(adv?.status || "").toUpperCase();
  const treatment = String(adv?.managerTreatment || "").toUpperCase();
  let approved = null;
  let approvedLabel = null;
  if (adv?.approvedAmount != null) {
    approved = Number(adv.approvedAmount) + pendingCarry;
    approvedLabel = "Approved";
  } else if (status === "REJECTED") {
    approvedLabel = "Rejected";
  } else if (treatment && treatment !== "DEFERRED") {
    approved = amount;
    approvedLabel = "Approved by manager";
  }
  const paid = adv?.disbursedAmount != null ? Number(adv.disbursedAmount) : null;
  return {
    requested, approved, approvedLabel, cut: approved != null ? Math.max(requested - approved, 0) : 0, paid,
    carryForward: cf ? cf.carry : 0, carryForwardMoved: cf ? cf.moved : false,
  };
};

// Three table cells: Requested, Approved, Paid. Each holds one figure, so the columns can be read down the table.
function AmountCells({ adv }) {
  const cur = adv.currencyCode || "INR";
  const { requested, approved, approvedLabel, cut, paid, carryForward, carryForwardMoved } = advanceAmounts(adv);
  const cell = "px-2.5 py-1.5 text-right align-middle whitespace-nowrap text-xs";
  return (
    <>
      <td
        className={cell}
        title={carryForward > 0
          ? `Cash Advance + Carry Forward: ${formatMoney(requested - carryForward, cur)} new cash + ${formatMoney(carryForward, cur)} carried forward${carryForwardMoved ? " (moved in)" : " (moves in on Finance's final approval)"}. Only the new cash is paid out.`
          : undefined}
      >
        <span className="font-mono font-semibold tabular-nums text-gray-900">{formatMoney(requested, cur)}</span>
        {carryForward > 0 && (
          <span className="block text-[10px] text-violet-700">incl. {formatMoney(carryForward, cur)} carry forward</span>
        )}
      </td>
      <td
        className={cell}
        // Who approved it is shown on hover, so the cell keeps to the amount and the cut.
        title={
          approved == null
            ? undefined
            : approvedLabel === "Approved by manager"
              ? `Approved by the manager. Waiting for Finance's final approval.${cut > 0 ? ` Requested ${formatMoney(requested, cur)}, cut by ${formatMoney(cut, cur)}.` : ""}`
              : `Final amount approved by Finance.${cut > 0 ? ` Requested ${formatMoney(requested, cur)}, cut by ${formatMoney(cut, cur)}.` : ""}`
        }
      >
        {approved != null ? (
          <span className="cursor-help">
            <span className={`block font-mono font-semibold tabular-nums ${cut > 0 ? "text-amber-700" : "text-emerald-700"}`}>{formatMoney(approved, cur)}</span>
            <span className="block text-[10px] text-gray-500">
              {cut > 0 ? `Cut by ${formatMoney(cut, cur)}` : "In full"}
            </span>
          </span>
        ) : (
          <span className={`text-[11px] ${approvedLabel === "Rejected" ? "text-rose-600" : "text-gray-400"}`}>
            {approvedLabel === "Rejected" ? "Rejected" : "Not yet"}
          </span>
        )}
      </td>
      <td className={cell}>
        {paid != null ? (
          <span className="font-mono tabular-nums text-gray-800">{formatMoney(paid, cur)}</span>
        ) : (
          <span className="text-[11px] text-gray-400">Not paid</span>
        )}
      </td>
    </>
  );
}

const formatDate = (dateValue) => {
  if (!dateValue) return "—";

  if (Array.isArray(dateValue)) {
    const [y, m, d] = dateValue;
    if (y && m) {
      const dt = new Date(y, m - 1, d || 1);
      return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
    }
  }

  if (typeof dateValue === "object" && dateValue !== null) {
    const y = dateValue.year;
    const m = dateValue.monthValue || dateValue.month;
    const d = dateValue.dayOfMonth || dateValue.day;
    if (y && m) {
      const dt = new Date(y, m - 1, d || 1);
      return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
    }
  }

  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const getCostCenterValue = (adv, costCentersMap) => {
  if (!adv) return "—";

  if (typeof adv.costCenterName === "string" && adv.costCenterName.trim()) {
    return adv.costCenterName;
  }
  if (typeof adv.costCenterCode === "string" && adv.costCenterCode.trim()) {
    return adv.costCenterCode;
  }
  if (typeof adv.costCenter === "string" && adv.costCenter.trim()) {
    return adv.costCenter;
  }
  if (typeof adv.cost_center_name === "string" && adv.cost_center_name.trim()) {
    return adv.cost_center_name;
  }
  if (typeof adv.cost_center_code === "string" && adv.cost_center_code.trim()) {
    return adv.cost_center_code;
  }

  if (typeof adv.costCenter === "object" && adv.costCenter !== null) {
    const name = adv.costCenter.costCenterName || adv.costCenter.name || adv.costCenter.title || adv.costCenter.costCenterCode || adv.costCenter.code;
    if (name) return name;
  }

  if (typeof adv.cost_center === "object" && adv.cost_center !== null) {
    const name = adv.cost_center.costCenterName || adv.cost_center.name || adv.cost_center.title || adv.cost_center.code;
    if (name) return name;
  }

  const ccId = adv.costCenterId || adv.cost_center_id;
  if (ccId && costCentersMap?.has(String(ccId))) {
    const cc = costCentersMap.get(String(ccId));
    const name = cc?.costCenterName || cc?.name || cc?.costCenterCode || cc?.code;
    if (name) return name;
  }

  if (adv.departmentName) return adv.departmentName;
  if (typeof adv.department === "string") return adv.department;
  if (adv.department && adv.department.name) return adv.department.name;

  if (adv.projectName) return adv.projectName;
  if (typeof adv.project === "string") return adv.project;
  if (adv.project && adv.project.name) return adv.project.name;

  if (ccId) {
    return `CC-${ccId}`;
  }

  return "—";
};

const getStatusBadge = (status) => {
  const upper = (status || "").toUpperCase();
  switch (upper) {
    case "DRAFT":
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-300">
          DRAFT
        </span>
      );
    case "SUBMITTED":
    case "PENDING":
    case "PENDING_APPROVAL":
    case "PENDING_MANAGER_APPROVAL":
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          PENDING MANAGER
        </span>
      );
    case "PENDING_COST_CENTER_APPROVAL":
    case "PENDING_COST_CENTER":
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          PENDING COST CENTER
        </span>
      );
    case "PENDING_FINANCE_APPROVAL":
    case "PENDING_FINANCE":
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          PENDING FINANCE
        </span>
      );
    case "APPROVED":
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          APPROVED
        </span>
      );
    case "DISBURSED":
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          DISBURSED
        </span>
      );
    case "SETTLED":
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          SETTLED
        </span>
      );
    case "REJECTED":
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          REJECTED
        </span>
      );
    case "CANCELLED":
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-300">
          CANCELLED
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
          {(upper || "PENDING").replace(/_/g, " ")}
        </span>
      );
  }
};

export const canApproveAdvance = (adv, user, hasRole) => {
  if (!adv) return false;

  const statusUpper = (adv.status || "").toUpperCase();

  // Non-actionable statuses must never show Approve/Reject
  const nonActionableStatuses = [
    "APPROVED",
    "REJECTED",
    "CANCELLED",
    "DISBURSED",
    "SETTLED",
    "CLOSED",
    "DRAFT"
  ];
  if (nonActionableStatuses.includes(statusUpper)) {
    return false;
  }

  // Manager roles approve at manager stage; Finance roles approve at finance stage. Employees (General)
  // and Admin are not approvers. The stage checks below decide which of the two applies to each advance.
  const isAuthorizedRole = hasRole
    ? hasRole([
        "Manager",
        "MANAGER",
        "Reporting_Manager",
        "Project_Manager",
        "Delivery_Manager",
        "Resource_Manager",
        "Finance",
        "FINANCE",
        "Finance_Executive",
        "FINANCE_EXECUTIVE",
      ])
    : false;

  if (!isAuthorizedRole) {
    return false;
  }

  // Employee cannot approve their own request
  if (user) {
    const userIds = [
      user.employeeId,
      user.employee_id,
      user.id,
      user.user_id,
      user.sub
    ]
      .filter(Boolean)
      .map((id) => String(id).toLowerCase());

    const requesterIds = [
      adv.employeeId,
      adv.employee_id,
      adv.userId,
      adv.createdById,
      adv.createdBy
    ]
      .filter(Boolean)
      .map((id) => String(id).toLowerCase());

    if (userIds.length > 0 && requesterIds.length > 0) {
      const isSelfRequest = userIds.some((uid) => requesterIds.includes(uid));
      if (isSelfRequest) {
        return false;
      }
    }
  }

  // Manager stage: only the assigned manager can approve or reject. Finance (and other roles,
  // including Admin) can still see the request, but Approve stays disabled until the manager has acted.
  const isManagerStage = ["SUBMITTED", "PENDING", "PENDING_APPROVAL", "PENDING_MANAGER_APPROVAL"].includes(statusUpper);
  if (isManagerStage) {
    const managerId = adv.managerId ? String(adv.managerId).toLowerCase() : null;
    const userIds = user
      ? [user.employeeId, user.employee_id, user.id, user.user_id, user.sub]
          .filter(Boolean)
          .map((id) => String(id).toLowerCase())
      : [];
    if (!managerId || !userIds.includes(managerId)) {
      return false;
    }
  }

  // Explicit backend boolean flag checks if provided (and explicitly true/false boolean)
  if (typeof adv.canApprove === "boolean") return adv.canApprove;
  if (typeof adv.actionable === "boolean") return adv.actionable;

  // Status must be one of the pending statuses
  const pendingStatuses = [
    "SUBMITTED",
    "PENDING",
    "PENDING_APPROVAL",
    "PENDING_MANAGER_APPROVAL",
    "PENDING_COST_CENTER_APPROVAL",
    "PENDING_COST_CENTER",
    "PENDING_FINANCE_APPROVAL",
    "PENDING_FINANCE"
  ];

  return pendingStatuses.includes(statusUpper);
};

/**
 * Cash advance approvals. `stage` decides which pending advances this list acts on:
 * "MANAGER" (the Approvals tab) shows advances waiting for the manager, "FINANCE" (the Finance tab)
 * shows advances waiting for Finance. Approved and rejected history is not split by stage.
 */
export default function CashAdvanceApprovalsList({ activeTab = "pending", searchTerm = "", amountFilter = "ALL", embedded = false, onRowCount, onDecided, windowStart = 0, windowEnd }) {
  const { user, hasRole } = useAuth();
  const ws = useApprovalWebSocket();
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [costCentersMap, setCostCentersMap] = useState(new Map());

  // Approve Confirmation Modal
  const [approvingAdvance, setApprovingAdvance] = useState(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  // Manager decision on the open request (full, reduced, set-off recommendation).
  const [decision, setDecision] = useState("FULL");
  const [reducedAmount, setReducedAmount] = useState("");
  const [setOffSourceId, setSetOffSourceId] = useState("");
  const [setOffAmount, setSetOffAmount] = useState("");

  // Reject Modal
  const [rejectingAdvance, setRejectingAdvance] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    lookupService
      .getActiveCostCenters()
      .then((list) => {
        if (isMounted && Array.isArray(list)) {
          const map = new Map();
          list.forEach((cc) => {
            const id = cc.costCenterId || cc.id || cc.uuid;
            if (id) map.set(String(id), cc);
          });
          setCostCentersMap(map);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // The backend already limits /my-approvals to the caller's roles and approval scope, so the
  // list shows whatever it returns (the same rows the card counts are based on).
  const fetchAdvances = async () => {
    setLoading(true);
    try {
      // Pending: the server's default (everything awaiting this user). Approved/Rejected ask for that status.
      const status =
        activeTab === "approved" ? "APPROVED" : activeTab === "rejected" ? "REJECTED" : undefined;
      const res = await cashAdvanceApi.getMyApprovals({ status, size: 100 });
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : data.content || data.items || [];
      setAdvances(list);
    } catch (err) {
      console.error("Failed to load cash advance approvals:", err);
      setAdvances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
  }, [activeTab]);

  // Keep the pending list current while the approver is on the page: reload on any approval queue
  // or notification push, and poll as a fallback in case a push is missed.
  const latestFetch = useRef(fetchAdvances);
  latestFetch.current = fetchAdvances;

  useEffect(() => {
    if (!ws) return undefined;
    const refresh = () => latestFetch.current();
    const unsubscribeQueue = ws.subscribe("queue-update", refresh);
    const unsubscribeNotification = ws.subscribe("notification", refresh);
    return () => {
      unsubscribeQueue();
      unsubscribeNotification();
    };
  }, [ws]);

  useEffect(() => {
    const timer = setInterval(() => latestFetch.current(), 60_000);
    return () => clearInterval(timer);
  }, []);

  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => {
      const statusUpper = (adv.status || "").toUpperCase();

      // Pending: only rows still awaiting a decision. Approved / Rejected: the server returns exactly what this user
      // decided, whatever stage the advance has reached since (e.g. still waiting for Finance), so nothing is dropped
      // here and the list matches the count on the card.
      const matchTab = activeTab === "pending" ? PENDING_STATUSES.includes(statusUpper) : true;

      let matchAmount = true;
      if (amountFilter !== "ALL") {
        const { cut, approved } = advanceAmounts(adv);
        matchAmount = amountFilter === "REDUCED" ? cut > 0 : amountFilter === "FULL" ? approved != null && cut === 0 : true;
      }

      const matchSearch =
        !searchTerm ||
        (adv.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.purpose || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.employeeId || adv.employee_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adv.employeeName || adv.employee_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatAdvanceNumber(adv).toLowerCase().includes(searchTerm.toLowerCase());

      // The backend already scopes /my-approvals to what this user is part of. Rows the user cannot act on yet
      // stay visible with disabled actions, as the card counts above do.
      return matchTab && matchAmount && matchSearch;
    });
  }, [advances, activeTab, searchTerm, amountFilter]);

  // Balance the approver sees before deciding: the employee's other open advances, loaded when the modal opens.
  const [approvalBalance, setApprovalBalance] = useState(null);
  useEffect(() => {
    if (!approvingAdvance) {
      setApprovalBalance(null);
      return undefined;
    }
    let cancelled = false;
    Promise.resolve()
      .then(() => cashAdvanceApi.approvalBalance(approvingAdvance.advanceId || approvingAdvance.id))
      .then((data) => {
        if (!cancelled) setApprovalBalance(data);
      })
      .catch(() => {
        if (!cancelled) setApprovalBalance({ error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [approvingAdvance]);

  const handleApprove = (adv) => {
    setApprovingAdvance(adv);
    setApprovalRemarks("");
    setDecision("FULL");
    setReducedAmount("");
    setSetOffSourceId("");
    setSetOffAmount("");
  };

  // Client-side checks mirror the server. The server re-checks everything and is the source of truth.
  const ROUND_BLOCK = 500;
  const decisionError = () => {
    if (!approvingAdvance) return "No request selected.";
    const requested = Number(approvingAdvance.amount) || 0;
    const needsJustification = decision !== "FULL" || !!approvalBalance?.exceedsLimit;
    if (needsJustification && !approvalRemarks.trim()) {
      return approvalBalance?.exceedsLimit && decision === "FULL"
        ? "This takes the employee above the exposure limit. Enter a justification to approve."
        : "Enter a justification for this decision.";
    }
    if (decision === "REDUCED") {
      const amt = Number(reducedAmount);
      if (!(amt > 0)) return "Enter the reduced amount.";
      if (amt >= requested) return `A reduced amount must be less than the requested ${formatMoney(requested, approvingAdvance.currencyCode || "INR")}.`;
      if (amt % ROUND_BLOCK !== 0) return `The amount must be a multiple of ${ROUND_BLOCK}.`;
    }
    if (decision === "SET_OFF") {
      const source = (approvalBalance?.otherOpenAdvances || []).find((o) => o.advanceId === setOffSourceId);
      if (!source) return "Choose the earlier advance to set off.";
      const amt = Number(setOffAmount);
      if (!(amt > 0)) return "Enter the amount to set off.";
      if (amt > Number(source.outstandingBalance)) return "The set-off is more than that advance's outstanding balance.";
      if (amt > requested) return "The set-off cannot be more than the advance being approved.";
    }
    return null;
  };

  const submitDecision = async (decisionCode) => {
    const advanceId = approvingAdvance.advanceId || approvingAdvance.id;
    const body = { decision: decisionCode, justification: approvalRemarks.trim() || null };
    if (decisionCode === "APPROVE_REDUCED") body.approvedAmount = Number(reducedAmount);
    if (decisionCode === "SET_OFF") {
      body.setOffSourceAdvanceId = setOffSourceId;
      body.setOffAmount = Number(setOffAmount);
    }
    setActionLoading(true);
    try {
      await cashAdvanceApi.managerDecision(advanceId, body);
      const verb = { APPROVE_FULL: "approved", APPROVE_REDUCED: "approved at a reduced amount", SET_OFF: "approved with a set-off recommended", DEFER: "deferred" }[decisionCode];
      showStatusToast(`Cash advance ${formatAdvanceNumber(approvingAdvance)} ${verb}.`, "success");
      setApprovingAdvance(null);
      setApprovalRemarks("");
      fetchAdvances();
      onDecided?.();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Could not record the decision", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmApprove = async (e) => {
    e.preventDefault();
    const problem = decisionError();
    if (problem) {
      showStatusToast(problem, "error");
      return;
    }
    const code = { FULL: "APPROVE_FULL", REDUCED: "APPROVE_REDUCED", SET_OFF: "SET_OFF" }[decision];
    await submitDecision(code);
  };

  const handleDefer = async () => {
    if (!approvalRemarks.trim()) {
      showStatusToast("Give the reason for deferring this request.", "error");
      return;
    }
    await submitDecision("DEFER");
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingAdvance) return;
    if (!rejectionReason.trim()) {
      showStatusToast("Rejection reason is mandatory when rejecting a request.", "error");
      return;
    }
    const advanceId = rejectingAdvance.advanceId || rejectingAdvance.id;
    setActionLoading(true);
    try {
      await cashAdvanceApi.reject(advanceId, rejectionReason.trim());
      showStatusToast(`Cash advance ${formatAdvanceNumber(rejectingAdvance)} rejected.`, "success");
      setRejectingAdvance(null);
      setRejectionReason("");
      fetchAdvances();
      onDecided?.();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to reject cash advance", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Only the advances inside this page's window; the parent counts every row across both lists.
  const windowAdvances = windowEnd === undefined ? filteredAdvances : filteredAdvances.slice(windowStart, windowEnd);
  const rowNodes = windowAdvances.map((adv) => {
                  const advId = adv.advanceId || adv.id;
                  const isActionable = canApproveAdvance(adv, user, hasRole);
                  // Show the buttons on every awaiting-approval row; disable them when this user can't act yet
                  // Approve/Reject only on the Pending tab: on Approved, a row still waiting for Finance is already decided by this user.
                  const showActions =
                    activeTab === "pending" && (isActionable || PENDING_STATUSES.includes((adv.status || "").toUpperCase()));
                  const neededBy = getNeededByDateValue(adv);
                  const empId = adv.employeeId || adv.employee_id || adv.userId || adv.createdById || adv.createdBy;

                  return (
                    <tr key={advId} className="hover:bg-gray-50/80 transition">
                      <td className="px-2.5 py-1.5 text-left">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">Cash advance</span>
                      </td>
                      <td className="px-2.5 py-1.5 text-left text-xs font-medium text-gray-900 whitespace-nowrap">
                        <EmployeeLabel employeeId={empId} />
                      </td>
                      <td className="px-2.5 py-1.5 text-left max-w-[220px]">
                        <p className="font-semibold text-gray-900 truncate text-xs">{adv.title || "Cash Advance"}</p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {neededBy ? `Needed by ${formatDate(neededBy)}` : `Requested on ${formatDate(adv.createdAt)}`}
                        </p>
                      </td>
                      <td className="px-2.5 py-1.5 text-left text-xs text-gray-600 truncate">{getCostCenterValue(adv, costCentersMap)}</td>
                      <td className="px-2.5 py-1.5 text-left whitespace-nowrap">
                        {getStatusBadge(adv.status)}
                      </td>
                      <AmountCells adv={adv} />
                      <td className="px-2.5 py-1.5 text-right whitespace-nowrap">
                        <RowActions>
                          <RowActionButton
                            tone="view"
                            icon={Eye}
                            label="View details"
                            onClick={() => navigate(`/expense-management/approvals/cash-advance/${adv.advanceId || adv.id}`)}
                          />
                          {showActions && (
                            <>
                              <RowActionButton
                                tone="approve"
                                icon={CheckCircle2}
                                label={`Approve ${adv.title || "cash advance"}`}
                                title={isActionable ? "Approve" : "Not yet your turn to approve"}
                                disabled={actionLoading || !isActionable}
                                onClick={() => handleApprove(adv)}
                              />
                              <RowActionButton
                                tone="reject"
                                icon={XCircle}
                                label={`Reject ${adv.title || "cash advance"}`}
                                title={isActionable ? "Reject" : "Not yet your turn to reject"}
                                disabled={actionLoading || !isActionable}
                                onClick={() => setRejectingAdvance(adv)}
                              />
                            </>
                          )}
                        </RowActions>
                      </td>
                    </tr>
                  );
                });

  const modals = createPortal(
    <>
      {/* Approve / decision modal */}
      {approvingAdvance && (() => {
        // The request's own currency labels its amounts. Other advances carry their own (see heldByCurrency).
        const cur = approvingAdvance.currencyCode || approvalBalance?.currencyCode || "INR";
        const money = (v) => formatMoney(Number(v) || 0, cur);
        // One line of the ledger: sign (+, −, =) in its own column so every figure lines up and the sum reads top to bottom.
        const Row = ({ sign, label, help, value, strong, tone, valueTone }) => (
          <div className={`flex items-start gap-2 py-1.5 ${strong ? "border-t-2 border-gray-300 mt-1 pt-2.5" : ""} ${tone || ""}`}>
            <span className="w-4 shrink-0 text-center font-mono font-semibold text-gray-400">{sign}</span>
            <span className="min-w-0 flex-1">
              <span className={`block ${strong ? "font-semibold text-gray-900 text-[13px]" : "text-gray-800"}`}>{label}</span>
              {help && <span className="block text-[11px] leading-snug text-gray-500">{help}</span>}
            </span>
            <span className={`shrink-0 whitespace-nowrap font-mono tabular-nums text-right ${strong ? "font-bold text-gray-900 text-[13px]" : "text-gray-800"} ${valueTone || ""}`}>
              {money(value)}
            </span>
          </div>
        );
        const sources = approvalBalance?.otherOpenAdvances || [];
        const pickedSource = sources.find((o) => o.advanceId === setOffSourceId) || null;
        const setOffCap = pickedSource
          ? Math.min(Number(pickedSource.outstandingBalance) || 0, Number(approvingAdvance.amount) || 0)
          : null;

        // Live figures for the "if you confirm" breakdown. Display only: the server re-checks and decides.
        const requested = Number(approvingAdvance.amount) || 0;
        const totalExposure = Number(approvalBalance?.potentialExposure) || 0;
        const limit = approvalBalance?.exposureLimit != null ? Number(approvalBalance.exposureLimit) : null;
        const reducedNum = Number(reducedAmount);
        const reducedValid = reducedAmount !== "" && reducedNum > 0 && reducedNum < requested && reducedNum % ROUND_BLOCK === 0;
        const reducedProblem = reducedAmount === "" ? null
          : !(reducedNum > 0) ? "Enter an amount above zero."
          : reducedNum >= requested ? `Must be less than the requested ${money(requested)}.`
          : reducedNum % ROUND_BLOCK !== 0 ? `Must be a multiple of ${ROUND_BLOCK} (for example ${money(Math.floor(reducedNum / ROUND_BLOCK) * ROUND_BLOCK)}).`
          : null;
        // A Cash Advance + Outstanding request carries the employee's balance into this one; a new request is just its cash.
        const includesCarryForward = approvingAdvance.requestType === "ADVANCE_PLUS_CARRY_FORWARD";
        const includesOutstanding = approvingAdvance.requestType === "ADVANCE_PLUS_OUTSTANDING" || includesCarryForward;
        const cfFigures = carryForwardRequest(approvingAdvance);
        const newCash = cfFigures ? cfFigures.newCash : Number(approvingAdvance.additionalAmountRequested ?? approvingAdvance.amount) || 0;
        const broughtIn = cfFigures ? cfFigures.carry : Math.max(0, (Number(approvingAdvance.totalAdvanceAllocation) || 0) - newCash);
        // Money the employee already holds or is due on other advances; shown only when there is some.
        const alreadyHeld = approvalBalance && !approvalBalance.error
          ? (Number(approvalBalance.pendingBalanceTotal) || 0) + (Number(approvalBalance.committedAmount) || 0)
          : 0;
        // Other advances can be in other currencies; each total keeps its own currency instead of borrowing this request's.
        const heldByCurrency = Object.entries(
          sources.reduce((acc, o) => {
            const code = o.currencyCode || cur;
            acc[code] = (acc[code] || 0) + (Number(o.outstandingBalance) || 0);
            return acc;
          }, {})
        ).filter(([, total]) => total > 0);
        const setOffNum = Number(setOffAmount);
        const sourceOwed = Number(pickedSource?.outstandingBalance) || 0;
        const setOffValid = !!pickedSource && setOffAmount !== "" && setOffNum > 0 && setOffNum <= sourceOwed && setOffNum <= requested;
        const setOffProblem = !pickedSource || setOffAmount === "" ? null
          : !(setOffNum > 0) ? "Enter an amount above zero."
          : setOffNum > sourceOwed ? `More than the ${money(sourceOwed)} still owed on that advance.`
          : setOffNum > requested ? `More than this request of ${money(requested)}.`
          : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <h3 className="font-bold text-gray-900 text-base">Decide on Cash Advance Request</h3>
                <button onClick={() => setApprovingAdvance(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <XCircle size={18} />
                </button>
              </div>
              <form onSubmit={handleConfirmApprove} className="p-5 space-y-4">
                {/* 1. What is being asked: one glance. */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-700">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900" title={approvingAdvance.title || undefined}>
                        {approvingAdvance.title || "Cash advance"}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-gray-400">{formatAdvanceNumber(approvingAdvance)}</p>
                    </div>
                    <p className="text-right text-[11px] text-gray-500">
                      Trip {formatTripDates(approvingAdvance)}
                    </p>
                  </div>
                  {approvingAdvance.purpose && (
                    <p className="mt-2 line-clamp-2 leading-relaxed text-gray-600" title={approvingAdvance.purpose}>
                      {approvingAdvance.purpose}
                    </p>
                  )}
                  {approvingAdvance.employeeJustification && (
                    <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-amber-900">
                      <span className="font-semibold">Why a separate advance: </span>
                      {approvingAdvance.employeeJustification}
                    </p>
                  )}
                </div>

                {/* 2. The money. A new request is one figure; a request with outstanding shows how the total is made. */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-2 text-xs">
                  {includesOutstanding ? (
                    <>
                      <Row sign="" label="New cash requested" value={newCash} />
                      {includesCarryForward ? (
                        <Row sign="+" label="Carry forward brought in" help="Balance Finance carried forward; moves in on final approval, not paid out" value={broughtIn} />
                      ) : (
                        <Row sign="+" label="Outstanding brought in" help="Balance the employee still holds, rolled into this advance" value={broughtIn} />
                      )}
                      <Row sign="=" label="Total advance" value={newCash + broughtIn} strong />
                    </>
                  ) : (
                    <Row sign="" label="Requested" help="New cash advance" value={requested} strong />
                  )}

                  {!approvalBalance && <p className="pb-1.5 text-[11px] text-gray-500">Checking the employee's other advances…</p>}
                  {approvalBalance?.error && (
                    <p className="pb-1.5 text-[11px] text-rose-700">Could not load the employee's other advances. Check them before deciding.</p>
                  )}
                  {alreadyHeld > 0 && (
                    <details className="border-t border-gray-200 py-1.5 text-[11px] text-gray-600">
                      <summary className="cursor-pointer">
                        Employee already holds{" "}
                        <span className="font-semibold text-gray-900">
                          {heldByCurrency.length > 0
                            ? heldByCurrency.map(([code, total]) => formatMoney(total, code)).join(" + ")
                            : money(alreadyHeld)}
                        </span>{" "}
                        on other advances
                        <span className="ml-1 text-blue-700 underline">show</span>
                      </summary>
                      <ul className="mt-1 space-y-0.5 pl-3">
                        {sources.map((o) => (
                          <li key={o.advanceId} className="flex justify-between gap-3">
                            <span className="truncate">{o.title || "Cash advance"}</span>
                            <span className="shrink-0 font-mono">{formatMoney(Number(o.outstandingBalance) || 0, o.currencyCode || cur)} owed</span>
                          </li>
                        ))}
                        {Number(approvalBalance?.committedAmount) > 0 && (
                          <li className="flex justify-between gap-3">
                            <span>Approved or pending, not paid yet</span>
                            <span className="shrink-0 font-mono">{money(approvalBalance.committedAmount)}</span>
                          </li>
                        )}
                      </ul>
                    </details>
                  )}
                  {approvalBalance?.exceedsLimit && (
                    <p className="mb-1.5 rounded bg-rose-50 px-2 py-1.5 text-[11px] font-semibold text-rose-700">
                      Approving in full is {money(approvalBalance.excessOverLimit)} over the company limit of {money(limit)}. A justification is required.
                    </p>
                  )}
                </div>

                {/* 3. The decision. Set-off is offered only when there is an earlier balance to set off. */}
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold text-gray-800">Your decision</legend>
                  <div className={`grid gap-2 ${sources.length > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                    {[
                      ["FULL", "Approve full amount"],
                      ["REDUCED", "Approve a lower amount"],
                      // A Carry Forward request already brings the carried balance in; a set-off on top would double it.
                      ...(sources.length > 0 && !includesCarryForward ? [["SET_OFF", "Set off earlier balance"]] : []),
                    ].map(([code, label]) => (
                      <label
                        key={code}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${decision === code ? "border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500" : "border-gray-200 text-gray-800 hover:border-gray-300"}`}
                      >
                        <input type="radio" name="decision" checked={decision === code} onChange={() => setDecision(code)} className="shrink-0" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {decision === "REDUCED" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="reduced-amount">Amount to approve ({cur})</label>
                    <input
                      id="reduced-amount"
                      type="number"
                      min="0"
                      step="500"
                      value={reducedAmount}
                      onChange={(e) => setReducedAmount(e.target.value)}
                      className={`w-full rounded-md border p-2 text-xs ${reducedProblem ? "border-rose-400" : "border-gray-300"}`}
                    />
                    <p className={`mt-1 text-[11px] ${reducedProblem ? "text-rose-600" : "text-gray-500"}`}>
                      {reducedProblem || `Less than ${money(requested)}, in multiples of ${ROUND_BLOCK}.`}
                    </p>
                  </div>
                )}

                {decision === "SET_OFF" && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="set-off-source">Earlier advance</label>
                      <select
                        id="set-off-source"
                        value={setOffSourceId}
                        onChange={(e) => {
                          const picked = sources.find((o) => o.advanceId === e.target.value);
                          setSetOffSourceId(e.target.value);
                          if (picked) {
                            setSetOffAmount(String(Math.min(Number(picked.outstandingBalance) || 0, Number(approvingAdvance.amount) || 0)));
                          }
                        }}
                        className="w-full rounded-md border border-gray-300 p-2 text-xs"
                      >
                        <option value="">Choose an earlier advance…</option>
                        {sources.map((o) => (
                          <option key={o.advanceId} value={o.advanceId}>
                            {`${o.title || "Cash advance"} · ${formatMoney(o.outstandingBalance, cur)} owed`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="set-off-amount">Amount to set off ({cur})</label>
                      <input
                        id="set-off-amount"
                        type="number"
                        min="0"
                        max={setOffCap ?? undefined}
                        step="0.01"
                        value={setOffAmount}
                        onChange={(e) => setSetOffAmount(e.target.value)}
                        className={`w-full rounded-md border p-2 text-xs ${setOffProblem ? "border-rose-400" : "border-gray-300"}`}
                      />
                      {setOffProblem && <p className="mt-1 text-[11px] text-rose-600">{setOffProblem}</p>}
                    </div>
                  </div>
                )}

                {/* 4. The outcome, in one line, recalculated as the approver types. */}
                <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs">
                  <span className="text-gray-700">
                    {decision === "FULL" && (includesCarryForward ? "Finance will pay the employee (new cash)" : "Finance will pay the employee")}
                    {decision === "REDUCED" && (reducedValid ? `Finance will pay the employee (cut by ${money(requested - reducedNum)})` : "Enter a valid amount to see what Finance pays")}
                    {decision === "SET_OFF" && (setOffValid ? `Finance will pay in cash (${money(setOffNum)} set off from the earlier advance)` : "Choose the earlier advance and amount to see the cash paid")}
                  </span>
                  <span className="font-mono text-base font-bold tabular-nums text-emerald-800">
                    {decision === "FULL" && money(requested)}
                    {decision === "REDUCED" && reducedValid && money(reducedNum)}
                    {decision === "SET_OFF" && setOffValid && money(requested - setOffNum)}
                  </span>
                  {/* Carry Forward: the payout is only the new cash, so say why it is lower than the total. */}
                  {includesCarryForward && broughtIn > 0 && (decision === "FULL" || (decision === "REDUCED" && reducedValid)) && (
                    <p data-testid="carry-forward-payout-note" className="basis-full text-[11px] leading-relaxed text-gray-600">
                      Only the new cash is paid. The employee accounts for{" "}
                      <span className="font-semibold text-gray-900">
                        {money((decision === "REDUCED" ? reducedNum : requested) + broughtIn)}
                      </span>{" "}
                      in total, including {money(broughtIn)} carried forward that they already hold.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Justification{" "}
                    {(decision !== "FULL" || approvalBalance?.exceedsLimit)
                      ? <span className="text-red-500">* (required)</span>
                      : <span className="text-gray-400 text-[11px]">(optional)</span>}
                  </label>
                  <textarea
                    value={approvalRemarks}
                    onChange={(e) => setApprovalRemarks(e.target.value)}
                    placeholder="Explain the decision, for Finance and the employee"
                    rows={2}
                    className="w-full rounded-md border border-gray-300 p-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setApprovingAdvance(null)} disabled={actionLoading} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={actionLoading}
                    onClick={() => {
                      setRejectingAdvance(approvingAdvance);
                      setApprovingAdvance(null);
                    }}
                    className="text-xs"
                  >
                    Reject
                  </Button>
                  <Button type="button" variant="outline" disabled={actionLoading} onClick={handleDefer} className="text-xs">
                    Defer
                  </Button>
                  <Button type="submit" variant="primary" disabled={actionLoading} className="text-xs bg-emerald-600 hover:bg-emerald-700">
                    {actionLoading ? <LoadingSpinner size="sm" className="mr-1.5" /> : "Confirm decision"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Reject Reason Modal */}
      {rejectingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">Reject Cash Advance Request</h3>
              <button onClick={() => setRejectingAdvance(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmReject} className="p-5 space-y-4">
              <p className="text-xs text-gray-600">
                You are about to reject cash advance request <strong className="text-gray-900">{formatAdvanceNumber(rejectingAdvance)}</strong> ({formatMoney(rejectingAdvance.amount, rejectingAdvance.currencyCode)}).
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for Rejection <span className="text-red-500">* (Mandatory)</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Mandatory: Provide clear reason for rejecting this cash advance request..."
                  rows={3}
                  required
                  className="w-full rounded-md border border-gray-300 p-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setRejectingAdvance(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="danger" disabled={actionLoading} className="text-xs">
                  {actionLoading ? <LoadingSpinner size="sm" className="mr-1.5" /> : "Confirm Reject"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>,
    document.body,
  );

  // Tell the parent how many rows this list has, so the page can show one empty message for the whole table.
  useEffect(() => {
    if (!loading && onRowCount) onRowCount(filteredAdvances.length);
  }, [loading, filteredAdvances.length, onRowCount]);

  if (embedded) {
    return (
      <>
        {loading && (
          <tbody>
            <tr>
              <td colSpan={9} className="py-10 text-center text-xs text-gray-500">Loading cash advance approval requests…</td>
            </tr>
          </tbody>
        )}
        {!loading && filteredAdvances.length > 0 && (
          <tbody className="divide-y divide-gray-100">{rowNodes}</tbody>
        )}
        {modals}
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-500">
            <LoadingSpinner size="lg" className="mb-2" />
            <p className="text-xs">Loading cash advance approval requests...</p>
          </div>
        ) : filteredAdvances.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle2 className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-700">No cash advance requests found</p>
            <p className="text-xs text-gray-400 mt-1">There are no {activeTab} cash advance requests matching your filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gradient-to-r from-blue-900 to-indigo-900 text-left text-xs font-semibold text-white uppercase">
                <tr>
                  <th className="w-8 px-2.5 py-2" />
                  <th className="px-2.5 py-2 text-left">Employee</th>
                  <th className="px-2.5 py-2 text-left">Title / Merchant</th>
                  <th className="px-2.5 py-2 text-left">Level / Status</th>
                  <th className="px-2.5 py-2 text-right">Requested</th>
                  <th className="px-2.5 py-2 text-right">Approved</th>
                  <th className="px-2.5 py-2 text-right">Paid</th>
                  <th className="px-2.5 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rowNodes}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modals}
    </div>
  );
}
