import React, { useState } from "react";
import { X, Wallet, FileText, Layers, CheckCircle2, ShieldCheck, Calendar, Receipt, User } from "lucide-react";
import Button from "@/components/Button/Button";
import StatusBadge from "@/components/status/statusbadge";
import InvoiceHandoffBadge from "@/pages/expense-management/components/expense-reports/InvoiceHandoffBadge";
import PolicyStatusBadge from "@/pages/expense-management/components/expense-reports/PolicyStatusBadge";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "@/components/toastfy/toast";
import EmployeeLabel from "../../../approval-engine/components/EmployeeLabel";
import ApprovalStatusPill from "../../../approval-engine/components/ApprovalStatusPill";
import ApprovalProgressLevels from "../../../approval-engine/components/ApprovalProgressLevels";
import { formatMoney, formatDate } from "../../../approval-engine/constants/approvalLabels";
import { useApPaymentDetails, useCompletePayment } from "../hooks/useApPayments";

const Section = ({ icon: Icon, title, aside, children, className = "" }) => (
  <section className={`rounded-xl border border-gray-200 bg-white ${className}`}>
    <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Icon className="h-4 w-4 text-gray-400" />
        {title}
      </h3>
      {aside}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const Field = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
    <dd className="mt-0.5 break-words text-sm font-medium text-gray-800">{children ?? "—"}</dd>
  </div>
);

const SummaryStat = ({ icon: Icon, label, children }) => (
  <div className="flex min-w-0 items-start gap-2.5">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 text-indigo-700 ring-1 ring-indigo-100">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-900/60">{label}</p>
      <div className="truncate text-sm font-semibold text-gray-900">{children}</div>
    </div>
  </div>
);

