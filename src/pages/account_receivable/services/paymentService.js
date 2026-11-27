import api from "../../../api/axiosInstance";
import { AR_BASE_URL, toNumber, unwrapApiData } from "../utils/apiAvailability";

/**
 * Payments — record, allocate and reconcile client payments against
 * receivables. Contract: docs/POST_INVOICE_API_CONTRACT.md §1.
 */
const PAYMENTS_URL = `${AR_BASE_URL}/api/v1/payments`;

export const PAYMENTS_ENDPOINT = "GET /api/v1/payments";

export const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Credit / Debit Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CASH", label: "Cash" },
  { value: "WIRE_TRANSFER", label: "Wire Transfer" },
  { value: "PAYMENT_GATEWAY", label: "Payment Gateway" },
];

export const PAYMENT_METHOD_LABELS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

export const ALLOCATION_STATUS_LABELS = {
  UNALLOCATED: "Unallocated",
  PARTIALLY_ALLOCATED: "Partially Allocated",
  FULLY_ALLOCATED: "Fully Allocated",
};

export const RECONCILIATION_STATUS_LABELS = {
  UNRECONCILED: "Unreconciled",
  RECONCILED: "Reconciled",
};

const normalizeAllocation = (a = {}) => ({
  allocationId: a.allocationId || null,
  receivableId: a.receivableId || null,
  invoiceId: a.invoiceId || null,
  invoiceNumber: a.invoiceNumber || "—",
  amount: toNumber(a.amount),
});

export const normalizePayment = (p = {}) => ({
  paymentId: p.paymentId || null,
  paymentNumber: p.paymentNumber || "—",
  clientId: p.clientId || null,
  clientName: p.clientName || "—",
  paymentDate: p.paymentDate || null,
  amount: toNumber(p.amount),
  currencyCode: p.currencyCode || "USD",
  paymentMethod: p.paymentMethod || null,
  referenceNumber: p.referenceNumber || "",
  allocatedAmount: toNumber(p.allocatedAmount),
  unallocatedAmount: toNumber(p.unallocatedAmount),
  allocationStatus: String(p.allocationStatus || "UNALLOCATED").toUpperCase(),
  reconciliationStatus: String(p.reconciliationStatus || "UNRECONCILED").toUpperCase(),
  reconciledAt: p.reconciledAt || null,
  bankReference: p.bankReference || "",
  remarks: p.remarks || "",
  allocations: Array.isArray(p.allocations) ? p.allocations.map(normalizeAllocation) : [],
  createdAt: p.createdAt || null,
  createdBy: p.createdBy || null,
});

/** GET /api/v1/payments — optional filters: clientId, fromDate, toDate. */
export const getPayments = async ({ clientId, fromDate, toDate } = {}) => {
  const params = {};
  if (clientId) params.clientId = clientId;
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  const response = await api.get(PAYMENTS_URL, { params });
  const data = unwrapApiData(response);
  return (Array.isArray(data) ? data : []).map(normalizePayment);
};

/** GET /api/v1/payments/{paymentId} */
export const getPaymentById = async (paymentId) => {
  const response = await api.get(`${PAYMENTS_URL}/${paymentId}`);
  return normalizePayment(unwrapApiData(response) || {});
};

/**
 * POST /api/v1/payments
 * Records a payment and (optionally) allocates it to the client's receivables
 * in the same request. The backend lowers each receivable's outstanding
 * balance and moves it to PARTIALLY_PAID or SETTLED.
 */
export const recordPayment = async (payload) => {
  const response = await api.post(PAYMENTS_URL, payload);
  return normalizePayment(unwrapApiData(response) || {});
};

/** POST /api/v1/payments/{paymentId}/allocations — allocate the unallocated remainder. */
export const allocatePayment = async (paymentId, allocations) => {
  const response = await api.post(`${PAYMENTS_URL}/${paymentId}/allocations`, { allocations });
  return normalizePayment(unwrapApiData(response) || {});
};

/** POST /api/v1/payments/{paymentId}/reconcile — match the payment to the bank statement. */
export const reconcilePayment = async (paymentId, { bankReference, reconciledDate, remarks }) => {
  const response = await api.post(`${PAYMENTS_URL}/${paymentId}/reconcile`, {
    bankReference,
    reconciledDate,
    remarks,
  });
  return normalizePayment(unwrapApiData(response) || {});
};
