import React, { useEffect, useState } from "react";
import Modal from "@/components/Modal/modal";
import Button from "@/components/Button/Button";
import FormInput from "@/components/forms/FormInput";
import { formatMoney } from "../../../approval-engine/constants/approvalLabels";

/** Mirrors the backend PaymentMethod enum. */
const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer (NEFT / RTGS / IMPS)" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

const today = () => new Date().toISOString().split("T")[0];

/**
 * AP records the payment it actually made. The report becomes "Paid" only when the server accepts
 * this - the amount must equal what the employee is owed, so a stale screen can't confirm the wrong
 * figure. onConfirm receives { paymentReference, paymentMethod, paymentDate, amountPaid, remarks }.
 */
export default function ConfirmPaymentModal({ isOpen, onClose, onConfirm, isSaving, reportNumber, amountOwed, currencyCode }) {
  const [form, setForm] = useState({ paymentReference: "", paymentMethod: "BANK_TRANSFER", paymentDate: today(), amountPaid: "", remarks: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm({
        paymentReference: "",
        paymentMethod: "BANK_TRANSFER",
        paymentDate: today(),
        amountPaid: amountOwed != null ? Number(amountOwed).toFixed(2) : "",
        remarks: "",
      });
      setErrors({});
    }
  }, [isOpen, amountOwed]);

  if (!isOpen) return null;

  const set = (name) => (e) => {
    setForm((prev) => ({ ...prev, [name]: e.target.value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.paymentReference.trim()) next.paymentReference = "Enter the UTR, UPI transaction id or cheque number.";
    if (!form.paymentDate) next.paymentDate = "Enter the date the payment was made.";
    else if (form.paymentDate > today()) next.paymentDate = "The payment date can't be in the future.";
    const amount = Number(form.amountPaid);
    if (!form.amountPaid || !(amount > 0)) next.amountPaid = "Enter the amount paid.";
    else if (amountOwed != null && Math.abs(amount - Number(amountOwed)) > 0.01) {
      next.amountPaid = `Must equal the amount owed (${formatMoney(amountOwed, currencyCode)}).`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onConfirm({
      paymentReference: form.paymentReference.trim(),
      paymentMethod: form.paymentMethod,
      paymentDate: form.paymentDate,
      amountPaid: Number(form.amountPaid),
      remarks: form.remarks.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? undefined : onClose}
      title="Confirm payment"
      subtitle={`${reportNumber || "Expense report"} · ${formatMoney(amountOwed, currencyCode)} owed to the employee`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="success" onClick={submit} loading={isSaving} loadingText="Confirming...">
            Confirm payment made
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Only confirm once the money has actually been sent. The employee sees this report as paid, with this
          reference, as soon as you confirm. This can't be undone.
        </p>
        <FormInput
          label="Payment reference (UTR / transaction id / cheque no.)"
          name="paymentReference"
          value={form.paymentReference}
          onChange={set("paymentReference")}
          placeholder="e.g. HDFCN26101500123456"
          requiredMark
          maxLength={100}
          error={errors.paymentReference}
          disabled={isSaving}
        />
        <div className="space-y-1">
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">
            Payment method<span className="ml-1 text-red-500">*</span>
          </label>
          <select
            id="paymentMethod"
            value={form.paymentMethod}
            onChange={set("paymentMethod")}
            disabled={isSaving}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormInput
            label="Payment date"
            name="paymentDate"
            type="date"
            value={form.paymentDate}
            onChange={set("paymentDate")}
            max={today()}
            requiredMark
            error={errors.paymentDate}
            disabled={isSaving}
          />
          <FormInput
            label={`Amount paid (${currencyCode || "INR"})`}
            name="amountPaid"
            type="number"
            value={form.amountPaid}
            onChange={set("amountPaid")}
            step="0.01"
            min="0"
            requiredMark
            error={errors.amountPaid}
            disabled={isSaving}
            onWheel={(e) => e.currentTarget.blur()}
          />
        </div>
        <FormInput
          label="Remarks (optional)"
          name="remarks"
          value={form.remarks}
          onChange={set("remarks")}
          placeholder="e.g. Paid in the 15 Oct payment batch"
          maxLength={500}
          disabled={isSaving}
        />
      </div>
    </Modal>
  );
}
