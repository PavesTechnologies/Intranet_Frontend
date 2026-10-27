import api from "../../../api/axiosInstance";
import { AR_BASE_URL, toNumber, unwrapApiData } from "../utils/apiAvailability";

/**
 * Customer ledger — every invoice, payment and note for one client with a
 * running balance. Contract: docs/POST_INVOICE_API_CONTRACT.md §3.
 * (Aging analysis needs no new API — it is computed from
 * GET /api/v1/receivables/outstanding.)
 */
export const CUSTOMER_LEDGER_ENDPOINT = "GET /api/v1/customers/{clientId}/ledger";

export const LEDGER_ENTRY_TYPE_LABELS = {
  INVOICE: "Invoice",
  PAYMENT: "Payment",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
};

const normalizeEntry = (e = {}) => ({
  entryId: e.entryId || `${e.entryType}-${e.reference}-${e.entryDate}`,
  entryDate: e.entryDate || null,
  entryType: String(e.entryType || "").toUpperCase(),
  reference: e.reference || "—",
  description: e.description || "",
  debit: toNumber(e.debit),
  credit: toNumber(e.credit),
  runningBalance: toNumber(e.runningBalance),
  invoiceId: e.invoiceId || null,
});

export const normalizeLedger = (l = {}) => ({
  clientId: l.clientId || null,
  clientName: l.clientName || "—",
  currencyCode: l.currencyCode || "USD",
  openingBalance: toNumber(l.openingBalance),
  closingBalance: toNumber(l.closingBalance),
  totals: {
    invoiced: toNumber(l.totals?.invoiced),
    received: toNumber(l.totals?.received),
    credited: toNumber(l.totals?.credited),
    debited: toNumber(l.totals?.debited),
  },
  entries: Array.isArray(l.entries) ? l.entries.map(normalizeEntry) : [],
});

/** GET /api/v1/customers/{clientId}/ledger?currencyCode=&fromDate=&toDate= */
export const getCustomerLedger = async (clientId, { currencyCode, fromDate, toDate } = {}) => {
  const params = {};
  if (currencyCode) params.currencyCode = currencyCode;
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  const response = await api.get(`${AR_BASE_URL}/api/v1/customers/${clientId}/ledger`, { params });
  return normalizeLedger(unwrapApiData(response) || {});
};
