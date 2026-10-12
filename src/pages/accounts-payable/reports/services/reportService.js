import api from "../../../../api/axiosInstance";
import { downloadBlob, extractFileNameFromContentDisposition } from "../../utils/documentUpload";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;

function withNormalizedStatus(error) {
  error.status = error.status ?? error.response?.status;
  return error;
}

function toParams({ fromDate, toDate, vendorId, departmentId, months, format }) {
  return {
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    vendor_id: vendorId || undefined,
    department_id: departmentId || undefined,
    months: months || undefined,
    format: format || undefined,
  };
}

/**
 * AP reports (Backend/API_Layer/routes/reports_route.py). The backend builds every row and
 * per-currency total and enforces each report's own permission — the same data the JSON preview
 * shows is what the Excel/PDF export contains.
 */
export const reportService = {
  /** Reports this user may run: [{key, title, period: "as_of"|"range"}]. */
  async listReports() {
    try {
      const response = await api.get(`${AP_BASE_URL}/reports`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** Period overview: KPI tiles, invoiced vs paid by month, breakdowns (GET /reports/summary). */
  async getSummary({ fromDate, toDate, vendorId, departmentId } = {}) {
    try {
      const response = await api.get(`${AP_BASE_URL}/reports/summary`, {
        params: toParams({ fromDate, toDate, vendorId, departmentId }),
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  async runReport(key, filters = {}) {
    try {
      const response = await api.get(`${AP_BASE_URL}/reports/${key}`, { params: toParams(filters) });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** Downloads the Excel or PDF export and saves it with the server-provided file name. */
  async exportReport(key, filters = {}, format = "xlsx") {
    try {
      const response = await api.get(`${AP_BASE_URL}/reports/${key}`, {
        params: toParams({ ...filters, format }),
        responseType: "blob",
      });
      const fileName = extractFileNameFromContentDisposition(
        response.headers?.["content-disposition"],
        `${key}.${format}`,
      );
      downloadBlob(response.data, fileName);
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },
};

export default reportService;
