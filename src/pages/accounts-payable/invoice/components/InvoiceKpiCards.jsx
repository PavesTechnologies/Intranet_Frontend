import { CheckCircle2, Clock, CornerUpLeft, FileScan, FileText, IndianRupee, Send, ShieldCheck, Wallet } from "lucide-react";
import StatCard from "../../../../components/Cards/StatCard";
import { useInvoiceSummary } from "../hooks/useInvoiceSummary";
import { useApPermissions } from "../../hooks/useApPermissions";
import { QUEUE_TYPES } from "../../constants/queueTypes";
import { formatCurrency } from "../../utils/formatters";

/**
 * Invoice Management's cards - the counts the viewer acts on, in business words, each opening its tab.
 *   AP Executive   all invoices, to review, sent back for correction, waiting for approval, approved
 *   Approver       waiting for approval, approved, sent back / rejected
 *   Finance        approved (to release), ready for payment, paid this month
 * Real figures from invoiceService.getInvoiceSummary; "-" while loading or on error.
 */
export function cardsFor(permissions, data) {
  const c = data?.statusCounts || {};
  const finance = permissions.canMarkPaid || permissions.canVerifyTds || permissions.canViewPayment;
  const intake = permissions.canUploadInvoice || permissions.canReviewOcr;
  const approver = permissions.canApproveInvoice || permissions.canRejectInvoice || permissions.canSendBackInvoice;
  if (finance) {
    return [
      { key: "approved", title: "Approved - to release", value: c.approved, subtitle: "Verify TDS, then mark ready", icon: ShieldCheck, tone: "text-amber-700", queue: QUEUE_TYPES.APPROVED },
      { key: "ready", title: "Ready for payment", value: data?.readyForPaymentCount, subtitle: data ? formatCurrency(data.readyForPaymentBalance) : "", icon: Wallet, tone: "text-indigo-700", queue: QUEUE_TYPES.READY_FOR_PAYMENT },
      { key: "paid", title: "Paid this month", value: data?.paidThisMonthCount, subtitle: data ? formatCurrency(data.paidThisMonthAmount) : "", icon: IndianRupee, tone: "text-emerald-700", queue: QUEUE_TYPES.PAID },
      { key: "approval", title: "Waiting for approval", value: c.pendingApproval, subtitle: "Coming to you after approval", icon: Clock, queue: QUEUE_TYPES.APPROVAL },
    ];
  }
  if (intake) {
    return [
      { key: "total", title: "All invoices", value: c.total, subtitle: data ? `${data.totalInvoicesThisMonth} dated this month` : "", icon: FileText, queue: QUEUE_TYPES.ALL_INVOICES },
      { key: "review", title: "To review", value: c.toReview, subtitle: "Uploaded - check the details", icon: FileScan, tone: "text-indigo-700", queue: QUEUE_TYPES.OCR_REVIEW },
      { key: "returned", title: "Sent back for correction", value: c.returned, subtitle: "Fix and resubmit", icon: CornerUpLeft, tone: c.returned ? "text-rose-700" : undefined, queue: QUEUE_TYPES.APPROVAL },
      { key: "send", title: "Ready to send", value: c.readyToSend, subtitle: "Reviewed - send for approval", icon: Send, queue: QUEUE_TYPES.APPROVAL },
      { key: "approval", title: "Waiting for approval", value: c.pendingApproval, subtitle: "With the approvers", icon: Clock, tone: "text-amber-700", queue: QUEUE_TYPES.APPROVAL },
      { key: "approved", title: "Approved", value: c.approvedOrLater, subtitle: "Passed to Finance", icon: CheckCircle2, tone: "text-emerald-700", queue: QUEUE_TYPES.APPROVED },
    ];
  }
  if (approver) {
    return [
      { key: "approval", title: "Waiting for approval", value: c.pendingApproval, subtitle: "Approve, send back or reject", icon: Clock, tone: "text-amber-700", queue: QUEUE_TYPES.APPROVAL },
      { key: "approved", title: "Approved", value: c.approvedOrLater, subtitle: "Passed to Finance", icon: CheckCircle2, tone: "text-emerald-700", queue: QUEUE_TYPES.APPROVED },
      { key: "returned", title: "Sent back for correction", value: c.returned, subtitle: "With AP to fix", icon: CornerUpLeft, queue: QUEUE_TYPES.APPROVAL },
    ];
  }
  return [];
}

export default function InvoiceKpiCards({ onSelect, visibleQueues = [] }) {
  const permissions = useApPermissions() || {};
  const { data, isLoading, isError } = useInvoiceSummary();
  // A failed summary fetch (e.g. the caller lacks INVOICE_VIEW) must not crash the page - show "-".
  const showPlaceholder = isLoading || isError;
  const cards = cardsFor(permissions, showPlaceholder ? null : data);
  if (!cards.length) return null;

  return (
    <div className={`mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 ${cards.length > 4 ? "lg:grid-cols-3 xl:grid-cols-6" : cards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {cards.map((card) => {
        const clickable = onSelect && visibleQueues.includes(card.queue);
        const body = (
          <StatCard
            title={card.title}
            value={showPlaceholder || card.value == null ? "—" : card.value}
            subtitle={showPlaceholder ? "" : card.subtitle}
            icon={card.icon}
            textColor={card.tone}
          />
        );
        return clickable ? (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.queue)}
            className="rounded-xl text-left transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
            aria-label={`${card.title}: open the list`}
          >
            {body}
          </button>
        ) : (
          <div key={card.key}>{body}</div>
        );
      })}
    </div>
  );
}
