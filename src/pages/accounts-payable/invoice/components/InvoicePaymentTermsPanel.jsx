import { useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, CalendarClock, RefreshCw, ShieldCheck } from "lucide-react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import PaymentTermStatusBadge from "./PaymentTermStatusBadge";
import {
  useInvoicePaymentTerms,
  useRecheckPaymentTermsMutation,
  useVerifyPaymentTermsMutation,
} from "../hooks/useInvoicePaymentTerms";
import { useApPermissions } from "../../hooks/useApPermissions";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/formatters";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import {
  DUE_BASIS_OPTIONS,
  PAYMENT_TERM_STATUS,
  REFERENCE_SOURCE_LABELS,
} from "../../constants/paymentTerms";

const CLOSED_STATUSES = [INVOICE_STATUS.PAID, INVOICE_STATUS.REJECTED];

function daysLabel(days) {
  if (days == null) return "—";
  if (days === 0) return "Immediate";
  return `${days} day${days === 1 ? "" : "s"}`;
}

function DueChip({ terms }) {
  if (terms.days_to_due == null) {
    return <span className="text-xs font-medium text-gray-500">Due date unverified</span>;
  }
  if (terms.is_overdue) {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
        {Math.abs(terms.days_to_due)} day{Math.abs(terms.days_to_due) === 1 ? "" : "s"} overdue
      </span>
    );
  }
  const soon = terms.days_to_due <= 7;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        soon ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {terms.days_to_due === 0 ? "Due today" : `${terms.days_to_due} days left`}
    </span>
  );
}

function SourceRow({ label, value, detail, applied }) {
  return (
    <tr className={applied ? "bg-blue-50/60" : undefined}>
      <td className="py-1.5 pr-3 text-gray-500">
        {label}
        {applied && <span className="ml-1 text-[10px] font-semibold uppercase text-blue-700">applied</span>}
      </td>
      <td className="py-1.5 pr-3 font-medium text-gray-900">{value}</td>
      <td className="py-1.5 text-xs text-gray-500">{detail}</td>
    </tr>
  );
}

/**
 * Payment-term compliance for one invoice (Backend/Business_Layer/services/
 * payment_term_compliance_service.py): what the invoice, PO, vendor agreement and vendor master
 * each say, which one is authoritative, and the contractual / statutory (MSME) / effective due
 * dates kept apart. Everything shown is computed by the backend. A MISMATCH or REVIEW_REQUIRED
 * blocks Mark Ready for Payment until Finance verifies the terms here (remarks mandatory).
 */
