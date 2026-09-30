/**
 * TDS payment-nature codes the backend currently supports (TDS Phase 1). There is no backend
 * list endpoint for these yet, so this is a deliberate frontend-only constant — see
 * InvoiceTdsPanel. Do not invent additional codes here without confirming them against the
 * backend first (see the invoiceStatus.js precedent for why: assumed-but-unverified values have
 * caused real bugs in this module before).
 */
export const PAYMENT_NATURE_OPTIONS = [
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "PROFESSIONAL_SERVICE", label: "Professional Services" },
  { value: "TECHNICAL_SERVICE", label: "Technical Services" },
  { value: "RENT", label: "Rent" },
  { value: "COMMISSION", label: "Commission / Brokerage" },
  { value: "PURCHASE_OF_GOODS", label: "Purchase of Goods" },
  { value: "INTEREST", label: "Interest" },
  { value: "OTHER", label: "Other" },
];

/** Friendly label for a payment-nature code; falls back to the raw code for an unrecognized value
 * (e.g. one added backend-side before this list is updated) rather than hiding it. */
export function paymentNatureLabel(code) {
  return PAYMENT_NATURE_OPTIONS.find((option) => option.value === code)?.label || code;
}

export default PAYMENT_NATURE_OPTIONS;
