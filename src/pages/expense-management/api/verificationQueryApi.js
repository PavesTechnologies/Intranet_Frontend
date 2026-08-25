import api from "@/api/axiosInstance";

/**
 * Service layer for the generic Verification Query resource (/xms/finance/verifications).
 * This is the CRUD surface behind the queries Finance raises via
 * financeVerificationApi.queryLineItem — that action writes a VerificationQuery row directly,
 * and this is how the employee reads it back and attaches employeeResponse. There is no
 * report-scoped or line-item-scoped list endpoint, so callers fetch getAll() and filter
 * client-side against the line items they already know belong to their report.
 */

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const withBase = (extra) => ({
  baseURL: EXPENSE_API_BASE,
  headers: authHeaders(),
  ...extra,
});

export const VERIFICATION_QUERY_STATUS = {
  RAISED: "RAISED",
  RESOLVED: "RESOLVED",
};

export const verificationQueryApi = {
  // VerificationQueryResponse[] - unfiltered, every query in the system.
  getAll: () => api.get("/xms/finance/verifications", withBase()),

  // VerificationQueryResponse
  getById: (queryId) => api.get(`/xms/finance/verifications/${queryId}`, withBase()),

  // VerificationQueryResponse - full VerificationQueryRequest required (lineItemId, raisedBy,
  // queryText, employeeResponse, status) - the backend replaces every field on update, so callers
  // must round-trip the existing row's values and only change what they mean to change.
  update: (queryId, payload) => api.put(`/xms/finance/verifications/${queryId}`, payload, withBase()),
};

export default verificationQueryApi;
