// src/pages/Projects/manager/milestones/ArBillingReadinessPanel.jsx
import React, { useState } from "react";
import {
  FileCheck,
  Receipt,
  DollarSign,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { formatINR } from "./mockMilestoneData";
import {
  ApprovalStatusBadge,
  BillingReadinessBadge,
} from "./MilestoneStatusBadges";

export default function ArBillingReadinessPanel({
  milestones = [],
  projectId = 101,
  projectName = "Enterprise Digital Core Transformation",
  onSelectMilestone,
  onTriggerInvoiceSimulation,
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Group milestones by billing readiness
  const invoicedCount = milestones.filter((m) => m.billingReadiness === "INVOICED").length;
  const eligibleCount = milestones.filter((m) => m.billingReadiness === "ELIGIBLE").length;
  const awaitingCount = milestones.filter((m) => m.billingReadiness === "AWAITING_APPROVAL").length;
  const notEligibleCount = milestones.filter((m) => m.billingReadiness === "NOT_ELIGIBLE").length;

  const totalBillableValue = milestones
    .filter((m) => m.billingReadiness === "ELIGIBLE" || m.billingReadiness === "INVOICED")
    .reduce((sum, m) => sum + (Number(m.billingAmount) || 0), 0);

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50/70 p-5 shadow-sm space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-indigo-100/70 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <DollarSign className="h-4 w-4" />
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              AR Billing Readiness Integration
            </h4>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
              Architecture Preview
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Demonstrates how PMS project milestone sign-offs map into Accounts Receivable (AR) Fixed Price / Milestone-Based billing schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 block font-medium">Authorized / Invoiced Value</span>
            <span className="text-xs font-bold text-slate-900">{formatINR(totalBillableValue)}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm"
            title={isExpanded ? "Collapse AR Readiness" : "Expand AR Readiness"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Architecture Boundary Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span>PMS Responsibility: Project Delivery & Sign-off</span>
              </div>
              <p className="text-blue-800 leading-relaxed">
                PMS owns milestone scheduling, epic linking, deliverable tracking, internal PM approval, and formal client acceptance certificate logging.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                <span>AR Responsibility: Commercial Billing & Invoicing</span>
              </div>
              <p className="text-emerald-800 leading-relaxed">
                AR ingests completed & authorized milestones, creates immutable billing snapshots, applies tax matrices, generates customer invoices, and tracks receivables.
              </p>
            </div>
          </div>

          {/* Readiness Status Matrix Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Milestone Code</th>
                    <th className="py-2.5 px-3">Milestone Name</th>
                    <th className="py-2.5 px-3">Completion Date</th>
                    <th className="py-2.5 px-3 text-right">Allocation</th>
                    <th className="py-2.5 px-3 text-center">Approval State</th>
                    <th className="py-2.5 px-3 text-center">AR Ingestion Readiness</th>
                    <th className="py-2.5 px-3">Invoice Association</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {milestones.map((m) => {
                    const isEligible = m.billingReadiness === "ELIGIBLE";
                    const isInvoiced = m.billingReadiness === "INVOICED";

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                          {m.code}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <button
                            type="button"
                            onClick={() => onSelectMilestone(m)}
                            className="hover:underline text-left"
                          >
                            {m.name}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {m.actualCompletionDate || (
                            <span className="text-slate-400 italic">Planned: {m.plannedCompletionDate}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatINR(m.billingAmount)}
                          <span className="ml-1 text-[11px] font-normal text-slate-500">
                            ({m.billingPercentage}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <ApprovalStatusBadge status={m.approvalStatus} />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <BillingReadinessBadge status={m.billingReadiness} />
                        </td>
                        <td className="py-2.5 px-3">
                          {isInvoiced ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                              <Receipt className="h-3 w-3" />
                              {m.invoiceNumber}
                            </span>
                          ) : isEligible ? (
                            <span className="text-[11px] text-indigo-600 font-semibold">
                              Ready for AR Occurrence
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Pending sign-off
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {isEligible ? (
                            <button
                              type="button"
                              onClick={() => onTriggerInvoiceSimulation(m)}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                            >
                              <Receipt className="h-3 w-3" />
                              Simulate Invoice
                            </button>
                          ) : isInvoiced ? (
                            <span className="text-[11px] text-emerald-700 font-medium">Invoiced</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectMilestone(m)}
                              className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
