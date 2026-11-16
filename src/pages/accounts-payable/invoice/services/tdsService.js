import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;

/** Copies error.response.status onto error.status, matching invoiceService.js/approvalService.js's
 * convention so callers can do error?.status === 404 without knowing this came from axios. */
function withNormalizedStatus(error) {
  error.status = error.status ?? error.response?.status;
  return error;
}

/**
 * Invoice TDS (tax deducted at source) determination/verification API — TDS Phase 1 backend.
 * The frontend never computes or sends a calculated value (tds_amount/tds_rate/taxable_base) —
 * the backend is the sole source of the determination; every call here either asks it to
 * (re)calculate or just corrects the one input field (payment nature) it accepts.
 */
export const tdsService = {
  /**
   * Runs (or re-runs) TDS determination for an invoice. Call with no paymentNatureCode for the
   * initial determination — the backend resolves payment nature from the purchase-category
   * mapping. Only pass paymentNatureCode when the caller is explicitly overriding that resolution
   * up front (rare — see updateTds for the normal correction path, after a determination already
   * exists).
   * @param {string|number} invoiceId
   * @param {string} [paymentNatureCode] - one of constants/tdsPaymentNature.js's codes
   * @returns {Promise<Object>} InvoiceTdsDTO
   */
  async determineTds(invoiceId, paymentNatureCode) {
    try {
      const body = paymentNatureCode ? { payment_nature_code: paymentNatureCode } : {};
      const response = await api.post(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/tds/determine`, body);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * @param {string|number} invoiceId
   * @returns {Promise<Object>} InvoiceTdsDTO — a 404 means TDS hasn't been determined for this
   *   invoice yet; callers treat that as a normal empty state, not an error (see useInvoiceTds).
   */
  async getTds(invoiceId) {
    try {
      const response = await api.get(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/tds`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * Corrects the payment nature on an already-determined TDS record — the backend recalculates
   * the full determination from this one input. Never send tds_amount/tds_rate/taxable_base or
   * any other calculated field here.
   * @param {string|number} invoiceId
   * @param {string} paymentNatureCode
   * @returns {Promise<Object>} InvoiceTdsDTO
   */
  async updateTds(invoiceId, paymentNatureCode) {
    try {
      const response = await api.put(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/tds`, {
        payment_nature_code: paymentNatureCode,
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * Locks the determination in as verified (Finance action) — irreversible for now, there is no
   * un-verify API.
   * @param {string|number} invoiceId
   * @param {string} [remarks] - optional
   * @returns {Promise<Object>} InvoiceTdsDTO
   */
  async verifyTds(invoiceId, remarks) {
    try {
      const response = await api.post(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/tds/verify`, {
        remarks: remarks?.trim() || null,
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },
};

export default tdsService;
