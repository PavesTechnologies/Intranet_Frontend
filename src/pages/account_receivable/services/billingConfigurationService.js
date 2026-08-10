import api from "../../../api/axiosInstance";
import { lookupService } from "../../expense-management/api/expenseReportsApi";

const BASE_URL = window.__APP_CONFIG__.AR_BASE_URL;

const BILLING_CONFIGURATIONS_URL = `${BASE_URL}/api/billing-configurations`;
const ACTIVE_BILLING_TYPES_URL = `${BASE_URL}/api/billing-types/active`;
const ACTIVE_BILLING_FREQUENCIES_URL = `${BASE_URL}/api/billing-frequency/active`;
const ACTIVE_PAYMENT_TERMS_URL = `${BASE_URL}/api/payment-terms/active`;
const ACTIVE_TAX_REGIONS_URL = `${BASE_URL}/api/tax-regions/active`;
const BILLING_SUBSCRIPTIONS_URL = `${BASE_URL}/api/billing-subscription`;
const TM_RATE_CARDS_URL = `${BASE_URL}/api/billing-tm-rate-card`;

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

const labelize = (value) => {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const normalizeBillingTypeValue = (value) => {
  if (!value) return "";

  const normalized = String(value).trim().toUpperCase().replace(/\s+/g, "_");

  if (["TIME_MATERIAL", "TIMESHEET_BASED", "TIMESHEET", "TIME_AND_MATERIAL"].includes(normalized)) return "TIME_MATERIAL";
  if (["FIXED_PRICE", "FIXED"].includes(normalized)) return "FIXED_PRICE";
  if (["MILESTONE", "MILESTONE_BASED"].includes(normalized)) return "MILESTONE";
  if (["RECURRING", "RECURRING_BILLING", "SUBSCRIPTION", "SUBSCRIPTION_BASED"].includes(normalized)) return "RECURRING";

  return normalized;
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeStatus = (status) => {
  const normalized = labelize(status);
  if (normalized === "Approved") return "Active";
  return normalized || "Draft";
};

const getConfigId = (config) =>
  config?.billingConfigurationId ||
  config?.configurationId ||
  config?.configId ||
  config?.id;

export const extractBillingConfigurationId = (value, depth = 3) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);

  const candidate = getConfigId(value);
  if (candidate || candidate === 0) return String(candidate);

  if (depth <= 0 || typeof value !== "object") return null;

  const nestedKeys = ["data", "response", "payload", "result", "body"];
  for (const key of nestedKeys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const nested = extractBillingConfigurationId(value[key], depth - 1);
      if (nested) return nested;
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractBillingConfigurationId(item, depth - 1);
      if (nested) return nested;
    }
  }

  for (const key of Object.keys(value)) {
    if (typeof value[key] === "object") {
      const nested = extractBillingConfigurationId(value[key], depth - 1);
      if (nested) return nested;
    }
  }

  return null;
};

const getProjectInfo = (config) => config?.projectInfo || config?.project || {};

const getBillingConfig = (config) =>
  config?.billingConfig || config?.billingConfiguration || config?.billingDetails || {};

const getToolBilling = (config) => config?.toolBilling || config?.toolBillingConfig || {};

const getControls = (config) => config?.controls || config?.financialControls || {};

const parseProjectDuration = (value) => {
  if (!value || typeof value !== "string") return { startDate: "", endDate: "" };

  const normalizedValue = value.trim();
  if (!normalizedValue) return { startDate: "", endDate: "" };

  const parts = normalizedValue
    .split(/\s+to\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      startDate: parts[0],
      endDate: parts[1],
    };
  }

  return { startDate: "", endDate: "" };
};

export const normalizeBillingConfiguration = (config = {}) => {
  const projectInfo = getProjectInfo(config);
  const billingConfig = getBillingConfig(config);
  const toolBilling = getToolBilling(config);
  const controls = getControls(config);
  const setupMode = config.setupMode || projectInfo.setupMode || (config.source === "Standalone" ? "STANDALONE" : "EXISTING");
  const status = normalizeStatus(config.status || config.approvalStatus || config.configurationStatus);

  return {
    ...config,
    id: getConfigId(config),
    billingConfigurationId: getConfigId(config),
    projectCode: config.projectCode || projectInfo.projectCode || projectInfo.code || "",
    projectName: config.projectName || projectInfo.projectName || projectInfo.name || "",
    client:
      config.client ||
      config.clientName ||
      projectInfo.clientName ||
      projectInfo.client?.clientName ||
      projectInfo.client?.name ||
      "",
    billingType: config.billingTypeLabel || labelize(config.billingType || billingConfig.billingType),
    billingFrequency: config.billingFrequency || billingConfig.billingFrequency || "",
    source: config.source || (setupMode === "STANDALONE" ? "Standalone" : "Enterprise"),
    setupMode,
    status,
    toolBillingEnabled:
      config.toolBillingEnabled ??
      toolBilling.enableToolBilling ??
      toolBilling.enabled ??
      false,
    lastUpdated: formatDate(config.lastUpdated || config.updatedAt || config.modifiedAt || config.createdAt),
    updatedBy: config.updatedBy || config.modifiedBy || config.createdBy || "",
    currentStep: config.currentStep || (status === "Draft" ? 1 : 6),
  };
};

