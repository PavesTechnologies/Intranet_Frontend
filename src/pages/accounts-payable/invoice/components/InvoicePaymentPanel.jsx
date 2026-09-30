import { useState } from "react";
import { toast } from "react-toastify";
import { CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import StatusBadge from "../../../../components/status/statusbadge";
import { useMarkReadyForPaymentMutation } from "../../payment/hooks/usePaymentMutations";
import { useInvoiceTds } from "../hooks/useInvoiceTds";
import { useApPermissions } from "../../hooks/useApPermissions";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate, formatTime, calculateBalance } from "../../utils/formatters";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import { AP_ROUTES } from "../../constants/routes";
import { Link } from "react-router-dom";

/** "₹17,700.00 — 10% under TDS - Professional or Technical Services (Section 194J, ...)" — built
 * entirely from fields useInvoiceTds already returns, never recomputed. Degrades gracefully if
 * the rule/rate isn't populated (still shows the amount alone) rather than showing a broken line. */
function buildTdsBasisLine(tds, symbol) {
  if (!tds?.tds_applicable) return null;
  const amount = formatCurrency(tds.tds_amount ?? 0, symbol);
  const parts = [];
  if (tds.tds_rate != null) parts.push(`${tds.tds_rate}%`);
  if (tds.tds_rule?.rule_name) parts.push(`under ${tds.tds_rule.rule_name}`);
  const basis = parts.join(" ");
  const withRef = tds.tds_rule?.legal_reference ? `${basis} (${tds.tds_rule.legal_reference})` : basis;
  return withRef ? `${amount} — ${withRef}` : amount;
}

/**
 * Payment readiness/status for this invoice. "Mark Ready for Payment" is the one manual gate
 * between Approved and payable (Backend/Business_Layer/services/payment_service.py:
 * mark_ready_for_payment) — never automatic just because the invoice was approved. Individual
 * payment transactions aren't listed here: GET /apm/payment has no invoice_id filter (only
 * vendor_id/status_id), so per-invoice payment history isn't fetchable without pulling every
 * payment in the system — see the Payment History page (filtered by vendor/status) instead.
 */
export default function InvoicePaymentPanel({ invoice }) {
  const { canMarkPaid } = useApPermissions();
  const markReady = useMarkReadyForPaymentMutation();
  // TDS Phase 1: the backend does not itself enforce "TDS verified before ready-for-payment" —
  // same frontend-only sequencing as InvoiceApprovalPanel's send-for-approval gate (see
  // InvoiceTdsPanel for the actual verify UI). A 404 here just means "not yet determined."
  const { data: tds } = useInvoiceTds(invoice.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);

  const symbol = invoice.currency?.symbol || "₹";
  const balance = calculateBalance(invoice.netAmount, invoice.amountPaid);
  const isApproved = invoice.status === INVOICE_STATUS.APPROVED;
  const tdsVerified = tds?.determination_status === "VERIFIED";
  const tdsBlocksMarkReady = isApproved && !tdsVerified;
  const canOfferMarkReady = isApproved && canMarkPaid && tdsVerified;
  // Backend-enforced, not a display estimate: PaymentService now caps allocation at
  // net_amount - tds_amount and rejects anything over it. invoice.payableAmount comes straight
  // off the invoice-details response (mapInvoiceRecord) — the same field the backend itself
  // computed — rather than being re-derived here from tds_amount, so this can never drift from
  // what payment creation will actually accept. Null until TDS has been determined.
  const netVendorPayable = invoice.payableAmount;
  const tdsBasisLine = buildTdsBasisLine(tds, symbol);
  const isPayable =
    invoice.status === INVOICE_STATUS.READY_FOR_PAYMENT ||
    invoice.status === INVOICE_STATUS.PARTIALLY_PAID;

  const handleMarkReady = () => {
    markReady.mutate(invoice.id, {
      onSuccess: () => {
        toast.success(`${invoice.invoiceNumber} marked ready for payment.`);
        setConfirmOpen(false);
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err, "Could not mark this invoice ready for payment."));
        setConfirmOpen(false);
      },
    });
  };

  return (
    <PageCard>
      <PageCardContent>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Payment Information</h3>

        <dl className="mb-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Net Amount</dt>
            <dd className="font-medium text-gray-900">{formatCurrency(invoice.netAmount, symbol)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Paid</dt>
            <dd className="font-medium text-gray-900">{formatCurrency(invoice.amountPaid, symbol)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Balance</dt>
            <dd className="font-semibold text-gray-900">{formatCurrency(balance, symbol)}</dd>
          </div>
          {netVendorPayable != null && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-1">
              <dt className="text-gray-500">Net Vendor Payable</dt>
              <dd className="font-semibold text-gray-900">{formatCurrency(netVendorPayable, symbol)}</dd>
            </div>
          )}
        </dl>

        {tds && (
          <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">TDS Deducted</span>
              {!tds.tds_applicable && <span className="text-sm font-medium text-gray-700">No TDS deducted</span>}
            </div>
            {tds.tds_applicable && tdsBasisLine && (
              <p className="mt-1 text-sm text-gray-800">{tdsBasisLine}</p>
            )}
            {tds.determination_reason && (
              <button
                type="button"
                onClick={() => setReasonOpen((open) => !open)}
                className="mt-1 flex items-center gap-1 text-xs font-medium text-[#0A0082] hover:underline"
              >
                {reasonOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {reasonOpen ? "Hide reason" : "Why this determination?"}
              </button>
            )}
            {reasonOpen && tds.determination_reason && (
              <p className="mt-1 text-xs text-gray-600">{tds.determination_reason}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              {tdsVerified
                ? `Verified by ${tds.verified_by || "—"}${tds.verified_at ? ` on ${formatDate(tds.verified_at)} ${formatTime(tds.verified_at)}` : ""}`
                : "Not yet verified"}
            </p>
          </div>
        )}
        {netVendorPayable != null && (
          <p className="mb-3 text-xs italic text-gray-500">
            Net Amount minus TDS — this is the amount actually payable to the vendor; the withheld
            portion is remitted separately.
          </p>
        )}

        {isApproved && (
          <p className="mb-3 text-xs italic text-gray-500">
            {tdsBlocksMarkReady
              ? "Approved, but not yet payable — TDS must be verified before this invoice can be marked ready for payment."
              : "Approved, but not yet payable — Finance must mark it ready for payment first."}
          </p>
        )}

        {canOfferMarkReady && (
          <Button variant="primary" size="small" className="w-full" onClick={() => setConfirmOpen(true)}>
            <CreditCard size={14} /> Mark Ready for Payment
          </Button>
        )}

        {isPayable && balance > 0 && canMarkPaid && (
          <Link
            to={AP_ROUTES.PAYMENT_MARK_PAID(invoice.id)}
            className="mt-2 block w-full rounded-lg border border-[#0A0082] px-3 py-2 text-center text-sm font-medium text-[#0A0082] hover:bg-[#0A0082]/5"
          >
            Pay Invoice
          </Link>
        )}

        {invoice.status === INVOICE_STATUS.PAID && <StatusBadge label="Paid" size="sm" />}
      </PageCardContent>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Mark Ready for Payment"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleMarkReady} loading={markReady.isPending}>
              Confirm
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-700">
          Mark invoice <span className="font-semibold">{invoice.invoiceNumber}</span> as ready for payment? This
          makes it payable from the Payments module.
        </p>
      </Modal>
    </PageCard>
  );
}
