/** Document classification captured at upload / confirmed during OCR review. */
export const INVOICE_TYPES = {
  TAX_INVOICE: "Tax Invoice",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
};

export const INVOICE_TYPE_OPTIONS = Object.values(INVOICE_TYPES).map((value) => ({
  value,
  label: value,
}));

/** Used when OCR can't confidently classify the uploaded document. */
export const DEFAULT_INVOICE_TYPE = INVOICE_TYPES.TAX_INVOICE;
