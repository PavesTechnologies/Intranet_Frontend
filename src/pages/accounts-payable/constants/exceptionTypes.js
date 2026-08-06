export const EXCEPTION_TYPES = {
  PRICE_MISMATCH: "Price Mismatch",
  QUANTITY_MISMATCH: "Quantity Mismatch",
  MISSING_PO: "Missing PO",
  DUPLICATE_INVOICE: "Duplicate Invoice",
  MISSING_GRN: "Missing GRN/Receipt",
  TAX_DISCREPANCY: "Tax Discrepancy",
};

export const EXCEPTION_TYPE_OPTIONS = Object.values(EXCEPTION_TYPES).map((value) => ({
  value,
  label: value,
}));

export const EXCEPTION_STATUS = {
  OPEN: "Open",
  IN_REVIEW: "In Review",
  RESOLVED: "Resolved",
};

export const EXCEPTION_STATUS_OPTIONS = Object.values(EXCEPTION_STATUS).map((value) => ({
  value,
  label: value,
}));
