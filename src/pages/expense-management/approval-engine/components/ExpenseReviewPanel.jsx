import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Check,
  XCircle,
  MessageSquareWarning,
  Landmark,
  FileText,
  Wallet,
  User,
  Layers,
} from "lucide-react";
import Button from "@/components/Button/Button";
import { showStatusToast } from "@/components/toastfy/toast";
import { expenseReportService, lineItemService } from "@/pages/expense-management/api/expenseReportsApi";
import { PolicyResultBanner } from "@/pages/expense-management/components/expense-reports/PolicyStatusBadge";
import ApprovalStatusPill from "./ApprovalStatusPill";
import EmployeeLabel from "./EmployeeLabel";
import LineReviewStatusBadge, { deriveLineReviewState } from "./LineReviewStatusBadge";
import ApprovalLevelTimeline from "./ApprovalLevelTimeline";
import ReceiptViewer from "./ReceiptViewer";
import CommentPromptModal from "./CommentPromptModal";
import {
  useApprovalStatus,
  useLineItemReviews,
  useReviewLineItem,
  useReviewSplit,
  useRejectReport,
  useBulkApprove,
} from "../hooks/useApprovalWorkflow";
import { resolveApproverRelevantLines } from "../utils/approvalAmounts";
import { formatMoney, formatDate, formatDateTime } from "../constants/approvalLabels";

const normalizeViolations = (line) => {
  if (Array.isArray(line?.policyWarnings)) return line.policyWarnings;
  if (Array.isArray(line?.policyViolations)) return line.policyViolations.map((v) => ({ ...v, enforcementType: v.enforcementType || "WARN" }));
  return [];
};

const Section = ({ icon, title, children }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4">
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
      {icon}
      {title}
    </div>
    {children}
  </div>
);

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-0.5 text-sm font-medium text-gray-800 break-words">{value ?? "—"}</p>
  </div>
);

/**
 * The approver-facing "open a report/line item" review experience (spec §2, the main priority).
 * Rendered as a full-screen overlay from PendingApprovalsPage (mode="queue") and
 * ApprovalHistoryPage (mode="history") rather than a routed page, so no change to App.jsx's
 * router/role-gates is needed to make it reachable.
 *
 * Data sourcing is reuse-only:
 *  - useApprovalStatus / useLineItemReviews: same hooks ExpenseReportDetailPage.jsx already uses,
 *    drive the timeline + needs-correction banner.
 *  - lineItemService.getAll(reportId): best-effort full line-item list so the switcher can show
 *    every line (not just still-pending ones) with its resolved state. If this errors (an approver
 *    may not have the same read access as the report owner - untested against a live backend), the
 *    panel falls back to whatever line items it was already given (pendingLineItems in queue mode).
 *  - expenseReportService.getById(reportId): best-effort report-level fields (title, business
 *    purpose, cost center) the queue/history projections don't carry. Same graceful-fallback logic.
 */
