import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import StatusBadge from "../../../../components/status/statusbadge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Button from "../../../../components/Button/Button";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import InvoiceAmountSummary from "../components/InvoiceAmountSummary";
import InvoiceLineTable from "../components/InvoiceLineTable";
import InvoiceAttachmentList from "../components/InvoiceAttachmentList";
import InvoiceIssueList from "../components/InvoiceIssueList";
import InvoiceOcrReviewPanel from "../components/InvoiceOcrReviewPanel";
import InvoiceValidationPanel from "../components/InvoiceValidationPanel";
import InvoiceApprovalPanel from "../components/InvoiceApprovalPanel";
import InvoiceAuditHistory from "../components/InvoiceAuditHistory";
import { useInvoiceDetail } from "../hooks/useInvoiceDetail";
import { OCR_REVIEW_QUEUE_STATUSES, VALIDATION_QUEUE_STATUSES, INVOICE_STATUS } from "../../constants/invoiceStatus";
import { AP_ROUTES } from "../../constants/routes";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";

/**
 * Single detail route for the whole invoice lifecycle (per the original AP architecture
 * decision) — the page renders an OCR Review / Validation / Approval workspace panel depending
 * on the invoice's current status, instead of separate near-duplicate detail pages each
 * re-implementing Header/Vendor/Amount Summary/Lines/Issues. The OCR and Validation panels are
 * always rendered (read-only outside their active stage) so extraction/validation results stay
 * visible per the detail-page spec; only the Approval panel's actions are stage-gated.
 */
export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
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

  const isOcrReview = OCR_REVIEW_QUEUE_STATUSES.includes(invoice.status);
  const isValidation = VALIDATION_QUEUE_STATUSES.includes(invoice.status);
  const isApproval = invoice.status === INVOICE_STATUS.PENDING_APPROVAL;
  const isRejected = invoice.status === INVOICE_STATUS.REJECTED;
  const symbol = invoice.currency?.symbol || "₹";

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
          <InvoiceOcrReviewPanel invoice={invoice} readOnly={!isOcrReview} />
          {isApproval && <InvoiceApprovalPanel invoice={invoice} />}
          <InvoiceValidationPanel invoice={invoice} readOnly={!isValidation} />

          <PageCard>
            <PageCardContent>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Invoice Lines</h3>
              <InvoiceLineTable lines={invoice.invoiceLines} currencySymbol={symbol} />
            </PageCardContent>
          </PageCard>

          <PageCard>
            <PageCardContent>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Attachments</h3>
              <InvoiceAttachmentList attachments={invoice.attachments} />
            </PageCardContent>
          </PageCard>

          <PageCard>
            <PageCardContent>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Issues</h3>
              <InvoiceIssueList invoiceId={invoice.id} issues={invoice.issues} />
            </PageCardContent>
          </PageCard>

          <InvoiceAuditHistory history={invoice.history} />
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

          <PageCard>
            <PageCardContent>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Purchase Information</h3>
              <dl className="space-y-1 text-sm">
                <Field label="PO Number" value={invoice.purchaseOrder?.poNumber || "Not applicable"} stacked />
                <Field label="GRN Number" value={invoice.goodsReceipt?.grnNumber || "Not applicable"} stacked />
                <Field label="Payment Terms" value={invoice.paymentTerms || "—"} stacked />
              </dl>
            </PageCardContent>
          </PageCard>

          <InvoiceAmountSummary invoice={invoice} />

          <PageCard>
            <PageCardContent>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Approval Information</h3>
              {invoice.approval?.required ? (
                <dl className="space-y-1 text-sm">
                  <Field label="Status" value={invoice.status} stacked />
                  <Field label={isRejected ? "Rejected By" : "Approved By"} value={invoice.approval.approvedBy || "Pending"} stacked />
                  <Field label="Approved On" value={formatDate(invoice.approval.approvedAt)} stacked />
                  {isRejected && (
                    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-red-600">Rejection Reason</p>
                      <p className="mt-0.5 text-sm text-red-700">{invoice.approval.rejectionReason || "—"}</p>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm italic text-gray-500">
                  No approval step required for this invoice.
                </p>
              )}
            </PageCardContent>
          </PageCard>

          <PageCard>
            <PageCardContent>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Payment Information</h3>
              {invoice.payments?.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {invoice.payments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                      <span className="text-gray-600">
                        {formatDate(payment.paidAt)} · {payment.method}
                      </span>
                      <span className="font-medium text-gray-900">{formatCurrency(payment.amount, symbol)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm italic text-gray-500">Not yet paid.</p>
              )}
            </PageCardContent>
          </PageCard>
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
