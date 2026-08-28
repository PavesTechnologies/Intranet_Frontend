import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye } from "lucide-react";
import { OCR_REVIEW_QUEUE_STATUSES, INVOICE_STATUS, INVOICE_STATUS_ID } from "../../constants/invoiceStatus";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useUpdateInvoiceStatusMutation } from "../hooks/useInvoiceMutations";
import { invoiceService } from "../services/invoiceService";
import { getApiErrorMessage } from "../../utils/apiError";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";

/** Opens the invoice's source document (PDF/image) in a new tab via a presigned blob URL. */
async function handleViewDocument(inboundDocumentId) {
  if (!inboundDocumentId) {
    toast.info("Source document is not available for this invoice.");
    return;
  }
  try {
    const { blob, contentType } = await invoiceService.viewInvoice(inboundDocumentId);
    const url = URL.createObjectURL(new Blob([blob], { type: contentType || "application/pdf" }));
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Could not load the source document."));
  }
}

/**
 * Row actions depend on the invoice's current lifecycle status. OCR correction happens in the
 * OCR Review Queue (keyed by inbound_document_id, not this invoice_id) for OCR_FAILED invoices,
 * so that link routes there. For OCR_REVIEW_PENDING invoices, "OCR Review" instead confirms and
 * then moves the invoice straight to Pending Approval via the status-update endpoint — there's no
 * field correction involved for that path. There's no standalone Validation action anymore (see
 * constants/invoiceStatus.js).
 */
export default function InvoiceRowActions({ invoice }) {
  const { canReviewOcr, canApproveInvoice } = useApPermissions();
  const [showMoveToApprovalConfirm, setShowMoveToApprovalConfirm] = useState(false);
  const updateStatus = useUpdateInvoiceStatusMutation();

  const needsOcrReview = OCR_REVIEW_QUEUE_STATUSES.includes(invoice.status);
  const needsApproval = invoice.status === INVOICE_STATUS.PENDING_APPROVAL;
  const canMoveToApproval = invoice.status === INVOICE_STATUS.OCR_REVIEW_PENDING;

  const handleMoveToApproval = () => {
    updateStatus.mutate(
      { invoiceId: invoice.id, statusId: INVOICE_STATUS_ID.PENDING_APPROVAL },
      {
        onSuccess: () => {
          toast.success(`${invoice.invoiceNumber} moved to Pending Approval.`);
          setShowMoveToApprovalConfirm(false);
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "Could not update invoice status."));
          setShowMoveToApprovalConfirm(false);
        },
      },
    );
  };

  return (
    <>
      <div className="flex items-center justify-center gap-3 text-xs font-medium whitespace-nowrap">
        <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="text-[#0A0082] hover:underline">
          View
        </Link>
        {needsOcrReview && canReviewOcr && (
          canMoveToApproval ? (
            <button
              type="button"
              onClick={() => setShowMoveToApprovalConfirm(true)}
              className="text-blue-700 hover:underline"
            >
              OCR Review
            </button>
          ) : (
            <Link to={AP_ROUTES.INVOICE_OCR_REVIEW} className="text-blue-700 hover:underline">
              OCR Review
            </Link>
          )
        )}
        {needsApproval && canApproveInvoice && (
          <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.id)} className="text-emerald-700 hover:underline">
            Approve
          </Link>
        )}
      </div>

      <ConfirmationModal
        isOpen={showMoveToApprovalConfirm}
        title="Move to Pending Approval"
        message={`Move invoice ${invoice.invoiceNumber} from OCR Review Pending to Pending Approval?`}
        confirmText="Move to Pending Approval"
        variant="primary"
        isLoading={updateStatus.isPending}
        onConfirm={handleMoveToApproval}
        onCancel={() => setShowMoveToApprovalConfirm(false)}
      >
        <button
          type="button"
          onClick={() => handleViewDocument(invoice.inboundDocumentId)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0A0082] hover:underline"
        >
          <Eye className="h-4 w-4" />
          Preview source document
        </button>
      </ConfirmationModal>
    </>
  );
}
