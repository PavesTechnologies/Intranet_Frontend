// Bulk import of payments / TDS challans / TDS filings (Backend/API_Layer/routes/bulk_import_route.py).
import api from "../../../../api/axiosInstance.js";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;
const BASE = () => `${AP_BASE_URL}/bulk-import`;

/** UI type -> URL segment. */
export const IMPORT_TYPES = {
  payments: { label: "Payments", kind: "PAYMENTS", document: "receipt" },
  "tds-challans": { label: "TDS challans", kind: "TDS_CHALLANS", document: "challan" },
  "tds-filings": { label: "TDS filings", kind: "TDS_FILINGS", document: "acknowledgement" },
};
export const TYPE_BY_KIND = Object.fromEntries(Object.entries(IMPORT_TYPES).map(([type, v]) => [v.kind, type]));

export const bulkImportService = {
  async template(type) {
    const { data } = await api.get(`${BASE()}/${type}/template`, { responseType: "blob" });
    return data;
  },
  async upload(type, workbook, documents, onProgress) {
    const formData = new FormData();
    formData.append("workbook", workbook);
    documents.forEach((file) => formData.append("documents", file));
    const { data } = await api.post(`${BASE()}/${type}`, formData, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return data;
  },
  /** Receipts only - no sheet: each receipt is matched to the invoice it pays (POST /bulk-import/payments/receipts). */
  async uploadReceipts(documents, onProgress) {
    const formData = new FormData();
    documents.forEach((file) => formData.append("documents", file));
    const { data } = await api.post(`${BASE()}/payments/receipts`, formData, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return data;
  },
  async listJobs(type, page = 1, pageSize = 10) {
    const { data } = await api.get(`${BASE()}/jobs`, { params: { kind: type, page, page_size: pageSize } });
    return data;
  },
  async getJob(jobId) {
    const { data } = await api.get(`${BASE()}/jobs/${Number(jobId)}`);
    return data;
  },
  async record(jobId, { rowIds, acceptReview = false } = {}) {
    const { data } = await api.post(`${BASE()}/jobs/${Number(jobId)}/record`, { row_ids: rowIds ?? null, accept_review: acceptReview });
    return data;
  },
  async skipRow(rowId) {
    const { data } = await api.post(`${BASE()}/rows/${Number(rowId)}/skip`);
    return data;
  },
  async results(jobId) {
    const { data } = await api.get(`${BASE()}/jobs/${Number(jobId)}/results`, { responseType: "blob" });
    return data;
  },
};

export default bulkImportService;
