import api from "@/api/axiosInstance";

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const withBase = (extra = {}) => ({
  baseURL: EXPENSE_API_BASE,
  headers: authHeaders(),
  ...extra,
});

export const apPaymentApi = {
  // PageResponse<ApPaymentQueueItemResponse>
  getQueue: (page = 0, size = 20) =>
    api.get("/xms/ap-payments/queue", withBase({ params: { page, size } })),

  // ApPaymentDetailsResponse
  getDetails: (reportId) =>
    api.get(`/xms/ap-payments/${reportId}`, withBase()),

  // ExpenseReportResponse
  completePayment: (reportId) =>
    api.post(`/xms/ap-payments/${reportId}/complete`, {}, withBase()),
};

export default apPaymentApi;
