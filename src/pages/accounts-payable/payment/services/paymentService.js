import api from "../../../../api/axiosInstance";
import {
  mapInvoicePaymentDetail,
  mapInvoicePaymentPage,
  mapPaymentDocument,
  mapPaymentMetadata,
} from "./paymentTrackingMapper";

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

  /**
   * APPROVED -> READY_FOR_PAYMENT — the explicit Finance action that gates whether an invoice
   * can receive a payment at all (PaymentService._INVOICE_PAYABLE_STATUSES on the backend). Not
   * automatic on approval — see invoiceStatus.js.
   * @param {string|number} invoiceId
   * @returns {Promise<{invoice_id: number, status_code: string, message: string}>}
   */
  async markInvoiceReadyForPayment(invoiceId) {
    const response = await api.post(`${AP_BASE_URL}/payment/invoice/${Number(invoiceId)}/ready-for-payment`);
    return response.data;
  },

  // ── Payment Management (Backend PaymentTrackingService) ────────────────────
  // All amounts (TDS, net payable, paid, remaining) are computed by the backend.

  /** Payment modes / document types / upload limits for the Record Payment form. */
  async getPaymentMetadata() {
    const response = await api.get(`${AP_BASE_URL}/payment/metadata`);
    return mapPaymentMetadata(response.data);
  },

  /**
   * READY_FOR_PAYMENT + PARTIALLY_PAID invoices, oldest due date first.
   * @param {{search?: string, status?: string, vendorId?: number, dueFrom?: string, dueTo?: string,
   *   overdue?: boolean, page?: number, pageSize?: number}} params
   */
  async getReadyForPayment({ search, status, vendorId, dueFrom, dueTo, overdue, page = 1, pageSize = 20 } = {}) {
    const response = await api.get(`${AP_BASE_URL}/payment/ready-for-payment`, {
      params: {
        search: search || undefined,
        status: status || undefined,
        vendor_id: vendorId || undefined,
        due_from: dueFrom || undefined,
        due_to: dueTo || undefined,
        overdue: overdue || undefined,
        page,
        page_size: pageSize,
      },
    });
    return mapInvoicePaymentPage(response.data);
  },

  /**
   * Invoices with at least one payment, most recently paid first.
   * @param {{search?: string, status?: string, paymentMode?: string, paidFrom?: string, paidTo?: string,
   *   page?: number, pageSize?: number}} params
   */
  async getPaymentHistory({ search, status, vendorId, paymentMode, paidFrom, paidTo, page = 1, pageSize = 20 } = {}) {
    const response = await api.get(`${AP_BASE_URL}/payment/history`, {
      params: {
        search: search || undefined,
        status: status || undefined,
        vendor_id: vendorId || undefined,
        payment_mode: paymentMode || undefined,
        paid_from: paidFrom || undefined,
        paid_to: paidTo || undefined,
        page,
        page_size: pageSize,
      },
    });
    return mapInvoicePaymentPage(response.data);
  },

  /** Invoice payment summary + every payment applied to it (with receipts). */
  async getInvoicePayments(invoiceId) {
    const response = await api.get(`${AP_BASE_URL}/payment/invoice/${Number(invoiceId)}`);
    return mapInvoicePaymentDetail(response.data);
  },

  /**
   * Records a payment already made to the vendor. The backend validates the amount against the
   * remaining payable and decides PARTIALLY_PAID / PAID.
   * @param {string|number} invoiceId
   * @param {{payment_date: string, amount: string, payment_mode: string, reference_number: string, remarks?: string}} payload
   */
  async recordPayment(invoiceId, payload) {
    const response = await api.post(`${AP_BASE_URL}/payment/invoice/${Number(invoiceId)}/record`, payload);
    return mapInvoicePaymentDetail(response.data);
  },

  /** Upload a receipt / proof for a recorded payment (multipart "file" + "document_type"). */
  async uploadPaymentDocument(paymentId, file, documentType = "RECEIPT") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);
    const response = await api.post(`${AP_BASE_URL}/payment/${Number(paymentId)}/documents`, formData);
    return mapPaymentDocument(response.data);
  },

  /** @returns {Promise<Blob>} the stored receipt, for openBlobInNewTab / downloadBlob */
  async viewPaymentDocument(paymentId, documentId) {
    const response = await api.get(
      `${AP_BASE_URL}/payment/${Number(paymentId)}/documents/${Number(documentId)}/view`,
      { responseType: "blob" },
    );
    return response.data;
  },
};

export default paymentService;
