import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Upload } from "lucide-react";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusBadge from "../../../../components/status/statusbadge";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import EmptyState from "../../procurement/components/EmptyState";
import RecordPaymentModal from "../components/RecordPaymentModal";
import DocumentUploadModal from "../components/DocumentUploadModal";
import DocumentViewButton from "../components/DocumentViewButton";
import PaymentStatusUpdateModal from "../components/PaymentStatusUpdateModal";
import { paymentService } from "../services/paymentService";
import { useInvoicePayments, usePaymentMetadata, useUploadPaymentDocumentMutation } from "../hooks/usePaymentTracking";
import { useApLookups } from "../../hooks/useApLookups";
import { useApPermissions } from "../../hooks/useApPermissions";
import { AP_ROUTES } from "../../constants/routes";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";

const TDS_TRACKING_LABELS = {
  TDS_PENDING: "TDS Pending",
  TDS_DEDUCTED: "TDS Deducted",
  TDS_DEPOSITED: "TDS Deposited",
  TDS_FILED: "TDS Return Filed",
};

function Row({ label, children, strong = false }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className={strong ? "font-semibold text-gray-900" : "font-medium text-gray-900"}>{children}</dd>
    </div>
  );
}

/**
 * One invoice's payments: what was billed, what TDS was withheld, what is payable, every payment
 * recorded against it (an invoice can have several) and their receipts. All figures are the
 * backend's (GET /payment/invoice/{id}).
 */
