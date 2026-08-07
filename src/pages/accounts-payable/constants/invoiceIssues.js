/**
 * Constants for invoice-level issues (raised by OCR extraction or Validation checks) and the
 * individual check outcomes that produce them. Kept separate from invoiceStatus.js — an issue's
 * severity/status is not an invoice lifecycle status, it's a property of a single finding.
 */

/** Severity of an individual invoice issue. */
export const ISSUE_SEVERITY = {
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
};

export const ISSUE_SEVERITY_OPTIONS = Object.values(ISSUE_SEVERITY).map((value) => ({
  value,
  label: value,
}));

/** Where an issue was raised. */
export const ISSUE_SOURCE = {
  OCR: "OCR",
  VALIDATION: "Validation",
};

/** Lifecycle status of a single issue (independent of the invoice's own status). */
export const ISSUE_STATUS = {
  OPEN: "Open",
  RESOLVED: "Resolved",
};

/**
 * Outcome of an individual validation/OCR check — distinct from ISSUE_SEVERITY: a check can
 * PASS and raise no issue at all, so this isn't just an alias for severity.
 */
export const CHECK_RESULT = {
  PASS: "PASS",
  WARNING: "WARNING",
  ERROR: "ERROR",
};

export const CHECK_RESULT_OPTIONS = Object.values(CHECK_RESULT).map((value) => ({
  value,
  label: value,
}));

/** The individual checks run on an invoice during the Validation Queue stage. */
export const VALIDATION_CHECKS = {
  VENDOR: "Vendor Validation",
  GST: "GST Validation",
  PO_MATCH: "PO Matching",
  GRN_MATCH: "GRN Matching",
  TAX: "Tax Validation",
  AMOUNT: "Amount Validation",
  DUPLICATE: "Duplicate Invoice Validation",
};