export default function InvoicePaymentTermsPanel({ invoice }) {
  const { canViewPaymentTerms, canVerifyPaymentTerms, canRecheckPaymentTerms } = useApPermissions();
  const { data: terms, isLoading, error } = useInvoicePaymentTerms(invoice.id, { enabled: canViewPaymentTerms });
  const recheck = useRecheckPaymentTermsMutation();
  const verify = useVerifyPaymentTermsMutation();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [form, setForm] = useState({ days: "", basis: "INVOICE_DATE", remarks: "" });

  if (!canViewPaymentTerms) return null;

  const closed = CLOSED_STATUSES.includes(invoice.status);
  const isException =
    terms?.validation_status === PAYMENT_TERM_STATUS.MISMATCH ||
    terms?.validation_status === PAYMENT_TERM_STATUS.REVIEW_REQUIRED;

  const openVerify = () => {
    setForm({
      days: String(terms?.applied_term_days ?? terms?.suggested_term_days ?? ""),
      basis: terms?.due_basis || "INVOICE_DATE",
      remarks: "",
    });
    setVerifyOpen(true);
  };

  const handleRecheck = () =>
    recheck.mutate(invoice.id, {
      onSuccess: () => toast.success("Payment terms re-checked."),
      onError: (err) => toast.error(getApiErrorMessage(err, "Could not re-check the payment terms.")),
    });

  const daysNumber = form.days === "" ? null : Number(form.days);
  const daysInvalid = daysNumber == null || !Number.isInteger(daysNumber) || daysNumber < 0 || daysNumber > 365;
  const remarksInvalid = form.remarks.trim().length < 5;

  const handleVerify = () =>
    verify.mutate(
      { invoiceId: invoice.id, appliedTermDays: daysNumber, dueBasis: form.basis, remarks: form.remarks.trim() },
      {
        onSuccess: () => {
          toast.success("Payment terms verified.");
          setVerifyOpen(false);
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Could not verify the payment terms.")),
      },
    );

  return (
    <PageCard>
      <PageCardContent>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <CalendarClock size={16} /> Payment Terms
          </h3>
          <div className="flex items-center gap-2">
            {terms?.evaluated && <PaymentTermStatusBadge status={terms.validation_status} />}
            {canRecheckPaymentTerms && !closed && (
              <button
                type="button"
                onClick={handleRecheck}
                disabled={recheck.isPending}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0A0082] hover:underline disabled:opacity-60"
                title="Re-check against the current PO, agreement and vendor master"
              >
                <RefreshCw size={12} className={recheck.isPending ? "animate-spin" : undefined} /> Re-check
              </button>
            )}
          </div>
        </div>

        {isLoading && <p className="text-sm text-gray-500">Loading payment terms…</p>}
        {error && <p className="text-sm text-rose-600">{getApiErrorMessage(error, "Could not load payment terms.")}</p>}

        {terms && !terms.evaluated && (
          <p className="text-sm italic text-gray-500">
            Payment terms have not been checked for this invoice yet. They are checked automatically when the
            invoice is reviewed or marked ready for payment{canRecheckPaymentTerms ? " — or use Re-check now" : ""}.
          </p>
        )}

        {terms?.evaluated && (
          <>
            {terms.reason_text && terms.validation_status !== PAYMENT_TERM_STATUS.COMPLIANT && (
              <div
                className={`mb-3 flex gap-2 rounded-lg border p-2 text-sm ${
                  isException ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-900"
                }`}
              >
                {isException ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <ShieldCheck size={16} className="mt-0.5 shrink-0" />}
                <span>
                  {terms.reason_text}
                  {isException && " Payment terms must be verified before this invoice can be marked ready for payment."}
                </span>
              </div>
            )}

            <table className="mb-3 w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <SourceRow
                  label="Invoice states"
                  value={terms.invoice_terms_text || daysLabel(terms.invoice_term_days)}
                  detail={terms.invoice_due_date_printed ? `Printed due date ${formatDate(terms.invoice_due_date_printed)}` : null}
                />
                {invoice.invoiceType === "PO" || terms.po_terms_text || terms.po_term_days != null ? (
                  <SourceRow
                    label="Purchase order"
                    value={terms.po_term_days != null ? daysLabel(terms.po_term_days) : "No terms"}
                    detail={terms.po_terms_text}
                    applied={terms.reference_source === "PO"}
                  />
                ) : null}
                {terms.agreement_id != null && (
                  <SourceRow
                    label="Vendor agreement"
                    value={daysLabel(terms.agreement_term_days)}
                    detail={`Agreement #${terms.agreement_id}`}
                    applied={terms.reference_source === "AGREEMENT"}
                  />
                )}
                <SourceRow
                  label="Vendor master"
                  value={terms.vendor_master_term_days != null ? daysLabel(terms.vendor_master_term_days) : "Not set"}
                  applied={terms.reference_source === "VENDOR_MASTER"}
                />
                {terms.reference_source === "MANUAL" && (
                  <SourceRow label="Verified manually" value={daysLabel(terms.applied_term_days)} applied />
                )}
              </tbody>
            </table>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-gray-500">Applied terms</dt>
                <dd className="font-medium text-gray-900">
                  {terms.applied_term_days != null ? daysLabel(terms.applied_term_days) : "—"}
                </dd>
                <dd className="text-xs text-gray-500">{REFERENCE_SOURCE_LABELS[terms.reference_source] || ""}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Counted from</dt>
                <dd className="font-medium text-gray-900">
                  {terms.due_basis === "GRN_DATE" ? "GRN date" : "Invoice date"}
                </dd>
                <dd className="text-xs text-gray-500">{terms.basis_date ? formatDate(terms.basis_date) : "No GRN yet"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Contractual due</dt>
                <dd className="font-medium text-gray-900">
                  {terms.contractual_due_date ? formatDate(terms.contractual_due_date) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Statutory (MSME) limit</dt>
                <dd className="font-medium text-gray-900">
                  {terms.statutory_due_date ? formatDate(terms.statutory_due_date) : "Not applicable"}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
              <div className="text-sm">
                <span className="text-gray-500">Effective due date: </span>
                <span className="font-semibold text-gray-900">
                  {terms.effective_due_date ? formatDate(terms.effective_due_date) : "Unverified"}
                </span>
                <span className="ml-2">
                  <DueChip terms={terms} />
                </span>
              </div>
              {canVerifyPaymentTerms && !closed && isException && (
                <Button variant="primary" size="small" onClick={openVerify}>
                  <ShieldCheck size={14} /> Verify terms
                </Button>
              )}
            </div>

            {terms.verified_by && (
              <p className="mt-2 text-xs text-gray-500">
                Verified by {terms.verified_by}
                {terms.verified_at ? ` on ${formatDate(terms.verified_at)}` : ""}
                {terms.verification_remarks ? ` — “${terms.verification_remarks}”` : ""}
              </p>
            )}
          </>
        )}
      </PageCardContent>

      <Modal
        isOpen={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        title="Verify payment terms"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setVerifyOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleVerify}
              loading={verify.isPending}
              disabled={daysInvalid || remarksInvalid}
            >
              Verify
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Confirm the payment terms that apply to <span className="font-semibold">{invoice.invoiceNumber}</span>.
            This is recorded in the audit trail with your remarks.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput
              label="Payment terms (days)"
              name="days"
              type="number"
              min={0}
              max={365}
              value={form.days}
              onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
              error={form.days !== "" && daysInvalid ? "0 to 365 days" : ""}
              requiredMark
            />
            <FormSelect
              label="Counted from"
              name="basis"
              options={DUE_BASIS_OPTIONS}
              value={form.basis}
              onChange={(e) => setForm((f) => ({ ...f, basis: e.target.value }))}
            />
          </div>
          <FormTextArea
            label="Remarks (required)"
            name="remarks"
            rows={3}
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
            placeholder="e.g. Confirmed Net 30 with the vendor by email dated …"
          />
          {terms?.statutory_due_date && (
            <p className="text-xs text-amber-700">
              MSME supplier: the statutory payment limit still caps the effective due date.
            </p>
          )}
        </div>
      </Modal>
    </PageCard>
  );
}
