import React from "react";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

// Display helpers shared by the Cash Advance pages. Kept out of the page components so that Vite's Fast Refresh
// can hot-update those pages without a full reload.

export const formatMoney = (amount, currencyCode = "INR") => {
  const num = Number(amount) || 0;
  return `${currencyCode} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};


export const formatDate = (dateValue) => {
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


export const getCostCenterValue = (adv) => {
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

  if (adv.departmentName) return adv.departmentName;
  if (typeof adv.department === "string") return adv.department;
  if (adv.department && adv.department.name) return adv.department.name;

  if (adv.projectName) return adv.projectName;
  if (typeof adv.project === "string") return adv.project;
  if (adv.project && adv.project.name) return adv.project.name;

  if (adv.costCenterId || adv.cost_center_id) {
    return `CC-${adv.costCenterId || adv.cost_center_id}`;
  }

  return "—";
};


export const getStatusBadge = (status) => {
  const upper = (status || "").toUpperCase();
  switch (upper) {
    case "DRAFT":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-300">Draft</span>;
    case "SUBMITTED":
    case "PENDING":
    case "PENDING_APPROVAL":
    case "PENDING_MANAGER_APPROVAL":
    case "PENDING_COST_CENTER_APPROVAL":
    case "PENDING_FINANCE_APPROVAL":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending Approval</span>;
    case "APPROVED":
    case "EXPENSE_VERIFIED":
    case "EXPENSE VERIFIED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 border border-teal-200">Approved</span>;
    case "DISBURSED":
    case "IN_PROGRESS":
    case "IN PROGRESS":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">In Progress</span>;
    case "RECONCILIATION_PENDING":
    case "RECONCILIATION PENDING":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-50 text-orange-700 border border-orange-200">Reconciliation Pending</span>;
    case "SUBMITTED_FOR_REVIEW":
    case "SUBMITTED FOR REVIEW":
    case "EXPENSE_SUBMITTED":
    case "EXPENSE SUBMITTED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Submitted for Review</span>;
    case "UNDER_REVIEW":
    case "UNDER REVIEW":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">Under Review</span>;
    case "SETTLEMENT_PENDING":
    case "SETTLEMENT PENDING":
    case "PARTIALLY_SETTLED":
    case "PARTIALLY_ADJUSTED":
    case "PARTIALLY ADJUSTED":
    case "ADJUSTED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Settlement Pending</span>;
    case "CLOSED":
    case "SETTLED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Closed</span>;
    case "REJECTED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
    case "OVERDUE":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Overdue</span>;
    case "CANCELLED":
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-300">Cancelled</span>;
    default:
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">{status || "Unknown"}</span>;
  }
};

