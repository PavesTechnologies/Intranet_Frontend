import api from "@/api/axiosInstance";

/**
 * Service layer for Finance Verification endpoints (/xms/finance-verification/*).
 * Follows the existing conventions of approvalWorkflowApi.js, using the same
 * base URL overrides and auth headers configuration.
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

export const financeVerificationApi = {
  // PageResponse<FinanceQueueItemResponse>
  getMyQueue: (page = 0, size = 20) =>
    api.get("/xms/finance-verification/my-queue", withBase({ params: { page, size } })),

  // FinanceLineItemReviewResponse[]
  getReviews: (reportId) =>
    api.get(`/xms/finance-verification/${reportId}/reviews`, withBase()),

  // ApprovalStatusResponse
  getStatus: (reportId) =>
    api.get(`/xms/finance-verification/${reportId}/status`, withBase()),

  // ExpenseReportResponse
  verifyLineItem: (reportId, lineItemId) =>
    api.post(`/xms/finance-verification/${reportId}/line-items/${lineItemId}/verify`, {}, withBase()),

  // ExpenseReportResponse - reason parameter required
  queryLineItem: (reportId, lineItemId, reason) =>
    api.post(`/xms/finance-verification/${reportId}/line-items/${lineItemId}/query`, { reason }, withBase()),
};
