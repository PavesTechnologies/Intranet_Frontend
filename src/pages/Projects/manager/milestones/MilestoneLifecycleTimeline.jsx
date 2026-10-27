// src/pages/Projects/manager/milestones/MilestoneLifecycleTimeline.jsx
import React from "react";
import { Check, Clock, AlertCircle, FileCheck, DollarSign, Receipt, ArrowRight } from "lucide-react";

export default function MilestoneLifecycleTimeline({ milestone }) {
  if (!milestone) return null;

  const {
    deliveryStatus,
    approvalStatus,
    billingReadiness,
    clientAcceptanceRequired = true,
  } = milestone;

  // Compute active status index in the 7-step sequence:
  // 0: Planned
  // 1: In Progress
  // 2: Completed (Delivery complete)
  // 3: PM Approved
  // 4: Client Accepted (Optional/Configurable)
  // 5: Billable (Eligible for AR Billing)
  // 6: Invoiced (Associated with AR Invoice)

  let currentStep = 0;
  if (billingReadiness === "INVOICED") {
    currentStep = 6;
  } else if (billingReadiness === "ELIGIBLE") {
    currentStep = 5;
  } else if (approvalStatus === "CLIENT_ACCEPTED") {
    currentStep = 4;
  } else if (approvalStatus === "PM_APPROVED") {
    currentStep = clientAcceptanceRequired ? 3 : 4;
  } else if (deliveryStatus === "COMPLETED") {
    currentStep = 2;
  } else if (deliveryStatus === "IN_PROGRESS") {
    currentStep = 1;
  }

  const isRejected = approvalStatus === "REJECTED";

  const steps = [
    {
      id: "PLANNED",
      label: "Planned",
      subtext: "Schedule & criteria set",
      icon: Clock,
    },
    {
      id: "IN_PROGRESS",
      label: "In Progress",
      subtext: "Active engineering",
      icon: Clock,
    },
    {
      id: "COMPLETED",
      label: "Completed",
      subtext: "Deliverables submitted",
      icon: Check,
    },
    {
      id: "PM_APPROVED",
      label: "PM Approved",
      subtext: "Internal PM sign-off",
      icon: Check,
    },
    ...(clientAcceptanceRequired
      ? [
          {
            id: "CLIENT_ACCEPTED",
            label: "Client Accepted",
            subtext: "External approval",
            icon: FileCheck,
          },
        ]
      : []),
    {
      id: "BILLABLE",
      label: "Billable",
      subtext: "Ready for AR ingestion",
      icon: DollarSign,
    },
    {
      id: "INVOICED",
      label: "Invoiced",
      subtext: milestone.invoiceNumber || "AR Invoice created",
      icon: Receipt,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <span>Proposed Milestone Lifecycle</span>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
              Interactive Preview
            </span>
          </h4>
          <p className="text-xs text-slate-500">
            Standard PMS delivery tracking to AR billing readiness progression.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Client Acceptance:{" "}
          <strong className="text-slate-800">
            {clientAcceptanceRequired ? "Required per Contract" : "Not Required"}
          </strong>
        </div>
      </div>

      {isRejected && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <span className="font-semibold">Milestone Rejected by PM: </span>
            <span>{milestone.rejectionReason || "Deliverables require revision before approval."}</span>
          </div>
        </div>
      )}

      {/* Horizontal Step Progression */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center min-w-[620px] justify-between relative">
          {/* Connector bar background */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />

          {steps.map((step, idx) => {
            const isCompleted = idx < currentStep || (idx === currentStep && currentStep === steps.length - 1);
            const isCurrent = idx === currentStep && currentStep !== steps.length - 1;
            const isUpcoming = idx > currentStep;
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center text-center relative z-10 px-2 group">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                      : isCurrent
                      ? "border-indigo-600 bg-white text-indigo-700 ring-4 ring-indigo-50 font-bold"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  <StepIcon className="h-4 w-4" />
                </div>
                <div className="mt-2 space-y-0.5">
                  <span
                    className={`block text-xs font-semibold ${
                      isCurrent
                        ? "text-indigo-900"
                        : isCompleted
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="block text-[10px] text-slate-400 max-w-[90px] leading-tight">
                    {step.subtext}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
