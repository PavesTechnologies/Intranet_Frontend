import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;

/**
 * Invoice approval workflow API. Approve/reject are real backend transitions — there is no
 * client-side approval state to track once these succeed, only cache invalidation.
 */
export const approvalService = {
  /** @param {string|number} invoiceId @param {string} [comments] */
  async approve(invoiceId, comments) {
    const response = await api.post(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/approve`, {
      comments: comments?.trim() || null,
    });
    return response.data;
  },

  /**
   * Comments are required on reject (unlike approve) — enforce this in the UI before calling.
   * @param {string|number} invoiceId @param {string} comments
   */
  async reject(invoiceId, comments) {
    const response = await api.post(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/reject`, {
      comments,
    });
    return response.data;
  },

  /** @param {string|number} invoiceId @returns {Promise<Array>} InvoiceApprovalDTO[] */
  async getApprovalHistory(invoiceId) {
    const response = await api.get(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/approvals`);
    return response.data;
  },
};

export default approvalService;
