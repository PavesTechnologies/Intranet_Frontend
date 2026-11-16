import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;

/** Copies error.response.status onto error.status, matching invoiceService.js's convention
 * so callers can do error?.status === 404 without knowing this came from axios. */
function withNormalizedStatus(error) {
  error.status = error.status ?? error.response?.status;
  return error;
}

/**
 * Invoice approval workflow API (Backend/API_Layer/routes/invoice_approval_route.py). The
 * approval instance/steps this returns are the backend's authoritative snapshot of a
 * configurable, policy-driven multi-level workflow — never reconstructed or cached client-side.
 */
export const approvalService = {
  /**
   * Moves an invoice into the approval workflow: the backend matches an active
   * ApprovalPolicy for the invoice's department/category/amount, resolves each level's
   * approvers, and creates the InvoiceApproval + its steps. No request body.
   * @param {string|number} invoiceId
   * @returns {Promise<Object>} InvoiceApprovalDTO
   */
  async sendForApproval(invoiceId) {
    try {
      const response = await api.post(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/send-for-approval`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * @param {string|number} invoiceId
   * @param {string} [comments] - optional on approve
   * @returns {Promise<Object>} InvoiceApprovalDTO
   */
  async approve(invoiceId, comments) {
    try {
      const response = await api.post(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/approve`, {
        comments: comments?.trim() || null,
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * Comments are required on reject (unlike approve) — enforce this in the UI before calling.
   * @param {string|number} invoiceId
   * @param {string} comments
   * @returns {Promise<Object>} InvoiceApprovalDTO
   */
  async reject(invoiceId, comments) {
    try {
      const response = await api.post(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/reject`, {
        comments,
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * Returns the invoice to the AP Executive for correction instead of approving/rejecting it
   * outright — distinct from reject() (Backend/Business_Layer/services/invoice_approval_service.py:
   * REJECTED is terminal, RETURNED_FOR_REVIEW lets the AP Executive edit and resubmit). Cancels
   * this approval cycle; resubmitting (via the OCR-review save, then Send for Approval again)
   * creates a brand new one.
   * @param {string|number} invoiceId
   * @param {string} comments - required reason
   * @returns {Promise<Object>} InvoiceApprovalDTO
   */
  async sendBack(invoiceId, comments) {
    try {
      const response = await api.post(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/send-back`, {
        comments,
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * The latest approval instance for this invoice — status, policy id, created/completed
   * timestamps, and its full step list (same steps getApprovalSteps returns standalone).
   * @param {string|number} invoiceId
   * @returns {Promise<Object>} InvoiceApprovalDTO
   */
  async getApproval(invoiceId) {
    try {
      const response = await api.get(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/approval`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * @param {string|number} invoiceId
   * @returns {Promise<Array>} InvoiceApprovalStepDTO[] — each with its approvers[] sub-array
   */
  async getApprovalSteps(invoiceId) {
    try {
      const response = await api.get(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/approval/steps`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },
};

export default approvalService;
