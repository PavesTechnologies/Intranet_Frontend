import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AR_BASE_URL;

const TAX_TYPE_MASTER_URL = `${BASE_URL}/api/tax-type-master`;

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
    return "You do not have permission to manage tax types.";
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
      if (lastMatch && !lastMatch.toLowerCase().includes("requestdto")) {
        return lastMatch;
      }
    }
  }

  return rawMsg || error?.message || fallback;
};

export const normalizeTaxType = (item = {}) => {
  if (!item || typeof item !== "object") return {};

  const id = item.taxTypeId || item.id || "";
  const taxTypeCode = String(item.taxTypeCode || item.code || "").trim();
  const taxTypeName = String(item.taxTypeName || item.name || "").trim();
  const description = item.description || "";
  const isActive = Boolean(item.isActive ?? item.is_active ?? true);

  return {
    ...item,
    id,
    taxTypeId: id,
    taxTypeCode,
    taxTypeName,
    description,
    isActive,
    label: taxTypeName && taxTypeCode ? `${taxTypeName} (${taxTypeCode})` : taxTypeName || taxTypeCode || id,
    value: id,
  };
};

// GET /api/tax-type-master
export const getTaxTypes = async () => {
  const response = await api.get(TAX_TYPE_MASTER_URL);
  return asArray(unwrapData(response)).map(normalizeTaxType);
};

// GET /api/tax-type-master/active
export const getActiveTaxTypes = async () => {
  const response = await api.get(`${TAX_TYPE_MASTER_URL}/active`);
  return asArray(unwrapData(response)).map(normalizeTaxType);
};