export const normalizeClient = (client = {}) => {
  const id = client.clientId || client.id || client.value;
  const name = client.clientName || client.name || client.label || client.companyName || "";

  return {
    ...client,
    id,
    clientId: id,
    clientName: name,
    value: id,
    label: name,
  };
};

export const normalizeBillingFrequencyValue = (value) => {
  if (!value) return "";
  return String(value).trim().toUpperCase().replace(/[-\s]+/g, "_");
};

export const normalizeBillingType = (billingType = {}) => {
  const id = billingType.billingTypeId || billingType.id || billingType.typeId || billingType.value || "";
  const rawValue =
  billingType.billingTypeCode ||
  billingType.code ||
  billingType.value ||
  billingType.typeCode ||
  billingType.type ||
  billingType.billingTypeValue ||
  billingType.billingTypeName ||
  billingType.name ||
  billingType.label ||
  "";
  const value = normalizeBillingTypeValue(rawValue);
  const name =
    {
      TIME_MATERIAL: "Timesheet Based",
      FIXED_PRICE: "Fixed Price",
      MILESTONE: "Milestone Based",
      RECURRING: "Recurring",
    }[value] ||
    billingType.billingTypeName ||
    billingType.name ||
    billingType.label ||
    billingType.displayName ||
    (value ? labelize(value) : "");
  const description = billingType.description || billingType.details || billingType.summary || "";

  return {
    ...billingType,
    id,
    billingTypeId: id,
    billingTypeName: name,
    value,
    billingTypeValue: value,
    label: name,
    description,
  };
};

export const normalizeBillingFrequency = (billingFrequency = {}) => {
  const id = billingFrequency.billingFrequencyId || billingFrequency.id || billingFrequency.value || "";
  const name = String(
    billingFrequency.billingFrequencyName || billingFrequency.name || billingFrequency.label || "",
  ).trim();
  const value = normalizeBillingFrequencyValue(name);

  return {
    ...billingFrequency,
    id,
    billingFrequencyId: id,
    value,
    label: name,
  };
};

export const normalizePaymentTerm = (term = {}) => {
  const id = term.paymentTermId || term.id || term.payment_term_id || term.termId || "";
  const name = String(term.paymentTermName || term.name || term.term_name || term.termName || term.label || "").trim();
  const value = normalizeBillingFrequencyValue(name);

  return {
    ...term,
    id,
    paymentTermId: id,
    value,
    label: name,
  };
};

export const normalizeCurrency = (currency = {}) => {
  const id = currency.currencyId || currency.currency_id || currency.id || currency.value || "";
  const code = currency.currencyCode || currency.currency_code || currency.code || currency.value || "";
  const name = currency.currencyName || currency.currency_name || currency.name || currency.label || code;

  return {
    ...currency,
    id,
    currencyId: id,
    currencyCode: code,
    value: id,
    label: code && name && code !== name ? `${code} - ${name}` : name || code,
  };
};

export const normalizeTaxRegion = (region = {}) => {
  const id = region.taxRegionId || region.tax_region_id || region.id || region.value || "";
  const code = region.taxRegionCode || region.tax_region_code || region.code || "";
  const name = region.taxRegionName || region.tax_region_name || region.name || region.label || code;

  return {
    ...region,
    id,
    taxRegionId: id,
    taxRegionCode: code,
    value: id,
    label: code && name && code !== name ? `${code} - ${name}` : name || code,
  };
};

