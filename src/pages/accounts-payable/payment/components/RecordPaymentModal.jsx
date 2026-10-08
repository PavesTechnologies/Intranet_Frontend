import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FileUpload from "../../../../components/forms/FileUpload";
import { usePaymentMetadata, useRecordPaymentMutation, useUploadPaymentDocumentMutation } from "../hooks/usePaymentTracking";
import { ACCEPTED_DOCUMENT_EXTENSIONS, validateDocumentFile } from "../../utils/documentUpload";
import { formatCurrency } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";

// Local calendar date (not toISOString(), which is UTC and can be a day behind in IST).
const todayIso = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/**
 * Reference-number format per payment mode, keyed by the mode's *label* (normalized to
 * uppercase/letters-only) rather than its backend `value` code — the metadata endpoint
 * (usePaymentMetadata) sends payment modes fully dynamically with no frontend-side enum, and the
 * only mode `value` confirmed against real data so far is "NEFT" (RecordPaymentModal.test.jsx);
 * matching on the displayed label is the safer bet since every label here is taken directly off
 * the actual dropdown. Patterns follow standard Indian banking reference conventions (NEFT/RTGS
 * UTR: 16-char alphanumeric; IMPS/UPI RRN: 12-digit numeric; cheque/DD number: 6-digit numeric) —
 * these are common conventions, not a confirmed backend contract, so treat a false-positive reject
 * here as a reason to double check with the backend/finance team rather than as a bug in the
 * invoice's actual reference. A mode with no entry here (e.g. "Bank Transfer", which has no fixed
 * format) only gets the existing non-empty check.
 */
const REFERENCE_FORMAT_BY_MODE = {
  NEFT: { pattern: /^[A-Za-z0-9]{16}$/, message: "NEFT UTR must be exactly 16 alphanumeric characters." },
  RTGS: { pattern: /^[A-Za-z0-9]{16}$/, message: "RTGS UTR must be exactly 16 alphanumeric characters." },
  IMPS: { pattern: /^\d{12}$/, message: "IMPS reference number (RRN) must be exactly 12 digits." },
  UPI: { pattern: /^\d{12}$/, message: "UPI reference number (RRN) must be exactly 12 digits." },
  CHEQUE: { pattern: /^\d{6}$/, message: "Cheque number must be exactly 6 digits." },
  DEMANDDRAFT: { pattern: /^\d{6}$/, message: "Demand Draft number must be exactly 6 digits." },
};

function normalizeModeKey(label = "") {
  return label.toUpperCase().replace(/[^A-Z]/g, "");
}

/**
 * Validates the form against the server-provided remaining payable. Returns {field: message}.
 * The backend re-validates everything (and is authoritative) — this only gives fast feedback.
 */
export function validateRecordPayment(form, remaining, { receiptRequired = false, paymentModeLabel } = {}) {
  const errors = {};
  if (!form.paymentDate) errors.paymentDate = "Payment date is required.";
  else if (form.paymentDate > todayIso()) errors.paymentDate = "Payment date cannot be in the future.";

  const amount = Number(form.amount);
  if (form.amount === "" || form.amount === null || Number.isNaN(amount)) errors.amount = "Payment amount is required.";
  else if (amount <= 0) errors.amount = "Payment amount must be greater than zero.";
  else if (!/^\d+(\.\d{1,2})?$/.test(String(form.amount).trim())) errors.amount = "Use at most 2 decimal places.";
  else if (remaining != null && amount > remaining) {
    errors.amount = `Payment amount cannot exceed the remaining payable (${formatCurrency(remaining)}).`;
  }

  if (!form.paymentMode) errors.paymentMode = "Payment mode is required.";
  const reference = form.referenceNumber?.trim();
  if (!reference) {
    errors.referenceNumber = "Reference is required.";
  } else {
    const format = REFERENCE_FORMAT_BY_MODE[normalizeModeKey(paymentModeLabel)];
    if (format && !format.pattern.test(reference)) errors.referenceNumber = format.message;
  }
  if (form.receipt) {
    const fileError = validateDocumentFile(form.receipt);
    if (fileError) errors.receipt = fileError;
  } else if (receiptRequired) {
    errors.receipt = "Payment receipt is required.";
  }
  return errors;
}

function ReadOnlyRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <dt className="text-gray-500">{label}</dt>
      <dd className={strong ? "font-semibold text-gray-900" : "font-medium text-gray-900"}>{value}</dd>
    </div>
  );
}

/**
 * Record a payment Finance has already made to the vendor (partial or full). Amounts shown are
 * the backend's (InvoicePaymentSummaryDTO) — TDS / net payable / remaining are never recomputed
 * here. The resulting invoice status (Partially Paid / Paid) is decided by the backend.
 * @param {{isOpen: boolean, onClose: () => void, invoice: object, onRecorded?: (detail: object) => void}} props
 */
