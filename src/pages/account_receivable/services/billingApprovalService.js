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
  getConfigurationDetailProject,
  getMilestonePlanByBillingConfiguration,
  normalizeMilestonePlanConfig,
  rejectBillingConfiguration,
  resolveConfigurationProject,
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

// Every billing type's commercial figures now come back nested under a
// dedicated key on the BillingConfigurationResponseDto — never at the top
// level, and never under the old "fixedPrice"/"recurring" nesting the Maker
// wizard's own draft-normalization uses (see billingConfigurationService.js —
// that shape is unrelated and must not be assumed here). Fixed Price and
// Recurring each carry a single details object; Time & Material and
// Milestone carry a list (one row per rate card / milestone).
const BILLING_TYPE_DETAILS_KEY = {
  FIXED_PRICE: "fixedPriceDetails",
  RECURRING: "recurringDetails",
  TIME_MATERIAL: "tmRateCards",
  MILESTONE: "milestoneSchedules",
  // Assumed to mirror the fixedPriceDetails/recurringDetails naming convention —
  // a single nested BillingMilestonePlanResponseDto-shaped object. Verify this
  // key against the real BillingConfigurationResponseDto if it differs.
  MILESTONE_PLAN: "milestonePlanDetails",
};

const resolveBillingTypeDetailsKey = (record = {}) => {
  const type = String(record.billingTypeName || record.billingType || "").trim().toUpperCase();
  if (type.includes("FIXED")) return BILLING_TYPE_DETAILS_KEY.FIXED_PRICE;
  if (type.includes("RECURRING")) return BILLING_TYPE_DETAILS_KEY.RECURRING;
  // No separate "Milestone Plan" master-data record exists — the billing type
  // name is still literally "Milestone Based" (no "PLAN" substring), and it now
  // drives the Milestone Plan flow, not the legacy bare Milestone one. Any
  // "MILESTONE" name therefore resolves to Milestone Plan; the bare MILESTONE
  // branch below is unreachable via live master data and kept only in case a
  // genuinely distinct legacy record is ever reintroduced.
  if (type.includes("MILESTONE")) return BILLING_TYPE_DETAILS_KEY.MILESTONE_PLAN;
  if (type.includes("TIME") || type.includes("MATERIAL") || type.includes("TIMESHEET")) return BILLING_TYPE_DETAILS_KEY.TIME_MATERIAL;
  return null;
};

// Picks the correct nested section for this record's billing type and
// normalizes it to a consistent { key, list, single } shape so callers never
// have to guess whether it's an object or an array — and never throw on a
// missing/null section (a draft with no commercial details saved yet, or a
// billing type not in the map above).
const resolveBillingDetails = (record = {}) => {
  const key = resolveBillingTypeDetailsKey(record);
  const raw = key ? record[key] : null;
  const list = Array.isArray(raw) ? raw : null;
  // Fixed Price/Recurring are single objects; Time & Material/Milestone are
  // lists — scalar reads below use the first (primary) row of a list.
  const single = list ? list[0] || null : raw && typeof raw === "object" ? raw : null;
  return { key, list, single: single || null };
};

