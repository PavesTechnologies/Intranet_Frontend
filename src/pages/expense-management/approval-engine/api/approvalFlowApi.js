import api from "@/api/axiosInstance";

/**
 * Admin config for the Approval Flow Engine (/xms/admin/approval-flows, ADMIN-only).
 *
 * ApprovalFlowRequest: { name, priority, criteriaPattern, criteria[], levels[], status? }
 * ApprovalFlowCriterionRequest: { index, field, operator, value }
 *   field: AMOUNT | CATEGORY | DEPARTMENT | COST_CENTER
 *   operator: EQUALS | NOT_EQUALS | GREATER_THAN | GREATER_THAN_OR_EQUAL | LESS_THAN | LESS_THAN_OR_EQUAL
 *     (GREATER_THAN and LESS_THAN variants are only legal when field === "AMOUNT" - server-enforced)
 * ApprovalLevelRequest: { levelOrder, levelName?, quorum, approvers[] }
 *   quorum: SEQUENTIAL | ANY_OF | ALL_OF
 * ApprovalLevelApproverRequest: { entryOrder, sourceType, sourceReference }
 *   sourceType: NAMED_USER | REPORTING_MANAGER | DEPARTMENT_OWNER | COST_CENTER_OWNER
 *   sourceReference: required (EOS employeeId) only when sourceType === "NAMED_USER"
 *
 * criteriaPattern is a boolean expression over the criteria[] rows' `index` values, e.g.
 * "(1 AND 2) OR 3" - every index it references must exist in criteria[] (server-validated).
 *
 * CatchAllFlowRequest: { levels[] } only - no name/priority/criteria, it always matches, always
 * evaluates last.
 */

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const withBase = (extra) => ({ baseURL: EXPENSE_API_BASE, headers: authHeaders(), ...extra });

export const approvalFlowApi = {
  getAll: () => api.get("/xms/admin/approval-flows", withBase()),
  getById: (flowId) => api.get(`/xms/admin/approval-flows/${flowId}`, withBase()),
  create: (payload) => api.post("/xms/admin/approval-flows", payload, withBase()),
  update: (flowId, payload) => api.put(`/xms/admin/approval-flows/${flowId}`, payload, withBase()),
  delete: (flowId) => api.delete(`/xms/admin/approval-flows/${flowId}`, withBase()),
  getCatchAll: () => api.get("/xms/admin/approval-flows/catch-all", withBase()),
  updateCatchAll: (payload) => api.put("/xms/admin/approval-flows/catch-all", payload, withBase()),
};
