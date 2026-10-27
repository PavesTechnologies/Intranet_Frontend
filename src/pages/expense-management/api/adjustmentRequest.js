/**
 * Request body for POST /xms/finance/reimbursements (CashAdvanceAdjustmentRequest on the backend).
 *
 * The backend accepts JSON only, with exactly these fields:
 *   advanceId (UUID, required), reportId (UUID, required), adjustedAmount (> 0, required), adjustedBy (optional;
 *   the server fills it from the signed-in user when omitted).
 * It has no payment-proof, notes, settlement-action or review-cycle fields. Anything the server cannot store is
 * refused here rather than dropped.
 */

export class AdjustmentRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = "AdjustmentRequestError";
  }
}

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

/**
 * Maps the values to the backend body. Throws AdjustmentRequestError when the request is incomplete or the server
 * has no way to record it, so the caller can show the reason instead of sending a body that will be rejected.
 */
/** A new idempotency key. Reuse the same key when retrying the same submit, so the server applies the offset once. */
export const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `adj-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const buildAdjustmentRequest = ({ advanceId, reportId, adjustedAmount, adjustedBy, idempotencyKey }) => {
  if (isBlank(advanceId)) {
    throw new AdjustmentRequestError("Select a cash advance.");
  }
  if (isBlank(reportId)) {
    throw new AdjustmentRequestError("Select the approved expense report to settle against this advance.");
  }
  const amount = Number(adjustedAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AdjustmentRequestError("Enter an adjustment amount greater than zero.");
  }

  const body = {
    advanceId: String(advanceId),
    reportId: String(reportId),
    adjustedAmount: Math.round(amount * 100) / 100,
    idempotencyKey: isBlank(idempotencyKey) ? newIdempotencyKey() : String(idempotencyKey).trim(),
  };
  if (!isBlank(adjustedBy)) {
    body.adjustedBy = String(adjustedBy).trim();
  }
  return body;
};

/**
 * Why a settlement action cannot be recorded through the adjustment endpoint yet. The settlement forms still collect
 * these actions, so the page shows the reason instead of sending a body the server would reject or silently drop.
 */
export const UNSUPPORTED_SETTLEMENT_MESSAGE = {
  ADJUST:
    "Carrying the balance forward to the next expense report is not supported by the server yet. The advance stays open until it is returned or deducted.",
  PAYROLL_DEDUCTION: "Payroll deduction is not supported by this settlement yet.",
  SETTLE:
    "This settlement cannot be recorded yet. The adjustment endpoint offsets an approved report against an advance and has no payment-proof fields, so a money movement has no place to store its proof. Finance must confirm how the offset and the Repay path combine.",
};

/**
 * The message to show after a failed adjustment call: the reason from the client-side check, otherwise the server's
 * message, otherwise the fallback.
 */
export const adjustmentErrorMessage = (err, fallback) => {
  if (err instanceof AdjustmentRequestError) return err.message;
  return err?.response?.data?.message || fallback;
};

/** The message to show for a settlement action the server cannot record, or null when it can be sent. */
export const getSettlementBlockReason = (action) => UNSUPPORTED_SETTLEMENT_MESSAGE[action] ?? null;
