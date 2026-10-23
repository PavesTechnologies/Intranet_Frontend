/**
 * Base URL for every Expense Management Service (XMS) request.
 *
 * XMS endpoints carry their own "/xms" prefix in the request path
 * (e.g. `/xms/dashboard/manager`), so the base must be the bare host.
 * EXPENSE_MANAGEMENT_URL in config.js may be configured with a trailing
 * "/xms" (like PMS_BASE_URL ends in "/pms"); strip it so requests don't
 * become `/xms/xms/...`.
 */
export const XMS_BASE_URL = (window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/xms$/i, "");
