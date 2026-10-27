// src/pages/Projects/manager/milestones/MilestoneDetailsModal.jsx
import React from "react";
import {
  X,
  Calendar,
  Layers,
  FileCheck,
  DollarSign,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  Receipt,
  Edit2,
  AlertCircle,
} from "lucide-react";
import Button from "../../../../components/Button/Button";
import { formatINR } from "./mockMilestoneData";
import {
  DeliveryStatusBadge,
  ApprovalStatusBadge,
  BillingReadinessBadge,
} from "./MilestoneStatusBadges";
import MilestoneLifecycleTimeline from "./MilestoneLifecycleTimeline";

export default function MilestoneDetailsModal({
  isOpen,
  onClose,
  milestone,
  onEdit,
  onTriggerWorkflow,
  projectName = "Enterprise Digital Core Transformation",
}) {
  if (!isOpen || !milestone) return null;

  const {
    code,
    sequence,
    name,
    description,
    epicName,
    deliverables,
    plannedStartDate,
    plannedCompletionDate,
    actualCompletionDate,
    billingPercentage,
    billingAmount,
    currency = "INR",
    deliveryStatus,
    approvalStatus,
    billingReadiness,
    clientAcceptanceRequired = true,
    invoiceNumber,
    invoicedDate,
    rejectionReason,
    createdAt,
    updatedAt,
    history = [],
  } = milestone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                {sequence}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {code}
              </span>
              <DeliveryStatusBadge status={deliveryStatus} />
              <ApprovalStatusBadge status={approvalStatus} />
              <BillingReadinessBadge status={billingReadiness} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-snug">{name}</h3>
            <p className="text-xs text-slate-500">
              Project: <span className="font-semibold text-slate-700">{projectName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(milestone)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Edit Details</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Rejection Alert */}
          {approvalStatus === "REJECTED" && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-rose-900">Milestone Rejection Feedback</h5>
                <p className="mt-1 text-rose-800">
                  {rejectionReason || "Deliverables require revision before approval."}
                </p>
              </div>
            </div>
          )}

          {/* Proposed Lifecycle Timeline */}
          <MilestoneLifecycleTimeline milestone={milestone} />

          {/* Quick Workflow Action Toolbar */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Available Workflow Actions
              </span>
              <span className="text-[11px] text-indigo-600">
                Interactive State Transitions
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {deliveryStatus === "PLANNED" && (
                <button
                  type="button"
                  onClick={() => onTriggerWorkflow(milestone, "START")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  <Clock className="h-3.5 w-3.5" /> Start Milestone
                </button>
              )}

              {deliveryStatus === "IN_PROGRESS" && (
                <button
                  type="button"
                  onClick={() => onTriggerWorkflow(milestone, "COMPLETE")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                </button>
              )}

              {deliveryStatus === "COMPLETED" && (approvalStatus === "AWAITING_PM_APPROVAL" || approvalStatus === "NOT_SUBMITTED" || approvalStatus === "REJECTED") && (
                <>
                  <button
                    type="button"
                    onClick={() => onTriggerWorkflow(milestone, "PM_APPROVE")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> PM Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerWorkflow(milestone, "PM_REJECT")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject Deliverables
                  </button>
                </>
              )}

              {approvalStatus === "PM_APPROVED" && clientAcceptanceRequired && (
                <button
                  type="button"
                  onClick={() => onTriggerWorkflow(milestone, "CLIENT_ACCEPT")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition-colors"
                >
                  <FileCheck className="h-3.5 w-3.5" /> Record Client Acceptance
                </button>
              )}

              {(approvalStatus === "CLIENT_ACCEPTED" || (approvalStatus === "PM_APPROVED" && !clientAcceptanceRequired)) &&
                billingReadiness !== "ELIGIBLE" &&
                billingReadiness !== "INVOICED" && (
                  <button
                    type="button"
                    onClick={() => onTriggerWorkflow(milestone, "MARK_BILLABLE")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                  >
                    <DollarSign className="h-3.5 w-3.5" /> Authorize AR Ingestion (Mark Billable)
                  </button>
                )}

              {billingReadiness === "ELIGIBLE" && (
                <button
                  type="button"
                  onClick={() => onTriggerWorkflow(milestone, "SIMULATE_INVOICE")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Receipt className="h-3.5 w-3.5" /> Simulate AR Invoicing
                </button>
              )}

              {billingReadiness === "INVOICED" && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                  <Receipt className="h-3.5 w-3.5" /> Associated with AR Invoice {invoiceNumber}
                </span>
              )}
            </div>
          </div>

          {/* Overview Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Scope & Deliverables Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Scope & Deliverables</span>
              </h5>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Related Epic:</span>
                  <span className="font-semibold text-slate-800">{epicName || "No Linked Epic"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Description:</span>
                  <p className="text-slate-700 leading-relaxed mt-0.5">{description || "No description provided."}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Completion Criteria / Deliverables:</span>
                  <p className="text-slate-700 font-medium leading-relaxed mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {deliverables}
                  </p>
                </div>
              </div>
            </div>

            {/* Target Schedule & Billing Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>Schedule & Commercial Allocation</span>
              </h5>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 font-medium block">Planned Start:</span>
                    <span className="font-semibold text-slate-800">{plannedStartDate || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Planned End:</span>
                    <span className="font-semibold text-slate-800">{plannedCompletionDate || "—"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium block">Actual Completion:</span>
                  <span className="font-bold text-slate-900">
                    {actualCompletionDate ? (
                      <span className="text-emerald-700">{actualCompletionDate} (Completed)</span>
                    ) : (
                      <span className="text-slate-400 italic">Not yet recorded</span>
                    )}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Proposed Billing Allocation:</span>
                    <span className="text-sm font-bold text-indigo-700">
                      {formatINR(billingAmount)} ({billingPercentage}%)
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Currency:</span>
                    <span className="font-semibold text-slate-700">{currency}</span>
                  </div>
                  {invoiceNumber && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-700">
                      <span>AR Invoice Reference:</span>
                      <span className="font-bold">{invoiceNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <History className="h-4 w-4 text-indigo-600" />
              <span>Milestone Audit History</span>
            </h5>

            <div className="space-y-2.5">
              {history.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs border-l-2 border-slate-200 pl-3 py-0.5">
                  <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{item.action}</span>
                      <span className="text-slate-400 text-[11px]">{item.date}</span>
                    </div>
                    <div className="text-slate-500">
                      By <span className="font-medium text-slate-700">{item.actor}</span>
                    </div>
                    {item.notes && <p className="text-slate-600 italic mt-0.5">{item.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
