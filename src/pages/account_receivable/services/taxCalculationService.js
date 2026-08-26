import api from "../../../api/axiosInstance";

const AR_BASE_URL = window.__APP_CONFIG__?.AR_BASE_URL || import.meta.env?.VITE_AR_API_BASE_URL || "http://localhost:8080";

const unwrapData = (response) => {
  const payload = response?.data;
  if (payload && typeof payload === "object") {
    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
      return payload.data;
    }
  }
  return payload?.data ?? payload ?? null;
};

export const getTaxCalculationErrorMessage = (error, fallback = "Tax calculation could not be completed. Please try again.") => {
  const status = error?.response?.status;
  const detail =
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.error ||
    error?.message ||
    "";

  if (status === 404) {
    return "Billing snapshot could not be found.";
  }
  if (status === 400 || status === 422) {
    if (detail.toLowerCase().includes("not ready")) {
      return "Tax calculation cannot be started because this billing snapshot is not ready for tax calculation.";
    }
    if (detail.toLowerCase().includes("region")) {
      return "Tax calculation cannot proceed because no tax region is configured for this billing snapshot.";
    }
    if (detail.toLowerCase().includes("active tax configuration") || detail.toLowerCase().includes("config")) {
      return "No active tax configuration is available for the selected tax region and billing period.";
    }
    if (detail.toLowerCase().includes("already") || detail.toLowerCase().includes("completed")) {
      return "Tax calculation has already been completed for this billing snapshot.";
    }
  }
  if (status === 409) {
    return "Tax calculation has already been completed for this billing snapshot.";
  }
  if (status === 403) {
    return "You do not have permission to execute tax calculation.";
  }

  return detail || fallback;
};

/**
 * Normalizes backend TaxCalculation response
 */
export const normalizeTaxCalculation = (item = {}) => {
  if (!item || typeof item !== "object") return null;

  return {
    ...item,
    taxCalculationId: item.taxCalculationId || item.tax_calculation_id || item.id || "",
    billingSnapshotId: item.billingSnapshotId || item.billing_snapshot_id || item.snapshotId || "",
    snapshotNumber: item.snapshotNumber || item.snapshot_number || "",
    taxRegionId: item.taxRegionId || item.tax_region_id || "",
    taxRateConfigurationId: item.taxRateConfigurationId || item.tax_rate_configuration_id || "",
    taxableAmount: item.taxableAmount !== undefined && item.taxableAmount !== null ? Number(item.taxableAmount) : null,
    cgstRate: item.cgstRate !== undefined && item.cgstRate !== null ? Number(item.cgstRate) : null,
    cgstAmount: item.cgstAmount !== undefined && item.cgstAmount !== null ? Number(item.cgstAmount) : null,
    sgstRate: item.sgstRate !== undefined && item.sgstRate !== null ? Number(item.sgstRate) : null,
    sgstAmount: item.sgstAmount !== undefined && item.sgstAmount !== null ? Number(item.sgstAmount) : null,
    igstRate: item.igstRate !== undefined && item.igstRate !== null ? Number(item.igstRate) : null,
    igstAmount: item.igstAmount !== undefined && item.igstAmount !== null ? Number(item.igstAmount) : null,
    totalTaxAmount: item.totalTaxAmount !== undefined && item.totalTaxAmount !== null ? Number(item.totalTaxAmount) : null,
    grandTotal: item.grandTotal !== undefined && item.grandTotal !== null ? Number(item.grandTotal) : null,
    status: item.status || "TAX_COMPLETED",
    calculatedAt: item.calculatedAt || item.calculated_at || "",
  };
};

/**
 * POST /api/v1/billing-snapshots/{snapshotId}/tax-calculation
 * Calculates tax on backend and saves result. No request body.
 */
export const calculateTax = async (snapshotId) => {
  if (!snapshotId) {
    throw new Error("Billing snapshot ID is required for tax calculation.");
  }
  const url = `${AR_BASE_URL}/api/v1/billing-snapshots/${snapshotId}/tax-calculation`;
  const response = await api.post(url);
  return normalizeTaxCalculation(unwrapData(response));
};

/**
 * GET /api/v1/billing-snapshots/{snapshotId}/tax-calculation
 * Retrieves saved TaxCalculation result from backend.
 */
export const getTaxCalculation = async (snapshotId) => {
  if (!snapshotId) {
    throw new Error("Billing snapshot ID is required.");
  }
  const url = `${AR_BASE_URL}/api/v1/billing-snapshots/${snapshotId}/tax-calculation`;
  const response = await api.get(url);
  return normalizeTaxCalculation(unwrapData(response));
};
