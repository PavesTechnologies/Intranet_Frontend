// Finance Manager (Checker) approval workflow for Project Billing Configuration.
//
// This is a deliberately separate module from billingConfigurationService.js —
// the Maker (Finance Executive) wizard's create/draft/save logic there still
// reads the legacy "status" + "isActive" fields for its own list/detail views,
// and must stay untouched. The approval workflow below is built entirely on
// the new BillingConfigurationResponseDto's flat two-status model
// (approvalStatus / billingStatus) and never reads/writes status or isActive.
import api from "../../../api/axiosInstance";
import {
  asArray,
  extractBillingConfigurationId,
  getApiErrorMessage,
  rejectBillingConfiguration,
  unwrapData,
} from "./billingConfigurationService";

const BASE_URL = window.__APP_CONFIG__.AR_BASE_URL;
const BILLING_CONFIGURATIONS_URL = `${BASE_URL}/api/billing-configurations`;

const firstPresent = (...values) =>
  values.find((value) => value !== null && value !== undefined && value !== "");

// Title-cases a SCREAMING_SNAKE_CASE enum value for display — e.g.
// "PENDING_APPROVAL" -> "Pending Approval". Used for approvalStatus/billingStatus
// badges; the raw enum value is preserved separately for status comparisons.
export const formatApprovalStatusLabel = (value) => {
  if (!value) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

// Maps the flat BillingConfigurationResponseDto (billingConfigurationId,
// clientName, projectName, ..., approvalStatus, billingStatus, ...) onto the
// shape the approvals list/review screen renders. No nested projectInfo/
// billingConfig digging — the new DTO is already flat.
export const normalizeApprovalConfiguration = (record = {}) => {
  const approvalStatus = String(record.approvalStatus || "").trim().toUpperCase() || "DRAFT";
  const billingStatus = String(record.billingStatus || "").trim().toUpperCase() || "INACTIVE";

  return {
    ...record,
    billingConfigurationId: record.billingConfigurationId || record.id || "",
    clientId: record.clientId || "",
    clientName: record.clientName || "",
    projectId: record.projectId || "",
    projectName: record.projectName || "",
    projectCode: firstPresent(record.projectCode, record.projectcode) || "",
    billingTypeId: record.billingTypeId || "",
    billingTypeName: record.billingTypeName || record.billingType || "",
    billingFrequencyId: record.billingFrequencyId || "",
    billingFrequencyName: record.billingFrequencyName || record.billingFrequency || "",
    currencyId: record.currencyId || "",
    currencyCode: firstPresent(record.currencyCode, record.currency) || "",
    projectBudget: record.projectBudget ?? record.pmsProjectBudget ?? "",
    projectBudgetCurrency: record.projectBudgetCurrency || "",
    paymentTermId: record.paymentTermId || "",
    paymentTermCode: record.paymentTermCode || "",
    paymentTermName: record.paymentTermName || record.paymentTerms || "",
    taxRegionId: record.taxRegionId || "",
    taxRegionName: record.taxRegionName || record.taxRegion || "",
    taxRegionCode: record.taxRegionCode || "",
    pricingModel: record.pricingModel || record.billingMode || "",
    invoiceGenerationType:
      record.invoiceGenerationType ||
      (record.autoInvoiceGeneration === true ? "Automatic" : record.autoInvoiceGeneration === false ? "Manual" : ""),
    autoInvoiceGeneration: record.autoInvoiceGeneration,
    invoiceGenerationDay: record.invoiceGenerationDay,
    expenseBillingEligible: Boolean(record.expenseBillingEligible),
    rejectionReason: record.rejectionReason || "",
    effectiveFrom: record.effectiveFrom || record.startDate || "",
    effectiveTo: record.effectiveTo || record.endDate || "",
    hourlyRate: record.hourlyRate ?? "",
    contractValue: firstPresent(
      record.contractValue,
      record.totalContractValue,
      record.fixedPrice?.totalContractValue,
      record.recurring?.contractValue
    ),
    contractValueSource: firstPresent(
      record.contractValueSource,
      record.fixedPrice?.contractValueSource,
      record.recurring?.contractValueSource
    ),
    pmsProjectBudget: firstPresent(
      record.pmsProjectBudget,
      record.fixedPrice?.pmsProjectBudget,
      record.recurring?.pmsProjectBudget,
      record.projectBudget
    ),
    retentionPercent: record.retentionPercent ?? record.fixedPrice?.retentionPercent,
    retentionAmount: record.retentionAmount ?? record.fixedPrice?.retentionAmount,
    billableAmount: record.billableAmount ?? record.fixedPrice?.billableAmount,
    advanceReceived: record.advanceReceived ?? record.fixedPrice?.advanceReceived,
    remainingAmount: record.remainingAmount ?? record.fixedPrice?.remainingAmount,
    approvalStatus,
    billingStatus,
    createdAt: firstPresent(record.createdAt, record.createdDate) || "",
    updatedAt: record.updatedAt || "",
    versionNo: record.versionNo ?? "",
    createdBy: record.createdBy || "",
    submittedBy: firstPresent(record.submittedBy, record.createdBy) || "",
  };
};

// GET /api/billing-configurations/pending-approvals — the dedicated endpoint
// for the Finance Manager's queue. The approvalStatus filter is kept as a
// defensive guarantee (never trust the endpoint to be the only thing standing
// between a non-pending record and the Checker's screen) rather than as the
// primary filtering mechanism.
export const getPendingApprovalConfigurations = async () => {
  const response = await api.get(`${BILLING_CONFIGURATIONS_URL}/pending-approvals`);
  return asArray(unwrapData(response))
    .filter((record) => String(record?.approvalStatus || "").trim().toUpperCase() === "PENDING_APPROVAL")
    .map(normalizeApprovalConfiguration);
};

// GET /api/billing-configurations/{billingConfigurationId} — used to load the
// full configuration for the read-only Review screen.
export const getBillingConfigurationForApproval = async (billingConfigurationId) => {
  const id = extractBillingConfigurationId(billingConfigurationId);
  if (!id) {
    return Promise.reject(new Error("Missing billingConfigurationId — unable to resolve an id from the provided value."));
  }

  const response = await api.get(`${BILLING_CONFIGURATIONS_URL}/${id}`);
  return normalizeApprovalConfiguration(unwrapData(response));
};

// PUT /api/billing-configurations/{billingConfigurationId}/approve — no
// request body. The backend alone decides billingStatus (ACTIVE vs INACTIVE)
// based on the effective/project start date; the frontend never sets it.
// Deliberately NOT named approveBillingConfiguration — that name is already
// the Maker wizard's legacy compatibility shim for the old /activate endpoint
// (see billingConfigurationService.js), which this workflow must never call.
export const approveBillingConfigurationRequest = async (billingConfigurationId) => {
  const id = extractBillingConfigurationId(billingConfigurationId);
  if (!id) {
    return Promise.reject(new Error("Missing billingConfigurationId — unable to resolve an id from the provided value."));
  }

  const response = await api.put(`${BILLING_CONFIGURATIONS_URL}/${id}/approve`);
  return normalizeApprovalConfiguration(unwrapData(response) || {});
};

// PUT /api/billing-configurations/{billingConfigurationId}/reject with
// { rejectionReason } — reuses the existing rejectBillingConfiguration, which
// already implements this exact BillingConfigurationRejectRequestDto contract.
export const rejectBillingConfigurationRequest = async (billingConfigurationId, rejectionReason) => {
  const id = extractBillingConfigurationId(billingConfigurationId);
  if (!id) {
    return Promise.reject(new Error("Missing billingConfigurationId — unable to resolve an id from the provided value."));
  }

  const result = await rejectBillingConfiguration(id, rejectionReason);
  return normalizeApprovalConfiguration(result || {});
};

export { getApiErrorMessage };
