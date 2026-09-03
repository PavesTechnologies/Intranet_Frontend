import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AR_BASE_URL;

const PAYMENT_TERMS_URL = `${BASE_URL}/api/payment-terms`;

const unwrapData = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.data?.data)) return payload.data.data;
    if (Array.isArray(payload.content)) return payload.content;
    if (Array.isArray(payload.content?.data)) return payload.content.data;
  }

  return payload?.data ?? payload ?? null;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.data?.data)) return value.data.data;
    if (Array.isArray(value.content)) return value.content;
    if (Array.isArray(value.content?.data)) return value.content.data;
  }

  return [];
};

export const getApiErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (error?.response?.status === 403) {
    return "You do not have permission to manage payment terms.";
  }

  const resData = error?.response?.data;

  if (Array.isArray(resData?.errors) && resData.errors.length > 0) {
    const firstErr = resData.errors[0];
    if (typeof firstErr === "string") return firstErr;
    if (firstErr?.defaultMessage) return firstErr.defaultMessage;
    if (firstErr?.message) return firstErr.message;
  }

  const rawMsg = resData?.message || resData?.detail || resData?.error;
  if (typeof rawMsg === "string" && rawMsg.includes("default message [")) {
    const matches = [...rawMsg.matchAll(/default message \[([^\]]+)\]/g)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1][1];
      if (lastMatch && !lastMatch.toLowerCase().includes("paymenttermrequestdto")) {
        return lastMatch;
      }
    }
  }

  return rawMsg || error?.message || fallback;
};

// Normalizes a PaymentTermResponseDto — DTO fields only:
// { paymentTermId, paymentTermName, paymentDays, description, isActive, createdAt, updatedAt }.
export const normalizePaymentTerm = (item = {}) => {
  if (!item || typeof item !== "object") return {};

  const id = item.paymentTermId || item.id || "";
  const paymentTermName = String(item.paymentTermName || "").trim();
  const description = item.description || "";
  const paymentDays = item.paymentDays ?? null;
  const isActive = Boolean(item.isActive ?? true);
  const status = isActive ? "ACTIVE" : "INACTIVE";

  return {
    ...item,
    id,
    paymentTermId: id,
    paymentTermName,
    paymentDays,
    description,
    isActive,
    status,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    value: id,
    label: paymentTermName,
  };
};

// GET /api/payment-terms
export const getPaymentTerms = async () => {
  const response = await api.get(PAYMENT_TERMS_URL);
  return asArray(unwrapData(response)).map(normalizePaymentTerm);
};

// GET /api/payment-terms/active
export const getActivePaymentTerms = async () => {
  const response = await api.get(`${PAYMENT_TERMS_URL}/active`);
  return asArray(unwrapData(response)).map(normalizePaymentTerm);
};

// GET /api/payment-terms/{id}
export const getPaymentTermById = async (id) => {
  const response = await api.get(`${PAYMENT_TERMS_URL}/${id}`);
  return normalizePaymentTerm(unwrapData(response));
};

// POST /api/payment-terms
export const createPaymentTerm = async (payload) => {
  const response = await api.post(PAYMENT_TERMS_URL, payload);
  return normalizePaymentTerm(unwrapData(response));
};

// PUT /api/payment-terms/{id}
export const updatePaymentTerm = async (id, payload) => {
  const response = await api.put(`${PAYMENT_TERMS_URL}/${id}`, payload);
  return normalizePaymentTerm(unwrapData(response));
};

// DELETE /api/payment-terms/{id}
export const deletePaymentTerm = async (id) => {
  const response = await api.delete(`${PAYMENT_TERMS_URL}/${id}`);
  return unwrapData(response);
};

// PUT /api/payment-terms/{id}/activate — backend contract returns Void, not
// the updated record. Callers must re-fetch the list after this resolves
// rather than merging a response body.
export const activatePaymentTerm = async (id) => {
  await api.put(`${PAYMENT_TERMS_URL}/${id}/activate`);
};
