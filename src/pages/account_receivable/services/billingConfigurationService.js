import api from "../../../api/axiosInstance";

const BASE_URL =
  window.__APP_CONFIG__?.AR_BASE_URL ||
  window.__APP_CONFIG__?.RMS_BASE_URL ||
  "";

const BILLING_CONFIGURATIONS_URL = `${BASE_URL}/api/billing-configurations`;

const unwrapData = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;

  return payload?.data ?? payload ?? null;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.content)) return value.content;
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

const getProjectInfo = (config) => config?.projectInfo || config?.project || {};

const getBillingConfig = (config) =>
  config?.billingConfig || config?.billingConfiguration || config?.billingDetails || {};

const getToolBilling = (config) => config?.toolBilling || config?.toolBillingConfig || {};

const getControls = (config) => config?.controls || config?.financialControls || {};

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

export const normalizeProject = (project = {}) => {
  const id = project.projectId || project.id || project.value;

  return {
    ...project,
    id,
    projectId: id,
    clientId: project.clientId || project.client?.clientId || project.client?.id,
    clientName: project.clientName || project.client?.clientName || project.client?.name || "",
    projectName: project.projectName || project.name || project.label || "",
    projectCode: project.projectCode || project.code || project.projectKey || "",
    contractNumber: project.contractNumber || project.contractReference || "",
    currency: project.currency || "",
    billingType: project.billingType || "",
    billingMode: project.billingMode || "",
    billingFrequency: project.billingFrequency || "",
    startDate: project.startDate || project.projectStartDate || "",
    endDate: project.endDate || project.projectEndDate || "",
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
  const response = await api.put(`${BILLING_CONFIGURATIONS_URL}/${billingConfigurationId}/approve`);
  return unwrapData(response);
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

export const getBillingConfigurationClients = async () => {
  const response = await api.get(`${BILLING_CONFIGURATIONS_URL}/clients`);
  return asArray(unwrapData(response)).map(normalizeClient);
};

export const getBillingConfigurationProjectsByClient = async (clientId) => {
  const response = await api.get(`${BILLING_CONFIGURATIONS_URL}/projects/${clientId}`);
  return asArray(unwrapData(response)).map(normalizeProject);
};

export const saveBillingConfiguration = async (payload, billingConfigurationId) => {
  if (billingConfigurationId) {
    return updateBillingConfiguration(billingConfigurationId, payload);
  }

  return createBillingConfiguration(payload);
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
