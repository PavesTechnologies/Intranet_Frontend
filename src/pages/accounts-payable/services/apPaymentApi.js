import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";

const EXPENSE_API_BASE = XMS_BASE_URL;

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

  // ExpenseReportResponse. confirmation (optional FormData): disbursement mode and proof. Expense
  // Management passes it; the AP module still calls this without one.
  completePayment: (reportId, confirmation) =>
    api.post(`/xms/ap-payments/${reportId}/complete`, confirmation ?? {}, withBase()),
};

export default apPaymentApi;
