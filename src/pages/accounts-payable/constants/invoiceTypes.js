/**
 * Invoice type has exactly two values, driven by whether the invoice is linked to a purchase
 * order — this is the classification the business actually filters/reports on, not a document
 * format distinction. A PO invoice always carries a purchaseOrder (see types/invoice.js); a
 * Non-PO invoice's purchaseOrder is always null.
 */
export const INVOICE_TYPES = {
  PO: "PO",
  NON_PO: "Non-PO",
};

export const INVOICE_TYPE_OPTIONS = Object.values(INVOICE_TYPES).map((value) => ({
  value,
  label: value,
}));

/** Used for a newly drafted invoice before any PO linkage is confirmed. */
export const DEFAULT_INVOICE_TYPE = INVOICE_TYPES.NON_PO;
