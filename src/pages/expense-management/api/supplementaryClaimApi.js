import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";

/**
 * Supplementary expense claims: missing expenses on a settled report, submitted as a separate claim.
 * Every permission and workflow rule is enforced by the backend; this layer only calls the endpoints.
 */

const BASE = XMS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const config = () => ({ baseURL: BASE, headers: authHeaders() });

// Statuses, mirroring SupplementaryExpenseClaim on the backend. Keep in sync if the backend changes.
export const SUPP_STATUS = {
  DRAFT: "DRAFT",
  PENDING_MANAGER: "PENDING_MANAGER",
  MANAGER_REJECTED: "MANAGER_REJECTED",
  PENDING_FINANCE: "PENDING_FINANCE",
  FINANCE_REJECTED: "FINANCE_REJECTED",
  CLARIFICATION_REQUIRED: "CLARIFICATION_REQUIRED",
  APPROVED: "APPROVED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  SETTLED: "SETTLED",
  CANCELLED: "CANCELLED",
};

export const SUPP_STATUS_LABEL = {
  DRAFT: "Draft",
  PENDING_MANAGER: "Waiting for manager",
  MANAGER_REJECTED: "Rejected by manager",
  PENDING_FINANCE: "Waiting for Finance",
  FINANCE_REJECTED: "Rejected by Finance",
  CLARIFICATION_REQUIRED: "Needs clarification",
  APPROVED: "Approved",
  PAYMENT_PENDING: "Approved, awaiting payment",
  SETTLED: "Paid",
  CANCELLED: "Cancelled",
};

export const LATE_REASON_OPTIONS = [
  { value: "RECEIPT_RECEIVED_LATE", label: "Receipt received late" },
  { value: "FORGOT_TO_SUBMIT", label: "Forgot to submit it in the report" },
  { value: "NOT_AVAILABLE_IN_REPORT", label: "Expense was not in the report" },
  { value: "OTHER", label: "Other (explain below)" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "PERSONAL_CARD", label: "Personal card" },
  { value: "UPI", label: "UPI" },
  { value: "COMPANY_CARD", label: "Company card" },
  { value: "OTHER", label: "Other" },
];

export const supplementaryClaimService = {
  eligibility: (reportId) => api.get(`/xms/employee/supplementary-claims/eligibility/${reportId}`, config()),
  create: (payload) => api.post("/xms/employee/supplementary-claims", payload, config()),
  listMine: () => api.get("/xms/employee/supplementary-claims", config()),
  listForReport: (reportId) => api.get(`/xms/employee/supplementary-claims/by-report/${reportId}`, config()),
  // Automatic path: create the expense from a receipt uploaded for this claim, with the details the employee confirmed.
  addItemFromReceipt: (claimId, receiptId, payload) =>
    api.post(`/xms/employee/supplementary-claims/${claimId}/items/from-receipt/${receiptId}`, payload, config()),
  get: (claimId) => api.get(`/xms/employee/supplementary-claims/${claimId}`, config()),
  addItem: (claimId, payload) => api.post(`/xms/employee/supplementary-claims/${claimId}/items`, payload, config()),
  updateItem: (claimId, itemId, payload) =>
    api.put(`/xms/employee/supplementary-claims/${claimId}/items/${itemId}`, payload, config()),
  removeItem: (claimId, itemId) => api.delete(`/xms/employee/supplementary-claims/${claimId}/items/${itemId}`, config()),
  acknowledge: (claimId) => api.post(`/xms/employee/supplementary-claims/${claimId}/acknowledge`, {}, config()),
  submit: (claimId) => api.post(`/xms/employee/supplementary-claims/${claimId}/submit`, {}, config()),
  resubmit: (claimId) => api.post(`/xms/employee/supplementary-claims/${claimId}/resubmit`, {}, config()),
  cancel: (claimId) => api.post(`/xms/employee/supplementary-claims/${claimId}/cancel`, {}, config()),

  // Finance creates a claim for an employee (needs SUPP_CLAIM_CREATE_FOR_EMPLOYEE on the backend).
  createOnBehalf: (payload) => api.post("/xms/finance/supplementary-claims", payload, config()),
};

