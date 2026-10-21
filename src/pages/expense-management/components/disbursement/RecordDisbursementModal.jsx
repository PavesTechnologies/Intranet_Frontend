import React, { useState } from "react";
import Modal from "@/components/Modal/modal";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { EMPTY_DISBURSEMENT_CONFIRMATION, validateDisbursementConfirmation } from "./disbursementConfirmation";
import DisbursementConfirmationFields, { Field, confirmationInputClass } from "./DisbursementConfirmationFields";

const FORM_ID = "record-disbursement-form";

/**
 * Captures how a payout was made and its proof, in the shared app Modal. The caller decides what
 * happens on submit (cash advance disbursement, AP payment completion); this modal only validates
 * and hands over the values. Nothing is marked paid by this component.
 */
export default function RecordDisbursementModal({
  title,
  submitLabel,
  summary,
  isSubmitting = false,
  onCancel,
  onSubmit,
}) {
  const [values, setValues] = useState(EMPTY_DISBURSEMENT_CONFIRMATION);
  const [errors, setErrors] = useState({});

  const handleFieldChange = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const nextErrors = validateDisbursementConfirmation(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(values);
  };

  return (
    <Modal
      isOpen
      onClose={isSubmitting ? undefined : onCancel}
      title={title}
      size="3xl"
      maxHeight="max-h-[92vh]"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="text-sm">
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            disabled={isSubmitting}
            className="text-sm bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? <LoadingSpinner size="sm" className="mr-1.5" /> : submitLabel}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5">
        {summary}

        <DisbursementConfirmationFields values={values} errors={errors} onFieldChange={handleFieldChange} />

        <Field id="disb-note" label="Confirmation note" required={false}>
          <textarea
            id="disb-note"
            rows={2}
            maxLength={500}
            className={confirmationInputClass}
            value={values.confirmationNote}
            onChange={(e) => handleFieldChange("confirmationNote", e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
