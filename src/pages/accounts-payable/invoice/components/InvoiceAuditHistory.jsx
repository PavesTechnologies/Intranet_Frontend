import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { useInvoiceHistory } from "../hooks/useInvoiceHistory";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate, formatTime } from "../../utils/formatters";
import { useEmployeeDirectory, resolveEmployeeName } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";

// Backend action codes -> plain-language labels (invoice_process_service.py /
// invoice_approval_service.py — see InvoiceHistoryEventDTO). Falls back to the raw code
// unchanged for anything not listed here, so a new backend event never disappears silently.
const ACTION_LABELS = {
  INVOICE_CREATED: "Invoice uploaded",
  INVOICE_OCR_REVIEWED: "OCR reviewed",
  INVOICE_RESUBMITTED: "Invoice resubmitted after review",
  INVOICE_SENT_FOR_APPROVAL: "Sent for approval",
  INVOICE_APPROVAL_STEP_DECISION: "Approval decision recorded",
  INVOICE_SENT_BACK: "Sent back for review",
  INVOICE_REJECTED: "Invoice rejected",
  INVOICE_APPROVED: "Invoice approved",
  INVOICE_READY_FOR_PAYMENT: "Marked ready for payment",
  INVOICE_PAYMENT_SCHEDULED: "Payment scheduled",
  INVOICE_PAYMENT_SENT: "Payment sent to bank",
  INVOICE_PAYMENT_CLEARED: "Payment cleared",
  INVOICE_PAYMENT_FAILED: "Payment attempt failed",
  // TDS Phase 1 — the backend only recently started writing these to audit_log, forward-only:
  // determinations/verifications made before that change won't retroactively appear here.
  INVOICE_TDS_DETERMINED: "TDS determined",
  INVOICE_TDS_VERIFIED: "TDS verified",
};

function formatCurrencyAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value;
}

function describeEvent(event) {
  const values = event.new_values || {};
  if (event.action === "INVOICE_APPROVAL_STEP_DECISION" && values.level_number) {
    return `Level ${values.level_number} — ${values.decision}${values.comments ? `: "${values.comments}"` : ""}`;
  }
  if (event.action === "INVOICE_SENT_BACK" && values.comments) {
    return `Reason: "${values.comments}"`;
  }
  if (event.action === "INVOICE_REJECTED" && values.comments) {
    return `Reason: "${values.comments}"`;
  }
  if (
    ["INVOICE_PAYMENT_SCHEDULED", "INVOICE_PAYMENT_SENT", "INVOICE_PAYMENT_CLEARED", "INVOICE_PAYMENT_FAILED"].includes(
      event.action,
    ) &&
    values.allocated_amount != null
  ) {
    return `₹${formatCurrencyAmount(values.allocated_amount)}${values.payment_id ? ` · Payment #${values.payment_id}` : ""}`;
  }
  if (event.action === "INVOICE_TDS_DETERMINED") {
    if (values.tds_applicable === false) return "Not applicable to this invoice";
    if (values.tds_amount != null) {
      const rate = values.tds_rate != null ? `${values.tds_rate}% · ` : "";
      const nature = values.payment_nature_code ? ` (${values.payment_nature_code})` : "";
      return `${rate}₹${formatCurrencyAmount(values.tds_amount)}${nature}`;
    }
    return values.determination_reason || null;
  }
  if (event.action === "INVOICE_TDS_VERIFIED") {
    if (values.tds_applicable === false) return "No TDS to verify";
    const amount = values.tds_amount != null ? `₹${formatCurrencyAmount(values.tds_amount)} verified` : "Verified";
    return `${amount}${values.remarks ? `: "${values.remarks}"` : ""}`;
  }
  return null;
}

/**
 * Real lifecycle history — GET /invoice-details/invoice/{id}/history, backed by the generic
 * ap.audit_log table (table_name='invoice'). Invoice creation/OCR-review/resubmission, every
 * approval decision (including Send Back), and every payment lifecycle event that touches this
 * invoice (scheduled/sent/cleared/failed) are all recorded there per this invoice's own
 * record_id — a payment covering several invoices writes one such entry per invoice, alongside
 * its own separate audit trail under table_name='payment' (see PaymentService).
 */
export default function InvoiceAuditHistory({ invoiceId }) {
  const { data: history, isLoading, error } = useInvoiceHistory(invoiceId);
  // changed_by is the JWT's numeric employee id (str(user_id) — see InvoiceApprovalService/
  // PaymentService's _record_audit calls), the same id space the Employee Onboarding directory
  // is keyed by (see useEmployeeDirectory) — resolves to a real name instead of a bare id.
  const { data: employeeDirectory } = useEmployeeDirectory();

  return (
    <PageCard>
      <PageCardContent>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Activity</h3>
        {isLoading ? (
          <LoadingSpinner text="Loading activity..." />
        ) : error ? (
          <p className="text-sm text-red-600">{getApiErrorMessage(error, "Unable to load activity right now.")}</p>
        ) : !history || history.length === 0 ? (
          <p className="text-sm italic text-gray-500">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-3 border-l border-gray-200 pl-4">
            {history.map((event, index) => {
              const detail = describeEvent(event);
              return (
                <li key={`${event.action}-${event.changed_at}-${index}`} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#0A0082]" />
                  <p className="text-sm font-medium text-gray-900">{ACTION_LABELS[event.action] || event.action}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(event.changed_at)} {formatTime(event.changed_at)}
                    {event.changed_by ? ` · ${resolveEmployeeName(employeeDirectory, event.changed_by)}` : ""}
                  </p>
                  {detail && <p className="mt-0.5 text-xs text-gray-600">{detail}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </PageCardContent>
    </PageCard>
  );
}
