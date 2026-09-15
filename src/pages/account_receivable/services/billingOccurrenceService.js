// Billing Occurrence integration — the period-level bridge between Fixed
// Price / Recurring Billing Configuration and Tax Calculation.
//
// Backend contract: BillingOccurrenceController, base path
// /api/billing-occurrences. This module only talks to that controller and
// normalizes its DTO — it never derives eligibility (e.g. comparing
// billingDate to "today"). periodStatus / taxStatus / isInvoiced as
// returned by the backend are the sole source of truth for where an
// occurrence appears on the Tax Calculation page.
import api from "../../../api/axiosInstance";

const AR_BASE_URL =
  window.__APP_CONFIG__?.AR_BASE_URL ||
  window.APP_CONFIG?.AR_BASE_URL ||
  import.meta.env?.VITE_AR_API_BASE_URL ||
  "http://localhost:8080";

const OCCURRENCES_URL = `${AR_BASE_URL}/api/billing-occurrences`;

const unwrapData = (response) => {
  const payload = response?.data;
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }
  return payload ?? null;
};

export const getOccurrenceErrorMessage = (
  error,
  fallback = "This request could not be completed. Please try again."
) => {
  const status = error?.response?.status;
  const detail =
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.error ||
    error?.message ||
    "";
  const lowerDetail = detail.toLowerCase();

  if (status === 404) {
    return "Billing occurrence could not be found.";
  }
  if (status === 400 || status === 422) {
    if (lowerDetail.includes("not eligible") || lowerDetail.includes("not ready") || lowerDetail.includes("pending")) {
      return "Tax calculation cannot be started because this billing occurrence is not yet eligible for tax calculation.";
    }
    if (lowerDetail.includes("region")) {
      return "Tax calculation cannot proceed because no tax region is configured for this billing occurrence.";
    }
    if (lowerDetail.includes("already") || lowerDetail.includes("completed") || lowerDetail.includes("calculated")) {
      return "Tax calculation has already been completed for this billing occurrence.";
    }
  }
  if (status === 409) {
    return "Tax calculation has already been completed for this billing occurrence.";
  }
  if (status === 403) {
    return "You do not have permission to execute tax calculation.";
  }

  return detail || fallback;
};

const normalizeTaxComponent = (component = {}, index = 0) => {
  const source = component && typeof component === "object" ? component : {};
  return {
    id:
      source.taxCalculationComponentId ||
      source.id ||
      `${source.taxTypeCode || source.taxTypeId || "component"}-${index}`,
    taxTypeId: source.taxTypeId || "",
    taxTypeCode: source.taxTypeCode || "",
    taxTypeName: source.taxTypeName || "",
    appliedRate:
      source.appliedRate !== undefined && source.appliedRate !== null ? Number(source.appliedRate) : null,
    taxAmount: source.taxAmount !== undefined && source.taxAmount !== null ? Number(source.taxAmount) : 0,
    applicabilityType: source.applicabilityType || "",
  };
};

/**
 * Normalizes a BillingOccurrenceController response record. Field presence
 * (billingConfigurationId vs recurringConfigurationId, tax-calculation
 * fields once calculated) varies by lifecycle stage — this only guards
 * against missing fields and never infers status.
 */