// Maps the flat BillingConfigurationResponseDto (billingConfigurationId,
// clientName, projectName, ..., approvalStatus, billingStatus, ...) plus its
// billing-type-specific nested details section onto the shape the approvals
// list/review screen renders.
export const normalizeApprovalConfiguration = (record = {}) => {
  const approvalStatus = String(record.approvalStatus || "").trim().toUpperCase() || "DRAFT";
  const billingStatus = String(record.billingStatus || "").trim().toUpperCase() || "INACTIVE";
  const { key: billingDetailsKey, list: billingDetailsList, single: billingDetails } = resolveBillingDetails(record);

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
    // Raw nested sections, passed through as-is for any UI that needs the
    // full shape (e.g. every T&M rate card row, not just the primary one).
    fixedPriceDetails: record.fixedPriceDetails || null,
    recurringDetails: record.recurringDetails || null,
    tmRateCards: record.tmRateCards || null,
    milestoneSchedules: record.milestoneSchedules || null,
    // The details section for THIS record's billing type — Fixed Price and
    // Recurring resolve to fixedPriceDetails/recurringDetails, T&M and
    // Milestone resolve to the first row of tmRateCards/milestoneSchedules.
    // null when the type isn't recognized or the section wasn't returned.
    billingDetailsKey,
    billingDetailsList,
    billingDetails,
    effectiveFrom: firstPresent(billingDetails?.effectiveFrom, record.effectiveFrom, record.startDate) || "",
    effectiveTo: firstPresent(billingDetails?.effectiveTo, record.effectiveTo, record.endDate) || "",
    hourlyRate: record.hourlyRate ?? "",
    // Recurring-only fields (see buildRecurringRequestPayload/normalizeRecurringConfig)
    // — read from the resolved billingDetails section (recurringDetails for a
    // RECURRING record), falling back to a top-level field in case the
    // backend also flattens it there.
    billingContext: firstPresent(billingDetails?.billingContext, record.billingContext) || "PROJECT",
    productName: firstPresent(billingDetails?.productName, record.productName) || "",
    productDescription: firstPresent(billingDetails?.productDescription, record.productDescription) || "",
    renewalType: firstPresent(billingDetails?.renewalType, record.renewalType) || "",
    renewalDurationType: firstPresent(billingDetails?.renewalDurationType, record.renewalDurationType) || "",
    renewalPricingType: firstPresent(billingDetails?.renewalPricingType, record.renewalPricingType) || "",
    renewalContractValue: firstPresent(billingDetails?.renewalContractValue, record.renewalContractValue),
    renewalBillingFrequencyId: firstPresent(billingDetails?.renewalBillingFrequencyId, record.renewalBillingFrequencyId) || "",
    renewalEffectiveFrom: firstPresent(billingDetails?.renewalEffectiveFrom, record.renewalEffectiveFrom) || "",
    // contractValue/pmsProjectBudget/contractValueSource and every commercial
    // figure below are read from the resolved billingDetails section first —
    // that's the backend's source of truth — falling back to the legacy flat
    // fields only when billingDetails is null/missing (e.g. a draft that was
    // never saved with commercial details).
    // Milestone Plan's total is deliberately NOT folded in here — it lives on
    // the separate BillingMilestonePlanResponseDto, see buildApprovalReviewModel.
    contractValue: firstPresent(billingDetails?.contractValue, record.contractValue),
    contractValueSource: firstPresent(billingDetails?.contractValueSource, record.contractValueSource),
    // PMS Project Budget: fixedPriceDetails.pmsProjectBudget first, falling
    // back to the top-level projectBudget when the details value is null.
    pmsProjectBudget: firstPresent(billingDetails?.pmsProjectBudget, record.projectBudget, record.pmsProjectBudget),
    // retentionPercentage is the canonical backend field name — check it first,
    // falling back to the legacy retentionPercent name for older responses.
    retentionPercent: firstPresent(
      billingDetails?.retentionPercentage,
      billingDetails?.retentionPercent,
      record.retentionPercentage,
      record.retentionPercent,
    ),
    retentionAmount: firstPresent(billingDetails?.retentionAmount, record.retentionAmount),
    billableAmount: firstPresent(billingDetails?.billableAmount, record.billableAmount),
    advanceReceived: firstPresent(billingDetails?.advanceReceived, record.advanceReceived),
    // remainingReceivable is the canonical backend field name — check it first,
    // falling back to the legacy remainingAmount name for older responses.
    remainingAmount: firstPresent(
      billingDetails?.remainingReceivable,
      billingDetails?.remainingAmount,
      record.remainingReceivable,
      record.remainingAmount,
    ),
    approvalStatus,
    billingStatus,
    // Re-approval change tracking — the backend's change snapshot is the only
    // source of truth for previous vs proposed values (see
    // ConfigurationChanges); preserved as-is, never recomputed here.
    changes: Array.isArray(record.changes) ? record.changes : [],
    previousApprovalStatus: String(record.previousApprovalStatus || "").trim().toUpperCase(),
    previousBillingStatus: String(record.previousBillingStatus || "").trim().toUpperCase(),
    createdAt: firstPresent(record.createdAt, record.createdDate) || "",
    updatedAt: record.updatedAt || "",
    versionNo: record.versionNo ?? "",
    createdBy: record.createdBy || "",
    submittedBy: firstPresent(record.submittedBy, record.createdBy) || "",
  };
};

