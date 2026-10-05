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

// Mirrors the backend's ReportStatus.isEditable()/isDeletable() sets exactly
// (expense-management-service enums/ReportStatus.java). Report-level Edit and
// every line-item add/edit/delete must only be offered while the report is in
// one of the editable statuses; Delete (the report itself) only while DRAFT.
// Keep these two arrays in sync if the backend's rule ever changes.
export const REPORT_EDITABLE_STATUSES = ["DRAFT", "POLICY_REJECTED", "QUERY_RAISED", "AWAITING_CORRECTION"];
export const REPORT_DELETABLE_STATUSES = ["DRAFT"];

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

// Whole-set replace, not per-row CRUD — PUT always sends the complete split list for the line
// item (see ExpenseSplitController/ExpenseSplitServiceImpl). An empty `splits` array reverts the
// line item to a normal, unsplit allocation; any other size below 2 is rejected by the backend.
export const splitService = {
  getAll: (lineItemId) =>
    api.get(`/xms/employee/expense-line-items/${lineItemId}/splits`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  replace: (lineItemId, payload) =>
    api.put(`/xms/employee/expense-line-items/${lineItemId}/splits`, payload, {
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

// Tax Configuration master (input-tax rates). Expense categories reference a code by value;
// its rate pre-fills GST on line items (surfaced as category.taxRate).
export const taxCodeService = {
  getAll: () => api.get("/xms/admin/tax-codes", { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  getActive: () => api.get("/xms/admin/tax-codes/active", { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  create: (payload) => api.post("/xms/admin/tax-codes", payload, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  update: (id, payload) => api.put(`/xms/admin/tax-codes/${id}`, payload, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  delete: (id) => api.delete(`/xms/admin/tax-codes/${id}`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
};

// Dated category -> tax code mappings (which code applies on an expense date). Admin writes.
export const categoryTaxMappingService = {
  list: (categoryId) =>
    api.get(`/xms/admin/expense-categories/${categoryId}/tax-mappings`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  create: (categoryId, payload) =>
    api.post(`/xms/admin/expense-categories/${categoryId}/tax-mappings`, payload, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  update: (categoryId, mappingId, payload) =>
    api.put(`/xms/admin/expense-categories/${categoryId}/tax-mappings/${mappingId}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  delete: (categoryId, mappingId) =>
    api.delete(`/xms/admin/expense-categories/${categoryId}/tax-mappings/${mappingId}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
};

// Expense tax is calculated by the server only; forms preview it through the same engine the save uses.
export const taxService = {
  // payload: { amount, currencyId, expenseDate, categoryId?, taxCodeId?, enteredTax? }
  calculate: (payload) => api.post("/xms/tax/calculate", payload, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  // Codes an employee may pick on the date, plus the category's default.
  applicable: (categoryId, date) =>
    api.get("/xms/tax-codes/applicable", {
      baseURL: EXPENSE_API_BASE,
      params: { ...(categoryId ? { categoryId } : {}), ...(date ? { date } : {}) },
      headers: authHeaders(),
    }),
};

// Tax analysis over submitted lines (base currency). params: { from, to, groupBy: month|taxCode|component|category, categoryId, taxCodeId }
export const taxReportService = {
  get: (params) => api.get("/xms/reports/tax", { baseURL: EXPENSE_API_BASE, params, headers: authHeaders() }),
};

// Tax audit history of one record, newest first. entity: tax-codes | tax-mappings | line-items
export const taxAuditService = {
  history: (entity, id) => api.get(`/xms/tax/audit/${entity}/${id}`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
};

// Tax journal (ERP read model) for reports approved between from and to (yyyy-mm-dd).
export const taxJournalService = {
  get: (params) => api.get("/xms/finance/tax-journal", { baseURL: EXPENSE_API_BASE, params, headers: authHeaders() }),
};

// Role dashboards: view is employee | manager | finance | ap | admin (DashboardController).
export const dashboardService = {
  get: (view) => api.get(`/xms/dashboard/${view}`, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
};

// Notification Center (NotificationController): the caller's personal notifications + team inboxes.
export const notificationService = {
  // params: status (all|read|unread), category, eventType, from, to (yyyy-mm-dd), q, page, size
  search: (params) => api.get("/xms/notifications", { baseURL: EXPENSE_API_BASE, params, headers: authHeaders() }),
  unreadCount: () => api.get("/xms/notifications/unread-count", { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  markRead: (id) => api.post(`/xms/notifications/${id}/read`, {}, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
  markAllRead: () => api.post("/xms/notifications/read-all", {}, { baseURL: EXPENSE_API_BASE, headers: authHeaders() }),
};

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
  // Epic 8 (client-billable expenses): the caller's own PMS-assigned ACTIVE/PLANNING projects —
  // distinct from /xms/admin/projects (org-wide master data, used by the Masters > Projects
  // admin page). Never assume all org projects are selectable for billing; only what this
  // returns is.
  //
  // Deliberately calls THIS SERVICE's own endpoint, not PMS directly (unlike the Backlog/Board
  // components elsewhere in this app, which do call window.__APP_CONFIG__.PMS_BASE_URL directly
  // for PMS-native features). EMS's /xms/employee/projects/assigned does real work the browser
  // cannot: it resolves the caller's numeric UMS user id from their JWT (PMS's /api/my-work
  // requires that as a ?userId= query param, and it is not something the frontend has), calls
  // PMS on the employee's behalf, and upserts the result into EMS's own project_cache so it can
  // return a stable local UUID — the same id ExpenseLineItemRequest.projectId expects. Calling
  // PMS directly from here would return PMS's raw numeric project ids with no userId supplied at
  // all, which cannot be submitted as a client-billable expense's project.
  getAssignedProjects: async () => {
    const res = await api.get("/xms/employee/projects/assigned", {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    });
    return normalizeList(res.data, "data");
  },
};

// Client invoice handoff queue (Epic 8) — separate from AP reimbursement (ApPaymentPage).
// Restricted server-side to the FINANCE_EXECUTIVE role.
export const invoiceHandoffService = {
  getEligibleExpenses: (params) =>
    api.get("/xms/finance/invoice-handoff-queue/eligible-expenses", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    }),
  markHandedOff: (lineItemId, payload) =>
    api.post(`/xms/finance/invoice-handoff-queue/${lineItemId}/handoff`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  getHistory: (lineItemId) =>
    api.get(`/xms/finance/invoice-handoff-queue/${lineItemId}/history`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  // InvoiceHandoffSummaryResponse: readyCount, readyBaseAmount, readyProjectCount, handedOffCount, baseCurrencyCode
  getSummary: () =>
    api.get("/xms/finance/invoice-handoff-queue/summary", {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    }),
  // PageResponse<InvoiceHandoffRecordResponse>, newest handoff first
  getHandedOff: (params) =>
    api.get("/xms/finance/invoice-handoff-queue/handed-off", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    }),
};

export { EXPENSE_API_BASE };
