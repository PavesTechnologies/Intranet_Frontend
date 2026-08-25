export * from "./billingConfigurationService";

// Existing alias
export {
  getBillingConfigurations as fetchBillingConfigurations,
} from "./billingConfigurationService";

// Overview aliases
export {
  getBillingConfigurationStats as fetchOverviewStats,
  getBillingConfigurationActivity as fetchRecentActivity,
} from "./billingConfigurationService";


// Compatibility aliases for older import names used across the frontend
export { getBillingConfigurationById as fetchBillingConfigurationById } from "./billingConfigurationService";
export { saveBillingConfiguration as saveDraftConfiguration } from "./billingConfigurationService";
export { approveBillingConfiguration as activateConfiguration } from "./billingConfigurationService";

// Note: do NOT add fake/stub APIs here. Only re-export real functions from billingConfigurationService.js