export const normalizeProject = (project = {}) => {
  const id = project.projectId || project.id || project.value;
  const projectDuration = project.projectDuration || project.duration || "";
  const parsedDuration = parseProjectDuration(projectDuration);
  const currencyObject = project.currency && typeof project.currency === "object" ? project.currency : null;
  const currencyCode =
    project.currencyCode ||
    project.currency_code ||
    currencyObject?.currencyCode ||
    currencyObject?.currency_code ||
    currencyObject?.code ||
    (typeof project.currency === "string" ? project.currency : "") ||
    project.budgetCurrency ||
    "";
  const projectBudgetCurrency = project.projectBudgetCurrency || currencyCode || "";
  const projectBudget = project.projectBudget ?? project.budget ?? project.budgetAmount ?? "";

  return {
    ...project,
    id,
    projectId: id,
    clientId: project.clientId || project.client?.clientId || project.client?.id,
    clientName: project.clientName || project.client?.clientName || project.client?.name || "",
    projectName: project.projectName || project.name || project.label || "",
    projectCode: project.projectCode || project.code || project.projectKey || "",
    contractNumber: project.contractNumber || project.contractReference || "",
    currencyId: project.currencyId || currencyObject?.currencyId || currencyObject?.id || project.currency_id || "",
    currency: currencyCode || projectBudgetCurrency || "",
    billingType: project.billingType || "",
    billingMode: project.billingMode || "",
    billingFrequency: project.billingFrequency || "",
    projectDuration,
    projectBudget,
    projectBudgetCurrency,
    startDate: project.startDate || project.projectStartDate || parsedDuration.startDate || "",
    endDate: project.endDate || project.projectEndDate || parsedDuration.endDate || "",
  };
};

export const getApiErrorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const getBillingConfigurations = async () => {
  const response = await api.get(BILLING_CONFIGURATIONS_URL);
  return asArray(unwrapData(response)).map(normalizeBillingConfiguration);
};

export const getBillingConfigurationById = async (billingConfigurationId) => {
  const response = await api.get(`${BILLING_CONFIGURATIONS_URL}/${billingConfigurationId}`);
  const config = unwrapData(response);
  const normalized = normalizeBillingConfiguration(config);

  return {
    summary: normalized,
    detail: {
      ...config,
      setupMode: config?.setupMode || normalized.setupMode,
      projectInfo: getProjectInfo(config),
      billingConfig: getBillingConfig(config),
      toolBilling: getToolBilling(config),
      controls: getControls(config),
    },
  };
};

export const getApprovedConfigurationByProject = async (projectId) => {
  const response = await api.get(`${BILLING_CONFIGURATIONS_URL}/project/${projectId}`);
  return normalizeBillingConfiguration(unwrapData(response));
};

export const createBillingConfiguration = async (payload) => {
  const response = await api.post(BILLING_CONFIGURATIONS_URL, payload);
  return unwrapData(response);
};

export const updateBillingConfiguration = async (billingConfigurationId, payload) => {
  const response = await api.put(`${BILLING_CONFIGURATIONS_URL}/${billingConfigurationId}`, payload);
  return unwrapData(response);
};

export const approveBillingConfiguration = async (billingConfigurationId) => {
  // Compatibility shim: use the activate endpoint instead of the old /approve path
  return activateBillingConfiguration(billingConfigurationId);
};

export const rejectBillingConfiguration = async (billingConfigurationId, rejectionReason) => {
  const response = await api.put(`${BILLING_CONFIGURATIONS_URL}/${billingConfigurationId}/reject`, {
    rejectionReason,
  });
  return unwrapData(response);
};

export const deactivateBillingConfiguration = async (billingConfigurationId) => {
  const response = await api.patch(`${BILLING_CONFIGURATIONS_URL}/${billingConfigurationId}/deactivate`);
  return unwrapData(response);
};

export const activateBillingConfiguration = async (billingConfigurationId) => {
  const id = extractBillingConfigurationId(billingConfigurationId);
  if (!id) {
    return Promise.reject(new Error("Missing billingConfigurationId — unable to resolve an id from the provided value."));
  }

  const response = await api.put(`${BILLING_CONFIGURATIONS_URL}/${id}/activate`);
  return unwrapData(response);
};

export const getBillingConfigurationClients = async () => {
  const response = await api.get(`${BILLING_CONFIGURATIONS_URL}/clients`);
  return asArray(unwrapData(response)).map(normalizeClient);
};

export const getActiveBillingTypes = async () => {
  const response = await api.get(ACTIVE_BILLING_TYPES_URL);
  return asArray(unwrapData(response))
    .map(normalizeBillingType)
    .filter((type) => ["TIME_MATERIAL", "FIXED_PRICE", "MILESTONE", "RECURRING"].includes(type.value));
};

export const getActiveBillingFrequencies = async () => {
  const response = await api.get(ACTIVE_BILLING_FREQUENCIES_URL);
  return asArray(unwrapData(response)).map(normalizeBillingFrequency);
};

