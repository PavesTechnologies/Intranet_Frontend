import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AR_BASE_URL;

const TAX_REGION_URL = `${BASE_URL}/api/tax-region`;

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
    return "You do not have permission to manage tax regions.";
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
      if (lastMatch && !lastMatch.toLowerCase().includes("taxregionrequestdto")) {
        return lastMatch;
      }
    }
  }

  return rawMsg || error?.message || fallback;
};

// Normalizes a TaxRegionResponseDto — DTO fields only:
// { taxRegionId, taxRegionCode, taxRegionName, taxRegime, currencyCode,
//   description, isActive, createdAt, updatedAt }. There is no
// activate/deactivate endpoint for this master — isActive is read-only here.
export const normalizeTaxRegion = (item = {}) => {
  if (!item || typeof item !== "object") return {};

  const id = item.taxRegionId || item.id || "";
  const taxRegionCode = String(item.taxRegionCode || "").trim();
  const taxRegionName = String(item.taxRegionName || "").trim();
  const taxRegime = String(item.taxRegime || "").trim();
  const currencyCode = String(item.currencyCode || "").trim();
  const description = item.description || "";
  const isActive = Boolean(item.isActive ?? true);
  const status = isActive ? "ACTIVE" : "INACTIVE";

  const label = taxRegionCode && taxRegionCode !== taxRegionName
    ? `${taxRegionName} (${taxRegionCode})`
    : taxRegionName || id;

  return {
    ...item,
    id,
    taxRegionId: id,
    taxRegionCode,
    taxRegionName,
    taxRegime,
    currencyCode,
    description,
    isActive,
    status,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    value: id,
    label,
  };
};

// GET /api/tax-region
export const getTaxRegions = async () => {
  const response = await api.get(TAX_REGION_URL);
  return asArray(unwrapData(response)).map(normalizeTaxRegion);
};

// GET /api/tax-region/active
export const getActiveTaxRegions = async () => {
  const response = await api.get(`${TAX_REGION_URL}/active`);
  return asArray(unwrapData(response)).map(normalizeTaxRegion);
};

// GET /api/tax-region/{id}
export const getTaxRegionById = async (id) => {
  const response = await api.get(`${TAX_REGION_URL}/${id}`);
  return normalizeTaxRegion(unwrapData(response));
};

// POST /api/tax-region
export const createTaxRegion = async (payload) => {
  const response = await api.post(TAX_REGION_URL, payload);
  return normalizeTaxRegion(unwrapData(response));
};

// PUT /api/tax-region/{id}
export const updateTaxRegion = async (id, payload) => {
  const response = await api.put(`${TAX_REGION_URL}/${id}`, payload);
  return normalizeTaxRegion(unwrapData(response));
};

// DELETE /api/tax-region/{id} — no activate/deactivate endpoint exists for
// this master, so this is treated as a real, unrecoverable delete.
export const deleteTaxRegion = async (id) => {
  const response = await api.delete(`${TAX_REGION_URL}/${id}`);
  return unwrapData(response);
};