// --- Approval Review model -------------------------------------------------
//
// The Review modal renders ONLY this model, so every business value has one
// definition and is shown in one place:
//   projectBudget — the PMS project budget (Commercial Configuration).
//   totalValue    — what this billing type actually bills: Fixed Price /
//                   Recurring contract value, or the Milestone Plan total.
//                   null for Time & Material (billed from rates, no total).
//   payments      — Milestone Plan payment entries.
//   pricingDetails— the remaining billing-type-specific figures/rates.
//   schedule      — only the schedule facts relevant to the billing type.
// Amounts are numbers or null — null means "not populated" and is never
// coerced to 0; only a real 0 from the backend renders as zero.

const toAmount = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const resolveReviewBillingType = (record = {}) => {
  const key = resolveBillingTypeDetailsKey(record);
  return Object.keys(BILLING_TYPE_DETAILS_KEY).find((type) => BILLING_TYPE_DETAILS_KEY[type] === key) || null;
};

const normalizeContractValueSource = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.startsWith("PMS")) return "PMS";
  if (normalized === "MANUAL") return "MANUAL";
  return normalized;
};

const buildTotalValue = (amount, source, projectBudget) =>
  amount === null
    ? null
    : {
        amount,
        source: normalizeContractValueSource(source),
        differsFromProjectBudget: projectBudget !== null && amount !== projectBudget,
      };

// Milestone Plan may come back embedded on the parent DTO in some
// environments; same candidate keys the Maker wizard's normalizer checks.
const MILESTONE_PLAN_EMBEDDED_KEYS = ["milestonePlan", "milestonePlanDetails", "billingMilestonePlan", "milestonePlanConfiguration"];

const findEmbeddedMilestonePlan = (record = {}) => {
  const embedded = firstPresent(...MILESTONE_PLAN_EMBEDDED_KEYS.map((key) => record[key]));
  return embedded && typeof embedded === "object" && !Array.isArray(embedded) ? embedded : null;
};

const buildMilestonePlanReview = (milestonePlanRecord) => {
  const plan = milestonePlanRecord ? normalizeMilestonePlanConfig(milestonePlanRecord) : null;
  const payments = (plan?.entries || [])
    .map((entry, index) => ({ ...entry, sequence: entry.sequence ?? index + 1 }))
    .sort((a, b) => a.sequence - b.sequence)
    .map((entry, index) => ({
      key: entry.paymentEntryId || `payment-${index}`,
      label: `Payment ${index + 1}`,
      percentage: toAmount(entry.percentage),
      amount: toAmount(entry.amount),
      billingDate: entry.billingDate || "",
      remarks: entry.remarks || "",
    }));
  const paymentStructure = plan ? String(plan.paymentStructure || "").toUpperCase() : "";

  let scheduleItems = [];
  if (payments.length > 0) {
    scheduleItems =
      paymentStructure === "FULL_PAYMENT"
        ? [
            { label: "Schedule Type", value: "One-Time Payment" },
            { label: "Billing Date", value: payments[0].billingDate, isDate: true },
          ]
        : [
            { label: "Schedule Type", value: "Installments" },
            { label: "Number of Payments", value: String(payments.length) },
            { label: "First Billing Date", value: payments[0].billingDate, isDate: true },
            { label: "Last Billing Date", value: payments[payments.length - 1].billingDate, isDate: true },
          ];
  }

  return {
    totalAmount: plan ? toAmount(plan.totalContractValue) : null,
    paymentStructure,
    payments,
    schedule: { items: scheduleItems, emptyMessage: "No payment schedule has been configured for this Milestone Plan." },
  };
};

