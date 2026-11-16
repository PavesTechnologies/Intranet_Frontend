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

  const rawBillingAmount =
    item.billingAmount !== undefined && item.billingAmount !== null
      ? Number(item.billingAmount)
      : item.taxableAmount !== undefined && item.taxableAmount !== null
      ? Number(item.taxableAmount)
      : null;

  const rawTaxableAmount =
    item.taxableAmount !== undefined && item.taxableAmount !== null
      ? Number(item.taxableAmount)
      : item.billingAmount !== undefined && item.billingAmount !== null
      ? Number(item.billingAmount)
      : null;

  const rawStatus = (item.status || item.taxCalculationStatus || "").toUpperCase();
  const rawPeriodStatus = (item.periodStatus || "").toUpperCase();
  const rawTaxStatus = (item.taxStatus || "").toUpperCase();

  const isCalculated =
    rawPeriodStatus === "TAX_CALCULATED" ||
    rawTaxStatus === "TAX_CALCULATED" ||
    rawTaxStatus === "CALCULATED" ||
    rawStatus === "CALCULATED";

  const periodStatus =
    item.periodStatus ||
    (isCalculated ? "TAX_CALCULATED" : "");

  const taxStatus =
    item.taxStatus ||
    (isCalculated ? "TAX_CALCULATED" : "");

  return {
    ...item,
    billingScheduleId: item.billingScheduleId ?? item.occurrenceId ?? item.id ?? "",
    billingConfigurationId: item.billingConfigurationId ?? null,
    recurringConfigurationId: item.recurringConfigurationId ?? null,
    periodNumber: item.periodNumber ?? null,
    periodStartDate: item.periodStartDate ?? item.billingPeriodStart ?? item.billingPeriodStartDate ?? "",
    periodEndDate: item.periodEndDate ?? item.billingPeriodEnd ?? item.billingPeriodEndDate ?? "",
    billingDate: item.billingDate ?? item.invoiceDate ?? "",
    billingAmount: rawBillingAmount,
    scheduleType: item.scheduleType ?? "",
    isPartialPeriod: Boolean(item.isPartialPeriod),
    periodStatus: periodStatus,
    taxStatus: taxStatus,
    isInvoiced: Boolean(item.isInvoiced),
    invoiceDate: item.invoiceDate ?? null,
    remarks: item.remarks ?? "",
    isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
    createdAt: item.createdAt ?? "",
    updatedAt: item.updatedAt ?? "",

    // Configuration context, when returned alongside the occurrence.
    projectName: item.projectName ?? "",
    clientName: item.clientName ?? "",
    currencyCode: item.currencyCode ?? "USD",
    taxRegionName: item.taxRegionName ?? "",
    taxRegionCode: item.taxRegionCode ?? "",

    // Tax calculation result, present once taxStatus has moved past TAX_PENDING.
    taxCalculationId: item.taxCalculationId ?? null,
    taxCalculationStatus: item.taxCalculationStatus ?? item.status ?? (isCalculated ? "CALCULATED" : ""),
    taxableAmount: rawTaxableAmount,
    totalTaxAmount:
      item.totalTaxAmount !== undefined && item.totalTaxAmount !== null
        ? Number(item.totalTaxAmount)
        : item.totalTax !== undefined && item.totalTax !== null
        ? Number(item.totalTax)
        : null,
    grandTotal:
      item.grandTotal !== undefined && item.grandTotal !== null ? Number(item.grandTotal) : null,
    taxCalculatedAt: item.taxCalculatedAt ?? "",
    taxComponents: rawComponents.map(normalizeTaxComponent),
  };
};

export const mergeOccurrenceWithTaxCalc = (base = {}, taxCalc = {}) => {
  if (!base && !taxCalc) return null;
  if (!base) return normalizeBillingOccurrence(taxCalc);
  if (!taxCalc) return normalizeBillingOccurrence(base);

  const b = normalizeBillingOccurrence(base) || {};
  const c = normalizeBillingOccurrence(taxCalc) || {};

  const components =
    c.taxComponents?.length > 0
      ? c.taxComponents
      : b.taxComponents?.length > 0
      ? b.taxComponents
      : [];

  const isCalculated =
    b.periodStatus === "TAX_CALCULATED" ||
    c.periodStatus === "TAX_CALCULATED" ||
    b.taxStatus === "TAX_CALCULATED" ||
    c.taxStatus === "TAX_CALCULATED" ||
    (b.taxCalculationStatus || "").toUpperCase() === "CALCULATED" ||
    (c.taxCalculationStatus || "").toUpperCase() === "CALCULATED";

  return {
    ...b,
    ...c,

    billingScheduleId: b.billingScheduleId || c.billingScheduleId,
    projectName: b.projectName || c.projectName,
    clientName: b.clientName || c.clientName,
    currencyCode: b.currencyCode || c.currencyCode || "USD",
    taxRegionName: b.taxRegionName || c.taxRegionName,
    taxRegionCode: b.taxRegionCode || c.taxRegionCode,
    scheduleType: b.scheduleType || c.scheduleType,

    periodStartDate: b.periodStartDate || c.periodStartDate,
    periodEndDate: b.periodEndDate || c.periodEndDate,
    billingDate: b.billingDate || c.billingDate,

    billingAmount:
      b.billingAmount !== null && b.billingAmount !== undefined
        ? b.billingAmount
        : c.billingAmount,

    periodStatus: isCalculated
      ? "TAX_CALCULATED"
      : b.periodStatus || c.periodStatus || "TAX_PENDING",
    taxStatus: isCalculated
      ? "TAX_CALCULATED"
      : b.taxStatus || c.taxStatus || "TAX_PENDING",
    taxCalculationStatus: isCalculated
      ? (c.taxCalculationStatus || b.taxCalculationStatus || "CALCULATED")
      : (b.taxCalculationStatus || c.taxCalculationStatus || ""),

    taxCalculationId: c.taxCalculationId || b.taxCalculationId,
    taxableAmount:
      c.taxableAmount !== null && c.taxableAmount !== undefined
        ? c.taxableAmount
        : b.taxableAmount !== null && b.taxableAmount !== undefined
        ? b.taxableAmount
        : b.billingAmount,
    totalTaxAmount:
      c.totalTaxAmount !== null && c.totalTaxAmount !== undefined
        ? c.totalTaxAmount
        : b.totalTaxAmount,
    grandTotal:
      c.grandTotal !== null && c.grandTotal !== undefined
        ? c.grandTotal
        : b.grandTotal,
    taxComponents: components,
    taxCalculatedAt: c.taxCalculatedAt || b.taxCalculatedAt,
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
  // Accept either a bare array or a Spring-style paginated page object
  // ({ content: [...] }) -- guards against a bucket silently rendering
  // empty if the backend ever wraps this particular query in pagination.
  const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
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
