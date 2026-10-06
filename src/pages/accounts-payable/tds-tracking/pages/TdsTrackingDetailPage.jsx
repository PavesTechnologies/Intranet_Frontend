import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Upload } from "lucide-react";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusBadge from "../../../../components/status/statusbadge";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import DocumentUploadModal from "../../payment/components/DocumentUploadModal";
import DocumentViewButton from "../../payment/components/DocumentViewButton";
import RecordTdsActivityModal from "../components/RecordTdsActivityModal";
import { sectionLabel } from "../utils/tdsTrackingFormat";
import { tdsTrackingService } from "../services/tdsTrackingService";
import { useTdsTrackingDetail, useTdsTrackingMetadata, useUploadTdsDocumentMutation } from "../hooks/useTdsTracking";
import { useApPermissions } from "../../hooks/useApPermissions";
import { AP_ROUTES } from "../../constants/routes";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";

const ACTIVITY_LABELS = {
  INVOICE_TDS_DETERMINED: "TDS determined",
  INVOICE_TDS_VERIFIED: "TDS verified",
  INVOICE_TDS_DEDUCTION_RECORDED: "Deduction recorded",
  INVOICE_TDS_DEPOSIT_RECORDED: "TDS payment (challan) recorded",
  INVOICE_TDS_FILING_RECORDED: "Filing details recorded",
  INVOICE_TDS_DOCUMENT_UPLOADED: "Document uploaded",
};

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{children ?? "—"}</dd>
    </div>
  );
}

/**
 * One invoice's TDS: the backend's determination (read-only — rate/amount are never editable
 * here), the external tracking lifecycle (deduction -> challan deposit -> return filing) with its
 * documents and timeline, and — kept visually separate — the invoice's own payment status.
 * Which actions are offered comes from the backend's allowed_actions, not from frontend rules.
 */