export const managerClaimService = {
  queue: () => api.get("/xms/manager/supplementary-claims/queue", config()),
  approve: (claimId) => api.post(`/xms/manager/supplementary-claims/${claimId}/approve`, {}, config()),
  reject: (claimId, comment) => api.post(`/xms/manager/supplementary-claims/${claimId}/reject`, { comment }, config()),
  clarify: (claimId, comment) => api.post(`/xms/manager/supplementary-claims/${claimId}/clarify`, { comment }, config()),
};

export const financeClaimService = {
  queue: () => api.get("/xms/finance/supplementary-claims/queue", config()),
  approve: (claimId) => api.post(`/xms/finance/supplementary-claims/${claimId}/approve`, {}, config()),
  reject: (claimId, comment) => api.post(`/xms/finance/supplementary-claims/${claimId}/reject`, { comment }, config()),
  clarify: (claimId, comment) => api.post(`/xms/finance/supplementary-claims/${claimId}/clarify`, { comment }, config()),
};

/** Receipts on claim items. The backend enforces the single-use and duplicate rules. */
export const supplementaryReceiptService = {
  upload: (claimId, itemId, file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/xms/employee/supplementary-claims/${claimId}/items/${itemId}/receipts`, form, {
      ...config(),
      headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
    });
  },
  attach: (claimId, itemId, receiptId) =>
    api.post(`/xms/employee/supplementary-claims/${claimId}/items/${itemId}/receipts/${receiptId}`, {}, config()),
  detach: (claimId, itemId, receiptId) =>
    api.delete(`/xms/employee/supplementary-claims/${claimId}/items/${itemId}/receipts/${receiptId}`, config()),
  releasable: () => api.get("/xms/employee/supplementary-claims/releasable-receipts", config()),
  suggestion: (receiptId) => api.get(`/xms/employee/supplementary-claims/receipts/${receiptId}/suggestion`, config()),
  // Preview and download use the same receipt endpoints as report receipts; the backend checks the caller may view it.
  viewUrl: (receiptId) => api.get(`/xms/employee/receipts/${receiptId}/view`, config()),
  downloadUrl: (receiptId) => api.get(`/xms/employee/receipts/${receiptId}/download`, config()),
  // Automatic path: store the receipt before its expense exists, so OCR can read it.
  uploadScan: (claimId, file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/xms/employee/supplementary-claims/${claimId}/receipt-scans`, form, {
      ...config(),
      headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
    });
  },
};

/** Two-person release of a Finance-rejected receipt. One user requests; a different user approves. */
export const receiptReleaseService = {
  candidates: (employeeId) => api.get("/xms/finance/receipt-releases/candidates", { ...config(), params: { employeeId } }),
  request: (receiptId, reason) => api.post("/xms/finance/receipt-releases", { receiptId, reason }, config()),
  queue: () => api.get("/xms/finance/receipt-releases/queue", config()),
  approve: (releaseId, reason) => api.post(`/xms/finance/receipt-releases/${releaseId}/approve`, { reason }, config()),
  reject: (releaseId, reason) => api.post(`/xms/finance/receipt-releases/${releaseId}/reject`, { reason }, config()),
};

/** AP payment for supplementary claims. Only AP_EXECUTIVE can use these endpoints. */
export const supplementaryPaymentService = {
  queue: () => api.get("/xms/ap/supplementary-payments/queue", config()),
  confirm: (paymentId, payload) => api.post(`/xms/ap/supplementary-payments/${paymentId}/confirm`, payload, config()),
};

/** The response body is ApiResponse: { success, message, data }. Return the data, or an empty array for lists. */
export const unwrap = (res) => res?.data?.data ?? null;
export const unwrapList = (res) => {
  const data = res?.data?.data;
  return Array.isArray(data) ? data : [];
};

/** The server's message when a request fails, otherwise a generic line. */
export const errorMessage = (err, fallback = "Something went wrong. Please try again.") =>
  err?.response?.data?.message || err?.message || fallback;
