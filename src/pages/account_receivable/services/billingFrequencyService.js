import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AR_BASE_URL;

const BILLING_FREQUENCY_URL = `${BASE_URL}/api/billing-frequency`;

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
    return "You do not have permission to manage billing frequencies.";
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
      if (lastMatch && !lastMatch.toLowerCase().includes("billingfrequencyrequestdto")) {
        return lastMatch;
      }
    }
  }

  return rawMsg || error?.message || fallback;
};

// Normalizes a BillingFrequencyResponseDto — DTO fields only:
// { billingFrequencyId, billingFrequencyName, description, isActive, createdAt, updatedAt }.
export const normalizeBillingFrequency = (item = {}) => {
  if (!item || typeof item !== "object") return {};

  const id = item.billingFrequencyId || item.id || "";
  const billingFrequencyName = String(item.billingFrequencyName || "").trim();
  const description = item.description || "";
  const isActive = Boolean(item.isActive ?? true);
  const status = isActive ? "ACTIVE" : "INACTIVE";

  return {
    ...item,
    id,
    billingFrequencyId: id,
    billingFrequencyName,
    description,
    isActive,
    status,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    value: id,
    label: billingFrequencyName,
  };
};

// GET /api/billing-frequency
export const getBillingFrequencies = async () => {
  const response = await api.get(BILLING_FREQUENCY_URL);
  return asArray(unwrapData(response)).map(normalizeBillingFrequency);
};

// GET /api/billing-frequency/active
export const getActiveBillingFrequencies = async () => {
  const response = await api.get(`${BILLING_FREQUENCY_URL}/active`);
  return asArray(unwrapData(response)).map(normalizeBillingFrequency);
};

// GET /api/billing-frequency/{id}
export const getBillingFrequencyById = async (id) => {
  const response = await api.get(`${BILLING_FREQUENCY_URL}/${id}`);
  return normalizeBillingFrequency(unwrapData(response));
};

// POST /api/billing-frequency
export const createBillingFrequency = async (payload) => {
  const response = await api.post(BILLING_FREQUENCY_URL, payload);
  return normalizeBillingFrequency(unwrapData(response));
};

// PUT /api/billing-frequency/{id}
export const updateBillingFrequency = async (id, payload) => {
  const response = await api.put(`${BILLING_FREQUENCY_URL}/${id}`, payload);
  return normalizeBillingFrequency(unwrapData(response));
};

// DELETE /api/billing-frequency/{id}
export const deleteBillingFrequency = async (id) => {
  const response = await api.delete(`${BILLING_FREQUENCY_URL}/${id}`);
  return unwrapData(response);
};

// PATCH /api/billing-frequency/{id}/activate
export const activateBillingFrequency = async (id) => {
  const response = await api.patch(`${BILLING_FREQUENCY_URL}/${id}/activate`);
  return normalizeBillingFrequency(unwrapData(response));
};
