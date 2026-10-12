// Review workbench (Backend/API_Layer/routes/invoice_review_workbench_route.py): invoices waiting
// for review / send with suggested department & category and readiness checks, plus bulk actions
// that run the same review -> TDS -> send-for-approval steps as one invoice at a time.
import api from "../../../../api/axiosInstance.js";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;
const BASE = `${AP_BASE_URL}/invoice-review`;

export const reviewWorkbenchService = {
  async getWorkbench(stage) {
    const { data } = await api.get(`${BASE}/workbench`, { params: { stage } });
    return data;
  },

  /** @param {{invoice_id:number, department_id?:number, purchase_category_id?:number}[]} items */
  async bulkReview(items, sendForApproval = true) {
    const { data } = await api.post(`${BASE}/bulk-review`, { items, send_for_approval: sendForApproval });
    return data;
  },

  async bulkSend(invoiceIds) {
    const { data } = await api.post(`${BASE}/bulk-send`, { invoice_ids: invoiceIds });
    return data;
  },
};

export default reviewWorkbenchService;
