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
 * Validates the form against the server-provided remaining payable. Returns {field: message}.
 * The backend re-validates everything (and is authoritative) — this only gives fast feedback.
 */
export function validateRecordPayment(form, remaining, { receiptRequired = false } = {}) {
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
  if (!form.referenceNumber?.trim()) errors.referenceNumber = "Reference is required.";
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
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const submitting = recordPayment.isPending || uploadDocument.isPending;

  const handleSubmit = () => {
    const validation = validateRecordPayment(form, remaining, { receiptRequired: metadata?.receiptRequired });
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
          <FormInput
            label={`${referenceLabel} *`}
            name="referenceNumber"
            value={form.referenceNumber}
            maxLength={100}
            onChange={(e) => setField("referenceNumber", e.target.value)}
            error={errors.referenceNumber}
          />
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
