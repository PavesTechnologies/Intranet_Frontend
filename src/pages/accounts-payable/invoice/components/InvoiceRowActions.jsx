import { Link } from "react-router-dom";
import { OCR_REVIEW_QUEUE_STATUSES, INVOICE_STATUS } from "../../constants/invoiceStatus";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";

/**
 * Row actions depend on the invoice's current lifecycle status. OCR correction happens in the
 * OCR Review Queue (keyed by inbound_document_id, not this invoice_id), so that quick link routes
 * there rather than to the detail page — the detail page's OCR card is read-only. There's no
 * standalone Validation action anymore (see constants/invoiceStatus.js).
 */
export default function InvoiceRowActions({ invoice }) {
  const { canReviewOcr, canApproveInvoice } = useApPermissions();

  const needsOcrReview = OCR_REVIEW_QUEUE_STATUSES.includes(invoice.status);
  const needsApproval = invoice.status === INVOICE_STATUS.PENDING_APPROVAL;

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
      {needsApproval && canApproveInvoice && (
        <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="text-emerald-700 hover:underline">
          Approve
        </Link>
      )}
    </div>
  );
}
