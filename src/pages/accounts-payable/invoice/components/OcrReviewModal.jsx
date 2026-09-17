import { useEffect, useState } from "react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import InvoiceReviewFieldsForm from "./InvoiceReviewFieldsForm";
import { useInvoiceReviewForm } from "../hooks/useInvoiceReviewForm";

/**
 * Correction form for one OCR review-queue item — Path A (already has an invoice_id, status
 * OCR_REVIEW_PENDING) or Path B (extracted, no vendor match, invoice_id still null). Both save
 * through the same endpoint, keyed by inbound_document_id, not invoice_id. Saving always ends
 * with the invoice at Pending Approval (see useInvoiceReviewForm) — actually sending it into the
 * approval workflow is a separate, later action on the invoice detail page.
 *
 * There's no "get full extracted fields" endpoint to pre-populate this form from — the review
 * queue row only carries a summary (file name, tentative invoice number/amount/confidence), so
 * the reviewer works from the source document (View Document) plus whatever the row already
 * shows, rather than a fully pre-filled form.
 */
export default function OcrReviewModal({ item, isOpen, onClose, onViewDocument }) {
  const [formKey, setFormKey] = useState(0);

  // Remount the form (fresh hook state) whenever a different queue item is opened — item swaps
  // are the only time initial values should re-hydrate.
  useEffect(() => {
    setFormKey((k) => k + 1);
  }, [item?.inbound_document_id]);

  if (!item) return null;

  return (
    <OcrReviewModalBody
      key={formKey}
      item={item}
      isOpen={isOpen}
      onClose={onClose}
      onViewDocument={onViewDocument}
    />
  );
}

function OcrReviewModalBody({ item, isOpen, onClose, onViewDocument }) {
  const review = useInvoiceReviewForm({
    inboundDocumentId: item.inbound_document_id,
    invoiceId: item.invoice_id,
    initial: {
      vendorId: item.vendor_id ?? null,
      form: {
        invoice_number: item.invoice_number || "",
        gross_amount: item.net_amount ?? "",
        net_amount: item.net_amount ?? "",
      },
    },
    onSaved: onClose,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review OCR extraction"
      subtitle={item.file_name || `Inbound document #${item.inbound_document_id}`}
      size="3xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => onViewDocument(item.inbound_document_id)}>
            View source document
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={review.handleSave} loading={review.isSaving}>
              Save review
            </Button>
          </div>
        </div>
      }
    >
      <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        The backend doesn't expose the full extracted field set for re-review — only the summary
        shown in the queue row. Verify against the source document before saving.
      </p>
      <InvoiceReviewFieldsForm review={review} />
    </Modal>
  );
}