export default function RecordPaymentModal({ isOpen, onClose, invoice, onRecorded }) {
  const { data: metadata } = usePaymentMetadata();
  const recordPayment = useRecordPaymentMutation();
  const uploadDocument = useUploadPaymentDocumentMutation();
  const remaining = invoice?.remainingAmount ?? null;
  const symbol = invoice?.currencySymbol || "₹";

  const emptyForm = useMemo(
    () => ({
      paymentDate: todayIso(),
      amount: remaining != null ? remaining.toFixed(2) : "",
      paymentMode: "",
      referenceNumber: "",
      remarks: "",
      receipt: null,
    }),
    [remaining],
  );
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [isOpen, emptyForm]);

  if (!invoice) return null;

  const modes = metadata?.paymentModes ?? [];
  const selectedMode = modes.find((m) => m.value === form.paymentMode);
  const referenceLabel = selectedMode?.referenceLabel || "UTR / Transaction Reference";
  const referenceFormatHint = REFERENCE_FORMAT_BY_MODE[normalizeModeKey(selectedMode?.label)]?.message;
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const submitting = recordPayment.isPending || uploadDocument.isPending;

  const handleSubmit = () => {
    const validation = validateRecordPayment(form, remaining, {
      receiptRequired: metadata?.receiptRequired,
      paymentModeLabel: selectedMode?.label,
    });
    setErrors(validation);
    if (Object.keys(validation).length) return;

    recordPayment.mutate(
      {
        invoiceId: invoice.invoiceId,
        payload: {
          payment_date: form.paymentDate,
          amount: String(form.amount).trim(),
          payment_mode: form.paymentMode,
          reference_number: form.referenceNumber.trim(),
          remarks: form.remarks.trim() || null,
        },
      },
      {
        onSuccess: async (detail) => {
          if (form.receipt && detail.recordedPaymentId) {
            try {
              await uploadDocument.mutateAsync({
                invoiceId: invoice.invoiceId,
                paymentId: detail.recordedPaymentId,
                file: form.receipt,
                documentType: "RECEIPT",
              });
            } catch (error) {
              toast.warning(
                `Payment recorded, but the receipt could not be uploaded (${getApiErrorMessage(error, "upload failed")}). ` +
                  "You can upload it from the payment details.",
              );
            }
          }
          toast.success(
            detail.statusCode === "PAID"
              ? `Payment recorded — ${invoice.invoiceNumber} is now fully paid.`
              : `Payment recorded — ${formatCurrency(detail.remainingAmount, symbol)} remains payable.`,
          );
          onRecorded?.(detail);
          onClose();
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not record the payment.")),
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title="Record Payment"
      subtitle={`${invoice.invoiceNumber} · ${invoice.vendorName}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting} loadingText="Recording…">
            Record Payment
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <dl className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
          <ReadOnlyRow label="Invoice Amount" value={formatCurrency(invoice.invoiceAmount, symbol)} />
          <ReadOnlyRow label="TDS" value={invoice.tdsApplicable ? `− ${formatCurrency(invoice.tdsAmount, symbol)}` : "Not applicable"} />
          <ReadOnlyRow label="Net Payable" value={formatCurrency(invoice.netPayable, symbol)} strong />
          <ReadOnlyRow label="Already Paid" value={formatCurrency(invoice.amountPaid, symbol)} />
          {invoice.pendingAmount > 0 && (
            <ReadOnlyRow label="Scheduled (not yet cleared)" value={formatCurrency(invoice.pendingAmount, symbol)} />
          )}
          <div className="mt-1 flex items-center justify-between border-t border-gray-200 pt-2">
            <dt className="font-semibold text-gray-700">Remaining Payable</dt>
            <dd className="text-base font-bold text-[#0A0082]">{formatCurrency(remaining, symbol)}</dd>
          </div>
        </dl>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormDatePicker
            label="Payment Date *"
            name="paymentDate"
            value={form.paymentDate}
            max={todayIso()}
            onChange={(e) => setField("paymentDate", e.target.value)}
            error={errors.paymentDate}
          />
          <FormInput
            label="Payment Amount *"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setField("amount", e.target.value)}
            error={errors.amount}
          />
          <div>
            <FormSelect
              label="Payment Mode *"
              name="paymentMode"
              options={[{ value: "", label: "Select payment mode" }, ...modes.map((m) => ({ value: m.value, label: m.label }))]}
              value={form.paymentMode}
              onChange={(e) => setField("paymentMode", e.target.value)}
            />
            {errors.paymentMode && <p className="mt-1 text-xs text-red-500">{errors.paymentMode}</p>}
          </div>
          <div>
            <FormInput
              label={`${referenceLabel} *`}
              name="referenceNumber"
              value={form.referenceNumber}
              maxLength={100}
              onChange={(e) => setField("referenceNumber", e.target.value)}
              error={errors.referenceNumber}
            />
            {!errors.referenceNumber && referenceFormatHint && (
              <p className="mt-1 text-xs text-gray-400">{referenceFormatHint}</p>
            )}
          </div>
        </div>

        <FormTextArea
          label="Remarks"
          name="remarks"
          rows={2}
          value={form.remarks}
          onChange={(e) => setField("remarks", e.target.value)}
        />

        <div>
          <FileUpload
            label={metadata?.receiptRequired ? "Payment Receipt / Proof *" : "Payment Receipt / Proof (optional)"}
            name="receipt"
            accept={ACCEPTED_DOCUMENT_EXTENSIONS.join(",")}
            onChange={(e) => setField("receipt", e.target.files?.[0] || null)}
          />
          {errors.receipt && <p className="mt-1 text-xs text-red-500">{errors.receipt}</p>}
        </div>
      </div>
    </Modal>
  );
}
