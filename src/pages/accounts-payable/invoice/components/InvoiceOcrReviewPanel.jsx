import { toast } from "react-toastify";
import { Eye } from "lucide-react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import { invoiceService } from "../services/invoiceService";
import { getApiErrorMessage } from "../../utils/apiError";

/**
 * Read-only OCR/processing summary for an already-persisted invoice. Field-level correction now
 * happens in the OCR Review Queue (InvoiceOcrReviewQueuePage + OcrReviewModal), which operates on
 * inbound_document_id — a queue item may not have an invoice_id at all yet (Path B: extracted,
 * no vendor match), so that flow can't live on this invoice-keyed detail page. There's also no
 * endpoint that returns the original extracted field set or a confidence score for a persisted
 * invoice, so this card only shows what InvoiceDetailsResponse actually carries.
 */
export default function InvoiceOcrReviewPanel({ invoice }) {
  const handleView = async () => {
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
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">OCR / Processing</h3>
          <Button variant="outline" size="small" onClick={handleView} disabled={!invoice.inboundDocumentId}>
            <Eye className="h-3.5 w-3.5" /> View source document
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Inbound document #{invoice.inboundDocumentId ?? "—"}. Field-level OCR corrections happen
          in the OCR Review Queue before an invoice reaches this stage.
        </p>
      </PageCardContent>
    </PageCard>
  );
}
