import api from "@/api/axiosInstance";

/**
 * Shared service layer for Expense Report / Line Item / Receipt / lookup calls.
 * Shared across CreateExpensePage, MyExpensesPage, and ExpenseReportDetailPage
 * so the axios boilerplate isn't duplicated 3x, matching the inline-service
 * style already used by the sibling masters pages (CostCentersPage, etc.).
 */

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const expenseReportService = {
  getAll: (params) =>
    api.get("/xms/employee/expense-reports", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    }),
  getById: (reportId) =>
    api.get(`/xms/employee/expense-reports/${reportId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  create: (payload) =>
    api.post("/xms/employee/expense-reports", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  update: (reportId, payload) =>
    api.put(`/xms/employee/expense-reports/${reportId}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  delete: (reportId) =>
    api.delete(`/xms/employee/expense-reports/${reportId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
};

export const lineItemService = {
  getAll: (reportId) =>
    api.get(`/xms/employee/expense-reports/${reportId}/line-items`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  getById: (reportId, lineItemId) =>
    api.get(`/xms/employee/expense-reports/${reportId}/line-items/${lineItemId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  create: (reportId, payload) =>
    api.post(`/xms/employee/expense-reports/${reportId}/line-items`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  update: (reportId, lineItemId, payload) =>
    api.put(`/xms/employee/expense-reports/${reportId}/line-items/${lineItemId}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  delete: (reportId, lineItemId) =>
    api.delete(`/xms/employee/expense-reports/${reportId}/line-items/${lineItemId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  // The line-item response already embeds `lineStatus` / `policyWarnings` on
  // create, update, and list — prefer those. This is only for flows that
  // need a fresh/reloaded violation list independent of a line-item fetch.
  getPolicyWarnings: (reportId, lineItemId) =>
    api.get(`/xms/employee/expense-reports/${reportId}/line-items/${lineItemId}/policy-warnings`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
};

export const receiptService = {
  getAll: (lineItemId) =>
    api.get(`/xms/employee/expense-line-items/${lineItemId}/receipts`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  upload: (lineItemId, formData, onUploadProgress) =>
    api.post(`/xms/employee/expense-line-items/${lineItemId}/receipts`, formData, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
      onUploadProgress,
    }),
  getById: (receiptId) =>
    api.get(`/xms/employee/receipts/${receiptId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  delete: (receiptId) =>
    api.delete(`/xms/employee/receipts/${receiptId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  getViewUrl: (receiptId) =>
    api.get(`/xms/employee/receipts/${receiptId}/view`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  getDownloadUrl: (receiptId) =>
    api.get(`/xms/employee/receipts/${receiptId}/download`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  // Uploads straight to the report (no line item yet) - the entry point for the "Automatic (AI
  // Scan)" add-line-item flow, as opposed to `upload()` above which attaches to an existing line item.
  uploadForOcr: (reportId, formData, onUploadProgress) =>
    api.post(`/xms/employee/expense-reports/${reportId}/receipts`, formData, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
      onUploadProgress,
    }),
  getOcrResult: (receiptId) =>
    api.get(`/xms/employee/receipts/${receiptId}/ocr`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  // The one place a line item is actually created/linked from a scanned receipt.
  confirmOcr: (receiptId, payload) =>
    api.post(`/xms/employee/receipts/${receiptId}/confirm`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
};

const normalizeList = (data, key) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return data[key] || data.content || data.data || [];
  return [];
};

const isActive = (status) => (status || "").toString().toUpperCase() === "ACTIVE";

export const lookupService = {
  getActiveCostCenters: async () => {
    const res = await api.get("/xms/admin/cost-centers", {
      baseURL: EXPENSE_API_BASE,
      params: { page: 1, limit: 1000 },
      headers: authHeaders(),
    });
    return normalizeList(res.data, "costCenters").filter((c) => isActive(c.status));
  },
  getActiveCurrencies: async () => {
    const res = await api.get("/xms/admin/currencies", {
      baseURL: EXPENSE_API_BASE,
      params: { page: 1, limit: 1000 },
      headers: authHeaders(),
    });
    return normalizeList(res.data, "currencies").filter((c) => isActive(c.status));
  },
  getActiveCategories: async () => {
    const res = await api.get("/xms/admin/expense-categories/active", {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    });
    return normalizeList(res.data, "expenseCategories");
  },
};

export { EXPENSE_API_BASE };
