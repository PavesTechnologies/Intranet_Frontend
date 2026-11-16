import api from "@/api/axiosInstance";
import { XMS_BASE_URL } from "@/pages/expense-management/api/xmsBaseUrl";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Multipart bodies must not carry a JSON or form-urlencoded Content-Type; the browser sets the boundary.
const multipartConfig = () => ({
  baseURL: XMS_BASE_URL,
  headers: authHeaders(),
  transformRequest: [
    (data, headers) => {
      headers.set("Content-Type", null);
      return data;
    },
  ],
});

const json = () => ({ baseURL: XMS_BASE_URL, headers: authHeaders() });

const unwrap = (res) => res?.data?.data ?? res?.data ?? null;

/** Client for the employee payment request (refund notice) and the salary deduction workflow. */
export const recoveryApi = {
  // Payment request: emails and notifies the employee, with a due date of one working day.
  sendPaymentRequest: (advanceId) =>
    api.post(`/xms/finance/cash-advance-recovery/${advanceId}/refund-notice`, {}, json()).then(unwrap),

  // Open notices across all advances. Callers filter by advanceId.
  listOpenNotices: () => api.get("/xms/finance/cash-advance-recovery/cases", json()).then(unwrap),

  cancelNotice: (caseId, reason) =>
    api.post(`/xms/finance/cash-advance-recovery/cases/${caseId}/cancel`, { reason }, json()).then(unwrap),

  // Salary deduction
  payrollMonths: () => api.get("/xms/finance/salary-deductions/payroll-months", json()).then(unwrap),

  listSalaryDeductions: (advanceId) =>
    api.get(`/xms/finance/salary-deductions/cash-advances/${advanceId}`, json()).then(unwrap),

  createSalaryDeduction: (advanceId, { amount, payrollMonth }) =>
    api
      .post(`/xms/finance/salary-deductions/cash-advances/${advanceId}`, { amount, payrollMonth }, json())
      .then(unwrap),

  retrySalaryEmail: (requestId) =>
    api.post(`/xms/finance/salary-deductions/${requestId}/retry-email`, {}, json()).then(unwrap),

  cancelSalaryDeduction: (requestId, reason) =>
    api.post(`/xms/finance/salary-deductions/${requestId}/cancel`, { reason }, json()).then(unwrap),

  // formData: actualAmount, payrollMonthProcessed, payrollReference?, evidenceType?, evidenceNote?, evidenceFile?
  recordSalaryResult: (requestId, formData) =>
    api
      .post(`/xms/finance/salary-deductions/${requestId}/result`, formData, {
        ...multipartConfig(),
      })
      .then(unwrap),
};

export default recoveryApi;
