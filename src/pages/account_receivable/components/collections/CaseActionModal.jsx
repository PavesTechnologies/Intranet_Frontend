import { useEffect, useState } from "react";

import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { formatCurrency } from "../../utils/format";
import { getArApiErrorMessage } from "../../utils/apiAvailability";
import {
  ACTIVITY_TYPES,
  assignCollectionCase,
  logCaseActivity,
  recordPromiseToPay,
  escalateCollectionCase,
  resolveCollectionCase,
} from "../../services/collectionsService";
import { toLocalIsoDate } from "../../services/receivableService";

const today = () => toLocalIsoDate();

// One modal for every case action — each entry defines its fields, validation and API call.
const ACTIONS = {
  assign: {
    title: "Assign Collector",
    submit: "Assign",
    initial: (c) => ({ assigneeName: c.assigneeName || "" }),
    validate: (f) => (!f.assigneeName.trim() ? "Enter the collector's name." : null),
    run: (c, f) => assignCollectionCase(c.caseId, f.assigneeName.trim()),
    done: "Collector assigned.",
  },
  activity: {
    title: "Log Follow-up",
    submit: "Save Follow-up",
    initial: () => ({ activityType: "CALL", outcome: "", notes: "", nextFollowUpDate: "" }),
    validate: (f) => (!f.outcome.trim() ? "Describe the outcome of the follow-up." : null),
    run: (c, f) =>
      logCaseActivity(c.caseId, {
        activityType: f.activityType,
        outcome: f.outcome.trim(),
        notes: f.notes.trim() || null,
        nextFollowUpDate: f.nextFollowUpDate || null,
      }),
    done: "Follow-up logged.",
  },
  promise: {
    title: "Record Promise to Pay",
    submit: "Save Promise",
    initial: (c) => ({ promisedDate: "", promisedAmount: c.totalOverdue ? String(c.totalOverdue) : "", notes: "" }),
    validate: (f) => {
      if (!f.promisedDate) return "Enter the promised payment date.";
      if (f.promisedDate < today()) return "The promised date cannot be in the past.";
      if (!(Number(f.promisedAmount) > 0)) return "Enter the promised amount.";
      return null;
    },
    run: (c, f) =>
      recordPromiseToPay(c.caseId, {
        promisedDate: f.promisedDate,
        promisedAmount: Number(f.promisedAmount),
        notes: f.notes.trim() || null,
      }),
    done: "Promise to pay recorded.",
  },
  escalate: {
    title: "Escalate Case",
    submit: "Escalate",
    initial: () => ({ reason: "" }),
    validate: (f) => (!f.reason.trim() ? "Give the reason for escalation." : null),
    run: (c, f) => escalateCollectionCase(c.caseId, f.reason.trim()),
    done: "Case escalated.",
  },
  resolve: {
    title: "Resolve Case",
    submit: "Resolve",
    initial: () => ({ resolution: "" }),
    validate: (f) => (!f.resolution.trim() ? "Describe how the case was resolved." : null),
    run: (c, f) => resolveCollectionCase(c.caseId, f.resolution.trim()),
    done: "Case resolved.",
  },
};

export default function CaseActionModal({ action, collectionCase, onClose, onDone }) {
  const config = action ? ACTIONS[action] : null;
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (config && collectionCase) {
      setForm(config.initial(collectionCase));
      setFormError(null);
    }
  }, [action, collectionCase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!config || !collectionCase) return null;

  const setField = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    const error = config.validate(form);
    if (error) return setFormError(error);
    setSubmitting(true);
    setFormError(null);
    try {
      await config.run(collectionCase, form);
      showStatusToast(config.done, "success");
      onDone?.();
      onClose();
    } catch (err) {
      setFormError(getArApiErrorMessage(err, "The action could not be completed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => !submitting && onClose()}
      title={config.title}
      subtitle={`${collectionCase.caseNumber} · ${collectionCase.clientName} · ${formatCurrency(collectionCase.totalOverdue, collectionCase.currencyCode)} overdue`}
      size="xl"
    >
      <div className="space-y-4">
        {action === "assign" && <FormInput label="Collector" name="assigneeName" value={form.assigneeName || ""} onChange={setField} requiredMark />}

        {action === "activity" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormSelect label="Type" name="activityType" value={form.activityType} onChange={setField} options={ACTIVITY_TYPES} />
              <FormDatePicker label="Next Follow-up" name="nextFollowUpDate" value={form.nextFollowUpDate || ""} onChange={setField} min={today()} />
            </div>
            <FormInput label="Outcome" name="outcome" value={form.outcome || ""} onChange={setField} placeholder="e.g. Client confirmed payment next week" requiredMark />
            <FormTextArea label="Notes" name="notes" value={form.notes || ""} onChange={setField} rows={2} placeholder="Optional" />
          </>
        )}

        {action === "promise" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormDatePicker label="Promised Date" name="promisedDate" value={form.promisedDate || ""} onChange={setField} min={today()} required />
              <FormInput
                label={`Promised Amount (${collectionCase.currencyCode})`}
                name="promisedAmount"
                type="number"
                value={form.promisedAmount || ""}
                onChange={setField}
                requiredMark
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <FormTextArea label="Notes" name="notes" value={form.notes || ""} onChange={setField} rows={2} placeholder="Optional" />
          </>
        )}

        {action === "escalate" && (
          <FormTextArea label="Reason" name="reason" value={form.reason || ""} onChange={setField} rows={3} required placeholder="Why this case needs escalation (e.g. legal)" />
        )}

        {action === "resolve" && (
          <FormTextArea label="Resolution" name="resolution" value={form.resolution || ""} onChange={setField} rows={3} required placeholder="How the case was resolved" />
        )}

        {formError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant={action === "escalate" ? "danger" : "primary"} onClick={handleSubmit} loading={submitting} loadingText="Saving...">
            {config.submit}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
