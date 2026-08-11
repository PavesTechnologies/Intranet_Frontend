import api from "@/api/axiosInstance";

/**
 * Service layer for the Approval Engine's action/read endpoints (/xms/approvals/*),
 * mirroring policyApi.js's shape (per-call baseURL override + explicit auth header —
 * the request interceptor on `api` already attaches the bearer token globally, this
 * is just belt-and-suspenders consistent with the rest of this module).
 *
 * Field names below are taken verbatim from the backend DTOs — do not rename without
 * the backend contract itself changing.
 *
 * getMyQueue/getMyHistory return a PageResponse envelope:
 *   { content: [...], page, size, totalElements, totalPages, first, last }
 */

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const withBase = (extra) => ({ baseURL: EXPENSE_API_BASE, headers: authHeaders(), ...extra });

export const approvalWorkflowApi = {
  // ApprovalQueueItemResponse: reportId, reportNumber, employeeId, totalAmount,
  // currencyCode, currentLevelOrder, pendingLineItems[], eligibleForBulkApprove.
  // pendingLineItems[]: lineItemId, reviewId, categoryName, merchantName, description,
  // expenseDate, amount, currencyCode, policyViolations[].
  getMyQueue: (page = 0, size = 20) =>
    api.get("/xms/approvals/my-queue", withBase({ params: { page, size } })),

  // ExpenseReportResponse rows. outcome: "APPROVED" | "REJECTED" | undefined (both).
  getMyHistory: (outcome, page = 0, size = 20) =>
    api.get("/xms/approvals/my-history", withBase({ params: { outcome, page, size } })),

  // ApprovalStatusResponse: currentLevelOrder, currentLevelName, currentLevelDisplayName,
  // totalLevels, canRecall, canCancel.
  getApprovalStatus: (reportId) =>
    api.get(`/xms/approvals/${reportId}/status`, withBase()),

  // LineItemReviewResponse[]: lineItemId, reviewId, status, comment, actedBy, actionedAt,
  // levelOrder, levelName, displayName.
  getLineItemReviews: (reportId) =>
    api.get(`/xms/approvals/${reportId}/line-item-reviews`, withBase()),

  submit: (reportId) => api.post(`/xms/approvals/${reportId}/submit`, {}, withBase()),

  recall: (reportId) => api.post(`/xms/approvals/${reportId}/recall`, {}, withBase()),

  cancel: (reportId) => api.post(`/xms/approvals/${reportId}/cancel`, {}, withBase()),

  // decision: "APPROVED" | "NEEDS_CORRECTION"; comment required for NEEDS_CORRECTION.
  reviewLineItem: (reportId, lineItemId, decision, comment) =>
    api.post(`/xms/approvals/${reportId}/line-items/${lineItemId}/review`, { decision, comment }, withBase()),

  rejectReport: (reportId, comment) =>
    api.post(`/xms/approvals/${reportId}/reject`, { comment }, withBase()),

  bulkApprove: (reportId) => api.post(`/xms/approvals/${reportId}/bulk-approve`, {}, withBase()),
};
