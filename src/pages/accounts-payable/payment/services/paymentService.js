import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;

/**
 * Payment API. Allocation to invoices is not a separate endpoint — it's the `allocations[]`
 * array inside the create-payment body ({invoice_id, allocated_amount} per line). The backend
 * validates remaining-payable amounts; this service never re-derives or overrides that.
 */
export const paymentService = {
  /**
   * @param {{vendorId?: number, statusId?: number, skip?: number, limit?: number}} [params]
   * @returns {Promise<Array>} PaymentDTO[]
   */
  async getPayments({ vendorId, statusId, skip = 0, limit = 100 } = {}) {
    const response = await api.get(`${AP_BASE_URL}/payment`, {
      params: {
        vendor_id: vendorId || undefined,
        status_id: statusId || undefined,
        skip,
        limit,
      },
    });
    return response.data;
  },

  /** @param {string|number} paymentId @returns {Promise<Object>} PaymentDTO */
  async getPaymentById(paymentId) {
    const response = await api.get(`${AP_BASE_URL}/payment/${Number(paymentId)}`);
    return response.data;
  },

  /**
   * @param {Object} payload - PaymentCreateRequest: vendor_id, scheduled_date, currency_id,
   *   payment_method, vendor_bank_id?, reference_number?, allocations: [{invoice_id, allocated_amount}]
   */
  async createPayment(payload) {
    const response = await api.post(`${AP_BASE_URL}/payment`, payload);
    return response.data;
  },

  /**
   * @param {string|number} paymentId
   * @param {{status_code: string, payment_date?: string, reference_number?: string}} payload
   */
  async updatePaymentStatus(paymentId, payload) {
    const response = await api.patch(`${AP_BASE_URL}/payment/${Number(paymentId)}/status`, payload);
    return response.data;
  },
};

export default paymentService;
