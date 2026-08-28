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
// The Maker wizard's DRAFT -> PENDING_APPROVAL transition — replaces the old
// activateConfiguration alias (which called the now-removed /activate
// endpoint). There is no activate step in the new workflow; the Finance
// Manager's approve/reject actions live entirely in billingApprovalService.js.
export { submitBillingConfigurationForApproval as submitConfigurationForApproval } from "./billingConfigurationService";

// Note: do NOT add fake/stub APIs here. Only re-export real functions from billingConfigurationService.js