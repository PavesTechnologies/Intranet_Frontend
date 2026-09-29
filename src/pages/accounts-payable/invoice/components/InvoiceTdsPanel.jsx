import { useState } from "react";
import { toast } from "react-toastify";
import { Landmark, CheckCircle2, AlertTriangle, PencilLine } from "lucide-react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusBadge from "../../../../components/status/statusbadge";
import {
  useInvoiceTds,
  useDetermineTdsMutation,
  useUpdateTdsMutation,
  useVerifyTdsMutation,
} from "../hooks/useInvoiceTds";
import { useApPermissions } from "../../hooks/useApPermissions";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import { PAYMENT_NATURE_OPTIONS, paymentNatureLabel } from "../../constants/tdsPaymentNature";

const DETERMINATION_STATUS = { PENDING: "PENDING", DETERMINED: "DETERMINED", VERIFIED: "VERIFIED" };

/**
 * TDS determination for one invoice — the AP Executive determines/corrects it once the invoice
 * reaches OCR Reviewed (before it can be sent for approval, see InvoiceApprovalPanel's
 * tdsBlocksSend), Finance verifies it once Approved (before Mark Ready for Payment, see
 * InvoicePaymentPanel's tdsVerified gate). One component covers determine/correct/verify/read-only
 * display, permission-gated internally — same pattern InvoiceApprovalPanel uses for its
 * pure-approver trim. The backend is the sole source of every calculated field (taxable base,
 * rate, amount) — this panel never computes any of them; the only input it ever sends back is a
 * payment nature code, per the TDS Phase 1 contract.
 */
