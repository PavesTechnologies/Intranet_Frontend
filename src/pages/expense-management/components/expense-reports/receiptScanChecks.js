/**
 * Checks on a scanned receipt (OCR result) before it becomes an expense line. The backend enforces the
 * same amount rule in POST /receipts/{id}/confirm; these let the review form say so before submitting.
 */

// Within a cent is rounding, not a mismatch - same tolerance as ReceiptConfirmationServiceImpl.
const AMOUNT_TOLERANCE = 0.01;

const toAmount = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const formatAmount = (value, currencyCode) =>
  `${currencyCode ? `${currencyCode} ` : ""}${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Compares the amount being claimed with the receipt total the scan read. Returns null when they agree
 * or can't be compared (no scanned total, nothing entered yet, or different currencies); otherwise
 * `{ direction: "HIGHER" | "LOWER", message, needsReason }`. Claiming more than the receipt needs a
 * reason in the description; claiming less (part of a bill) is allowed but called out.
 */
export const receiptAmountMismatch = ({ enteredAmount, receiptTotal, enteredCurrencyCode, receiptCurrencyCode }) => {
  const entered = toAmount(enteredAmount);
  const total = toAmount(receiptTotal);
  if (entered === null || entered <= 0 || total === null || total <= 0) return null;
  if (enteredCurrencyCode && receiptCurrencyCode
      && enteredCurrencyCode.toUpperCase() !== receiptCurrencyCode.toUpperCase()) return null;
  if (Math.abs(entered - total) <= AMOUNT_TOLERANCE + 1e-9) return null;

  const shown = formatAmount(total, receiptCurrencyCode || enteredCurrencyCode);
  if (entered > total) {
    return {
      direction: "HIGHER",
      needsReason: true,
      message: `The scan read the receipt total as ${shown}. You're claiming more than that - add a description explaining the difference.`,
    };
  }
  return {
    direction: "LOWER",
    needsReason: false,
    message: `The scan read the receipt total as ${shown}. You're claiming less - fine for part of a bill, otherwise check the amount.`,
  };
};

/** True when the scan found none of merchant, date and total - usually not a receipt, or unreadable. */
export const scanFoundNothing = (ocr) =>
  !!ocr && !(ocr.merchantName || "").trim() && !ocr.receiptDate && !(toAmount(ocr.totalAmount) > 0);

/**
 * Whether the scan should be checked by hand. The backend decides (missing core field, confidence under
 * its configured threshold, or subtotal + tax not adding up to the total) and returns `reviewRecommended`;
 * the confidence fallback only covers an older response without that flag, at the backend's default 0.80.
 */
export const scanNeedsReview = (ocr) => {
  if (!ocr) return false;
  if (typeof ocr.reviewRecommended === "boolean") return ocr.reviewRecommended;
  const confidence = toAmount(ocr.confidenceScore);
  if (confidence === null) return false;
  return confidence > 1 ? confidence < 80 : confidence < 0.8;
};
