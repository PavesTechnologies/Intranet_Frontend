import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;

/** Same convention as tdsService.js: copy error.response.status onto error.status. */
function withNormalizedStatus(error) {
  error.status = error.status ?? error.response?.status;
  return error;
}

async function call(promise) {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    throw withNormalizedStatus(error);
  }
}

/**
 * Payment-term compliance + vendor agreements (Backend/API_Layer/routes/payment_terms_route.py).
 * The backend computes every status and due date; nothing here derives them.
 */
export const paymentTermService = {
  /** @returns {Promise<Object>} InvoicePaymentTermDTO — evaluated:false for a legacy invoice. */
  getInvoicePaymentTerms(invoiceId) {
    return call(api.get(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/payment-terms`));
  },

  recheckInvoicePaymentTerms(invoiceId) {
    return call(api.post(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/payment-terms/recheck`));
  },

  /** @param {{appliedTermDays?: number, dueBasis?: string, remarks: string}} body */
  verifyInvoicePaymentTerms(invoiceId, { appliedTermDays, dueBasis, remarks }) {
    return call(
      api.post(`${AP_BASE_URL}/invoice/${Number(invoiceId)}/payment-terms/verify`, {
        applied_term_days: appliedTermDays ?? null,
        due_basis: dueBasis || null,
        remarks,
      }),
    );
  },

  getMetadata() {
    return call(api.get(`${AP_BASE_URL}/payment-terms/metadata`));
  },

  /** @param {{status?: string[], vendorId?, reasonCode?, dueFrom?, dueTo?, search?, page?, pageSize?}} filters */
  listExceptions({ status, vendorId, reasonCode, dueFrom, dueTo, search, page = 1, pageSize = 20 } = {}) {
    const params = new URLSearchParams();
    (status || []).forEach((s) => params.append("status", s));
    if (vendorId) params.append("vendor_id", vendorId);
    if (reasonCode) params.append("reason_code", reasonCode);
    if (dueFrom) params.append("due_from", dueFrom);
    if (dueTo) params.append("due_to", dueTo);
    if (search) params.append("search", search);
    params.append("page", page);
    params.append("page_size", pageSize);
    return call(api.get(`${AP_BASE_URL}/payment-terms/exceptions?${params.toString()}`));
  },

  // ── Vendor agreements ────────────────────────────────────────────────
  listVendorAgreements(vendorId) {
    return call(api.get(`${AP_BASE_URL}/vendor-agreements/vendor/${Number(vendorId)}`));
  },

  /** Read-only Textract suggestions for the upload form; nothing is saved. */
  extractVendorAgreement(vendorId, file) {
    const form = new FormData();
    form.append("file", file);
    return call(api.post(`${AP_BASE_URL}/vendor-agreements/vendor/${Number(vendorId)}/extract`, form));
  },

  /** @param {Object} fields - title, agreement_type, valid_from, valid_to, term_days, ... */
  createVendorAgreement(vendorId, file, fields) {
    const form = new FormData();
    form.append("file", file);
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") form.append(key, value);
    });
    return call(api.post(`${AP_BASE_URL}/vendor-agreements/vendor/${Number(vendorId)}`, form));
  },

  updateVendorAgreement(agreementId, fields) {
    return call(api.patch(`${AP_BASE_URL}/vendor-agreements/${Number(agreementId)}`, fields));
  },

  verifyVendorAgreement(agreementId, remarks) {
    return call(api.post(`${AP_BASE_URL}/vendor-agreements/${Number(agreementId)}/verify`, { remarks: remarks || null }));
  },

  rejectVendorAgreement(agreementId, remarks) {
    return call(api.post(`${AP_BASE_URL}/vendor-agreements/${Number(agreementId)}/reject`, { remarks }));
  },

  listExpiringAgreements(withinDays = 30) {
    return call(api.get(`${AP_BASE_URL}/vendor-agreements/expiring?within_days=${withinDays}`));
  },

  agreementDocumentUrl(agreementId, documentId) {
    return `${AP_BASE_URL}/vendor-agreements/${Number(agreementId)}/documents/${Number(documentId)}/view`;
  },

  async viewAgreementDocument(agreementId, documentId) {
    try {
      const response = await api.get(
        `${AP_BASE_URL}/vendor-agreements/${Number(agreementId)}/documents/${Number(documentId)}/view`,
        { responseType: "blob" },
      );
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },
};

export default paymentTermService;