export const getActivePaymentTerms = async () => {
  const response = await api.get(ACTIVE_PAYMENT_TERMS_URL);
  return asArray(unwrapData(response)).map(normalizePaymentTerm).filter((t) => t.value);
};

export const getActiveCurrencies = async () => {
  const currencies = await lookupService.getActiveCurrencies();
  return asArray(currencies).map(normalizeCurrency).filter((currency) => currency.currencyId);
};

export const getActiveTaxRegions = async () => {
  const response = await api.get(ACTIVE_TAX_REGIONS_URL);
  return asArray(unwrapData(response)).map(normalizeTaxRegion).filter((region) => region.taxRegionId);
};

export const getBillingSubscriptionById = async (subscriptionConfigurationId) => {
  const response = await api.get(`${BILLING_SUBSCRIPTIONS_URL}/${subscriptionConfigurationId}`);
  return unwrapData(response);
};

export const getBillingSubscriptionByBillingConfigurationId = async (billingConfigurationId) => {
  const response = await api.get(`${BILLING_SUBSCRIPTIONS_URL}/billing-configuration/${billingConfigurationId}`);
  return unwrapData(response);
};

export const createBillingSubscription = async (billingConfigurationId, payload) => {
  const response = await api.post(`${BILLING_SUBSCRIPTIONS_URL}/${billingConfigurationId}`, payload);
  return unwrapData(response);
};

export const updateBillingSubscription = async (subscriptionConfigurationId, payload) => {
  const response = await api.put(`${BILLING_SUBSCRIPTIONS_URL}/${subscriptionConfigurationId}`, payload);
  return unwrapData(response);
};

export const getBillingConfigurationProjectsByClient = async (clientId) => {
  const response = await api.get(`${BILLING_CONFIGURATIONS_URL}/projects/${clientId}`);
  return asArray(unwrapData(response)).map(normalizeProject);
};

// --- Time & Material Rate Card APIs ---
export const getTmRateCardsByBillingConfiguration = async (billingConfigurationId) => {
  if (!billingConfigurationId) return [];
  const response = await api.get(`${TM_RATE_CARDS_URL}/${billingConfigurationId}/tm-rate-cards`);
  return asArray(unwrapData(response));
};

export const getTmRateCardById = async (rateCardId) => {
  if (!rateCardId) return null;
  const response = await api.get(`${TM_RATE_CARDS_URL}/tm-rate-cards/${rateCardId}`);
  return unwrapData(response);
};

export const createTmRateCard = async (billingConfigurationId, payload) => {
  if (!billingConfigurationId) throw new Error("Missing billingConfigurationId");
  const response = await api.post(`${TM_RATE_CARDS_URL}/${billingConfigurationId}/tm-rate-cards`, payload);
  return unwrapData(response);
};

export const updateTmRateCard = async (rateCardId, payload) => {
  if (!rateCardId) throw new Error("Missing rateCardId");
  const response = await api.put(`${TM_RATE_CARDS_URL}/tm-rate-cards/${rateCardId}`, payload);
  return unwrapData(response);
};

export const deleteTmRateCard = async (rateCardId) => {
  if (!rateCardId) throw new Error("Missing rateCardId");
  const response = await api.delete(`${TM_RATE_CARDS_URL}/tm-rate-cards/${rateCardId}`);
  return unwrapData(response);
};

const buildSubscriptionPayload = (payload = {}) => {
  const billingConfig = payload?.billingConfig || {};
  const recurringMode = billingConfig.billingMode || "MONTHLY_RETAINER";

  if (recurringMode === "SUBSCRIPTION") {
    return {
      recurringMode: "SUBSCRIPTION",
      plan: billingConfig.subscription?.plan || "",
      amount: billingConfig.subscription?.amount || "",
      billingCycle: billingConfig.subscription?.billingCycle || billingConfig.billingFrequency || "",
      startDate: billingConfig.subscription?.startDate || "",
      endDate: billingConfig.subscription?.endDate || "",
      autoRenewal: Boolean(billingConfig.subscription?.autoRenewal),
      gracePeriodDays: billingConfig.subscription?.gracePeriodDays || "",
    };
  }

  return {
    recurringMode: "MONTHLY_RETAINER",
    amount: billingConfig.monthlyRetainer?.amount || "",
    billingStartDate: billingConfig.monthlyRetainer?.billingStartDate || "",
    billingFrequency: billingConfig.billingFrequency || "",
    billingDayOfMonth: billingConfig.monthlyRetainer?.billingDayOfMonth || "",
    autoInvoiceGeneration: Boolean(billingConfig.monthlyRetainer?.autoInvoiceGeneration),
    prorateFirstMonth: Boolean(billingConfig.monthlyRetainer?.prorateFirstMonth),
  };
};

