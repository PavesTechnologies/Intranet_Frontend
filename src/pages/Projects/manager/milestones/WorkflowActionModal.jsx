// src/pages/Projects/manager/milestones/WorkflowActionModal.jsx
import React, { useState } from "react";
import { X, CheckCircle2, XCircle, AlertCircle, Clock, FileCheck, Receipt } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { formatINR } from "./mockMilestoneData";

export default function WorkflowActionModal({
  isOpen,
  onClose,
  milestone,
  actionType, // "START" | "COMPLETE" | "PM_APPROVE" | "PM_REJECT" | "CLIENT_ACCEPT" | "MARK_BILLABLE" | "SIMULATE_INVOICE"
  onConfirm,
}) {
  const [notes, setNotes] = useState("");
  const [actualDate, setActualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [signerName, setSignerName] = useState("S. Mehta (Client Sign-off)");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  if (!isOpen || !milestone) return null;

  const getActionConfig = () => {
    switch (actionType) {
      case "START":
        return {
          title: "Start Milestone Execution",
          subtitle: `Transition ${milestone.code} to In Progress`,
          confirmText: "Start Milestone",
          variant: "primary",
          icon: Clock,
        };
      case "COMPLETE":
        return {
          title: "Mark Milestone as Completed",
          subtitle: `Confirm delivery of all completion criteria for ${milestone.code}`,
          confirmText: "Mark Completed",
          variant: "primary",
          icon: CheckCircle2,
        };
      case "PM_APPROVE":
        return {
          title: "PM Approval Sign-off",
          subtitle: `Approve deliverables for ${milestone.code} as Project Manager`,
          confirmText: "Approve Milestone",
          variant: "primary",
          icon: CheckCircle2,
        };
      case "PM_REJECT":
        return {
          title: "Reject Milestone Deliverables",
          subtitle: `Send ${milestone.code} back for revision with feedback`,
          confirmText: "Reject & Request Revisions",
          variant: "danger",
          icon: XCircle,
        };
      case "CLIENT_ACCEPT":
        return {
          title: "Record Client Acceptance",
          subtitle: `Log formal client sign-off certificate for ${milestone.code}`,
          confirmText: "Record Acceptance",
          variant: "primary",
          icon: FileCheck,
        };
      case "MARK_BILLABLE":
        return {
          title: "Mark Eligible for AR Billing",
          subtitle: `Transition ${milestone.code} (${formatINR(milestone.billingAmount)}) to Ready for AR Ingestion`,
          confirmText: "Authorize AR Ingestion",
          variant: "primary",
          icon: CheckCircle2,
        };
      case "SIMULATE_INVOICE":
        return {
          title: "Simulate AR Invoice Generation",
          subtitle: `Simulate AR module generating customer invoice for ${milestone.code}`,
          confirmText: "Generate Mock AR Invoice",
          variant: "primary",
          icon: Receipt,
        };
      default:
        return {
          title: "Update Milestone Status",
          subtitle: milestone.code,
          confirmText: "Confirm",
          variant: "primary",
          icon: CheckCircle2,
        };
    }
  };

  const config = getActionConfig();
  const IconComponent = config.icon;

  const handleConfirm = () => {
    if (actionType === "PM_REJECT" && !rejectionReason.trim()) {
      setError("Please specify the rejection reason and corrective actions required.");
      return;
    }

    onConfirm({
      actionType,
      notes,
      actualDate,
      signerName,
      rejectionReason,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${actionType === "PM_REJECT" ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"}`}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{config.title}</h3>
              <p className="text-xs text-slate-500">{config.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Milestone:</span>
              <span className="font-bold text-slate-900">{milestone.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Proposed Billing Amount:</span>
              <span className="font-bold text-indigo-700">
                {formatINR(milestone.billingAmount)} ({milestone.billingPercentage}%)
              </span>
            </div>
            <div className="text-xs text-slate-600 pt-1 border-t border-slate-200/60">
              <span className="text-slate-400 font-medium">Deliverables: </span>
              <span>{milestone.deliverables}</span>
            </div>
          </div>

          {/* Conditional Input Fields */}
          {actionType === "COMPLETE" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Actual Completion Date *
              </label>
              <input
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          )}

          {actionType === "CLIENT_ACCEPT" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client Signatory / Reference *
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g. S. Mehta (VP Technology)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          )}

          {actionType === "PM_REJECT" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Reason & Required Remediation *
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setError("");
                }}
                placeholder="Describe what deliverables are missing or defect items that need fixing before approval..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-red-500 focus:ring-red-500"
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Workflow Transition Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Audit log remarks..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors ${
              config.variant === "danger"
                ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
            }`}
          >
            {config.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
