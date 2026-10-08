import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AR_BASE_URL;

const TAX_STRUCTURE_URL = `${BASE_URL}/api/tax-structure/regions`;

const unwrapData = (response) => {
  const payload = response?.data;
  if (payload && typeof payload === "object" && !Array.isArray(payload) && payload.data !== undefined) {
    return payload.data;
  }
  return payload ?? null;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const toNumberOrNull = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

// Normalizes one component of a tax regime. Optional metadata (min/max,
// required, applicability) is passed through when the backend provides it so
// validation and defaults stay metadata-driven.
export const normalizeTaxStructureComponent = (comp = {}) => {
  const taxComponentId = comp.taxComponentId || comp.id || "";
  const componentCode = String(comp.componentCode || comp.taxTypeCode || "").trim();
  const componentName = String(comp.componentName || comp.taxTypeName || componentCode).trim();

  return {
    ...comp,
    taxComponentId: String(taxComponentId),
    taxTypeId: comp.taxTypeId ? String(comp.taxTypeId) : "",
    taxTypeCode: String(comp.taxTypeCode || "").trim(),
    taxTypeName: String(comp.taxTypeName || "").trim(),
    componentCode,
    componentName,
    description: comp.description || "",
    inputType: String(comp.inputType || "PERCENTAGE").trim().toUpperCase(),
    displayOrder: toNumberOrNull(comp.displayOrder) ?? Number.MAX_SAFE_INTEGER,
    minValue: toNumberOrNull(comp.minValue),
    maxValue: toNumberOrNull(comp.maxValue),
    required: Boolean(comp.required ?? comp.isRequired ?? comp.mandatory ?? false),
    applicabilityType: comp.applicabilityType || comp.defaultApplicabilityType || null,
  };
};

export const normalizeTaxRegime = (regime = {}) => {
  const components = asArray(regime.components)
    .map(normalizeTaxStructureComponent)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return {
    ...regime,
    taxRegimeId: String(regime.taxRegimeId || regime.id || ""),
    taxRegimeCode: String(regime.taxRegimeCode || regime.code || "").trim(),
    taxRegimeName: String(regime.taxRegimeName || regime.name || regime.taxRegimeCode || "").trim(),
    description: regime.description || "",
    components,
  };
};

export const normalizeTaxStructure = (item = {}) => {
  const region = item?.taxRegion || {};
  return {
    taxRegion: {
      taxRegionId: String(region.taxRegionId || region.id || ""),
      taxRegionCode: region.taxRegionCode || "",
      taxRegionName: region.taxRegionName || "",
      currencyCode: region.currencyCode || "",
    },
    taxRegimes: asArray(item?.taxRegimes).map(normalizeTaxRegime),
  };
};

// Tax structure is master data that changes rarely; cache the in-flight /
// resolved promise per region so re-opening the form or toggling between
// regions does not re-fetch. Failed requests are evicted so a retry hits the API.
const structureCache = new Map();

// GET /api/tax-structure/regions/{taxRegionId}
export const getTaxStructureByRegion = (taxRegionId, { force = false } = {}) => {
  if (!taxRegionId) return Promise.reject(new Error("Tax region is required to load its tax structure."));

  const key = String(taxRegionId);
  if (!force && structureCache.has(key)) return structureCache.get(key);

  const request = api
    .get(`${TAX_STRUCTURE_URL}/${encodeURIComponent(key)}`)
    .then((response) => normalizeTaxStructure(unwrapData(response)))
    .catch((error) => {
      structureCache.delete(key);
      throw error;
    });

  structureCache.set(key, request);
  return request;
};

export const clearTaxStructureCache = (taxRegionId) => {
  if (taxRegionId) structureCache.delete(String(taxRegionId));
  else structureCache.clear();
};
