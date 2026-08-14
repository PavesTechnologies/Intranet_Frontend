/**
 * Payment record statuses — exact `status_code` values from the backend's status_master
 * (module_name = PAYMENT), set via PATCH /apm/payment/{id}/status. A Payment and the invoice(s)
 * it's allocated against are separate backend entities with independent status lifecycles, so
 * these are defined on their own rather than re-exported from invoiceStatus.js.
 */
export const PAYMENT_STATUS = {
  SCHEDULED: "Scheduled",
  SENT: "Sent",
  CLEARED: "Cleared",
  FAILED: "Failed",
};

export const PAYMENT_STATUS_OPTIONS = Object.values(PAYMENT_STATUS).map((value) => ({
  value,
  label: value,
}));

/** Recorded on the payment when created. */
export const PAYMENT_METHODS = {
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  UPI: "UPI",
};

export const PAYMENT_METHOD_OPTIONS = Object.values(PAYMENT_METHODS).map((value) => ({
  value,
  label: value,
}));