const BreakdownRow = ({ label, value, hint, strong, negative }) => (
  <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? "border-t border-gray-200 pt-2.5" : ""}`}>
    <div className="min-w-0">
      <p className={`text-sm ${strong ? "font-semibold text-gray-900" : "text-gray-600"}`}>{label}</p>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
    <p
      className={`shrink-0 font-mono text-sm ${
        strong ? "text-base font-bold text-emerald-700" : negative ? "text-rose-600" : "font-medium text-gray-800"
      }`}
    >
      {value}
    </p>
  </div>
);

const showForeign = (line) => line.currencyCode && line.baseCurrencyCode && line.currencyCode !== line.baseCurrencyCode;

/**
 * The AP Executive's "open a report" detail/action view - same full-screen-overlay shape as
 * ExpenseReviewPanel/FinanceReviewPanel (header + scrollable body + sticky action bar). Sourced
 * from a single GET /xms/ap-payments/{reportId} call - ApPaymentDetailsResponse composes the
 * report, its line items, and the approval-status read model (including the per-level approval
 * progress) in one response.
 * <p>
 * Layout: what is being paid and to whom up top; the line items and report details in the main
 * column; how the amount was reached and who approved it alongside; the payment action pinned to
 * the bottom with the amount repeated, so the AP Executive confirms exactly what they read.
 */
export default function ApPaymentReviewPanel({ isOpen, onClose, reportId, queueItem }) {
  const [confirming, setConfirming] = useState(false);
  const { data: details, isLoading } = useApPaymentDetails(isOpen ? reportId : null);
  const completePayment = useCompletePayment();

  if (!isOpen) return null;

  const report = details?.report || queueItem;
  const lineItems = details?.lineItems || queueItem?.lineItems || queueItem?.pendingLineItems || [];
  const approvalStatus = details?.approvalStatus;

  const reportNumber = queueItem?.reportNumber || report?.reportNumber || report?.reportId;
  const employeeId = queueItem?.employeeId || report?.employeeId;
  const title = report?.title || queueItem?.title;
  const businessPurpose = report?.businessPurpose || queueItem?.businessPurpose;
  const costCenterName = queueItem?.costCenterName || queueItem?.costCenter || report?.costCenterName || report?.costCenter;
  const totalAmount = queueItem?.totalAmount ?? queueItem?.amount ?? report?.totalAmount ?? report?.amount;
  // Report totals are in the base currency (queue items and report.baseCurrencyCode say so).
  const currencyCode = queueItem?.currencyCode || report?.baseCurrencyCode || report?.currencyCode || "INR";
  // Tax breakdown in base currency. The employee is paid the gross less cash advance adjustments;
  // recoverable tax is claimed back by the company and never reduces reimbursement.
  const sumLines = (pick) => lineItems.reduce((sum, l) => sum + (Number(pick(l)) || 0), 0);
  const taxTotal = queueItem?.taxAmount ?? sumLines((l) => l.tax?.baseTaxAmount);
  const recoverableTotal = queueItem?.recoverableTaxAmount ?? sumLines((l) => l.tax?.baseRecoverableTaxAmount);
  const reimbursableAmount = queueItem?.reimbursableAmount ?? report?.reimbursableAmount ?? totalAmount;
  const advanceAdjustment = Number(totalAmount) - Number(reimbursableAmount);
  const approvedAt = queueItem?.approvedAt || report?.approvedAt || queueItem?.createdAt || queueItem?.submittedAt || report?.createdAt;
  const reportStatus = approvalStatus?.reportStatus || queueItem?.reportStatus || report?.reportStatus || "APPROVED";
  // Real PaymentRoutingStatus values: NONE, APPROVED_FOR_PAYMENT, PAYMENT_COMPLETED,
  // INVOICE_HANDOFF_PENDING, INVOICE_HANDOFF_COMPLETED, HANDOFF_FAILED - "PENDING" is not one of
  // them and must never be treated as a stand-in for "payable".
  const paymentRoutingStatus = queueItem?.paymentRoutingStatus || report?.paymentRoutingStatus || "NONE";
  const invoiceHandoffStatus = queueItem?.invoiceHandoffStatus || report?.invoiceHandoffStatus;
  const policyFlagged = lineItems.filter((l) => (l.policyWarnings || []).length > 0).length;

  const canComplete = paymentRoutingStatus === "APPROVED_FOR_PAYMENT";
  const isPaid = paymentRoutingStatus === "PAYMENT_COMPLETED";

  const handleConfirmPayment = () => {
    completePayment.mutate(reportId, {
      onSuccess: () => {
        showStatusToast("Payment marked as completed", "success");
        setConfirming(false);
        onClose();
      },
      onError: (err) => {
        showStatusToast(err.response?.data?.message || "Failed to complete payment", "error");
        setConfirming(false);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-gray-900">{reportNumber || "Expense Report"}</h2>
            <ApprovalStatusPill status={reportStatus} />
            {paymentRoutingStatus && paymentRoutingStatus !== "NONE" && <StatusBadge label={paymentRoutingStatus} size="sm" />}
          </div>
          {title && <p className="mt-0.5 truncate text-sm text-gray-500">{title}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {isPaid && (
        <div className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 sm:px-6">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Payment completed for this report. No further action is needed.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6">
          {/* Summary: what is being paid, to whom */}
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-900/60">
                  {isPaid ? "Paid to employee" : "Amount to pay employee"}
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 sm:text-3xl">{formatMoney(reimbursableAmount, currencyCode)}</p>
                {advanceAdjustment > 0.004 && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatMoney(totalAmount, currencyCode)} claimed, less {formatMoney(advanceAdjustment, currencyCode)} cash advance
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[560px]">
                <SummaryStat icon={User} label="Employee">
                  <EmployeeLabel employeeId={employeeId} />
                </SummaryStat>
                <SummaryStat icon={Calendar} label="Approved on">
                  {formatDate(approvedAt)}
                </SummaryStat>
                <SummaryStat icon={Layers} label="Line items">
                  {lineItems.length || report?.lineItemCount || "—"}
                  {policyFlagged > 0 && <span className="ml-1.5 text-xs font-medium text-amber-700">· {policyFlagged} policy-flagged</span>}
                </SummaryStat>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Main column */}
            <div className="space-y-4 lg:col-span-2">
              <Section icon={Layers} title={`Line Items (${lineItems.length})`}>
                {isLoading && lineItems.length === 0 ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                    ))}
                  </div>
                ) : lineItems.length === 0 ? (
                  <p className="text-sm text-gray-400">No line items.</p>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="-mx-4 hidden md:block">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          <tr>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Expense</th>
                            <th className="px-4 py-2 text-right">Amount</th>
                            <th className="px-4 py-2 text-right">Tax</th>
                            <th className="px-4 py-2">Policy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lineItems.map((line) => (
                            <tr key={line.lineItemId} className="align-top">
                              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(line.expenseDate)}</td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{line.merchantName || "—"}</p>
                                <p className="text-xs text-gray-500">
                                  {line.categoryName || "Uncategorised"}
                                  {line.costCenterName && line.costCenterName !== costCenterName ? ` · ${line.costCenterName}` : ""}
                                </p>
                                {line.description && <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{line.description}</p>}
                                {line.clientBillable && (
                                  <span className="mt-1 inline-flex rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                                    Billable{line.resolvedClientName || line.projectName ? ` · ${line.resolvedClientName || line.projectName}` : ""}
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                                <p className="font-semibold text-gray-900">{formatMoney(line.baseAmount ?? line.amount, line.baseCurrencyCode || line.currencyCode)}</p>
                                {showForeign(line) && <p className="text-[11px] text-gray-400">{formatMoney(line.amount, line.currencyCode)}</p>}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-gray-700">
                                {line.taxAmount != null && Number(line.taxAmount) > 0 ? (
                                  <>
                                    <p>{formatMoney(line.taxAmount, line.currencyCode)}</p>
                                    {line.tax?.taxCode && <p className="text-[11px] text-gray-400">{line.tax.taxCode}</p>}
                                  </>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <PolicyStatusBadge lineStatus={line.lineStatus} policyWarnings={line.policyWarnings} audience="reviewer" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="space-y-2 md:hidden">
                      {lineItems.map((line) => (
                        <div key={line.lineItemId} className="rounded-lg border border-gray-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900">{line.merchantName || "—"}</p>
                              <p className="text-xs text-gray-500">
                                {line.categoryName || "Uncategorised"} · {formatDate(line.expenseDate)}
                              </p>
                            </div>
                            <p className="shrink-0 font-mono text-sm font-semibold text-gray-900">
                              {formatMoney(line.baseAmount ?? line.amount, line.baseCurrencyCode || line.currencyCode)}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            {line.taxAmount != null && Number(line.taxAmount) > 0 && (
                              <span>
                                Tax {formatMoney(line.taxAmount, line.currencyCode)}
                                {line.tax?.taxCode ? ` · ${line.tax.taxCode}` : ""}
                              </span>
                            )}
                            <PolicyStatusBadge lineStatus={line.lineStatus} policyWarnings={line.policyWarnings} audience="reviewer" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Section>

              <Section icon={FileText} title="Report Details">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Employee">
                    <EmployeeLabel employeeId={employeeId} showIdSubtext />
                  </Field>
                  <Field label="Report number">{reportNumber}</Field>
                  <Field label="Cost center">{costCenterName}</Field>
                  <Field label="Submitted on">{formatDate(report?.submittedAt)}</Field>
                  <Field label="Approved on">{formatDate(approvedAt)}</Field>
                  <Field label="Fiscal year">{report?.fiscalYear}</Field>
                  {businessPurpose && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Field label="Business purpose">{businessPurpose}</Field>
                    </div>
                  )}
                </dl>
              </Section>
            </div>

            {/* Side column */}
            <div className="space-y-4">
              <Section icon={Wallet} title="Payment Breakdown">
                <BreakdownRow label="Total claimed" hint="Gross, including tax" value={formatMoney(totalAmount, currencyCode)} />
                {advanceAdjustment > 0.004 && (
                  <BreakdownRow label="Less cash advance" hint="Already paid out in advance" value={`− ${formatMoney(advanceAdjustment, currencyCode)}`} negative />
                )}
                <BreakdownRow label="Reimbursable to employee" value={formatMoney(reimbursableAmount, currencyCode)} strong />
                <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Tax (included above)</p>
                  <BreakdownRow label="Total tax" value={formatMoney(taxTotal, currencyCode)} />
                  <BreakdownRow label="Recoverable (ITC)" hint="Claimed back by the company" value={formatMoney(recoverableTotal, currencyCode)} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                  <Field label="Currency">{currencyCode}</Field>
                  <Field label="Payment status">
                    <StatusBadge label={paymentRoutingStatus} size="sm" />
                  </Field>
                  {invoiceHandoffStatus && invoiceHandoffStatus !== "NOT_APPLICABLE" && (
                    <div className="col-span-2">
                      <Field label="Client invoice">
                        <InvoiceHandoffBadge status={invoiceHandoffStatus} />
                      </Field>
                    </div>
                  )}
                </dl>
              </Section>

              <Section
                icon={ShieldCheck}
                title="Approval Progress"
                aside={
                  approvalStatus?.levels?.length ? (
                    <span className="text-xs text-gray-400">
                      {approvalStatus.levels.length} level{approvalStatus.levels.length > 1 ? "s" : ""}
                    </span>
                  ) : null
                }
              >
                {approvalStatus?.levels?.length ? (
                  <ApprovalProgressLevels levels={approvalStatus.levels} reportStatus={reportStatus} />
                ) : isLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {approvalStatus?.totalLevels ? `${approvalStatus.totalLevels} approval levels completed.` : "No approval details available."}
                  </p>
                )}
              </Section>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      {canComplete && (
        <div className="sticky bottom-0 shrink-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-sm text-gray-600">
              <Receipt className="h-4 w-4 shrink-0 text-gray-400" />
              <span>
                Pay <span className="font-semibold text-gray-900">{formatMoney(reimbursableAmount, currencyCode)}</span> to{" "}
                <EmployeeLabel employeeId={employeeId} className="font-semibold text-gray-900" />
              </span>
            </p>
            <Button variant="success" disabled={completePayment.isPending} onClick={() => setConfirming(true)}>
              <CheckCircle2 className="h-4 w-4" /> Complete Payment
            </Button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirming}
        title="Complete Payment"
        message={`Mark ${reportNumber || "this report"} (${formatMoney(reimbursableAmount, currencyCode)} to the employee) as paid? This cannot be undone.`}
        confirmText="Complete Payment"
        cancelText="Cancel"
        variant="success"
        isLoading={completePayment.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
}
