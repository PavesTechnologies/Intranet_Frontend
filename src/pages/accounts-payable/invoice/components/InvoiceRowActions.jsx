import { Link } from "react-router-dom";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";

/**
 * Row actions depend on the invoice's current lifecycle status.
 *
 * "OCR Review" (only for OCR_FAILED — a real extraction failure) still links to the separate OCR
 * Review Queue, keyed by inbound_document_id rather than invoice_id.
 *
 * "Edit & Review" (RETURNED_FOR_REVIEW only) and "Send for Approval" (OCR_REVIEWED only) are
 * both navigation links into the invoice detail page, not direct API calls from the row — the
 * detail page's InvoiceReviewEditor/InvoiceApprovalPanel own the actual PATCH/POST calls. It
 * used to fire POST .../send-for-approval directly from a confirm dialog on this row, but the
 * backend's send-for-approval route only accepts an invoice that's already reviewed — jumping
 * straight to the API call skipped the chance to review/correct fields first, which for a
 * Returned invoice is the entire point of the action.
 *
 * OCR_REVIEWED vs. PENDING_APPROVAL is now a real, distinct status transition performed by
 * send_for_approval itself (see InvoiceApprovalService) — OCR_REVIEWED means "reviewed, not yet
 * sent", PENDING_APPROVAL means "sent, awaiting a decision", so each status maps to exactly one
 * of Send for Approval / Approve, no extra flag needed to tell them apart.
 *
 * "Mark Ready" (APPROVED) and "Pay" (READY_FOR_PAYMENT / PARTIALLY_PAID) are Finance's payment
 * readiness/execution actions — the former navigates to the detail page's InvoicePaymentPanel
 * (a confirm dialog, not a bare click-to-mutate row action), the latter straight to the existing
 * Mark as Paid form.
 */
export default function InvoiceRowActions({ invoice }) {
  const { canReviewOcr, canApproveInvoice, canSendForApproval, canMarkPaid } = useApPermissions();

  const needsOcrReview = invoice.status === INVOICE_STATUS.OCR_FAILED;
  const needsReturnedEdit = invoice.status === INVOICE_STATUS.RETURNED_FOR_REVIEW;
  const needsApproval = invoice.status === INVOICE_STATUS.PENDING_APPROVAL;
  const canSendForApprovalNow = invoice.status === INVOICE_STATUS.OCR_REVIEWED;
  const canOfferMarkReady = invoice.status === INVOICE_STATUS.APPROVED;
  const canOfferPay =
    invoice.status === INVOICE_STATUS.READY_FOR_PAYMENT || invoice.status === INVOICE_STATUS.PARTIALLY_PAID;

  return (
    <div className="flex items-center justify-center gap-3 text-xs font-medium whitespace-nowrap">
      <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="text-[#0A0082] hover:underline">
        View
      </Link>
      {needsOcrReview && canReviewOcr && (
        <Link to={AP_ROUTES.INVOICE_OCR_REVIEW} className="text-blue-700 hover:underline">
          OCR Review
        </Link>
      )}
      {needsReturnedEdit && canReviewOcr && (
        <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="text-amber-700 hover:underline">
          Edit & Review
        </Link>
      )}
      {canSendForApprovalNow && canSendForApproval && (
        <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="text-blue-700 hover:underline">
          Send for Approval
        </Link>
      )}
      {needsApproval && canApproveInvoice && (
        <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="text-emerald-700 hover:underline">
          Approve
        </Link>
      )}
      {canOfferMarkReady && canMarkPaid && (
        <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="text-indigo-700 hover:underline">
          Mark Ready
        </Link>
      )}
      {canOfferPay && canMarkPaid && (
        <Link to={AP_ROUTES.PAYMENT_MARK_PAID(invoice.id)} className="text-indigo-700 hover:underline">
          Pay
        </Link>
      )}
    </div>
  );
}
