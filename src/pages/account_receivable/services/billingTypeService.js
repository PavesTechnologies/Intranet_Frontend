import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AR_BASE_URL;

const BILLING_TYPES_URL = `${BASE_URL}/api/billing-types`;

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
    return "You do not have permission to manage billing types.";
  }

  const resData = error?.response?.data;

  // Spring Boot validation errors array
  if (Array.isArray(resData?.errors) && resData.errors.length > 0) {
    const firstErr = resData.errors[0];
    if (typeof firstErr === "string") return firstErr;
    if (firstErr?.defaultMessage) return firstErr.defaultMessage;
    if (firstErr?.message) return firstErr.message;
  }

  // Extract clean message from Spring MethodArgumentNotValidException string
  const rawMsg = resData?.message || resData?.detail || resData?.error;
  if (typeof rawMsg === "string" && rawMsg.includes("default message [")) {
    const matches = [...rawMsg.matchAll(/default message \[([^\]]+)\]/g)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1][1];
      if (lastMatch && !lastMatch.toLowerCase().includes("billingtyperequestdto")) {
        return lastMatch;
      }
    }
  }

  return rawMsg || error?.message || fallback;
};

// Normalizes a BillingTypeResponseDto — DTO fields only, no code/status
// guessing: { billingTypeId, billingTypeName, description, isActive, createdAt, updatedAt }.
export const normalizeBillingType = (item = {}) => {
  if (!item || typeof item !== "object") return {};

  const id = item.billingTypeId || item.id || "";
  const billingTypeName = String(item.billingTypeName || "").trim();
  const description = item.description || "";
  const isActive = Boolean(item.isActive ?? true);
  const status = isActive ? "ACTIVE" : "INACTIVE";

  return {
    ...item,
    id,
    billingTypeId: id,
    billingTypeName,
    description,
    isActive,
    status,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    value: id,
    label: billingTypeName,
  };
};

// GET /api/billing-types
export const getBillingTypes = async () => {
  const response = await api.get(BILLING_TYPES_URL);
  return asArray(unwrapData(response)).map(normalizeBillingType);
};

// GET /api/billing-types/active
export const getActiveBillingTypes = async () => {
  const response = await api.get(`${BILLING_TYPES_URL}/active`);
  return asArray(unwrapData(response)).map(normalizeBillingType);
};

// GET /api/billing-types/{id}
export const getBillingTypeById = async (id) => {
  const response = await api.get(`${BILLING_TYPES_URL}/${id}`);
  return normalizeBillingType(unwrapData(response));
};

// POST /api/billing-types
export const createBillingType = async (payload) => {
  const response = await api.post(BILLING_TYPES_URL, payload);
  return normalizeBillingType(unwrapData(response));
};

// PUT /api/billing-types/{id}
export const updateBillingType = async (id, payload) => {
  const response = await api.put(`${BILLING_TYPES_URL}/${id}`, payload);
  return normalizeBillingType(unwrapData(response));
};

// DELETE /api/billing-types/{id}
export const deleteBillingType = async (id) => {
  const response = await api.delete(`${BILLING_TYPES_URL}/${id}`);
  return unwrapData(response);
};

// PATCH /api/billing-types/{id}/activate
export const activateBillingType = async (id) => {
  const response = await api.patch(`${BILLING_TYPES_URL}/${id}/activate`);
  return normalizeBillingType(unwrapData(response));
};