export const normalizeBillingOccurrence = (item = {}) => {
  if (!item || typeof item !== "object") return null;

  const rawComponents = Array.isArray(item.taxComponents)
    ? item.taxComponents
    : Array.isArray(item.components)
    ? item.components
    : [];

  return {
    ...item,
    billingScheduleId: item.billingScheduleId ?? item.occurrenceId ?? item.id ?? "",
    billingConfigurationId: item.billingConfigurationId ?? null,
    recurringConfigurationId: item.recurringConfigurationId ?? null,
    periodNumber: item.periodNumber ?? null,
    periodStartDate: item.periodStartDate ?? "",
    periodEndDate: item.periodEndDate ?? "",
    billingDate: item.billingDate ?? "",
    billingAmount:
      item.billingAmount !== undefined && item.billingAmount !== null ? Number(item.billingAmount) : null,
    scheduleType: item.scheduleType ?? "",
    isPartialPeriod: Boolean(item.isPartialPeriod),
    periodStatus: item.periodStatus ?? "",
    taxStatus: item.taxStatus ?? "",
    isInvoiced: Boolean(item.isInvoiced),
    invoiceDate: item.invoiceDate ?? null,
    remarks: item.remarks ?? "",
    isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
    createdAt: item.createdAt ?? "",
    updatedAt: item.updatedAt ?? "",

    // Configuration context, when returned alongside the occurrence.
    projectName: item.projectName ?? "",
    clientName: item.clientName ?? "",
    currencyCode: item.currencyCode ?? "",
    taxRegionName: item.taxRegionName ?? "",
    taxRegionCode: item.taxRegionCode ?? "",

    // Tax calculation result, present once taxStatus has moved past TAX_PENDING.
    taxCalculationId: item.taxCalculationId ?? null,
    taxCalculationStatus: item.taxCalculationStatus ?? "",
    taxableAmount:
      item.taxableAmount !== undefined && item.taxableAmount !== null ? Number(item.taxableAmount) : null,
    totalTaxAmount:
      item.totalTaxAmount !== undefined && item.totalTaxAmount !== null ? Number(item.totalTaxAmount) : null,
    grandTotal: item.grandTotal !== undefined && item.grandTotal !== null ? Number(item.grandTotal) : null,
    taxCalculatedAt: item.taxCalculatedAt ?? "",
    taxComponents: rawComponents.map(normalizeTaxComponent),
  };
};

const OCCURRENCE_QUERY_KEYS = [
  "billingConfigurationId",
  "recurringConfigurationId",
  "periodStatus",
  "taxStatus",
  "billingDateBefore",
  "billingDateAfter",
];

/**
 * GET /api/billing-occurrences
 * Accepts any subset of the backend's supported query parameters — pass
 * only what's needed for a given section (e.g. { taxStatus: "TAX_PENDING" }).
 */
export const getBillingOccurrences = async (params = {}) => {
  const query = {};
  OCCURRENCE_QUERY_KEYS.forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      query[key] = value;
    }
  });

  const response = await api.get(OCCURRENCES_URL, { params: query });
  const data = unwrapData(response);
  const list = Array.isArray(data) ? data : [];
  return list.map(normalizeBillingOccurrence).filter(Boolean);
};

/**
 * GET /api/billing-occurrences/{occurrenceId}
 */
export const getBillingOccurrence = async (occurrenceId) => {
  if (!occurrenceId) {
    throw new Error("Billing occurrence ID is required.");
  }
  const response = await api.get(`${OCCURRENCES_URL}/${occurrenceId}`);
  return normalizeBillingOccurrence(unwrapData(response));
};

/**
 * GET /api/billing-occurrences/{occurrenceId}/tax-calculation
 */
export const getOccurrenceTaxCalculation = async (occurrenceId) => {
  if (!occurrenceId) {
    throw new Error("Billing occurrence ID is required.");
  }
  const response = await api.get(`${OCCURRENCES_URL}/${occurrenceId}/tax-calculation`);
  return normalizeBillingOccurrence(unwrapData(response));
};

/**
 * POST /api/billing-occurrences/{occurrenceId}/calculate-tax
 * No request body. The backend validates occurrence eligibility — this
 * call never runs a client-side eligibility check beforehand.
 */
export const calculateOccurrenceTax = async (occurrenceId) => {
  if (!occurrenceId) {
    throw new Error("Billing occurrence ID is required.");
  }
  const response = await api.post(`${OCCURRENCES_URL}/${occurrenceId}/calculate-tax`);
  return normalizeBillingOccurrence(unwrapData(response));
};
