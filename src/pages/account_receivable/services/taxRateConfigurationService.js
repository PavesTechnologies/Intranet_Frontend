import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AR_BASE_URL;

const TAX_RATE_CONFIGURATIONS_URL = `${BASE_URL}/api/v1/tax-rate-configurations`;
const ACTIVE_TAX_REGIONS_URL = `${BASE_URL}/api/tax-region/active`;

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
    return "You do not have permission to manage tax configuration.";
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
      if (lastMatch && !lastMatch.includes("taxRateConfigurationRequestDto")) {
        return lastMatch;
      }
    }
  }

  return rawMsg || error?.message || fallback;
};

export const normalizeTaxRegion = (region = {}) => {
  const id = region.taxRegionId || region.tax_region_id || region.id || region.value || "";
  const name = String(
    region.taxRegionName || region.tax_region_name || region.name || region.label || ""
  ).trim();
  const code = String(
    region.taxRegionCode || region.tax_region_code || region.code || region.regionCode || ""
  ).trim();

  const label = code && code !== name ? `${name} (${code})` : name || id;

  return {
    ...region,
    id,
    taxRegionId: id,
    taxRegionName: name,
    taxRegionCode: code,
    value: id,
    label,
  };
};

export const normalizeTaxRateConfiguration = (item = {}) => {
  if (!item || typeof item !== "object") return {};

  const id = item.id || item.taxRateConfigurationId || item.tax_rate_configuration_id || "";
  
  // Tax region parsing
  const taxRegionObj = item.taxRegion || item.tax_region || {};
  const taxRegionId =
    item.taxRegionId ||
    item.tax_region_id ||
    taxRegionObj.taxRegionId ||
    taxRegionObj.id ||
    "";
  const taxRegionName =
    item.taxRegionName ||
    item.tax_region_name ||
    taxRegionObj.taxRegionName ||
    taxRegionObj.name ||
    "";
  const taxRegionCode =
    item.taxRegionCode ||
    item.tax_region_code ||
    taxRegionObj.taxRegionCode ||
    taxRegionObj.code ||
    "";

  const taxRegionLabel = taxRegionCode && taxRegionCode !== taxRegionName
    ? `${taxRegionName} (${taxRegionCode})`
    : taxRegionName || taxRegionId;

  const taxRegime = item.taxRegime || item.tax_regime || item.taxType || item.tax_type || "GST";
  
  const parseRate = (val) => {
    if (val === null || val === undefined || val === "") return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  let cgstRate = parseRate(item.cgstRate ?? item.cgst_rate ?? item.cgst);
  let sgstRate = parseRate(item.sgstRate ?? item.sgst_rate ?? item.sgst);
  let igstRate = parseRate(item.igstRate ?? item.igst_rate ?? item.igst);

  // Clean up legacy 0.0000 to null for non-applicable tax components
  if (cgstRate !== null && cgstRate > 0 && sgstRate !== null && sgstRate > 0 && (igstRate === 0 || igstRate === null)) {
    igstRate = null;
  }
  if (igstRate !== null && igstRate > 0 && (cgstRate === 0 || cgstRate === null) && (sgstRate === 0 || sgstRate === null)) {
    cgstRate = null;
    sgstRate = null;
  }

  const effectiveFrom = item.effectiveFrom || item.effective_from || "";
  const effectiveTo = item.effectiveTo || item.effective_to || null;

  const activeFlag = item.active ?? item.is_active ?? item.isActive ?? (item.status === "ACTIVE");
  const status = activeFlag ? "ACTIVE" : "INACTIVE";

  return {
    ...item,
    id,
    taxRateConfigurationId: id,
    taxRegionId,
    taxRegionName,
    taxRegionCode,
    taxRegionLabel,
    taxRegime,
    cgstRate,
    sgstRate,
    igstRate,
    effectiveFrom,
    effectiveTo,
    status,
    active: Boolean(activeFlag),
  };
};

// GET active tax regions
export const getActiveTaxRegions = async () => {
  const response = await api.get(ACTIVE_TAX_REGIONS_URL);
  return asArray(unwrapData(response)).map(normalizeTaxRegion).filter((region) => region.taxRegionId);
};

// GET tax-rate-configurations
export const getTaxRateConfigurations = async () => {
  const response = await api.get(TAX_RATE_CONFIGURATIONS_URL);
  return asArray(unwrapData(response)).map(normalizeTaxRateConfiguration);
};

// GET tax-rate-configurations/{id}
export const getTaxRateConfigurationById = async (id) => {
  const response = await api.get(`${TAX_RATE_CONFIGURATIONS_URL}/${id}`);
  return normalizeTaxRateConfiguration(unwrapData(response));
};

// GET tax-rate-configurations/active
export const getActiveTaxRateConfigurations = async () => {
  const response = await api.get(`${TAX_RATE_CONFIGURATIONS_URL}/active`);
  return asArray(unwrapData(response)).map(normalizeTaxRateConfiguration);
};

// GET tax-rate-configurations/tax-region/{taxRegionId}
export const getTaxRateConfigurationsByTaxRegion = async (taxRegionId) => {
  const response = await api.get(`${TAX_RATE_CONFIGURATIONS_URL}/tax-region/${taxRegionId}`);
  return asArray(unwrapData(response)).map(normalizeTaxRateConfiguration);
};

// POST tax-rate-configurations
export const createTaxRateConfiguration = async (payload) => {
  const response = await api.post(TAX_RATE_CONFIGURATIONS_URL, payload);
  return normalizeTaxRateConfiguration(unwrapData(response));
};

// PUT tax-rate-configurations/{id}
export const updateTaxRateConfiguration = async (id, payload) => {
  const response = await api.put(`${TAX_RATE_CONFIGURATIONS_URL}/${id}`, payload);
  return normalizeTaxRateConfiguration(unwrapData(response));
};

// PATCH tax-rate-configurations/{id}/deactivate
export const deactivateTaxRateConfiguration = async (id) => {
  const response = await api.patch(`${TAX_RATE_CONFIGURATIONS_URL}/${id}/deactivate`);
  return normalizeTaxRateConfiguration(unwrapData(response));
};

export { calculateTax, getTaxCalculation, getTaxCalculationErrorMessage } from "./taxCalculationService";

