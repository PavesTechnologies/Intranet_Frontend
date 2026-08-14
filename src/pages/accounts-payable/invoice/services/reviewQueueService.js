import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;

/**
 * OCR Review Queue API. Backed by GET /apm/invoice/review-queue, which returns items on two
 * paths in one response: Path A (status_code = OCR_REVIEW_PENDING — an invoice already exists
 * and needs field correction) and Path B (extracted but invoice_id is still null — no vendor
 * match was found, so nothing has been persisted yet). Corrections for either path go through
 * the same PATCH endpoint, keyed by inbound_document_id, not invoice_id.
 */
export const reviewQueueService = {
  /**
   * @param {{skip?: number, limit?: number}} [params]
   * @returns {Promise<{total_path_a: number, total_path_b: number, skip: number, limit: number, items: Array}>}
   */
  async getReviewQueue({ skip = 0, limit = 50 } = {}) {
    const response = await api.get(`${AP_BASE_URL}/invoice/review-queue`, {
      params: { skip, limit },
    });
    return response.data;
  },

  /**
   * @param {string|number} inboundDocumentId
   * @param {Object} payload - InvoiceOCRReviewRequest
   */
  async saveOcrReview(inboundDocumentId, payload) {
    const response = await api.patch(
      `${AP_BASE_URL}/invoice/inbound-documents/${Number(inboundDocumentId)}/ocr-review`,
      payload,
    );
    return response.data;
  },
};

export default reviewQueueService;
