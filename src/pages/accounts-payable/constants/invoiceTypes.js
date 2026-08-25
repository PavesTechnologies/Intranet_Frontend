/**
 * Invoice type — exact `InvoiceType` enum values from the backend ("PO" | "NON_PO"), driven by
 * whether the invoice is linked to a purchase order. Values here must match what the backend
 * sends/accepts verbatim (filters and the OCR review form both send these raw); use
 * INVOICE_TYPE_LABELS for anything user-facing.
 */
export const INVOICE_TYPES = {
  PO: "PO",
  NON_PO: "NON_PO",
};

export const INVOICE_TYPE_LABELS = {
  [INVOICE_TYPES.PO]: "PO",
  [INVOICE_TYPES.NON_PO]: "Non-PO",
};

export const INVOICE_TYPE_OPTIONS = Object.values(INVOICE_TYPES).map((value) => ({
  value,
  label: INVOICE_TYPE_LABELS[value],
}));

/** Used for a newly drafted invoice before any PO linkage is confirmed. */
export const DEFAULT_INVOICE_TYPE = INVOICE_TYPES.NON_PO;