export default function ExpenseReviewPanel({ isOpen, onClose, reportId, mode, queueItem, historyItem }) {
  const [selectedLineItemId, setSelectedLineItemId] = useState(null);
  const [flaggingLine, setFlaggingLine] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const { data: approvalStatus } = useApprovalStatus(isOpen ? reportId : null);
  const { data: lineItemReviews } = useLineItemReviews(isOpen ? reportId : null);
  const reviewLineItem = useReviewLineItem();
  const reviewSplit = useReviewSplit();
  const rejectReport = useRejectReport();
  const bulkApprove = useBulkApprove();

  const { data: fullReport } = useQuery({
    queryKey: ["expenseReviewReport", reportId],
    queryFn: () => expenseReportService.getById(reportId).then((res) => res.data?.data),
    enabled: isOpen && !!reportId,
    retry: 0,
    staleTime: 60_000,
  });

  const { data: fullLineItems } = useQuery({
    queryKey: ["expenseReviewLineItems", reportId],
    queryFn: async () => {
      const res = await lineItemService.getAll(reportId);
      const payload = res.data?.data;
      return Array.isArray(payload) ? payload : payload?.lineItems || payload?.content || payload?.data || [];
    },
    enabled: isOpen && !!reportId,
    retry: 0,
    staleTime: 30_000,
  });

  const reportStatus = historyItem?.reportStatus || fullReport?.reportStatus;
  const isQueueMode = mode === "queue";

  const lineItems = fullLineItems?.length ? fullLineItems : queueItem?.pendingLineItems || queueItem?.lineItems || queueItem?.items || queueItem?.pendingLines || [];

  // Split-aware amounts (queue mode only — history mode has no pendingSplits, so every line
  // resolves as a normal, full-amount line, unchanged from before). No extra API call: derived
  // entirely from queueItem.pendingSplits, already returned by the my-queue endpoint.
  const relevantByLineItem = useMemo(() => {
    const { relevantLines } = resolveApproverRelevantLines(lineItems, queueItem?.pendingSplits, queueItem?.costCenterName);
    const map = new Map();
    relevantLines.forEach((l) => map.set(l.lineItemId, l));
    return map;
  }, [lineItems, queueItem]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedLineItemId(null);
      return;
    }
    if (lineItems.length && !lineItems.some((l) => l.lineItemId === selectedLineItemId)) {
      setSelectedLineItemId(lineItems[0].lineItemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reportId, lineItems.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const reviewsByLineItem = useMemo(() => {
    const map = new Map();
    (lineItemReviews || []).forEach((r) => map.set(r.lineItemId, r));
    return map;
  }, [lineItemReviews]);

  const selectedLine = lineItems.find((l) => l.lineItemId === selectedLineItemId) || null;
  const selectedReview = selectedLine ? reviewsByLineItem.get(selectedLine.lineItemId) : null;
  const selectedViolations = normalizeViolations(selectedLine);
  // null when this line isn't the caller's responsibility at all (e.g. a different Cost Center
  // Owner's normal-track line) — the sticky action bar disables Approve/Needs Correction for it.
  const selectedRelevant = selectedLine ? relevantByLineItem.get(selectedLine.lineItemId) || null : null;

  const needsCorrectionLines = (lineItemReviews || []).filter((r) => r.status === "NEEDS_CORRECTION");

  const employeeId = queueItem?.employeeId || historyItem?.employeeId || fullReport?.employeeId;
  const reportNumber = queueItem?.reportNumber || historyItem?.reportNumber || fullReport?.reportNumber;
  const title = historyItem?.title || fullReport?.title;
  const businessPurpose = historyItem?.businessPurpose || fullReport?.businessPurpose;
  const costCenterName = queueItem?.costCenterName || queueItem?.costCenter || queueItem?.costCenterCode || queueItem?.departmentName || historyItem?.costCenterName || historyItem?.costCenter || fullReport?.costCenterName || fullReport?.costCenter;
  const submittedAt = queueItem?.submittedAt || queueItem?.createdAt || queueItem?.submittedDate || historyItem?.submittedAt || historyItem?.createdAt || fullReport?.submittedAt || fullReport?.createdAt;
  const totalAmount = queueItem?.totalAmount ?? historyItem?.totalAmount ?? fullReport?.totalAmount;
  const currencyCode = queueItem?.currencyCode || historyItem?.currencyCode || fullReport?.currencyCode;

  const isMutating = reviewLineItem.isPending || reviewSplit.isPending || rejectReport.isPending || bulkApprove.isPending;
  const canAct = isQueueMode && reportStatus !== "APPROVED" && reportStatus !== "REJECTED";
  // Not this caller's line at all (see selectedRelevant above) → nothing to act on, even though
  // canAct is true for the report as a whole.
  const canActOnSelected = canAct && !!selectedRelevant;

  if (!isOpen) return null;

  const handleApprove = () => {
    if (!selectedRelevant) return;
    const onError = (err) => showStatusToast(err.response?.data?.message || "Failed to approve", "error");
    if (selectedRelevant.isSplit) {
      Promise.all(
        selectedRelevant.mySplits.map((s) => reviewSplit.mutateAsync({ reportId, splitId: s.splitId, decision: "APPROVED" }))
      ).catch(onError);
      return;
    }
    reviewLineItem.mutate({ reportId, lineItemId: selectedRelevant.lineItemId, decision: "APPROVED" }, { onError });
  };

  const handleBulkApprove = () => {
    bulkApprove.mutate(reportId, {
      onSuccess: () => {
        showStatusToast("Report bulk-approved", "success");
        onClose();
      },
      onError: (err) => showStatusToast(err.response?.data?.message || "Bulk approve failed", "error"),
    });
  };

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-gray-900">{reportNumber || "Expense Report"}</h2>
            {reportStatus && <ApprovalStatusPill status={reportStatus} label={approvalStatus?.currentLevelDisplayName ? `Pending ${approvalStatus.currentLevelDisplayName}` : undefined} />}
          </div>
          {title && <p className="mt-0.5 truncate text-sm text-gray-500">{title}</p>}
        </div>
        <button type="button" onClick={onClose} className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </header>

      {needsCorrectionLines.length > 0 && (
        <div className="shrink-0 border-b border-orange-200 bg-orange-50 px-4 py-3 sm:px-6">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-orange-800">
            <MessageSquareWarning className="h-4 w-4" /> Awaiting correction from employee
          </p>
          <ul className="mt-1.5 space-y-1">
            {needsCorrectionLines.map((r) => {
              const line = lineItems.find((l) => l.lineItemId === r.lineItemId);
              return (
                <li key={r.reviewId} className="text-xs text-orange-700">
                  <span className="font-medium">{line?.merchantName || line?.categoryName || "Line item"}</span>
                  {r.comment ? `: "${r.comment}"` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <div className="h-[42vh] shrink-0 border-b border-gray-200 p-3 md:h-auto md:w-[42%] md:border-b-0 md:border-r md:p-4">
          <ReceiptViewer lineItemId={selectedLine?.lineItemId} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:w-[58%]">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {lineItems.length > 1 && (
              <Section icon={<Layers className="h-4 w-4 text-gray-400" />} title={`Line Items (${lineItems.length})`}>
                <div className="space-y-1.5">
                  {lineItems.map((line) => {
                    const review = reviewsByLineItem.get(line.lineItemId);
                    const state = deriveLineReviewState(review, normalizeViolations(line).length > 0);
                    const isSelected = line.lineItemId === selectedLineItemId;
                    const relevant = relevantByLineItem.get(line.lineItemId) || null;
                    const isNotMine = isQueueMode && !relevant;
                    return (
                      <button
                        key={line.lineItemId}
                        type="button"
                        onClick={() => setSelectedLineItemId(line.lineItemId)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isSelected ? "border-[#0A0082] bg-indigo-50" : "border-gray-200 hover:bg-gray-50"
                        } ${isNotMine ? "opacity-60" : ""}`}
                      >
                        <span className="min-w-0 truncate font-medium text-gray-800">
                          {line.merchantName || line.categoryName || "Line item"}
                          {relevant?.isSplit && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                              Split
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {formatMoney(relevant ? relevant.myAmount : line.amount, line.currencyCode)}
                          </span>
                          <LineReviewStatusBadge state={state} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section icon={<User className="h-4 w-4 text-gray-400" />} title="Employee Information">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Employee" value={<EmployeeLabel employeeId={employeeId} />} />
                <Field label="Report ID" value={reportNumber} />
                <Field label="Submitted" value={formatDate(submittedAt)} />
                <Field label="Cost Center" value={costCenterName} />
              </div>
              {businessPurpose && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <Field label="Business Purpose" value={businessPurpose} />
                </div>
              )}
            </Section>

            {selectedLine ? (
              <>
                <Section icon={<FileText className="h-4 w-4 text-gray-400" />} title="Expense Information">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Merchant" value={selectedLine.merchantName} />
                    <Field label="Category" value={selectedLine.categoryName} />
                    <Field label="Date" value={formatDate(selectedLine.expenseDate)} />
                    <Field
                      label="Line Status"
                      value={<LineReviewStatusBadge state={deriveLineReviewState(selectedReview, selectedViolations.length > 0)} />}
                    />
                  </div>
                  {selectedLine.description && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <Field label="Description" value={selectedLine.description} />
                    </div>
                  )}
                </Section>

                <Section icon={<Wallet className="h-4 w-4 text-gray-400" />} title="Amount">
                  {selectedRelevant?.isSplit ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Full Expense Amount" value={formatMoney(selectedRelevant.lineAmount, selectedLine.currencyCode)} />
                        <Field label="Report Total" value={formatMoney(totalAmount, currencyCode)} />
                      </div>
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
                          <Layers className="h-3.5 w-3.5" /> Split Allocation
                        </p>
                        {selectedRelevant.mySplits.map((s) => (
                          <p key={s.splitId} className="text-sm font-semibold text-indigo-700">
                            {s.costCenterName} — {formatMoney(s.allocatedAmount, selectedLine.currencyCode)}{" "}
                            <span className="text-xs font-normal text-indigo-500">(your allocation)</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Field label="Line Amount" value={formatMoney(selectedLine.amount, selectedLine.currencyCode)} />
                      {selectedLine.taxAmount != null && <Field label="Tax / GST" value={formatMoney(selectedLine.taxAmount, selectedLine.currencyCode)} />}
                      <Field label="Report Total" value={formatMoney(totalAmount, currencyCode)} />
                    </div>
                  )}
                  {isQueueMode && !selectedRelevant && (
                    <p className="mt-2 text-xs text-gray-400">
                      This line isn't part of your approval — shown for context only.
                    </p>
                  )}
                </Section>

                {selectedViolations.length > 0 && (
                  <PolicyResultBanner lineStatus={selectedLine.lineStatus} policyWarnings={selectedViolations} />
                )}
              </>
            ) : (
              <Section icon={<FileText className="h-4 w-4 text-gray-400" />} title="Expense Information">
                <p className="text-sm text-gray-400">No line item details available for this report.</p>
              </Section>
            )}

            <Section icon={<Landmark className="h-4 w-4 text-gray-400" />} title="Approval Progress">
              <ApprovalLevelTimeline reportId={reportId} reportStatus={reportStatus} />
            </Section>
          </div>

          {canAct && (
            <div className="sticky bottom-0 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-white p-3 sm:p-4">
              {queueItem?.eligibleForBulkApprove && (
                <Button variant="success" disabled={isMutating} loading={bulkApprove.isPending} onClick={handleBulkApprove}>
                  <Check className="h-4 w-4" /> Bulk Approve Report
                </Button>
              )}
              <Button variant="outline" disabled={isMutating || !canActOnSelected} onClick={() => setFlaggingLine(selectedRelevant)}>
                <MessageSquareWarning className="h-4 w-4" /> Request Correction
              </Button>
              <Button
                variant="success"
                disabled={isMutating || !canActOnSelected}
                loading={reviewLineItem.isPending || reviewSplit.isPending}
                onClick={handleApprove}
              >
                <Check className="h-4 w-4" /> {selectedRelevant?.isSplit ? "Approve My Allocation" : "Approve Line"}
              </Button>
              <Button variant="danger" disabled={isMutating} onClick={() => setIsRejecting(true)}>
                <XCircle className="h-4 w-4" /> Reject Report
              </Button>
            </div>
          )}
        </div>
      </div>

      <CommentPromptModal
        isOpen={!!flaggingLine}
        title="Request correction"
        description="The employee will see this comment and can fix just this line, without restarting the whole approval."
        contextLabel={
          flaggingLine
            ? `Correcting: ${flaggingLine.source?.merchantName || flaggingLine.source?.categoryName || "Line item"} — ${formatMoney(
                flaggingLine.myAmount,
                flaggingLine.currencyCode
              )}${flaggingLine.isSplit ? " (your allocation)" : ""}`
            : ""
        }
        confirmLabel="Request Correction"
        confirmVariant="danger"
        isLoading={reviewLineItem.isPending || reviewSplit.isPending}
        onCancel={() => setFlaggingLine(null)}
        onConfirm={(comment) => {
          const onSuccess = () => {
            showStatusToast("Flagged for correction", "success");
            onClose();
          };
          const onError = (err) => showStatusToast(err.response?.data?.message || "Failed to flag for correction", "error");
          if (flaggingLine.isSplit) {
            Promise.all(
              flaggingLine.mySplits.map((s) =>
                reviewSplit.mutateAsync({ reportId, splitId: s.splitId, decision: "NEEDS_CORRECTION", comment })
              )
            ).then(onSuccess).catch(onError);
          } else {
            reviewLineItem.mutate({ reportId, lineItemId: flaggingLine.lineItemId, decision: "NEEDS_CORRECTION", comment }, { onSuccess, onError });
          }
          setFlaggingLine(null);
        }}
      />

      <CommentPromptModal
        isOpen={isRejecting}
        title={`Reject report ${reportNumber || ""}`}
        description="This is a terminal decision under the configured approval workflow - the employee cannot resubmit this report. Use Request Correction on individual lines instead if the report just needs a fix."
        confirmLabel="Reject Report"
        confirmVariant="danger"
        isLoading={rejectReport.isPending}
        onCancel={() => setIsRejecting(false)}
        onConfirm={(comment) => {
          rejectReport.mutate(
            { reportId, comment },
            {
              onSuccess: () => {
                showStatusToast("Report rejected", "success");
                setIsRejecting(false);
                onClose();
              },
              onError: (err) => showStatusToast(err.response?.data?.message || "Failed to reject report", "error"),
            },
          );
        }}
      />
    </div>
  );
}