export default function PaymentInvoiceDetailPage() {
  const { invoiceId } = useParams();
  const { canRecordPayment, canMarkPaid, canViewTdsTracking } = useApPermissions();
  const { data: invoice, isLoading, isError, error } = useInvoicePayments(invoiceId);
  const { data: metadata } = usePaymentMetadata();
  const { paymentStatuses } = useApLookups();
  const uploadDocument = useUploadPaymentDocumentMutation();
  const [recordOpen, setRecordOpen] = useState(false);
  const [uploadFor, setUploadFor] = useState(null);
  const [statusFor, setStatusFor] = useState(null);

  if (isLoading) return <div className="p-6"><LoadingSpinner text="Loading payment details…" /></div>;
  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(error, "Unable to load payment details right now.")}
        </div>
      </div>
    );
  }

  const symbol = invoice.currencySymbol;
  const modeLabel = Object.fromEntries((metadata?.paymentModes ?? []).map((m) => [m.value, m.label]));
  const statusOptions = paymentStatuses.map((s) => ({ code: s.status_code, label: s.status_name }));

  const handleUpload = (file, documentType) =>
    uploadDocument
      .mutateAsync({ invoiceId: invoice.invoiceId, paymentId: uploadFor.paymentId, file, documentType })
      .then(() => toast.success("Receipt uploaded."))
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Could not upload the receipt."));
        throw err;
      });

  return (
    <div className="space-y-4 p-6">
      <Breadcrumb
        items={[
          { label: "Payments", to: AP_ROUTES.PAYMENT_READY },
          { label: "Payment History", to: AP_ROUTES.PAYMENT_HISTORY },
          { label: invoice.invoiceNumber },
        ]}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-gray-500">
            {invoice.vendorName} ·{" "}
            <Link to={AP_ROUTES.INVOICE_DETAIL(invoice.invoiceId)} className="text-[#0A0082] hover:underline">
              Open invoice
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge label={invoice.statusName || invoice.statusCode} />
          {canRecordPayment && invoice.canRecordPayment && (
            <Button variant="primary" onClick={() => setRecordOpen(true)}>
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PageCard>
          <PageCardContent>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Invoice Summary</h3>
            <dl>
              <Row label="Invoice Date">{formatDate(invoice.invoiceDate)}</Row>
              <Row label="Due Date">
                <span className={invoice.isOverdue ? "text-red-600" : ""}>{formatDate(invoice.dueDate)}</span>
              </Row>
              <Row label="Invoice Amount">{formatCurrency(invoice.invoiceAmount, symbol)}</Row>
              <Row label="TDS">{invoice.tdsApplicable ? `− ${formatCurrency(invoice.tdsAmount, symbol)}` : "Not applicable"}</Row>
              <Row label="Net Payable" strong>{formatCurrency(invoice.netPayable, symbol)}</Row>
            </dl>
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardContent>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Payment Summary</h3>
            <dl>
              <Row label="Total Paid">{formatCurrency(invoice.amountPaid, symbol)}</Row>
              {invoice.pendingAmount > 0 && <Row label="Scheduled (not cleared)">{formatCurrency(invoice.pendingAmount, symbol)}</Row>}
              <Row label="Remaining" strong>{formatCurrency(invoice.remainingAmount, symbol)}</Row>
              <Row label="Payment Status">
                <StatusBadge label={invoice.statusName || invoice.statusCode} size="sm" />
              </Row>
            </dl>
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardContent>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">TDS Summary</h3>
            {invoice.tdsApplicable ? (
              <dl>
                <Row label="TDS Amount">{formatCurrency(invoice.tdsAmount, symbol)}</Row>
                <Row label="Determination">{invoice.tdsDeterminationStatus || "—"}</Row>
                <Row label="TDS Status">
                  <StatusBadge label={TDS_TRACKING_LABELS[invoice.tdsTrackingStatus] || invoice.tdsTrackingStatus || "—"} size="sm" />
                </Row>
                {canViewTdsTracking && (
                  <Link to={AP_ROUTES.TDS_TRACKING_DETAIL(invoice.invoiceId)} className="mt-1 block text-sm text-[#0A0082] hover:underline">
                    TDS tracking details →
                  </Link>
                )}
              </dl>
            ) : (
              <p className="text-sm text-gray-500">No TDS applies to this invoice.</p>
            )}
            <p className="mt-2 text-xs text-gray-400">TDS status is tracked separately from the invoice payment status.</p>
          </PageCardContent>
        </PageCard>
      </div>

      <PageCard>
        <PageCardContent>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Payments ({invoice.payments.length})</h3>
          {invoice.payments.length === 0 ? (
            <EmptyState title="No payment records found." description="Recorded payments for this invoice will appear here." />
          ) : (
            <ol className="space-y-3">
              {invoice.payments.map((payment, index) => (
                <li key={payment.paymentId} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-gray-800">
                      Payment {index + 1}
                      <span className="ml-2 font-normal text-gray-500">#{payment.paymentId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-gray-900">{formatCurrency(payment.amount, symbol)}</span>
                      <StatusBadge label={payment.statusName || payment.statusCode} size="sm" />
                    </div>
                  </div>
                  <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm md:grid-cols-3">
                    <div><dt className="inline text-gray-500">Date: </dt><dd className="inline">{formatDate(payment.paymentDate || payment.scheduledDate)}</dd></div>
                    <div><dt className="inline text-gray-500">Mode: </dt><dd className="inline">{modeLabel[payment.paymentMode] || payment.paymentMode}</dd></div>
                    <div><dt className="inline text-gray-500">UTR / Reference: </dt><dd className="inline">{payment.referenceNumber || "—"}</dd></div>
                    <div><dt className="inline text-gray-500">Recorded by: </dt><dd className="inline">{payment.recordedBy || "—"}</dd></div>
                    <div><dt className="inline text-gray-500">Recorded at: </dt><dd className="inline">{formatDateTime(payment.recordedAt)}</dd></div>
                    {payment.paymentTotal !== payment.amount && (
                      <div><dt className="inline text-gray-500">Whole payment: </dt><dd className="inline">{formatCurrency(payment.paymentTotal, symbol)}</dd></div>
                    )}
                  </dl>
                  {payment.remarks && <p className="mt-2 text-sm text-gray-600">{payment.remarks}</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    {payment.documents.length === 0 && <span className="text-xs text-gray-400">No receipt uploaded</span>}
                    {payment.documents.map((doc) => (
                      <DocumentViewButton
                        key={doc.id}
                        fileName={doc.fileName}
                        fetchBlob={() => paymentService.viewPaymentDocument(payment.paymentId, doc.id)}
                      />
                    ))}
                    {canRecordPayment && (
                      <button
                        type="button"
                        onClick={() => setUploadFor(payment)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#0A0082] hover:underline"
                      >
                        <Upload size={12} /> Upload receipt
                      </button>
                    )}
                    {canMarkPaid && ["SCHEDULED", "SENT"].includes(payment.statusCode) && (
                      <Button variant="outline" size="small" onClick={() => setStatusFor(payment)}>
                        Update Status
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </PageCardContent>
      </PageCard>

      <RecordPaymentModal isOpen={recordOpen} invoice={invoice} onClose={() => setRecordOpen(false)} />
      <DocumentUploadModal
        isOpen={Boolean(uploadFor)}
        onClose={() => setUploadFor(null)}
        title={uploadFor ? `Upload Receipt — Payment #${uploadFor.paymentId}` : "Upload Receipt"}
        documentTypes={metadata?.documentTypes ?? [{ value: "RECEIPT", label: "Payment Receipt / Proof" }]}
        defaultType="RECEIPT"
        onUpload={handleUpload}
        isUploading={uploadDocument.isPending}
      />
      <PaymentStatusUpdateModal
        payment={statusFor}
        statusOptions={statusOptions}
        isOpen={Boolean(statusFor)}
        onClose={() => setStatusFor(null)}
      />
    </div>
  );
}
