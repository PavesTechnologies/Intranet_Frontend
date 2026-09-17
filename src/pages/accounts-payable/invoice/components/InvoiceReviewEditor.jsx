import { toast } from "react-toastify";
import { Eye } from "lucide-react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import InvoiceReviewFieldsForm from "./InvoiceReviewFieldsForm";
import { useInvoiceReviewForm } from "../hooks/useInvoiceReviewForm";
import { invoiceService } from "../services/invoiceService";
import { getApiErrorMessage } from "../../utils/apiError";

/**
 * Inline "confirm and correct" form shown on the invoice detail page while an invoice is still
 * OCR Review Pending — the AP executive reviews/edits here instead of being routed to a separate
 * OCR Review Queue screen for the same data. Saving goes through the same PATCH .../ocr-review
 * endpoint the queue uses, which — per apply_ocr_review — unconditionally advances the invoice
 * past this stage (to Pending Approval, or straight to Approved if it auto-qualifies). Once that
 * happens this editor stops rendering (InvoiceDetailPage swaps it for the read-only
 * InvoiceOcrReviewPanel) and the "Send for Approval" action becomes available below.
 *
 * GET /invoice-details/invoice/{id} doesn't return vendor_id/currency_id/po_id/payment_term_id/
 * department_id/purchase_category_id — only vendor_name is available as display text. Every
 * field on the review PATCH is optional and the backend only overwrites a field when a non-null
 * value is submitted (see useInvoiceReviewForm), so those fields are safe to leave blank here:
 * doing so simply preserves whatever's already on the invoice. What IS known from the invoice
 * itself (number, type, dates, amounts) is pre-filled.
 */
export default function InvoiceReviewEditor({ invoice }) {
  const review = useInvoiceReviewForm({
    inboundDocumentId: invoice.inboundDocumentId,
    invoiceId: invoice.id,
    initial: {
      form: {
        invoice_number: invoice.invoiceNumber || "",
        invoice_type: invoice.invoiceType || "",
        invoice_date: invoice.invoiceDate || "",
        due_date: invoice.dueDate || "",
        gross_amount: invoice.grossAmount ?? "",
        discount_amount: invoice.discountAmount ?? "",
        tax_amount: invoice.taxAmount ?? "",
        net_amount: invoice.netAmount ?? "",
      },
    },
  });

  const handleViewDocument = async () => {
    if (!invoice.inboundDocumentId) {
      toast.info("Source document is not available for this invoice.");
      return;
    }
    try {
      const { blob, contentType } = await invoiceService.viewInvoice(invoice.inboundDocumentId);
      const url = URL.createObjectURL(new Blob([blob], { type: contentType || "application/pdf" }));
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load the source document."));
    }
  };

  return (
    <PageCard>
      <PageCardContent>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-700">Review & Confirm Invoice Details</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="small" onClick={handleViewDocument} disabled={!invoice.inboundDocumentId}>
              <Eye className="h-3.5 w-3.5" /> View source document
            </Button>
            <Button variant="primary" size="small" onClick={review.handleSave} loading={review.isSaving}>
              Save Details
            </Button>
          </div>
        </div>
        <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Vendor, currency, PO, payment term, department, and purchase category aren't returned by
          this page's data yet, so those start blank below — verify against the source document.
          Leaving any field blank keeps whatever is already saved on the invoice; it's only
          overwritten if you fill it in.
        </p>
        <InvoiceReviewFieldsForm review={review} vendorHint={invoice.vendor?.name} />
      </PageCardContent>
    </PageCard>
  );
}
