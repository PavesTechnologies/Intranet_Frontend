export const PAYMENT_BATCH_STATUS = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export const PAYMENT_BATCH_STATUS_OPTIONS = Object.values(PAYMENT_BATCH_STATUS).map((value) => ({
  value,
  label: value,
}));

export const PAYMENT_METHODS = {
  ACH: "ACH",
  WIRE: "Wire",
  CHECK: "Check",
};

export const PAYMENT_METHOD_OPTIONS = Object.values(PAYMENT_METHODS).map((value) => ({
  value,
  label: value,
}));
