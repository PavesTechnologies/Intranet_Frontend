import React from "react";
import { Check, ChevronRight, FileText, Calculator, Database, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * InvoiceLifecycleStepper
 *
 * Professional enterprise financial stepper visually representing the Account Receivable
 * invoice lifecycle stages:
 * 1. Billing Data Acquisition (Completed)
 * 2. Tax Calculation (Completed)
 * 3. Invoice Draft Review (Active during Draft Preview)
 * 4. Official Invoice (Active after successful Generation & Submission)
 */
export default function InvoiceLifecycleStepper({
  generationState = "DRAFT", // "DRAFT" | "GENERATING" | "GENERATED"
  invoiceStatus = null,       // "GENERATED" | "PENDING_APPROVAL" | etc.
  backToTaxUrl = null,
  backToAcquisitionUrl = "/account-receivable/billing-data-acquisition/workspace",
}) {
  const isGenerating = generationState === "GENERATING";
  const isGenerated = generationState === "GENERATED";
  const isPendingApproval = invoiceStatus === "PENDING_APPROVAL";

  const steps = [
    {
      id: "acquisition",
      number: "1",
      label: "Billing Data Acquired",
      shortLabel: "Acquisition",
      status: "completed",
      icon: Database,
      linkTo: backToAcquisitionUrl,
    },
    {
      id: "tax",
      number: "2",
      label: "Tax Calculated",
      shortLabel: "Tax Calculation",
      status: "completed",
      icon: Calculator,
      linkTo: backToTaxUrl,
    },
    {
      id: "draft",
      number: "3",
      label: "Invoice Draft Review",
      shortLabel: "Draft Review",
      status: isGenerated ? "completed" : "current",
      icon: FileText,
      linkTo: null,
    },
    {
      id: "official",
      number: "4",
      label: isPendingApproval ? "Pending Approval" : isGenerated ? "Official Invoice" : "Official Invoice",
      shortLabel: isPendingApproval ? "Pending Approval" : "Official Invoice",
      status: isGenerated ? (isPendingApproval ? "completed" : "current") : isGenerating ? "in_progress" : "upcoming",
      icon: ShieldCheck,
      linkTo: null,
    },
  ];

  return (
    <div
      className="w-full rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs"
      aria-label="Invoice Generation Lifecycle"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Lifecycle Workflow
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs font-semibold text-slate-700">
            {isPendingApproval
              ? "Step 4 of 4: Submitted for Approval"
              : isGenerated
              ? "Step 4 of 4: Official Invoice Created"
              : isGenerating
              ? "Step 3 → 4: Generating Official Invoice..."
              : "Step 3 of 4: Reviewing Financial Draft"}
          </span>
        </div>

        {/* Stepper pills */}
        <nav aria-label="Progress" className="w-full sm:w-auto">
          <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1;
              const StepIcon = step.icon;

              let pillStyles = "";
              let iconBadge = null;

              if (step.status === "completed") {
                pillStyles = "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70";
                iconBadge = (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                );
              } else if (step.status === "current") {
                pillStyles = "bg-[#0A0082]/10 text-[#0A0082] border-[#0A0082]/30 font-bold shadow-2xs";
                iconBadge = (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0A0082] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0A0082]" />
                  </span>
                );
              } else if (step.status === "in_progress") {
                pillStyles = "bg-indigo-50 text-indigo-900 border-indigo-300 font-semibold animate-pulse";
                iconBadge = (
                  <span className="relative flex h-2 w-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-indigo-600" />
                  </span>
                );
              } else {
                pillStyles = "bg-slate-50 text-slate-400 border-slate-200/80";
                iconBadge = (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                );
              }

              const pillContent = (
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${pillStyles}`}
                >
                  {iconBadge}
                  <span className="tabular-nums text-[10px] font-semibold opacity-70">
                    {step.number}.
                  </span>
                  <span className="font-medium whitespace-nowrap">
                    {step.shortLabel}
                  </span>
                </div>
              );

              return (
                <li key={step.id} className="flex items-center gap-1.5 sm:gap-2">
                  {step.linkTo && step.status === "completed" ? (
                    <Link
                      to={step.linkTo}
                      title={`Review ${step.label}`}
                      className="inline-block transition-transform hover:scale-[1.02]"
                    >
                      {pillContent}
                    </Link>
                  ) : (
                    pillContent
                  )}

                  {!isLast && (
                    <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
