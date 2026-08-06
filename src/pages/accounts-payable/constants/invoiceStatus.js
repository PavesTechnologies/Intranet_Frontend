export const INVOICE_STATUS = {
  DRAFT: "Draft",
  PENDING_VALIDATION: "Pending Validation",
  PENDING_MATCH: "Pending Match",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  PAID: "Paid",
  REJECTED: "Rejected",
  EXCEPTION: "Exception",
};

export const INVOICE_STATUS_OPTIONS = Object.values(INVOICE_STATUS).map((value) => ({
  value,
  label: value,
}));

export const MATCH_STATUS = {
  MATCHED: "Matched",
  PARTIAL: "Partially Matched",
  UNMATCHED: "Unmatched",
};

export const MATCH_STATUS_OPTIONS = Object.values(MATCH_STATUS).map((value) => ({
  value,
  label: value,
}));
