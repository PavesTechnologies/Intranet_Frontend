import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";

const EXPENSE_API_BASE = XMS_BASE_URL;

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// For multipart bodies the request must carry no Content-Type. axios would otherwise send
// application/x-www-form-urlencoded (its POST default), so Spring would read the multipart body as a
// form and every field and file would be lost. With the header removed, the browser sets the
// multipart boundary itself.
const multipartConfig = () => ({
  baseURL: EXPENSE_API_BASE,
  headers: authHeaders(),
  transformRequest: [
    (data, headers) => {
      // null (not delete): axios re-adds its form-urlencoded default after the transforms unless the header is set.
      headers.set("Content-Type", null);
      return data;
    },
  ],
});

/**
 * Service layer for Cash Advance operations mapping to CashAdvanceController endpoints:
 * - GET/PUT/DELETE /xms/employee/cash-advances/{advanceId}
 * - GET/POST /xms/employee/cash-advances
 * - POST /xms/employee/cash-advances/{advanceId}/submit
 * - POST /xms/employee/cash-advances/{advanceId}/approve
 * - POST /xms/employee/cash-advances/{advanceId}/reject
 * - POST /xms/employee/cash-advances/{advanceId}/manager-decision
 * - POST /xms/employee/cash-advances/{advanceId}/disburse
 * - POST /xms/employee/cash-advances/{advanceId}/cancel
 * - GET /xms/employee/cash-advances/my-advances
 */
export const cashAdvanceApi = {
  getAll: (params) =>
    api.get("/xms/employee/cash-advances", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    }),

  getMyApprovals: (params) =>
    api.get("/xms/employee/cash-advances/my-approvals", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    }),

  getMyAdvances: (params) =>
    api.get("/xms/employee/cash-advances/my-advances", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    }),

  getById: (advanceId) =>
    api.get(`/xms/employee/cash-advances/${advanceId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  create: (payload) =>
    api.post("/xms/employee/cash-advances", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  // Calculation preview for the request form. The server calculates it; the browser only displays it.
  preview: (payload) =>
    api.post("/xms/employee/cash-advances/preview", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }).then((res) => res.data?.data ?? res.data),

  // The signed-in employee's identity for the request form (read-only).
  myProfile: () =>
    api.get("/xms/employee/cash-advances/my-profile", {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }).then((res) => res.data?.data ?? res.data),

  // Supporting documents on a request. Upload and removal are allowed only while the request is a draft (the server checks).
  listDocuments: (advanceId) =>
    api.get(`/xms/employee/cash-advances/${advanceId}/documents`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }).then((res) => res.data?.data ?? res.data),

  uploadDocument: (advanceId, category, file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    return api.post(`/xms/employee/cash-advances/${advanceId}/documents`, formData, multipartConfig())
      .then((res) => res.data?.data ?? res.data);
  },

  // A short-lived link to view ("view") or download ("download") a document.
  documentLink: (advanceId, documentId, kind) =>
    api.get(`/xms/employee/cash-advances/${advanceId}/documents/${documentId}/${kind}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }).then((res) => res.data?.data ?? res.data),

  deleteDocument: (advanceId, documentId) =>
    api.delete(`/xms/employee/cash-advances/${advanceId}/documents/${documentId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  update: (advanceId, payload) =>
    api.put(`/xms/employee/cash-advances/${advanceId}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  delete: (advanceId) =>
    api.delete(`/xms/employee/cash-advances/${advanceId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  submit: (advanceId) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/submit`, null, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  // The employee's other open advances and what each still owes, shown to the approver before deciding.
  approvalBalance: (advanceId) =>
    api.get(`/xms/employee/cash-advances/${advanceId}/approval-balance`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }).then((res) => res.data?.data ?? res.data),

  approve: (advanceId) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/approve`, null, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  // The manager's decision: APPROVE_FULL, APPROVE_REDUCED, SET_OFF, DEFER or REJECT. The server re-checks every rule.
  managerDecision: (advanceId, body) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/manager-decision`, body),

  reject: (advanceId, reason) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/reject`, null, {
      baseURL: EXPENSE_API_BASE,
      params: reason ? { reason } : undefined,
      headers: authHeaders(),
    }),

  // confirmation: FormData from buildDisbursementFormData (disbursementMode plus cash acknowledgment,
  // bank transfer details or UPI proof). Sent as multipart; the advance is only recorded as disbursed
  // once this succeeds.
  disburse: (advanceId, confirmation) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/disburse`, confirmation ?? null, multipartConfig()),

  cancel: (advanceId) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/cancel`, null, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  // Reads a payment screenshot (UPI or bank) and returns the fields it shows. Used to fill the payment form.
  extractPaymentProof: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post("/xms/finance/payment-proofs/extract", formData, multipartConfig())
      .then((res) => res?.data?.data ?? res?.data ?? null);
  },

  // A stored payment proof, as a blob, so the login token is sent. Path comes from the settlement record.
  getProofFile: (path) =>
    api.get(path, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
      responseType: "blob",
    }),

  // Settlement / repayment endpoints
  getSettlement: (advanceId) =>
    api.get(`/xms/employee/cash-advances/${advanceId}/settlement`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  // Server-calculated utilization (claimed/approved/returned, reservations, closure). Display only.
  getUtilization: (advanceId) =>
    api.get(`/xms/employee/cash-advances/${advanceId}/utilization`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  // formData: amount plus the payment confirmation (buildDisbursementFormData). Canonical contract is
  // multipart/form-data only; the server rejects a JSON body. The advance is only recorded as repaid
  // once this succeeds and the server has verified the payment details.
  repay: (advanceId, formData) =>
    api.post(`/xms/employee/cash-advances/${advanceId}/repayments`, formData, multipartConfig()),

  // Settlement / Reimbursement Adjustment Endpoints (/xms/finance/reimbursements)
  getReimbursementAdjustments: (params) =>
    api.get("/xms/finance/reimbursements", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    }),

  getReimbursementAdjustmentById: (adjustmentId) =>
    api.get(`/xms/finance/reimbursements/${adjustmentId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  // POST /xms/finance/reimbursements. The server accepts JSON only (CashAdvanceAdjustmentRequest), so the body is
  // sent as JSON. FormData is refused here: it would be sent as form-urlencoded and rejected with 415.
  // Build the body with buildAdjustmentRequest (api/adjustmentRequest.js).
  createReimbursementAdjustment: (payload) => {
    if (typeof FormData !== "undefined" && payload instanceof FormData) {
      throw new TypeError("createReimbursementAdjustment takes a JSON body from buildAdjustmentRequest, not FormData.");
    }
    return api.post("/xms/finance/reimbursements", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: { ...authHeaders(), "Content-Type": "application/json" },
    });
  },

  updateReimbursementAdjustment: (adjustmentId, payload) =>
    api.put(`/xms/finance/reimbursements/${adjustmentId}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),

  deleteReimbursementAdjustment: (adjustmentId) =>
    api.delete(`/xms/finance/reimbursements/${adjustmentId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
};

export default cashAdvanceApi;
