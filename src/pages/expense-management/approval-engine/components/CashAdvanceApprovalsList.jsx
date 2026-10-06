import React, { useState, useEffect, useMemo } from "react";
import { CheckCircle2, XCircle, Eye, DollarSign, Calendar, RefreshCw, Send, AlertCircle } from "lucide-react";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { lookupService } from "@/pages/expense-management/api/expenseReportsApi";
import { useAuth } from "@/contexts/AuthContext";
import EmployeeLabel from "@/pages/expense-management/approval-engine/components/EmployeeLabel";
import CashAdvanceWorkflowStepper from "@/pages/expense-management/pages/cash-advance/components/CashAdvanceWorkflowStepper";

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

const canApproveAdvance = (adv, user, hasRole) => {
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

  // User must have appropriate approval role (Manager, Finance Executive, Finance, or Admin)
  const isAuthorizedRole = hasRole
    ? hasRole([
        "Manager",
        "MANAGER",
        "Reporting_Manager",
        "Project_Manager",
        "Delivery_Manager",
        "Resource_Manager",
        "General",
        "GENERAL",
        "Finance Executive",
        "FINANCE_EXECUTIVE",
        "Finance",
        "FINANCE",
        "Admin",
        "ADMIN"
      ])
    : true;

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

export default function CashAdvanceApprovalsList({ activeTab = "pending", searchTerm = "" }) {
  const { user, hasRole } = useAuth();
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [costCentersMap, setCostCentersMap] = useState(new Map());

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

  const isManagerPOV = hasRole
    ? hasRole([
        "Manager",
        "MANAGER",
        "Reporting_Manager",
        "Project_Manager",
        "Delivery_Manager",
        "Resource_Manager",
        "General",
        "GENERAL",
        "Finance Executive",
        "FINANCE_EXECUTIVE",
        "Finance",
        "FINANCE",
        "Admin",
        "ADMIN"
      ])
    : true;

  const fetchAdvances = async () => {
    if (!isManagerPOV) {
      setAdvances([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await cashAdvanceApi.getMyApprovals();
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

  const filteredAdvances = useMemo(() => {
    if (!isManagerPOV) return [];

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

      return matchTab && matchSearch;
    });
  }, [advances, activeTab, searchTerm]);

  const handleApprove = async (adv) => {
    const advanceId = adv.advanceId || adv.id;
    setActionLoading(true);
    try {
      await cashAdvanceApi.approve(advanceId);
      showStatusToast(`Cash advance ${formatAdvanceNumber(adv)} approved successfully!`, "success");
      fetchAdvances();
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Failed to approve cash advance", "error");
    } finally {
      setActionLoading(false);
    }
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
                  <th className="py-3 px-4">REPORT #</th>
                  <th className="py-3 px-4">EMPLOYEE</th>
                  <th className="py-3 px-4">TITLE</th>
                  <th className="py-3 px-4">COST CENTER</th>
                  <th className="py-3 px-4">CURRENCY</th>
                  <th className="py-3 px-4">NEEDED BY</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAdvances.map((adv) => {
                  const advId = adv.advanceId || adv.id;
                  const isActionable = canApproveAdvance(adv, user, hasRole);
                  const empId = adv.employeeId || adv.employee_id || adv.userId || adv.createdById || adv.createdBy;

                  return (
                    <tr key={advId} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 font-mono font-medium text-blue-700 whitespace-nowrap">
                        {formatAdvanceNumber(adv)}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                        <EmployeeLabel employeeId={empId} />
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-gray-900 truncate">{adv.title || "Cash Advance"}</p>
                        {adv.purpose && <p className="text-[11px] text-gray-500 truncate mt-0.5">{adv.purpose}</p>}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700 whitespace-nowrap">
                        {getCostCenterValue(adv, costCentersMap)}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                        {formatMoney(adv.amount, adv.currencyCode || "INR")}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                        {formatDate(getNeededByDateValue(adv))}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(adv.status)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedAdvance(adv)}
                            title="View Details"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            <Eye size={15} />
                          </button>

                          {isActionable && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleApprove(adv)}
                                disabled={actionLoading}
                                className="!py-1 !px-2.5 !text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Approve
                              </Button>

                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => setRejectingAdvance(adv)}
                                disabled={actionLoading}
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
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {selectedAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">Cash Advance Request Details & Lifecycle</h3>
              <button onClick={() => setSelectedAdvance(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Stepper */}
              <CashAdvanceWorkflowStepper currentStatus={selectedAdvance.status} />

              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div>
                  <p className="text-[10px] font-semibold text-blue-600 uppercase">Requested Amount</p>
                  <p className="text-lg font-bold text-blue-900 mt-0.5">
                    {formatMoney(selectedAdvance.amount, selectedAdvance.currencyCode || "INR")}
                  </p>
                </div>
                {getStatusBadge(selectedAdvance.status)}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Employee</p>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    <EmployeeLabel employeeId={selectedAdvance.employeeId || selectedAdvance.employee_id || selectedAdvance.userId} showIdSubtext />
                  </p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Report #</p>
                  <p className="font-mono font-medium text-blue-700 mt-0.5">{formatAdvanceNumber(selectedAdvance)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Title</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedAdvance.title || "—"}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Cost Center</p>
                  <p className="font-medium text-gray-800 mt-0.5">{getCostCenterValue(selectedAdvance, costCentersMap)}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Purpose / Justification</p>
                <p className="text-gray-800 mt-1 whitespace-pre-line">{selectedAdvance.purpose || "No details provided."}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Needed By Date</p>
                  <p className="font-medium text-gray-800 mt-0.5">{formatDate(getNeededByDateValue(selectedAdvance))}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Settlement Expected</p>
                  <p className="font-medium text-gray-800 mt-0.5">{formatDate(selectedAdvance.settlementDueDate)}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedAdvance(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
