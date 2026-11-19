/**
 * Pure helpers for the salary deduction workflow. Kept free of React so the rules can be tested directly.
 * The backend enforces the same rules; these exist so Finance sees the problem before submitting.
 */

export const SALARY_STATUS_LABEL = {
  PENDING_SEND: "Queued to send",
  SENT_TO_PAYROLL: "Sent to payroll",
  PAYROLL_CONFIRMED: "Payroll result recorded",
  PAYROLL_FAILED: "Nothing deducted",
  CANCELLED: "Cancelled",
};

export const EMAIL_STATUS_LABEL = {
  NOT_QUEUED: "Not queued",
  QUEUED: "Queued",
  PENDING: "Queued, not yet sent",
  SENT: "Delivered to payroll",
  FAILED: "Failed - can be sent again",
  CANCELLED: "Withdrawn",
};

export const EVIDENCE_TYPE_OPTIONS = [
  { value: "PAYROLL_EMAIL", label: "Payroll confirmation email" },
  { value: "PAYSLIP", label: "Payslip" },
  { value: "PAYROLL_RECORD", label: "Payroll record" },
  { value: "OTHER", label: "Other approved record" },
];

const toNumber = (raw) => {
  if (raw === null || raw === undefined) return NaN;
  const text = String(raw).trim();
  if (text === "" || !/^\d+(\.\d{1,2})?$/.test(text)) return NaN;
  return Number(text);
};

/** Returns an error message for the requested deduction amount, or "" when it is valid. */
export const validateRequestAmount = (raw, outstanding) => {
  const value = toNumber(raw);
  if (Number.isNaN(value)) return "Enter an amount with at most two decimal places.";
  if (value <= 0) return "The amount must be greater than zero.";
  if (value > Number(outstanding || 0)) return "The amount cannot exceed the outstanding balance.";
  return "";
};

/** Result form. `requested` is the request amount; a zero result is allowed. */
export const validateResult = (values, requested) => {
  const errors = {};
  const actual = toNumber(values.actualAmount);
  if (Number.isNaN(actual) || actual < 0) {
    errors.actualAmount = "Enter the amount Payroll actually deducted (0 if nothing was deducted).";
  } else if (actual > Number(requested || 0)) {
    errors.actualAmount = "The actual deduction cannot exceed the requested amount.";
  }
  if (!values.payrollMonthProcessed) {
    errors.payrollMonthProcessed = "Select the payroll month Payroll processed.";
  }
  const hasReference = Boolean(values.payrollReference && values.payrollReference.trim());
  if (!hasReference) {
    if (!values.evidenceType) {
      errors.evidenceType = "Choose the evidence type, or enter Payroll's reference.";
    }
    const hasFile = Boolean(values.evidenceFile);
    if (!hasFile && !(values.evidenceNote && values.evidenceNote.trim())) {
      errors.evidence = "Attach the evidence file, or describe it in the note, when there is no reference.";
    }
  }
  return errors;
};

/** Multipart body for the result endpoint. Only fields that have a value are sent. */
export const buildResultFormData = (values) => {
  const formData = new FormData();
  formData.append("actualAmount", String(Number(values.actualAmount)));
  formData.append("payrollMonthProcessed", values.payrollMonthProcessed);
  if (values.payrollReference && values.payrollReference.trim()) {
    formData.append("payrollReference", values.payrollReference.trim());
  }
  if (values.evidenceType) formData.append("evidenceType", values.evidenceType);
  if (values.evidenceNote && values.evidenceNote.trim()) {
    formData.append("evidenceNote", values.evidenceNote.trim());
  }
  if (values.evidenceFile) formData.append("evidenceFile", values.evidenceFile);
  return formData;
};

/** Amount to show as "shortfall" once a result is recorded. */
export const shortfallOf = (requested, actual) => Number(requested || 0) - Number(actual || 0);
