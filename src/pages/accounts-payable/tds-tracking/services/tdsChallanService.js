import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;
const CHALLANS = () => `${AP_BASE_URL}/tds/challans`;
const FILINGS = () => `${AP_BASE_URL}/tds/filings`;

/**
 * Shared TDS challan + quarterly filing (Backend/API_Layer/routes/tds_challan_route.py). Responses
 * are passed through in the backend's snake_case shape; amounts are decimal strings.
 */
function multipart(payload, file) {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));
  if (file) formData.append("file", file);
  return formData;
}

async function extract(url, file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(url, formData);
  return data;
}

export const tdsChallanService = {
  listChallans: async (page = 1, pageSize = 20) => (await api.get(CHALLANS(), { params: { page, page_size: pageSize } })).data,
  getChallan: async (id) => (await api.get(`${CHALLANS()}/${Number(id)}`)).data,
  challanCandidates: async ({ period, section } = {}) =>
    (await api.get(`${CHALLANS()}/candidates`, { params: { ...(period ? { period } : {}), ...(section ? { section } : {}) } })).data,
  extractChallan: (file) => extract(`${CHALLANS()}/extract`, file),
  validateChallan: async (header, allocations, hasDocument) =>
    (await api.post(`${CHALLANS()}/validate`, { header, allocations, has_document: hasDocument })).data,
  createChallan: async (header, allocations, file) => (await api.post(CHALLANS(), multipart({ header, allocations }, file))).data,
  challanDocument: async (id) => (await api.get(`${CHALLANS()}/${Number(id)}/document`, { responseType: "blob" })).data,

  listFilings: async (page = 1, pageSize = 20) => (await api.get(FILINGS(), { params: { page, page_size: pageSize } })).data,
  getFiling: async (id) => (await api.get(`${FILINGS()}/${Number(id)}`)).data,
  filingCandidates: async ({ financialYear, quarter, revision = false }) =>
    (await api.get(`${FILINGS()}/candidates`, { params: { financial_year: financialYear, quarter, revision } })).data,
  extractFiling: (file) => extract(`${FILINGS()}/extract`, file),
  validateFiling: async (header, invoiceIds, hasDocument) =>
    (await api.post(`${FILINGS()}/validate`, { header, invoice_ids: invoiceIds, has_document: hasDocument })).data,
  createFiling: async (header, invoiceIds, file) => (await api.post(FILINGS(), multipart({ header, invoice_ids: invoiceIds }, file))).data,
  filingDocument: async (id) => (await api.get(`${FILINGS()}/${Number(id)}/document`, { responseType: "blob" })).data,
};

export default tdsChallanService;
