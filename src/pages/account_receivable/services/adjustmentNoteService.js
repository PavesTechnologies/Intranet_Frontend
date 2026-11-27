import api from "../../../api/axiosInstance";
import { AR_BASE_URL, toNumber, unwrapApiData } from "../utils/apiAvailability";

/**
 * Credit and debit notes — adjustments to a receivable's outstanding
 * balance. Contract: docs/POST_INVOICE_API_CONTRACT.md §2.
 */
const NOTES_URL = `${AR_BASE_URL}/api/v1/adjustment-notes`;

export const ADJUSTMENT_NOTES_ENDPOINT = "GET /api/v1/adjustment-notes";

export const NOTE_TYPES = { CREDIT: "CREDIT", DEBIT: "DEBIT" };

// Reasons from the AR flow: credit notes reduce, debit notes increase the balance.
export const NOTE_REASONS = {
  CREDIT: [
    { value: "RETURNED_GOODS", label: "Returned Goods" },
    { value: "BILLING_ERROR", label: "Billing Error" },
    { value: "DISCOUNT_ADJUSTMENT", label: "Discount Adjustment" },
    { value: "PROJECT_CANCELLATION", label: "Project Cancellation" },
    { value: "OVERBILLING", label: "Overbilling" },
  ],
  DEBIT: [
    { value: "ADDITIONAL_CHARGES", label: "Additional Charges" },
    { value: "BILLING_CORRECTION", label: "Billing Correction" },
    { value: "PRICE_ADJUSTMENT", label: "Price Adjustment" },
    { value: "PENALTY_CHARGES", label: "Penalty Charges" },
    { value: "TAX_ADJUSTMENT", label: "Tax Adjustment" },
  ],
};

export const NOTE_REASON_LABELS = Object.fromEntries(
  [...NOTE_REASONS.CREDIT, ...NOTE_REASONS.DEBIT].map((r) => [r.value, r.label])
);

export const normalizeNote = (n = {}) => ({
  noteId: n.noteId || null,
  noteNumber: n.noteNumber || "—",
  noteType: String(n.noteType || "").toUpperCase(),
  receivableId: n.receivableId || null,
  invoiceId: n.invoiceId || null,
  invoiceNumber: n.invoiceNumber || "—",
  clientId: n.clientId || null,
  clientName: n.clientName || "—",
  currencyCode: n.currencyCode || "USD",
  amount: toNumber(n.amount),
  reason: n.reason || null,
  remarks: n.remarks || "",
  noteDate: n.noteDate || null,
  status: String(n.status || "ISSUED").toUpperCase(),
  balanceBefore: n.balanceBefore === undefined || n.balanceBefore === null ? null : toNumber(n.balanceBefore),
  balanceAfter: n.balanceAfter === undefined || n.balanceAfter === null ? null : toNumber(n.balanceAfter),
  createdAt: n.createdAt || null,
  createdBy: n.createdBy || null,
});

/** GET /api/v1/adjustment-notes — optional filters: noteType, clientId, receivableId. */
export const getAdjustmentNotes = async ({ noteType, clientId, receivableId } = {}) => {
  const params = {};
  if (noteType) params.noteType = noteType;
  if (clientId) params.clientId = clientId;
  if (receivableId) params.receivableId = receivableId;
  const response = await api.get(NOTES_URL, { params });
  const data = unwrapApiData(response);
  return (Array.isArray(data) ? data : []).map(normalizeNote);
};

/**
 * POST /api/v1/adjustment-notes
 * CREDIT lowers the receivable's outstanding balance (never below zero);
 * DEBIT raises it.
 */
export const createAdjustmentNote = async (payload) => {
  const response = await api.post(NOTES_URL, payload);
  return normalizeNote(unwrapApiData(response) || {});
};