export default function InvoiceTdsPanel({ invoice }) {
  const { canViewTds, canDetermineTds, canEditTds, canVerifyTds } = useApPermissions();
  const { data: tds, isLoading, error } = useInvoiceTds(invoice.id);
  const determineTds = useDetermineTdsMutation();
  const updateTds = useUpdateTdsMutation();
  const verifyTds = useVerifyTdsMutation();

  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctedNature, setCorrectedNature] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyRemarks, setVerifyRemarks] = useState("");

  if (!canViewTds) return null;

  const symbol = invoice.currency?.symbol || "₹";
  const hasNoTdsYet = error?.status === 404;
  const isLoadFailure = Boolean(error) && !hasNoTdsYet;
  const status = tds?.determination_status;
  const isDetermined = status === DETERMINATION_STATUS.DETERMINED;
  const isVerified = status === DETERMINATION_STATUS.VERIFIED;
  // TDS only becomes relevant once the invoice has actually been reviewed — offering Determine
  // any earlier would run ahead of data that doesn't exist yet (OCR Review Pending has no
  // confirmed vendor/amounts for the backend's purchase-category mapping to key off).
  const canOfferDetermine =
    hasNoTdsYet &&
    canDetermineTds &&
    invoice.status !== INVOICE_STATUS.OCR_REVIEW_PENDING &&
    invoice.status !== INVOICE_STATUS.OCR_FAILED;
  // Once the invoice has actually been sent for approval, the payment nature is what the
  // approvers are reviewing against — correcting it out from under an in-flight (or completed)
  // approval would silently invalidate a decision already made. OCR_REVIEWED is specifically
  // "reviewed, not yet sent" (see InvoiceApprovalPanel's tdsBlocksSend), so correction stays open
  // only through that window, same as Determine's own status gate above.
  const canCorrectNature = isDetermined && canEditTds && invoice.status === INVOICE_STATUS.OCR_REVIEWED;

  const handleDetermine = () => {
    determineTds.mutate(invoice.id, {
      onSuccess: () => toast.success("TDS determined."),
      onError: (err) => toast.error(getApiErrorMessage(err, "Could not determine TDS for this invoice.")),
    });
  };

  const startCorrecting = () => {
    setCorrectedNature(tds?.payment_nature?.code || "");
    setIsCorrecting(true);
  };

  const handleCorrect = () => {
    if (!correctedNature) return;
    updateTds.mutate(
      { invoiceId: invoice.id, paymentNatureCode: correctedNature },
      {
        onSuccess: () => {
          toast.success("Payment nature corrected — TDS recalculated.");
          setIsCorrecting(false);
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Could not correct the payment nature.")),
      },
    );
  };

  const handleVerify = () => {
    verifyTds.mutate(
      { invoiceId: invoice.id, remarks: verifyRemarks.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("TDS verified.");
          setVerifyOpen(false);
          setVerifyRemarks("");
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Could not verify TDS.")),
      },
    );
  };

  return (
    <PageCard>
      <PageCardContent>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">TDS Determination</h3>
          {status && <StatusBadge label={status} size="sm" />}
        </div>

        {isLoading ? (
          <LoadingSpinner text="Loading TDS status..." />
        ) : isLoadFailure ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {getApiErrorMessage(error, "Could not load TDS status for this invoice.")}
          </div>
        ) : hasNoTdsYet ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <span>TDS not yet determined.</span>
            {canOfferDetermine && (
              <Button variant="primary" size="small" onClick={handleDetermine} loading={determineTds.isPending}>
                <Landmark size={14} /> Determine TDS
              </Button>
            )}
          </div>
        ) : (
          <>
            <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Field label="TDS Applicable" value={tds.tds_applicable ? "Yes" : "No"} />
              <div>
                {canCorrectNature && isCorrecting ? (
                  <FormSelect
                    label="Payment Nature"
                    name="paymentNature"
                    options={PAYMENT_NATURE_OPTIONS}
                    value={correctedNature}
                    onChange={(e) => setCorrectedNature(e.target.value)}
                  />
                ) : (
                  <>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment Nature</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {tds.payment_nature
                        ? tds.payment_nature.name || paymentNatureLabel(tds.payment_nature.code)
                        : "—"}
                    </dd>
                  </>
                )}
              </div>
              <Field label="TDS Rule" value={tds.tds_rule?.rule_name} />
              <Field label="Legal Reference" value={tds.tds_rule?.legal_reference} />
              <Field
                label="Taxable Base"
                value={tds.taxable_base != null ? formatCurrency(tds.taxable_base, symbol) : null}
              />
              <Field label="TDS Rate" value={tds.tds_rate != null ? `${tds.tds_rate}%` : null} />
              <Field
                label="TDS Amount"
                value={tds.tds_amount != null ? formatCurrency(tds.tds_amount, symbol) : null}
              />
              <Field
                label="Threshold Amount"
                value={tds.threshold_amount != null ? formatCurrency(tds.threshold_amount, symbol) : null}
              />
              <Field
                label="Prior Period Aggregate"
                value={tds.prior_period_aggregate != null ? formatCurrency(tds.prior_period_aggregate, symbol) : null}
              />
              <Field
                label="Current Transaction"
                value={
                  tds.current_transaction_amount != null
                    ? formatCurrency(tds.current_transaction_amount, symbol)
                    : null
                }
              />
              <Field
                label="Aggregate Amount"
                value={tds.aggregate_amount != null ? formatCurrency(tds.aggregate_amount, symbol) : null}
              />
              <Field label="PAN Status" value={tds.pan_status} />
              <Field label="Entity Type" value={tds.entity_type} />
            </dl>

            {tds.determination_reason && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</p>
                <p className="mt-1 text-sm text-gray-700">{tds.determination_reason}</p>
              </div>
            )}

            {isVerified && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircle2 size={16} className="shrink-0" />
                TDS Verified{tds.verified_by ? ` by ${tds.verified_by}` : ""}
                {tds.verified_at ? ` on ${formatDate(tds.verified_at)}` : ""}.
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {canCorrectNature && !isCorrecting && (
                <Button variant="outline" size="small" onClick={startCorrecting}>
                  <PencilLine size={14} /> Correct Payment Nature
                </Button>
              )}
              {canCorrectNature && isCorrecting && (
                <>
                  <Button variant="outline" size="small" onClick={() => setIsCorrecting(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleCorrect}
                    disabled={!correctedNature}
                    loading={updateTds.isPending}
                  >
                    Save Correction
                  </Button>
                </>
              )}
              {isDetermined && canVerifyTds && (
                <Button variant="primary" size="small" onClick={() => setVerifyOpen(true)}>
                  <CheckCircle2 size={14} /> Verify TDS
                </Button>
              )}
            </div>
          </>
        )}
      </PageCardContent>

      <Modal
        isOpen={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        title="Verify TDS"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setVerifyOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleVerify} loading={verifyTds.isPending}>
              Confirm Verification
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-gray-700">
          Verify the TDS determination for invoice <span className="font-semibold">{invoice.invoiceNumber}</span>?
          This locks it in — there is no way to un-verify it afterward.
        </p>
        <FormTextArea
          label="Remarks (optional)"
          name="verifyRemarks"
          value={verifyRemarks}
          onChange={(e) => setVerifyRemarks(e.target.value)}
          rows={2}
        />
      </Modal>
    </PageCard>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}
