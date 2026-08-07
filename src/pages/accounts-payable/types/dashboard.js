/**
 * @typedef {Object} PipelineStageCount
 * @property {string} status - one of INVOICE_STATUS (see constants/invoiceStatus.js)
 * @property {number} count
 */

/**
 * @typedef {Object} DashboardKpi
 * @property {string} label
 * @property {number|string} value
 * @property {string} [subtitle]
 */

/**
 * @typedef {Object} ActivityFeedItem
 * @property {string} id
 * @property {string} message
 * @property {string} timestamp - ISO date string
 */

/**
 * @typedef {Object} ApDashboardSummary
 * @property {DashboardKpi[]} kpis - role-scoped, see hooks/useApPermissions.js
 * @property {PipelineStageCount[]} pipeline
 * @property {ActivityFeedItem[]} recentActivity
 */

/** @returns {ApDashboardSummary} an empty summary, used while the dashboard query is loading */
export function createEmptyDashboardSummary() {
  return { kpis: [], pipeline: [], recentActivity: [] };
}
