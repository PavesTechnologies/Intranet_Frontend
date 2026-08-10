import { Link } from "react-router-dom";
import { OCR_REVIEW_QUEUE_STATUSES, VALIDATION_QUEUE_STATUSES } from "../../constants/invoiceStatus";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";

/**
 * Row actions depend on the invoice's current lifecycle status — an invoice already Paid only
 * gets "View"; one awaiting OCR review additionally gets "OCR Review", etc. Both routes point
 * to the same InvoiceDetailPage — the detail page itself renders the OCR/Validation workspace
 * panel based on the invoice's status, so there's no separate review-only route.
 */
export default function InvoiceRowActions({ invoice }) {
  const { canReviewOcr, canValidateInvoice } = useApPermissions();

  const needsOcrReview = OCR_REVIEW_QUEUE_STATUSES.includes(invoice.status);
  const needsValidation = VALIDATION_QUEUE_STATUSES.includes(invoice.status);

  return (
    <div className="flex items-center justify-center gap-3 text-xs font-medium whitespace-nowrap">
      <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="text-[#0A0082] hover:underline">
        View
      </Link>
      {needsOcrReview && canReviewOcr && (
        <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="text-blue-700 hover:underline">
          OCR Review
        </Link>
      )}
      {needsValidation && canValidateInvoice && (
        <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="text-amber-700 hover:underline">
          Validation
        </Link>
      )}
    </div>
  );
}
