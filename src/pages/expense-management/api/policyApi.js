import api from "@/api/axiosInstance";

/**
 * Shared service layer for the Policy & Compliance Engine (bundles, groups,
 * assignments, rules, severity thresholds, versions), mirroring the shape of
 * expenseReportsApi.js so every Policy Engine screen/drawer can share one
 * axios boilerplate instead of re-declaring it per page.
 *
 * Every request/response field name below is taken verbatim from the backend
 * API reference — do not rename, add, or remove fields without the backend
 * contract itself changing.
 */

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const normalizeList = (data, key) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return data[key] || data.content || data.data || [];
  return [];
};

// --- Policy Bundles: /xms/admin/policy-bundles ------------------------------
// Response/request fields: policyId, policyName, description, status,
// currentVersion, createdAt, updatedAt.
export const policyBundleService = {
  getAll: () => api.get("/xms/admin/policy-bundles", { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  getById: (policyId) =>
    api.get(`/xms/admin/policy-bundles/${policyId}`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  create: (payload) =>
    api.post("/xms/admin/policy-bundles", payload, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  update: (policyId, payload) =>
    api.put(`/xms/admin/policy-bundles/${policyId}`, payload, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  delete: (policyId) =>
    api.delete(`/xms/admin/policy-bundles/${policyId}`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
};

// --- Policy Groups: /xms/admin/policy-groups --------------------------------
// Response/request fields: groupId, groupName, description, status,
// memberCount, createdAt, updatedAt. Members are NOT embedded — fetch via
// getMembers().
export const policyGroupService = {
  getAll: () => api.get("/xms/admin/policy-groups", { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  getById: (groupId) =>
    api.get(`/xms/admin/policy-groups/${groupId}`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  create: (payload) =>
    api.post("/xms/admin/policy-groups", payload, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  update: (groupId, payload) =>
    api.put(`/xms/admin/policy-groups/${groupId}`, payload, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  delete: (groupId) =>
    api.delete(`/xms/admin/policy-groups/${groupId}`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  getMembers: (groupId) =>
    api.get(`/xms/admin/policy-groups/${groupId}/members`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
};

// PolicyGroupMemberResponse: memberId, groupId, employeeId, createdAt.
export const groupMemberService = {
  add: (groupId, employeeId) =>
    api.post(
      `/xms/admin/policy-groups/${groupId}/members`,
      { employeeId },
      { baseURL: EXPENSE_API_BASE, headers: authHeaders() }
    ),
  remove: (groupId, employeeId) =>
    api.delete(`/xms/admin/policy-groups/${groupId}/members/${employeeId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
};

// --- Policy Assignments: /xms/admin/policy-assignments ----------------------
// Request: assignmentType, employeeId, groupId, policyId, status.
// Response adds: assignmentId, groupName, policyName, createdAt, updatedAt.
export const policyAssignmentService = {
  getAll: () => api.get("/xms/admin/policy-assignments", { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  getById: (assignmentId) =>
    api.get(`/xms/admin/policy-assignments/${assignmentId}`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  create: (payload) =>
    api.post("/xms/admin/policy-assignments", payload, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  delete: (assignmentId) =>
    api.delete(`/xms/admin/policy-assignments/${assignmentId}`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  // No request body — policyId in the path becomes the org-wide fallback for
  // anyone without an Individual/Group assignment.
  setDefault: (policyId) =>
    api.put(`/xms/admin/policy-assignments/default/${policyId}`, null, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
};

// --- Policy Rules: /xms/admin/policies --------------------------------------
// NOTE: the path is /policies, and {policyId} here is the RULE's own id, not
// the bundle's. The parent bundle is referenced via policyBundleId in the body.
// Request/response fields: policyId, policyBundleId, categoryId, categoryName,
// policyName, ruleType, ruleValue, severity, enforcementType, effectiveFrom,
// effectiveTo, status, limits: [{currencyId, limitAmount, currencyCode?}].
export const policyRuleService = {
  getAll: (categoryId) =>
    api.get("/xms/admin/policies", {
      baseURL: EXPENSE_API_BASE,
      params: categoryId ? { categoryId } : undefined,
      headers: authHeaders(),
    }),
  getById: (policyId) =>
    api.get(`/xms/admin/policies/${policyId}`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  create: (payload) =>
    api.post("/xms/admin/policies", payload, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  update: (policyId, payload) =>
    api.put(`/xms/admin/policies/${policyId}`, payload, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  delete: (policyId) =>
    api.delete(`/xms/admin/policies/${policyId}`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
};

// --- Severity Thresholds: /xms/admin/severity-thresholds --------------------
// GET/PUT both take an optional policyId query param (omit for the global
// default bands). PUT body is a RAW ARRAY of
// {tier, minPercentOver, maxPercentOver} — not wrapped in an object.
export const severityThresholdService = {
  get: (policyId) =>
    api.get("/xms/admin/severity-thresholds", {
      baseURL: EXPENSE_API_BASE,
      params: policyId ? { policyId } : undefined,
      headers: authHeaders(),
    }),
  update: (bands, policyId) =>
    api.put("/xms/admin/severity-thresholds", bands, {
      baseURL: EXPENSE_API_BASE,
      params: policyId ? { policyId } : undefined,
      headers: authHeaders(),
    }),
};

// --- Policy Versions: /xms/admin/policy-bundles/{policyId}/versions --------
// Response fields: versionId, policyId, versionNumber, activatedAt. Nothing
// else is returned — no changed-by or change-summary data exists.
export const policyVersionService = {
  getVersions: (policyId) =>
    api.get(`/xms/admin/policy-bundles/${policyId}/versions`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
};

export { EXPENSE_API_BASE };