export default function TdsTrackingDetailPage() {
  const { invoiceId } = useParams();
  const { canUpdateTdsTracking, canViewPaymentManagement } = useApPermissions();
  const { data: detail, isLoading, isError, error } = useTdsTrackingDetail(invoiceId);
  const { data: metadata } = useTdsTrackingMetadata();
  const uploadDocument = useUploadTdsDocumentMutation();
  const [activeAction, setActiveAction] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  if (isLoading) return <div className="p-6"><LoadingSpinner text="Loading TDS details…" /></div>;
  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(error, "Unable to load TDS details right now.")}
        </div>
      </div>
    );
  }

  const symbol = detail.currencySymbol;
  const determination = detail.determination || {};
  const tracking = detail.tracking || {};
  const actionLabel = Object.fromEntries((metadata?.actions ?? []).map((a) => [a.value, a.label]));
  const docTypeLabel = Object.fromEntries((metadata?.document_types ?? []).map((d) => [d.value, d.label]));
  const verified = determination.determination_status === "VERIFIED";

  const handleUpload = (file, documentType) =>
    uploadDocument
      .mutateAsync({ invoiceId: detail.invoiceId, file, documentType })
      .then(() => toast.success("Document uploaded."))
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Could not upload the document."));
        throw err;
      });

  return (
    <div className="space-y-4 p-6">
      <Breadcrumb items={[{ label: "TDS Tracking", to: AP_ROUTES.TDS_TRACKING }, { label: detail.invoiceNumber }]} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{detail.invoiceNumber}</h1>
          <p className="text-sm text-gray-500">
            {detail.vendorName} · {formatDate(detail.invoiceDate)} ·{" "}
            <Link to={AP_ROUTES.INVOICE_DETAIL(detail.invoiceId)} className="text-[#0A0082] hover:underline">
              Open invoice
            </Link>
          </p>
        </div>
        {canUpdateTdsTracking && (
          <div className="flex flex-wrap gap-2">
            {detail.allowedActions.map((action) => (
              <Button key={action} variant="primary" size="small" onClick={() => setActiveAction(action)}>
                {actionLabel[action] || action}
              </Button>
            ))}
            {verified && (
              <Button variant="outline" size="small" onClick={() => setUploadOpen(true)}>
                <Upload size={14} /> Upload Document
              </Button>
            )}
          </div>
        )}
      </div>

      {!verified && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          TDS for this invoice has not been verified by Finance yet — tracking activity can be recorded once it is verified.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PageCard>
          <PageCardContent>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">TDS Determination</h3>
            <dl>
              <Row label="TDS Applicable">{determination.tds_applicable ? "Yes" : "No"}</Row>
              <Row label="Payment Nature">{detail.paymentNature?.name}</Row>
              <Row label="Section / Rule">{sectionLabel(detail)}</Row>
              <Row label="Taxable Base">{formatCurrency(detail.taxableBase, symbol)}</Row>
              <Row label="Rate">{detail.tdsRate != null ? `${detail.tdsRate}%` : null}</Row>
              <Row label="TDS Amount">{formatCurrency(detail.tdsAmount, symbol)}</Row>
              <Row label="Determination">{determination.determination_status}</Row>
              <Row label="Verified">
                {determination.verified_at ? `${determination.verified_by || "—"} · ${formatDateTime(determination.verified_at)}` : null}
              </Row>
            </dl>
            {determination.determination_reason && (
              <p className="mt-2 text-xs text-gray-500">{determination.determination_reason}</p>
            )}
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardContent>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">TDS Tracking</h3>
              <StatusBadge label={detail.trackingStatusLabel} size="sm" />
            </div>
            <dl>
              <Row label="Deduction Date">{formatDate(tracking.deduction_date, null)}</Row>
              <Row label="Challan Number">{tracking.challan_number}</Row>
              <Row label="BSR Code">{tracking.bsr_code}</Row>
              <Row label="TDS Payment Date">{formatDate(tracking.deposit_date, null)}</Row>
              <Row label="Filing Date">{formatDate(tracking.filing_date, null)}</Row>
              <Row label="Filing Reference">{tracking.filing_reference}</Row>
              <Row label="Remarks">{tracking.remarks}</Row>
            </dl>
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardContent>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Invoice Payment Status</h3>
            <dl>
              <Row label="Status">
                <StatusBadge label={detail.payment.statusName || detail.payment.statusCode || "—"} size="sm" />
              </Row>
              <Row label="Invoice Amount">{formatCurrency(detail.invoiceAmount, symbol)}</Row>
              <Row label="Net Payable">{formatCurrency(detail.payment.netPayable, symbol)}</Row>
              <Row label="Paid">{formatCurrency(detail.payment.amountPaid, symbol)}</Row>
              <Row label="Remaining">{formatCurrency(detail.payment.remainingAmount, symbol)}</Row>
            </dl>
            {canViewPaymentManagement && (
              <Link to={AP_ROUTES.PAYMENT_DETAIL(detail.invoiceId)} className="mt-1 block text-sm text-[#0A0082] hover:underline">
                Payment details →
              </Link>
            )}
            <p className="mt-2 text-xs text-gray-400">Independent of the TDS status.</p>
          </PageCardContent>
        </PageCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PageCard>
          <PageCardContent>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Supporting Documents</h3>
            {detail.documents.length === 0 ? (
              <p className="text-sm text-gray-500">No documents uploaded.</p>
            ) : (
              <ul className="space-y-2">
                {detail.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2">
                    <DocumentViewButton fileName={doc.fileName} fetchBlob={() => tdsTrackingService.viewDocument(detail.invoiceId, doc.id)} />
                    <span className="text-xs text-gray-500">
                      {docTypeLabel[doc.documentType] || doc.documentType} · {formatDate(doc.uploadedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardContent>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Activity</h3>
            {detail.activity.length === 0 ? (
              <p className="text-sm text-gray-500">No TDS activity yet.</p>
            ) : (
              <ol className="space-y-2 border-l border-gray-200 pl-4">
                {detail.activity.map((event, index) => (
                  <li key={`${event.action}-${index}`} className="text-sm">
                    <div className="font-medium text-gray-800">
                      {ACTIVITY_LABELS[event.action] || event.action}
                      {event.new_values?.correction && <span className="ml-1 text-xs text-gray-500">(correction)</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDateTime(event.changed_at)} · {event.changed_by || "—"}
                    </div>
                    {event.new_values?.remarks && <div className="text-xs text-gray-600">{event.new_values.remarks}</div>}
                  </li>
                ))}
              </ol>
            )}
          </PageCardContent>
        </PageCard>
      </div>

      <RecordTdsActivityModal
        isOpen={Boolean(activeAction)}
        onClose={() => setActiveAction(null)}
        invoiceId={detail.invoiceId}
        action={activeAction}
        actionLabel={actionLabel[activeAction]}
        tracking={tracking}
      />
      <DocumentUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload TDS Document"
        documentTypes={(metadata?.document_types ?? []).map((d) => ({ value: d.value, label: d.label }))}
        defaultType="CHALLAN"
        onUpload={handleUpload}
        isUploading={uploadDocument.isPending}
      />
    </div>
  );
}
