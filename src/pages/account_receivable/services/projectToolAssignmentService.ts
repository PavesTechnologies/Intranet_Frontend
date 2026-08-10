// Real API integration for Epic 4 (Tool / Software / License Billing) Phase 3, Story 4.2 —
// Project Tool Assignment. Mirrors the axios usage convention already established in
// src/pages/account_receivable/services/projectToolBillingService.ts and
// toolCatalogService.ts (api wrapper + AR base URL + Bearer header).
//
// Assignment endpoint paths extend the /api/ar/... prefix used by Phase 1/2 — a reasonable
// inference, not a confirmed contract. The active Tool Catalog lookup below uses the exact
// path given for this phase, GET /api/tool-catalog/active — note this has no /ar/ segment,
// unlike the /api/ar/tool-catalog/active this module inferred for Tool Catalog in Phase 2.
// That mismatch is left as-is (Tool Catalog is out of scope for this phase); flag it to the
// backend team to confirm which path is correct.
import api from "../../../api/axiosInstance";

const AR_BASE_URL = window.__APP_CONFIG__?.AR_BASE_URL;
const ASSIGNMENTS_PATH = "/api/ar/project-tool-assignments";
const ACTIVE_TOOL_CATALOG_PATH = "/api/tool-catalog/active";

function authHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };
}

function assignmentUrl(id) {
  return id ? `${AR_BASE_URL}${ASSIGNMENTS_PATH}/${id}` : `${AR_BASE_URL}${ASSIGNMENTS_PATH}`;
}

/**
 * @returns {Promise<import("../types/projectToolAssignment").ProjectToolAssignment[]>}
 */
export async function getAll() {
  const response = await api.get(assignmentUrl(), authHeaders());
  return response.data;
}

/**
 * @param {string} projectId
 * @returns {Promise<import("../types/projectToolAssignment").ProjectToolAssignment[]>}
 */
export async function getByProject(projectId) {
  const response = await api.get(`${AR_BASE_URL}/api/ar/projects/${projectId}/tool-assignments`, authHeaders());
  return response.data;
}

/**
 * @param {string} id
 * @returns {Promise<import("../types/projectToolAssignment").ProjectToolAssignment>}
 */
export async function getById(id) {
  const response = await api.get(assignmentUrl(id), authHeaders());
  return response.data;
}

/**
 * @param {import("../types/projectToolAssignment").ProjectToolAssignmentInput} payload
 * @returns {Promise<import("../types/projectToolAssignment").ProjectToolAssignment>}
 */
export async function create(payload) {
  const response = await api.post(assignmentUrl(), payload, authHeaders());
  return response.data;
}

/**
 * @param {string} id
 * @param {import("../types/projectToolAssignment").ProjectToolAssignmentInput} payload
 * @returns {Promise<import("../types/projectToolAssignment").ProjectToolAssignment>}
 */
export async function update(id, payload) {
  const response = await api.put(assignmentUrl(id), payload, authHeaders());
  return response.data;
}

// Backend performs a soft delete (deactivation) — the record is not actually removed.
export async function deleteById(id) {
  const response = await api.delete(assignmentUrl(id), authHeaders());
  return response.data;
}

/**
 * Renews an assignment as a new effective period — POST /{assignmentId}/renew, per Phase 6.
 * @param {string} assignmentId
 * @param {import("../types/projectToolAssignment").ProjectToolAssignmentInput} payload
 * @returns {Promise<import("../types/projectToolAssignment").ProjectToolAssignment>}
 */
export async function renew(assignmentId, payload) {
  const response = await api.post(`${assignmentUrl(assignmentId)}/renew`, payload, authHeaders());
  return response.data;
}

/**
 * Active Tool Catalog lookup for the Tool select — GET /api/tool-catalog/active, as specified
 * for this phase.
 * @returns {Promise<import("../types/toolCatalog").ToolCatalogItem[]>}
 */
export async function getActiveTools() {
  const response = await api.get(`${AR_BASE_URL}${ACTIVE_TOOL_CATALOG_PATH}`, authHeaders());
  return response.data;
}
