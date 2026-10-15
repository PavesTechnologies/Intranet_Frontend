import { useEffect, useMemo, useState } from "react";

import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import { showStatusToast } from "../../../../components/toastfy/toast";
import SearchableSelect from "../common/SearchableSelect";
import PaymentAllocationEditor, { toAllocationPayload, validateAllocations } from "./PaymentAllocationEditor";
import { PAYMENT_METHODS, recordPayment } from "../../services/paymentService";
import { getArApiErrorMessage } from "../../utils/apiAvailability";
import { toLocalIsoDate } from "../../services/receivableService";

const today = () => toLocalIsoDate();

const emptyForm = () => ({
  clientId: "",
  currencyCode: "",
  paymentDate: today(),
  paymentMethod: "BANK_TRANSFER",
  amount: "",
  referenceNumber: "",
  remarks: "",
});

/**
 * Record a client payment and allocate it across the client's outstanding
 * receivables. `prefill` = { clientId, receivableId } when opened from a
 * receivable ("Record Payment" on the Outstanding Receivables page).
 */
export default function RecordPaymentModal({ isOpen, onClose, onRecorded, clients, receivables, prefill }) {
  const [form, setForm] = useState(emptyForm);
  const [allocations, setAllocations] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const next = emptyForm();
    const prefillReceivable = receivables.find((r) => r.receivableId === prefill?.receivableId);
    if (prefill?.clientId) next.clientId = prefill.clientId;
    if (prefillReceivable) {
      next.clientId = prefillReceivable.clientId;
      next.currencyCode = prefillReceivable.currencyCode;
      next.amount = String(prefillReceivable.outstandingBalance);
    }
    setForm(next);
    setAllocations(
      prefillReceivable ? { [prefillReceivable.receivableId]: String(prefillReceivable.outstandingBalance) } : {}
    );
    setFormError(null);
  }, [isOpen, prefill, receivables]);

  const client = clients.find((c) => c.clientId === form.clientId) || null;
  const currencyOptions = (client?.currencies || []).map((code) => ({ value: code, label: code }));
  const currency = form.currencyCode || client?.currencies?.[0] || "";

  const clientReceivables = useMemo(
    () => receivables.filter((r) => r.clientId === form.clientId && r.currencyCode === currency),
    [receivables, form.clientId, currency]
  );

  const set = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "clientId" || name === "currencyCode") setAllocations({});
  };

  const handleSubmit = async () => {
    const amount = Number(form.amount);
    if (!form.clientId) return setFormError("Select the client who paid.");
    if (!currency) return setFormError("Select the payment currency.");
    if (!Number.isFinite(amount) || amount <= 0) return setFormError("Enter a payment amount greater than zero.");
    if (!form.paymentDate) return setFormError("Enter the payment date.");
    if (form.paymentDate > today()) return setFormError("Payment date cannot be in the future.");
    if (form.paymentMethod !== "CASH" && !form.referenceNumber.trim()) {
      return setFormError("Enter the transaction / cheque reference number.");
    }
    const allocationError = validateAllocations(allocations, clientReceivables, amount);
    if (allocationError) return setFormError(allocationError);

    setSubmitting(true);
    setFormError(null);
    try {
      const payment = await recordPayment({
        clientId: form.clientId,
        paymentDate: form.paymentDate,
        amount,
        currencyCode: currency,
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber.trim() || null,
        remarks: form.remarks.trim() || null,
        allocations: toAllocationPayload(allocations),
      });
      showStatusToast(
        payment.paymentNumber !== "—" ? `Payment ${payment.paymentNumber} recorded.` : "Payment recorded.",
        "success"
      );
      onRecorded?.(payment);
      onClose();
    } catch (err) {
      setFormError(getArApiErrorMessage(err, "Payment could not be recorded."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !submitting && onClose()} title="Record Payment" subtitle="Log money received from a client and apply it to their invoices." size="3xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SearchableSelect
            label="Client"
            name="clientId"
            requiredMark
            value={form.clientId}
            onChange={set}
            placeholder="Search client..."
            options={clients.map((c) => ({ value: c.clientId, label: c.clientName }))}
            emptyState="No clients with outstanding receivables."
          />
          {currencyOptions.length > 1 ? (
            <FormSelect label="Currency" name="currencyCode" value={currency} onChange={set} options={currencyOptions} />
          ) : (
            <FormInput label="Currency" name="currencyCode" value={currency} disabled placeholder="From client's invoices" />
          )}
          <FormDatePicker label="Payment Date" name="paymentDate" value={form.paymentDate} onChange={set} max={today()} required />
          <FormSelect label="Payment Method" name="paymentMethod" value={form.paymentMethod} onChange={set} options={PAYMENT_METHODS} />
          <FormInput label="Amount Received" name="amount" type="number" value={form.amount} onChange={set} placeholder="0.00" requiredMark onWheel={(e) => e.currentTarget.blur()} />
          <FormInput
            label={form.paymentMethod === "CHEQUE" ? "Cheque Number" : "Transaction Reference"}
            name="referenceNumber"
            value={form.referenceNumber}
            onChange={set}
            placeholder={form.paymentMethod === "CASH" ? "Optional for cash" : "UTR / transaction ID"}
            requiredMark={form.paymentMethod !== "CASH"}
          />
        </div>

        {form.clientId && (
          <PaymentAllocationEditor
            receivables={clientReceivables}
            allocations={allocations}
            onChange={setAllocations}
            available={form.amount}
            currency={currency}
          />
        )}

        <FormTextArea label="Remarks" name="remarks" value={form.remarks} onChange={set} rows={2} placeholder="Optional" />

        {formError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting} loadingText="Recording...">Record Payment</Button>
        </div>
      </div>
    </Modal>
  );
}