const periodSchedule = (from, to, fromLabel = "Effective From", toLabel = "Effective To") => ({
  items:
    from || to
      ? [
          { label: fromLabel, value: from || "", isDate: true },
          { label: toLabel, value: to || "", isDate: true, emptyText: "Ongoing" },
        ]
      : [],
  emptyMessage: "No billing period has been configured.",
});

// `resolvedProject` is the canonical project from resolveConfigurationProject
// (same pipeline as the wizard's View/Review), so all three screens show the
// same Project Name/Code/Primary Location/Project Duration.
export const buildApprovalReviewModel = (record = {}, milestonePlanRecord = null, resolvedProject = {}) => {
  const billingType = resolveReviewBillingType(record);
  const fixedPrice = record.fixedPriceDetails || null;
  const recurring = record.recurringDetails || null;
  const projectBudget = toAmount(firstPresent(record.projectBudget, record.pmsProjectBudget));

  const model = {
    billingType,
    project: {
      ...getConfigurationDetailProject(record),
      ...resolvedProject,
      clientName: record.clientName || "",
      billingContext: firstPresent(recurring?.billingContext, record.billingContext) || "PROJECT",
      productName: firstPresent(recurring?.productName, record.productName) || "",
      productDescription: firstPresent(recurring?.productDescription, record.productDescription) || "",
    },
    billingTypeName: record.billingTypeName || record.billingType || "",
    billingFrequencyName: record.billingFrequencyName || record.billingFrequency || "",
    billingFrequencyId: record.billingFrequencyId || "",
    // Same rule as the wizard's View/Review: the project's budget currency,
    // with the configuration's currencyCode only as a fallback.
    currency:
      firstPresent(resolvedProject.projectBudgetCurrency, record.projectBudgetCurrency, record.currencyCode, record.currency) || "",
    projectBudget,
    totalValue: null,
    paymentStructure: "",
    payments: [],
    schedule: periodSchedule(record.effectiveFrom || record.startDate, record.effectiveTo || record.endDate),
    pricingDetails: {},
  };

  if (billingType === "FIXED_PRICE") {
    model.totalValue = buildTotalValue(
      toAmount(firstPresent(fixedPrice?.contractValue, fixedPrice?.totalContractValue, record.contractValue)),
      firstPresent(fixedPrice?.contractValueSource, record.contractValueSource),
      projectBudget,
    );
    model.pricingDetails = {
      retentionPercent: toAmount(firstPresent(fixedPrice?.retentionPercentage, fixedPrice?.retentionPercent)),
      retentionAmount: toAmount(fixedPrice?.retentionAmount),
      billableAmount: toAmount(fixedPrice?.billableAmount),
      advanceReceived: toAmount(fixedPrice?.advanceReceived),
      remainingReceivable: toAmount(firstPresent(fixedPrice?.remainingReceivable, fixedPrice?.remainingAmount)),
    };
    model.schedule = periodSchedule(
      firstPresent(fixedPrice?.effectiveFrom, record.effectiveFrom),
      firstPresent(fixedPrice?.effectiveTo, record.effectiveTo),
    );
  } else if (billingType === "RECURRING") {
    model.totalValue = buildTotalValue(
      toAmount(firstPresent(recurring?.contractValue, record.contractValue)),
      firstPresent(recurring?.contractValueSource, record.contractValueSource),
      projectBudget,
    );
    const isCustomRenewal =
      recurring?.renewalDurationType === "CUSTOM" || recurring?.renewalPricingType === "REVISED_PRICE";
    model.pricingDetails = {
      billingContext: firstPresent(recurring?.billingContext, record.billingContext) || "PROJECT",
      productName: firstPresent(recurring?.productName, record.productName) || "",
      productDescription: firstPresent(recurring?.productDescription, record.productDescription) || "",
      renewal: recurring?.renewalType
        ? {
            mode: isCustomRenewal ? "Custom" : "Same as Previous",
            amount: isCustomRenewal ? toAmount(recurring.renewalContractValue) : null,
            effectiveFrom: isCustomRenewal ? recurring.renewalEffectiveFrom || "" : "",
          }
        : null,
    };
    model.schedule = periodSchedule(
      firstPresent(recurring?.recurringStartDate, recurring?.effectiveFrom, record.effectiveFrom),
      firstPresent(recurring?.recurringEndDate, recurring?.effectiveTo, record.effectiveTo),
      "Recurring Start",
      "Recurring End",
    );
  } else if (billingType === "TIME_MATERIAL") {
    const rawCards = Array.isArray(record.tmRateCards) ? record.tmRateCards : [];
    const rateCards = rawCards.map((card, index) => ({
      key: firstPresent(card.rateCardId, card.tmRateCardId, card.id) || `rate-${index}`,
      role: firstPresent(card.roleName, card.role, card.resourceRole, card.designation) || "Standard Rate",
      rate: toAmount(firstPresent(card.rate, card.amount)),
      ratePeriod: String(firstPresent(card.ratePeriod, card.period) || "HOURLY").toUpperCase(),
    }));
    if (rateCards.length === 0 && toAmount(record.hourlyRate) !== null) {
      rateCards.push({ key: "rate-standard", role: "Standard Rate", rate: toAmount(record.hourlyRate), ratePeriod: "HOURLY" });
    }
    model.pricingDetails = { pricingModel: record.pricingModel || record.billingMode || "", rateCards };
    model.schedule = periodSchedule(
      firstPresent(rawCards[0]?.effectiveFrom, record.effectiveFrom),
      firstPresent(rawCards[0]?.effectiveTo, record.effectiveTo),
    );
  } else if (billingType === "MILESTONE_PLAN") {
    // Milestone Plan's total and payments live ONLY on the Milestone Plan
    // record — never the parent's contractValue or legacy milestoneSchedules.
    const plan = buildMilestonePlanReview(milestonePlanRecord);
    model.totalValue = buildTotalValue(plan.totalAmount, null, projectBudget);
    model.paymentStructure = plan.paymentStructure;
    model.payments = plan.payments;
    model.schedule = plan.schedule;
  }

  return model;
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
// full configuration for the read-only Review screen. The parent DTO carries
// no Milestone Plan payment entries (milestoneSchedules is the unrelated
// legacy list), so for a Milestone Plan the plan itself is loaded once from
// GET /api/billing-milestone-plan/{id}/milestone-plan — unless the parent
// already embeds it. The result's `review` is what the modal renders.
export const getBillingConfigurationForApproval = async (billingConfigurationId) => {
  const id = extractBillingConfigurationId(billingConfigurationId);
  if (!id) {
    return Promise.reject(new Error("Missing billingConfigurationId — unable to resolve an id from the provided value."));
  }

  const response = await api.get(`${BILLING_CONFIGURATIONS_URL}/${id}`);
  const record = unwrapData(response) || {};
  const normalized = normalizeApprovalConfiguration(record);

  const loadMilestonePlan = async () => {
    if (resolveReviewBillingType(record) !== "MILESTONE_PLAN") return null;
    const embedded = findEmbeddedMilestonePlan(record);
    if (embedded) return embedded;
    try {
      return await getMilestonePlanByBillingConfiguration(normalized.billingConfigurationId || id);
    } catch (error) {
      console.warn("Unable to load milestone plan for approval review", error);
      return null;
    }
  };

  // Project master data resolves in parallel with the Milestone Plan — the
  // same resolution the wizard's View/Review uses, so Project Duration etc.
  // match across all three screens.
  const [milestonePlanRecord, resolvedProject] = await Promise.all([
    loadMilestonePlan(),
    resolveConfigurationProject(getConfigurationDetailProject(record)).catch((error) => {
      console.warn("Unable to resolve project for approval review", error);
      return {};
    }),
  ]);

  return { ...normalized, review: buildApprovalReviewModel(record, milestonePlanRecord, resolvedProject) };
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
