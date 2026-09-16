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
 * "Send for Approval" is a navigation link into the invoice detail page, not a direct API call
 * from the row — shown for OCR_REVIEW_PENDING (review/edit the invoice there; saving is what
 * actually advances it, per apply_ocr_review) and for PENDING_APPROVAL (review already saved but
 * not yet sent — the detail page's InvoiceApprovalPanel has the real Send for Approval button and
 * live approval timeline). It used to fire POST .../send-for-approval directly from a confirm
 * dialog on this row, but the backend's send-for-approval route only accepts an invoice that's
 * already Pending Approval — an OCR_REVIEW_PENDING invoice would always 422 there, and even for
 * an eligible one, jumping straight to the API call skipped the chance to review/correct fields
 * first (see InvoiceReviewEditor on the detail page).
 */
export default function InvoiceRowActions({ invoice }) {
  const { canReviewOcr, canApproveInvoice, canSendForApproval } = useApPermissions();

  const needsOcrReview = invoice.status === INVOICE_STATUS.OCR_FAILED;
  const needsApproval = invoice.status === INVOICE_STATUS.PENDING_APPROVAL;
  const canSendForApprovalNow =
    invoice.status === INVOICE_STATUS.OCR_REVIEW_PENDING || invoice.status === INVOICE_STATUS.PENDING_APPROVAL;

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
    </div>
  );
}
