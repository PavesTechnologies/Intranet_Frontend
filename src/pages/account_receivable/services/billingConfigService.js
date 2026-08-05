// Mock service layer for Project Billing Setup. Wraps the static data modules with
// promise-based, artificially-latent functions so pages can already be written against
// an async data-fetching contract — swap the bodies for real axios calls (see
// src/pages/resource_management/services for the target shape) once the Epic 1 API exists.
import { PROJECTS } from "../data/projects";
import { BILLING_CONFIGURATIONS, RECENT_ACTIVITY, CONFIG_DETAILS } from "../data/billingConfigurations";
import { CONFIGURATION_HISTORY } from "../data/configurationHistory";

const LATENCY_MS = 400;

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

export function fetchBillingConfigurations() {
  return delay(BILLING_CONFIGURATIONS);
}

export function fetchRecentActivity() {
  return delay(RECENT_ACTIVITY);
}

export function fetchConfigurationHistory() {
  return delay(CONFIGURATION_HISTORY);
}

export function fetchOverviewStats() {
  const total = BILLING_CONFIGURATIONS.length;
  const active = BILLING_CONFIGURATIONS.filter((config) => config.status === "Active").length;
  const draft = BILLING_CONFIGURATIONS.filter((config) => config.status === "Draft").length;
  const integrated = BILLING_CONFIGURATIONS.filter((config) => config.setupMode === "EXISTING").length;
  const manual = BILLING_CONFIGURATIONS.filter((config) => config.setupMode === "STANDALONE").length;
  const toolBillingEnabled = BILLING_CONFIGURATIONS.filter((config) => config.toolBillingEnabled).length;

  return delay({ total, active, draft, integrated, manual, toolBillingEnabled });
}

export function fetchActiveEnterpriseProjects() {
  const results = PROJECTS.filter((project) => project.source === "PMS" && project.status === "Active");
  return delay(results);
}

export function fetchBillingConfigurationById(configId) {
  const summary = BILLING_CONFIGURATIONS.find((config) => config.id === configId) || null;
  const detail = CONFIG_DETAILS[configId] || null;

  return delay(summary ? { summary, detail } : null);
}

export function saveDraftConfiguration(wizardData) {
  // Placeholder — will POST/PATCH the draft to the Epic 1 API. No persistence happens yet;
  // the caller keeps the source of truth in component state for this UI phase.
  return delay({ ...wizardData, status: "Draft", savedAt: new Date().toISOString() });
}

export function activateConfiguration(wizardData) {
  // Placeholder — will POST activation to the Epic 1 API.
  return delay({ ...wizardData, status: "Active", activatedAt: new Date().toISOString() });
}
