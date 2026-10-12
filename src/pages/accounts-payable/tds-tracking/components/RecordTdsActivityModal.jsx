import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import FormTextArea from "../../../../components/forms/FormTextArea";
import { useRecordTdsActivityMutation } from "../hooks/useTdsTracking";
import { getApiErrorMessage } from "../../utils/apiError";

const todayIso = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// Field set per activity — mirrors RecordTdsDeduction/Deposit/FilingRequest in
// Backend/API_Layer/interface/tds_tracking_interface.py.
const FIELDS = {
  RECORD_DEDUCTION: [{ name: "deduction_date", label: "Deduction Date", type: "date", required: true }],
  RECORD_DEPOSIT: [
    { name: "challan_number", label: "Challan Number", required: true, maxLength: 50 },
    { name: "deposit_date", label: "TDS Payment Date", type: "date", required: true },
    { name: "bsr_code", label: "BSR Code (7 digits)", maxLength: 7 },
  ],
  RECORD_FILING: [
    { name: "filing_date", label: "Filing Date", type: "date", required: true },
    { name: "filing_reference", label: "Filing Reference / Acknowledgement No.", required: true, maxLength: 100 },
  ],
};

const EXISTING = {
  deduction_date: "deductionDate",
  challan_number: "challanNumber",
  deposit_date: "depositDate",
  bsr_code: "bsrCode",
  filing_date: "filingDate",
  filing_reference: "filingReference",
};

export function validateTdsActivity(action, values) {
  const errors = {};
  for (const field of FIELDS[action] || []) {
    const value = (values[field.name] || "").trim();
    if (field.required && !value) errors[field.name] = `${field.label} is required.`;
    else if (field.type === "date" && value && value > todayIso()) errors[field.name] = `${field.label} cannot be in the future.`;
  }
  if (values.bsr_code && !/^\d{7}$/.test(values.bsr_code.trim())) errors.bsr_code = "BSR Code must be 7 digits.";
  return errors;
}

/**
 * Records a TDS activity Finance completed OUTSIDE this system (the Intranet does not file TDS
 * with the tax authority). Labels/actions come from the backend metadata; TDS rate/amount are not
 * editable here. Re-opening the current step pre-fills its values so it can be corrected.
 * @param {{isOpen: boolean, onClose: () => void, invoiceId: number, action: string|null,
 *   actionLabel?: string, tracking?: object}} props
 */
export default function RecordTdsActivityModal({ isOpen, onClose, invoiceId, action, actionLabel, tracking = {} }) {
  const recordActivity = useRecordTdsActivityMutation();
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen || !action) return;
    const initial = { remarks: "" };
    for (const field of FIELDS[action]) {
      initial[field.name] = tracking?.[field.name] ?? tracking?.[EXISTING[field.name]] ?? "";
    }
    setValues(initial);
    setErrors({});
  }, [isOpen, action, tracking]);

  if (!action) return null;

  const handleSubmit = () => {
    const validation = validateTdsActivity(action, values);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    const payload = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, typeof value === "string" ? value.trim() || null : value]),
    );
    recordActivity.mutate(
      { invoiceId, action, payload },
      {
        onSuccess: (detail) => {
          toast.success(`${actionLabel || "TDS activity"} recorded — status is now ${detail.trackingStatusLabel}.`);
          onClose();
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not record the TDS activity.")),
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={actionLabel || "Record TDS Activity"}
      subtitle="Record details of an activity already completed outside the Intranet."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={recordActivity.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={recordActivity.isPending}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {FIELDS[action].map((field) =>
          field.type === "date" ? (
            <FormDatePicker
              key={field.name}
              label={`${field.label}${field.required ? " *" : ""}`}
              name={field.name}
              value={values[field.name] || ""}
              max={todayIso()}
              onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
              error={errors[field.name]}
            />
          ) : (
            <FormInput
              key={field.name}
              label={`${field.label}${field.required ? " *" : ""}`}
              name={field.name}
              value={values[field.name] || ""}
              maxLength={field.maxLength}
              onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
              error={errors[field.name]}
            />
          ),
        )}
        <FormTextArea
          label="Remarks"
          name="remarks"
          rows={2}
          value={values.remarks || ""}
          onChange={(e) => setValues((v) => ({ ...v, remarks: e.target.value }))}
        />
      </div>
    </Modal>
  );
}
