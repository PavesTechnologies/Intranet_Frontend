import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;
const BASE = () => `${AP_BASE_URL}/tds/tracking`;

const toNumber = (value) => (value === null || value === undefined || value === "" ? null : Number(value));

/**
 * TDS Tracking API (Backend/API_Layer/routes/tds_tracking_route.py). TDS rate/amount always come
 * from the backend's verified determination snapshot — this module only maps them (decimal
 * strings -> numbers, snake_case -> camelCase), it never calculates TDS.
 */
export function mapTdsTrackingRow(raw) {
  return {
    invoiceId: raw.invoice_id,
    invoiceNumber: raw.invoice_number,
    vendorId: raw.vendor_id,
    vendorName: raw.vendor_name,
    invoiceDate: raw.invoice_date,
    currencySymbol: raw.currency_symbol || "₹",
    invoiceStatusCode: raw.invoice_status_code,
    invoiceStatusName: raw.invoice_status_name,
    paymentNature: raw.payment_nature || null,
    ruleCode: raw.rule_code,
    oldSection: raw.old_section,
    newSection: raw.new_section,
    invoiceAmount: toNumber(raw.invoice_amount),
    taxableBase: toNumber(raw.taxable_base),
    tdsRate: toNumber(raw.tds_rate),
    tdsAmount: toNumber(raw.tds_amount),
    netPayable: toNumber(raw.net_payable),
    determinationStatus: raw.determination_status,
    trackingStatus: raw.tds_tracking_status,
    trackingStatusLabel: raw.tds_tracking_status_label,
    deductionDate: raw.deduction_date,
    depositDate: raw.deposit_date,
    challanNumber: raw.challan_number,
    filingDate: raw.filing_date,
    filingReference: raw.filing_reference,
    allowedActions: raw.allowed_actions || [],
  };
}

export function mapTdsTrackingDetail(raw) {
  const payment = raw.payment || {};
  return {
    ...mapTdsTrackingRow(raw),
    determination: raw.determination || {},
    payment: {
      statusCode: payment.status_code,
      statusName: payment.status_name,
      netPayable: toNumber(payment.net_payable),
      amountPaid: toNumber(payment.amount_paid),
      remainingAmount: toNumber(payment.remaining_amount),
      lastPaymentDate: payment.last_payment_date,
      paymentCount: payment.payment_count ?? 0,
    },
    tracking: raw.tracking || {},
    documents: (raw.documents || []).map((d) => ({
      id: d.id,
      documentType: d.document_type,
      fileName: d.file_name,
      uploadedBy: d.uploaded_by,
      uploadedAt: d.uploaded_at,
    })),
    activity: raw.activity || [],
  };
}

export const tdsTrackingService = {
  async getMetadata() {
    const response = await api.get(`${BASE()}/metadata`);
    return response.data;
  },

  /**
   * TDS-applicable invoices.
   * @param {{search?: string, tdsStatus?: string, paymentNature?: string, determinationStatus?: string,
   *   invoiceStatus?: string, page?: number, pageSize?: number}} params
   */
  async getTdsInvoices({ search, tdsStatus, paymentNature, determinationStatus, invoiceStatus, page = 1, pageSize = 20 } = {}) {
    const response = await api.get(BASE(), {
      params: {
        search: search || undefined,
        tds_status: tdsStatus || undefined,
        payment_nature: paymentNature || undefined,
        determination_status: determinationStatus || undefined,
        invoice_status: invoiceStatus || undefined,
        page,
        page_size: pageSize,
      },
    });
    const data = response.data;
    return { items: (data.items || []).map(mapTdsTrackingRow), total: data.total ?? 0, page: data.page, pageSize: data.page_size };
  },

  async getTdsDetail(invoiceId) {
    const response = await api.get(`${BASE()}/${Number(invoiceId)}`);
    return mapTdsTrackingDetail(response.data);
  },

  /** @param {"RECORD_DEDUCTION"|"RECORD_DEPOSIT"|"RECORD_FILING"} action */
  async recordActivity(invoiceId, action, payload) {
    const path = { RECORD_DEDUCTION: "deduction", RECORD_DEPOSIT: "deposit", RECORD_FILING: "filing" }[action];
    if (!path) throw new Error(`Unknown TDS activity ${action}`);
    const response = await api.post(`${BASE()}/${Number(invoiceId)}/${path}`, payload);
    return mapTdsTrackingDetail(response.data);
  },

  async uploadDocument(invoiceId, file, documentType) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);
    const response = await api.post(`${BASE()}/${Number(invoiceId)}/documents`, formData);
    return response.data;
  },

  /** @returns {Promise<Blob>} */
  async viewDocument(invoiceId, documentId) {
    const response = await api.get(`${BASE()}/${Number(invoiceId)}/documents/${Number(documentId)}/view`, {
      responseType: "blob",
    });
    return response.data;
  },
};

export default tdsTrackingService;
