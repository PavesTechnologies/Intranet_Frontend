// src/pages/accounts-payable/invoice/services/bulkUploadService.js
// Bulk invoice upload (Backend/API_Layer/routes/invoice_bulk_upload_route.py). The backend runs
// every file through the same extract -> validate -> create operations as the single upload, so
// created invoices land in the OCR review queue like any other.
import api from "../../../../api/axiosInstance.js";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;
const BASE = `${AP_BASE_URL}/invoice-bulk-upload`;

export const bulkUploadService = {
  async getLimits() {
    const { data } = await api.get(`${BASE}/limits`);
    return data;
  },

  /**
   * @param {File[]} files - several invoices, or a single ZIP
   * @param {(percent: number) => void} [onProgress] - browser -> server transfer progress
   */
  async uploadBatch(files, onProgress) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const { data } = await api.post(BASE, formData, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return data;
  },

  async listBatches({ mine = true, status, sourceType, page = 1, pageSize = 20 } = {}) {
    const params = { mine, page, page_size: pageSize };
    if (status) params.status = status;
    if (sourceType) params.source_type = sourceType;
    const { data } = await api.get(`${BASE}/batches`, { params });
    return data;
  },

  async getBatch(batchId) {
    const { data } = await api.get(`${BASE}/batches/${encodeURIComponent(batchId)}`);
    return data;
  },

  async retryBatch(batchId) {
    const { data } = await api.post(`${BASE}/batches/${encodeURIComponent(batchId)}/retry`);
    return data;
  },

  async retryItem(itemId) {
    const { data } = await api.post(`${BASE}/items/${encodeURIComponent(itemId)}/retry`);
    return data;
  },

  async skipItem(itemId) {
    const { data } = await api.post(`${BASE}/items/${encodeURIComponent(itemId)}/skip`);
    return data;
  },
};

/** Mailbox intake on/off switch (email_intake_route.py). */
export const emailIntakeService = {
  async getStatus() {
    const { data } = await api.get(`${AP_BASE_URL}/email-intake/status`);
    return data;
  },
  async setEnabled(enabled) {
    const { data } = await api.put(`${AP_BASE_URL}/email-intake/status`, { enabled });
    return data;
  },
};

export default bulkUploadService;