const REQUIRED_BILLING_CONFIGURATION_FIELDS = [
  "clientId",
  "projectId",
  "billingTypeId",
  "billingFrequencyId",
  "paymentTermId",
  "currencyId",
  "taxRegionId",
  "invoiceGenerationType",
  "pricingModel",
  "expenseBillingEligible",
  "effectiveFrom",
];

const isBlank = (value) => value === null || value === undefined || value === "";

export const buildBillingConfigurationRequestPayload = (wizardPayload = {}) => {
  const projectInfo = wizardPayload.projectInfo || {};
  const billingConfig = wizardPayload.billingConfig || {};
  const controls = wizardPayload.controls || {};

  return {
    clientId: projectInfo.clientId || wizardPayload.clientId || "",
    projectId: projectInfo.projectId || wizardPayload.projectId || "",
    billingTypeId: billingConfig.billingTypeId || wizardPayload.billingTypeId || "",
    billingFrequencyId: billingConfig.billingFrequencyId || wizardPayload.billingFrequencyId || "",
    paymentTermId: controls.paymentTermId || wizardPayload.paymentTermId || "",
    currencyId: projectInfo.currencyId || billingConfig.currencyId || wizardPayload.currencyId || "",
    taxRegionId: controls.taxRegionId || wizardPayload.taxRegionId || "",
    invoiceGenerationType:
      controls.invoiceGenerationType ||
      wizardPayload.invoiceGenerationType ||
      (controls.autoInvoiceGeneration === true ? "AUTOMATIC" : "MANUAL"),
    pricingModel: billingConfig.billingMode || billingConfig.pricingModel || wizardPayload.pricingModel || "",
    expenseBillingEligible:
      controls.expenseBillingEligible ?? wizardPayload.expenseBillingEligible ?? false,
    effectiveFrom:
      billingConfig.effectiveFrom ||
      wizardPayload.effectiveFrom ||
      projectInfo.startDate ||
      "",
  };
};

const assertBillingConfigurationPayload = (payload) => {
  const missingFields = REQUIRED_BILLING_CONFIGURATION_FIELDS.filter((field) => isBlank(payload[field]));

  if (missingFields.length > 0) {
    throw new Error(`Missing required billing configuration field(s): ${missingFields.join(", ")}`);
  }
};

export const saveBillingConfiguration = async (payload, billingConfigurationId) => {
  const requestPayload = buildBillingConfigurationRequestPayload(payload);
  console.log("Billing configuration save payload", requestPayload);
  assertBillingConfigurationPayload(requestPayload);

  const configResponse = billingConfigurationId
    ? await updateBillingConfiguration(billingConfigurationId, requestPayload)
    : await createBillingConfiguration(requestPayload);

  const configId =
    extractBillingConfigurationId(billingConfigurationId) ||
    extractBillingConfigurationId(configResponse);
  const billingType = payload?.billingConfig?.billingType || configResponse?.billingType || "";

  if (configId && billingType === "RECURRING") {
    try {
      const existingSubscription = await getBillingSubscriptionByBillingConfigurationId(configId);
      const subscriptionPayload = buildSubscriptionPayload(payload);
      if (existingSubscription) {
        await updateBillingSubscription(existingSubscription.subscriptionConfigurationId || existingSubscription.id, subscriptionPayload);
      } else {
        await createBillingSubscription(configId, subscriptionPayload);
      }
    } catch (error) {
      console.warn("Unable to save recurring subscription configuration", error);
    }
  }

  return configResponse;
};

export const getBillingConfigurationStats = async () => {
  const configurations = await getBillingConfigurations();

  return {
    total: configurations.length,
    active: configurations.filter((config) => config.status === "Active").length,
    draft: configurations.filter((config) => config.status === "Draft").length,
    integrated: configurations.filter((config) => config.setupMode === "EXISTING").length,
    manual: configurations.filter((config) => config.setupMode === "STANDALONE").length,
    toolBillingEnabled: configurations.filter((config) => config.toolBillingEnabled).length,
  };
};

export const getBillingConfigurationActivity = async () => {
  const configurations = await getBillingConfigurations();

  return configurations
    .filter((config) => config.lastUpdated)
    .slice(0, 6)
    .map((config) => ({
      configId: config.id,
      action: `${config.status} Configuration`,
      user: config.updatedBy || "System",
      time: config.lastUpdated,
    }));
};
