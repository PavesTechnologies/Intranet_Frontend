// src/pages/Projects/manager/milestones/MilestoneStatusBadges.jsx
import React from "react";
import { CheckCircle2, Clock, AlertCircle, FileCheck, XCircle, DollarSign, Receipt } from "lucide-react";

export function DeliveryStatusBadge({ status }) {
  switch (status) {
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          Completed
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
          <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          In Progress
        </span>
      );
    case "PLANNED":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
          Planned
        </span>
      );
  }
}

export function ApprovalStatusBadge({ status }) {
  switch (status) {
    case "CLIENT_ACCEPTED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/25">
          <FileCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          Client Accepted
        </span>
      );
    case "PM_APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          PM Approved
        </span>
      );
    case "AWAITING_CLIENT_ACCEPTANCE":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-200">
          <Clock className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          Awaiting Client
        </span>
      );
    case "AWAITING_PM_APPROVAL":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          Awaiting PM Approval
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
          <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          Rejected
        </span>
      );
    case "NOT_SUBMITTED":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
          Not Submitted
        </span>
      );
  }
}

export function BillingReadinessBadge({ status }) {
  switch (status) {
    case "INVOICED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-300">
          <Receipt className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
          Invoiced
        </span>
      );
    case "ELIGIBLE":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/80 px-2.5 py-0.5 text-xs font-semibold text-indigo-900 ring-1 ring-inset ring-indigo-300">
          <DollarSign className="h-3.5 w-3.5 text-indigo-700 shrink-0" />
          Billable
        </span>
      );
    case "AWAITING_APPROVAL":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-300/60">
          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          Awaiting Sign-off
        </span>
      );
    case "NOT_ELIGIBLE":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
          <AlertCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          Not Yet Eligible
        </span>
      );
  }
}
