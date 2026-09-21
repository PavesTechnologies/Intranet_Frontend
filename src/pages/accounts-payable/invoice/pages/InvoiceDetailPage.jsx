import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import StatusBadge from "../../../../components/status/statusbadge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Button from "../../../../components/Button/Button";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import InvoiceAmountSummary from "../components/InvoiceAmountSummary";
import InvoiceAttachmentList from "../components/InvoiceAttachmentList";
import InvoiceIssueList from "../components/InvoiceIssueList";
import InvoiceOcrReviewPanel from "../components/InvoiceOcrReviewPanel";
import InvoiceReviewEditor from "../components/InvoiceReviewEditor";
import InvoiceReturnedBanner from "../components/InvoiceReturnedBanner";
import InvoiceValidationPanel from "../components/InvoiceValidationPanel";
import InvoiceApprovalPanel from "../components/InvoiceApprovalPanel";
import InvoicePaymentPanel from "../components/InvoicePaymentPanel";
import InvoiceAuditHistory from "../components/InvoiceAuditHistory";
import { useInvoiceDetail } from "../hooks/useInvoiceDetail";
import { useApPermissions } from "../../hooks/useApPermissions";
import { AP_ROUTES } from "../../constants/routes";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import { formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";

/**
 * Single detail route for the whole invoice lifecycle. The OCR/Validation slot renders the
 * editable InvoiceReviewEditor for both OCR Review Pending AND Returned for Review (spec section
 * 13: same edit surface, entered from either stage) — reviewing and saving here (PATCH
 * .../ocr-review) is what advances it past whichever stage it's in, per apply_ocr_review always
 * ending at Pending Approval on a successful save. That editor is also gated on canReviewOcr —
 * the PATCH itself now requires INVOICE_OCR_REVIEW server-side, so a viewer without it would
 * otherwise see a fully editable form whose Save button just 403s; they get the read-only
 * InvoiceOcrReviewPanel instead, same as once it's moved past this stage entirely. Approval is
 * real, live data from its own endpoint; only its action buttons are stage-gated (Send for
 * Approval requires Pending Approval, not OCR Review Pending — the backend's send-for-approval
 * route itself rejects anything still at OCR Review Pending or Returned for Review).
 */
export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { canReviewOcr } = useApPermissions();
  const { data: invoice, isLoading, isError, error } = useInvoiceDetail(invoiceId);

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading invoice..." />
      </div>
    );
  }

  if (isError) {
    const notFound = error?.status === 404;
    return (
      <div className="p-6">
        <PageHeader title="Invoice Details" />
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-gray-700">
            {notFound ? "Invoice not found" : "Something went wrong"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {notFound
              ? "This invoice doesn't exist or may have been removed."
              : getApiErrorMessage(error, "Unable to load this invoice right now.")}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(AP_ROUTES.INVOICE_LIST)}>
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumb
        items={[
          { label: "Invoice Management", to: AP_ROUTES.INVOICE_LIST },
          { label: invoice.invoiceNumber || invoiceId },
        ]}
      />

      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`${invoice.invoiceType} · Uploaded ${formatDate(invoice.uploadedAt)}`}
        actions={
          <Button variant="outline" onClick={() => navigate(AP_ROUTES.INVOICE_LIST)}>
            <ArrowLeft className="h-4 w-4" /> Back to Invoices
          </Button>
        }
      />

      {/* Invoice Header */}
      <PageCard className="mb-4">
        <PageCardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Invoice Number" value={invoice.invoiceNumber} />
            <Field label="Invoice Type" value={invoice.invoiceType} />
            <Field label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
            <Field label="Due Date" value={formatDate(invoice.dueDate)} />
            <Field label="Inbound Document ID" value={invoice.inboundDocumentId} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</p>
              <div className="mt-1">
                <StatusBadge label={invoice.status} size="sm" />
              </div>
            </div>
          </div>
        </PageCardContent>
      </PageCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          {invoice.status === INVOICE_STATUS.RETURNED_FOR_REVIEW && (
            <InvoiceReturnedBanner invoiceId={invoice.id} />
          )}
          {(invoice.status === INVOICE_STATUS.OCR_REVIEW_PENDING ||
            invoice.status === INVOICE_STATUS.RETURNED_FOR_REVIEW) &&
          canReviewOcr ? (
            <InvoiceReviewEditor invoice={invoice} />
          ) : (
            <InvoiceOcrReviewPanel invoice={invoice} />
          )}
          <InvoiceApprovalPanel invoice={invoice} />
          <InvoiceValidationPanel />

          <PageCard>
            <PageCardContent>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Attachments</h3>
              <InvoiceAttachmentList attachments={invoice.attachments} inboundDocumentId={invoice.inboundDocumentId} />
            </PageCardContent>
          </PageCard>

          <PageCard>
            <PageCardContent>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Issues</h3>
              <InvoiceIssueList issues={invoice.issues} />
            </PageCardContent>
          </PageCard>

          <InvoiceAuditHistory invoiceId={invoice.id} />
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <PageCard>
            <PageCardContent>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Vendor Information</h3>
              {invoice.vendor ? (
                <dl className="space-y-1 text-sm">
                  <Field label="Vendor Name" value={invoice.vendor.name} stacked />
                  <Field label="GSTIN" value={invoice.vendor.gstin} stacked />
                  <Field label="Email" value={invoice.vendor.email} stacked />
                </dl>
              ) : (
                <p className="text-sm italic text-gray-500">
                  Vendor not yet identified — pending OCR extraction.
                </p>
              )}
            </PageCardContent>
          </PageCard>

          <InvoiceAmountSummary invoice={invoice} />

          <InvoicePaymentPanel invoice={invoice} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, stacked = false }) {
  return (
    <div className={stacked ? "flex items-center justify-between" : ""}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={stacked ? "text-sm font-medium text-gray-900" : "mt-1 text-sm font-medium text-gray-900"}>
        {value || "—"}
      </p>
    </div>
  );
}
