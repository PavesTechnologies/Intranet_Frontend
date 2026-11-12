import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Eye, DollarSign, Calendar, RefreshCw, Send, AlertCircle } from "lucide-react";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { lookupService } from "@/pages/expense-management/api/expenseReportsApi";
import { useAuth } from "@/contexts/AuthContext";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
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

const getNeededByDateValue = (adv) => {
  if (!adv) return null;
  return (
    adv.neededByDate ||
    adv.neededBy ||
    adv.needed_by_date ||
    adv.needed_by ||
    adv.requiredDate ||
    adv.targetDate ||
    adv.expectedDate ||
    adv.settlementDueDate ||
    adv.createdDate ||
    adv.createdAt ||
    adv.created_at
  );
};

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
          {upper || "PENDING"}
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
export default function CashAdvanceApprovalsList({ activeTab = "pending", searchTerm = "", embedded = false }) {
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

      let matchTab = false;
      if (activeTab === "pending") {
        matchTab = [
          "SUBMITTED",
          "PENDING",
          "PENDING_APPROVAL",
          "PENDING_MANAGER_APPROVAL",
          "PENDING_COST_CENTER_APPROVAL",
          "PENDING_COST_CENTER",
          "PENDING_FINANCE_APPROVAL",
          "PENDING_FINANCE"
        ].includes(statusUpper);
      } else if (activeTab === "approved") {
        matchTab = ["APPROVED", "DISBURSED", "SETTLED"].includes(statusUpper);
      } else if (activeTab === "rejected") {
        matchTab = statusUpper === "REJECTED";
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
      return matchTab && matchSearch;
    });
  }, [advances, activeTab, searchTerm]);

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
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to reject cash advance", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const rowNodes = filteredAdvances.map((adv) => {
                  const advId = adv.advanceId || adv.id;
                  const isActionable = canApproveAdvance(adv, user, hasRole);
                  // Show the buttons on every awaiting-approval row; disable them when this user can't act yet
                  const showActions =
                    isActionable ||
                    [
                      "SUBMITTED",
                      "PENDING",
                      "PENDING_APPROVAL",
                      "PENDING_MANAGER_APPROVAL",
                      "PENDING_COST_CENTER_APPROVAL",
                      "PENDING_COST_CENTER",
                      "PENDING_FINANCE_APPROVAL",
                      "PENDING_FINANCE",
                    ].includes((adv.status || "").toUpperCase());
                  const empId = adv.employeeId || adv.employee_id || adv.userId || adv.createdById || adv.createdBy;

                  return (
                    <tr key={advId} className="hover:bg-gray-50/80 transition">
                      <td className="px-2.5 py-1.5" />
                      <td className="px-2.5 py-1.5 font-mono font-medium text-blue-700 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-emerald-800">Cash Advance</span>
                      </td>
                      <td className="px-2.5 py-1.5 font-medium text-gray-900 whitespace-nowrap">
                        <EmployeeLabel employeeId={empId} />
                      </td>
                      <td className="px-2.5 py-1.5 max-w-[220px]">
                        <p className="font-semibold text-gray-900 truncate text-xs">{adv.title || "Cash Advance"}</p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {getCostCenterValue(adv, costCentersMap)} · Needed by {formatDate(getNeededByDateValue(adv))}
                        </p>
                      </td>
                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        {getStatusBadge(adv.status)}
                      </td>
                      <td className="px-2.5 py-1.5 text-xs text-gray-400">—</td>
                      <td className="px-2.5 py-1.5 text-xs text-gray-400">—</td>
                      <td className="px-2.5 py-1.5 font-bold text-gray-900 whitespace-nowrap text-xs">
                        {formatMoney(adv.amount, adv.currencyCode || "INR")}
                      </td>
                      <td className="px-2.5 py-1.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/expense-management/approvals/cash-advance/${adv.advanceId || adv.id}`)}
                            title="View Details"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            <Eye size={15} />
                          </button>

                          {showActions && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleApprove(adv)}
                                disabled={actionLoading || !isActionable}
                                className="!py-1 !px-2.5 !text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Approve
                              </Button>

                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => setRejectingAdvance(adv)}
                                disabled={actionLoading || !isActionable}
                                className="!py-1 !px-2.5 !text-[11px]"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                });

  const modals = createPortal(
    <>
      {/* Approve / decision modal */}
      {approvingAdvance && (() => {
        const cur = approvalBalance?.currencyCode || approvingAdvance.currencyCode || "INR";
        const Row = ({ label, value, strong, tone }) => (
          <p className={`flex justify-between gap-3 ${strong ? "font-semibold border-t border-gray-200 pt-1.5" : ""} ${tone || ""}`}>
            <span>{label}</span>
            <span className="font-mono whitespace-nowrap">{formatMoney(value ?? 0, cur)}</span>
          </p>
        );
        const sources = approvalBalance?.otherOpenAdvances || [];
        const pickedSource = sources.find((o) => o.advanceId === setOffSourceId) || null;
        const setOffCap = pickedSource
          ? Math.min(Number(pickedSource.outstandingBalance) || 0, Number(approvingAdvance.amount) || 0)
          : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 sticky top-0">
                <h3 className="font-bold text-gray-900 text-sm">Decide on Cash Advance Request</h3>
                <button onClick={() => setApprovingAdvance(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <XCircle size={18} />
                </button>
              </div>
              <form onSubmit={handleConfirmApprove} className="p-5 space-y-4">
                <div className="rounded-lg border border-gray-200 p-3 text-xs text-gray-700 space-y-1.5">
                  <p className="font-semibold text-gray-900">Request {formatAdvanceNumber(approvingAdvance)}</p>
                  <p><span className="text-gray-500">Purpose: </span>{approvingAdvance.purpose || "Not given"}</p>
                  <p>
                    <span className="text-gray-500">Trip: </span>
                    {approvingAdvance.expectedTripStartDate
                      ? `${new Date(approvingAdvance.expectedTripStartDate).toLocaleDateString("en-IN")} to ${approvingAdvance.expectedTripEndDate ? new Date(approvingAdvance.expectedTripEndDate).toLocaleDateString("en-IN") : "—"}`
                      : "Not given"}
                  </p>
                  {approvingAdvance.notes && (
                    <p><span className="text-gray-500">Employee's justification: </span>{approvingAdvance.notes}</p>
                  )}
                  <p className="pt-1">Requested: <strong className="text-gray-900">{formatMoney(approvingAdvance.amount, cur)}</strong></p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-1.5">
                  <p className="font-semibold text-gray-900">Employee exposure</p>
                  {!approvalBalance && <p className="text-gray-500">Loading balance...</p>}
                  {approvalBalance?.error && <p className="text-rose-700">Could not load the balance. Check it before deciding.</p>}
                  {approvalBalance && !approvalBalance.error && (
                    <>
                      <Row label="Outstanding in other advances" value={approvalBalance.pendingBalanceTotal} />
                      <Row label="Approved or pending, not yet paid" value={approvalBalance.committedAmount} />
                      <Row label="This request" value={approvingAdvance.amount} />
                      <Row label="Total exposure" value={approvalBalance.potentialExposure} strong />
                      {approvalBalance.exposureLimit != null ? (
                        <Row label="Company limit" value={approvalBalance.exposureLimit} />
                      ) : (
                        <p className="text-gray-500">No exposure limit is configured.</p>
                      )}
                      {approvalBalance.exceedsLimit && (
                        <p className="rounded bg-rose-50 p-2 font-semibold text-rose-700">
                          Above the limit by {formatMoney(approvalBalance.excessOverLimit, cur)}. You can still approve with a justification, which Finance will authorize, or choose another option.
                        </p>
                      )}
                      {sources.length > 0 && (
                        <ul className="space-y-1 border-t border-gray-200 pt-2">
                          {sources.map((o) => (
                            <li key={o.advanceId} className="flex justify-between gap-3">
                              <span className="truncate">{o.advanceId} · {o.title || "Cash advance"}</span>
                              <span className="font-mono whitespace-nowrap">{formatMoney(o.outstandingBalance, cur)} owed</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium text-gray-700 mb-1">Your decision</legend>
                  {[
                    ["FULL", "Approve the full amount", "Option A. Both advances stay separate. Finance pays exactly this amount."],
                    ["REDUCED", "Approve a lower amount", "Finance pays the reduced amount. The requested amount is kept on record."],
                    ["SET_OFF", "Set off an earlier outstanding balance", "Option B. Recommended only. Finance proposes and approves the carry-forward, and disbursement waits for it."],
                  ].map(([code, label, help]) => (
                    <label key={code} className={`flex gap-2 rounded-md border p-2.5 text-xs cursor-pointer ${decision === code ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                      <input type="radio" name="decision" checked={decision === code} onChange={() => setDecision(code)} className="mt-0.5" />
                      <span>
                        <span className="font-semibold text-gray-900 block">{label}</span>
                        <span className="text-gray-500">{help}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>

                {decision === "REDUCED" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount to approve ({cur})</label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={reducedAmount}
                      onChange={(e) => setReducedAmount(e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-2 text-xs"
                    />
                  </div>
                )}

                {decision === "SET_OFF" && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Earlier advance</label>
                      <select
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
                            {`${o.title || "Cash advance"} · ${String(o.advanceId).slice(0, 8)} · ${formatMoney(o.outstandingBalance, cur)} owed`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Amount to set off ({cur})</label>
                      <input
                        type="number"
                        min="0"
                        max={setOffCap ?? undefined}
                        step="0.01"
                        value={setOffAmount}
                        onChange={(e) => setSetOffAmount(e.target.value)}
                        className="w-full rounded-md border border-gray-300 p-2 text-xs"
                      />
                      {setOffCap != null && (
                        <p className="mt-1 text-[11px] text-gray-500">
                          At most {formatMoney(setOffCap, cur)}: the earlier balance or this request, whichever is lower.
                        </p>
                      )}
                    </div>
                  </div>
                )}

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
                    rows={3}
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
              <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="w-8 px-2.5 py-2" />
                  <th className="px-2.5 py-2">Report</th>
                  <th className="px-2.5 py-2">Employee</th>
                  <th className="px-2.5 py-2">Title / Merchant</th>
                  <th className="px-2.5 py-2">Level / Status</th>
                  <th className="px-2.5 py-2">Expenses</th>
                  <th className="px-2.5 py-2">Policy</th>
                  <th className="px-2.5 py-2">Amount</th>
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
