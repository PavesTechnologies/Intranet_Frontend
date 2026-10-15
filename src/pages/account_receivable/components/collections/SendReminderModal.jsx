import { useEffect, useState } from "react";

import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import { showStatusToast } from "../../../../components/toastfy/toast";
import SearchableSelect from "../common/SearchableSelect";
import { receivableOptionLabel } from "../../hooks/useOutstandingReceivables";
import { formatCurrency, formatDisplayDate } from "../../utils/format";
import { getArApiErrorMessage } from "../../utils/apiAvailability";
import { REMINDER_TYPES, REMINDER_CHANNELS, sendReminder } from "../../services/collectionsService";

// Suggest the reminder type from where the invoice is against its due date.
const suggestType = (receivable) => {
  if (!receivable) return "OVERDUE";
  // Uses the live (local-date) aging from useOutstandingReceivables.
  if (receivable.daysOverdue > 0) return "OVERDUE";
  if (receivable.daysUntilDue === 0) return "DUE_TODAY";
  return "UPCOMING_DUE";
};

export default function SendReminderModal({ isOpen, onClose, onSent, receivables, prefillReceivableId }) {
  const [form, setForm] = useState({ receivableId: "", reminderType: "OVERDUE", channel: "EMAIL", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const receivable = receivables.find((r) => r.receivableId === prefillReceivableId);
    setForm({ receivableId: receivable?.receivableId || "", reminderType: suggestType(receivable), channel: "EMAIL", message: "" });
    setFormError(null);
  }, [isOpen, prefillReceivableId, receivables]);

  const selected = receivables.find((r) => r.receivableId === form.receivableId) || null;

  const setField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "receivableId" ? { reminderType: suggestType(receivables.find((r) => r.receivableId === value)) } : {}),
    }));
  };

  const handleSend = async () => {
    if (!form.receivableId) return setFormError("Select the invoice to remind the client about.");
    setSubmitting(true);
    setFormError(null);
    try {
      const reminder = await sendReminder({
        receivableId: form.receivableId,
        reminderType: form.reminderType,
        channel: form.channel,
        message: form.message.trim() || null,
      });
      // Like invoice delivery, the outcome is in the body: FAILED is not a success.
      if (reminder.status === "FAILED") {
        setFormError(`Reminder could not be sent: ${reminder.failureReason || "delivery failed."}`);
        onSent?.();
        return;
      }
      showStatusToast(`Reminder sent${reminder.recipient ? ` to ${reminder.recipient}` : ""}.`, "success");
      onSent?.();
      onClose();
    } catch (err) {
      setFormError(getArApiErrorMessage(err, "Reminder could not be sent."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !submitting && onClose()} title="Send Payment Reminder" subtitle="Remind the client about an unpaid invoice." size="2xl">
      <div className="space-y-4">
        <SearchableSelect
          label="Invoice"
          name="receivableId"
          requiredMark
          value={form.receivableId}
          onChange={setField}
          placeholder="Search invoice or client..."
          options={receivables.map((r) => ({ value: r.receivableId, label: receivableOptionLabel(r, formatCurrency) }))}
          emptyState="No outstanding invoices."
        />
        {selected && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Due {selected.dueDate ? formatDisplayDate(selected.dueDate) : "—"}
            {selected.daysOverdue > 0 ? ` · ${selected.daysOverdue} days overdue` : ""} · Outstanding{" "}
            <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(selected.outstandingBalance, selected.currencyCode)}</span>
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect label="Reminder Type" name="reminderType" value={form.reminderType} onChange={setField} options={REMINDER_TYPES} />
          <FormSelect label="Channel" name="channel" value={form.channel} onChange={setField} options={REMINDER_CHANNELS} />
        </div>
        <FormTextArea label="Message" name="message" value={form.message} onChange={setField} rows={3} placeholder="Optional note added to the standard reminder" />
        {formError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSend} loading={submitting} loadingText="Sending...">Send Reminder</Button>
        </div>
      </div>
    </Modal>
  );
}
