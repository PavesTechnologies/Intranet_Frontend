import api from "../../../../api/axiosInstance";
import { extractFileNameFromContentDisposition } from "../../utils/documentUpload";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/gst/gstr2b`;

/** Drops empty params so the backend applies its own defaults. */
const params = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));

/** Import modes (backend import_mode). OFFICIAL is the backend default, so it is only sent on uploads. */
export const IMPORT_MODE = { OFFICIAL: "OFFICIAL", DEMO: "DEMO", ALL: "ALL" };
const modeParam = (importMode) => (importMode && importMode !== IMPORT_MODE.OFFICIAL ? importMode : undefined);

/**
 * GSTR-2B reconciliation API (/apm/gst/gstr2b - Backend API_Layer/routes/gstr2b_route.py).
 * Return periods are sent as "YYYY-MM". Matching, totals and statuses are all computed by the
 * backend; nothing here recalculates them. Reads return the OFFICIAL import unless importMode is DEMO.
 */
export const gstr2bService = {
  /** Months with purchase invoices or a GSTR-2B import, newest first, each with its financial year. */
  async periods(financialYear) {
    const { data } = await api.get(`${BASE}/periods`, { params: params({ financial_year: financialYear }) });
    return data;
  },

  /** One period's reconciliation counts and per-component ITC totals. */
  async summary(returnPeriod, importMode) {
    const { data } = await api.get(`${BASE}/matches/summary`, {
      params: params({ return_period: returnPeriod, import_mode: modeParam(importMode) }),
    });
    return data;
  },

  /** The period's GSTR-2B documents with their match, plus invoices in the books missing in GSTR-2B (paged). */
  async matches({ returnPeriod, status, matchGroup, search, page = 1, pageSize = 25, importMode }) {
    const { data } = await api.get(`${BASE}/matches`, {
      params: params({
        return_period: returnPeriod, status, match_group: matchGroup, search, page, page_size: pageSize, import_mode: modeParam(importMode),
      }),
    });
    return data;
  },

  /** One record: field-level comparison, mapping and review history. */
  async matchDetail(matchId) {
    const { data } = await api.get(`${BASE}/matches/${encodeURIComponent(matchId)}`);
    return data;
  },

  /** The period's imported documents exactly as filed (source section / row). */
  async records({ returnPeriod, page = 1, pageSize = 50 }) {
    const { data } = await api.get(`${BASE}/records`, { params: { return_period: returnPeriod, page, page_size: pageSize } });
    return data;
  },

  /** Import history, including failed and superseded imports (importMode ALL = official and demo, labelled). */
  async imports({ returnPeriod, financialYear, importMode } = {}) {
    const { data } = await api.get(`${BASE}/imports`, {
      params: params({ return_period: returnPeriod, financial_year: financialYear, import_mode: modeParam(importMode) }),
    });
    return data;
  },

  /**
   * Validates an upload exactly as the import would and returns what it would import (accepted /
   * rejected records with field-level errors, blocking errors, replacement) - nothing is written.
   */
  async previewImport({ file, returnPeriod, importMode = IMPORT_MODE.OFFICIAL }) {
    const form = new FormData();
    form.append("file", file);
    form.append("return_period", returnPeriod);
    form.append("import_mode", importMode);
    const { data } = await api.post(`${BASE}/import/preview`, form, { headers: { "Content-Type": "multipart/form-data" } });
    return data;
  },

  /**
   * Uploads the GSTR-2B (portal Excel / JSON, or the CSV template) - or, in DEMO mode, the AP demo
   * Excel template - for a return period. `replace` is sent only after the user confirmed replacing
   * the period's current import of the same mode - the backend answers 409 otherwise and keeps the
   * existing import untouched. A demo import never replaces the official one.
   */
  async importFile({ file, returnPeriod, replace = false, importMode = IMPORT_MODE.OFFICIAL, onUploadProgress }) {
    const form = new FormData();
    form.append("file", file);
    form.append("return_period", returnPeriod);
    form.append("import_mode", importMode);
    if (replace) form.append("replace", "true");
    const { data } = await api.post(`${BASE}/import`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onUploadProgress
        ? (event) => event.total && onUploadProgress(Math.round((event.loaded / event.total) * 100))
        : undefined,
    });
    return data;
  },

  /** Re-runs automatic matching for one period (manual mappings are kept by the backend). */
  async rematch(returnPeriod) {
    const { data } = await api.post(`${BASE}/rematch`, null, { params: params({ return_period: returnPeriod }) });
    return data;
  },

  /** The period's reconciliation as an Excel / CSV file. */
  async exportMatches({ returnPeriod, status, search, format = "xlsx", importMode }) {
    const response = await api.get(`${BASE}/matches/export`, {
      params: params({ return_period: returnPeriod, status, search, format, import_mode: modeParam(importMode) }),
      responseType: "blob",
    });
    const demo = importMode === IMPORT_MODE.DEMO ? "DEMO_" : "";
    const fallback = `gstr2b_${demo}reconciliation_${returnPeriod.replace("-", "_")}.${format}`;
    return {
      blob: response.data,
      fileName: extractFileNameFromContentDisposition(response.headers?.["content-disposition"], fallback),
    };
  },

  /** Maps a GSTR-2B document to an AP invoice of the same supplier GSTIN (invoiceId null clears a manual mapping). */
  async mapMatch(matchId, { invoiceId, comments }) {
    const { data } = await api.put(`${BASE}/matches/${encodeURIComponent(matchId)}/mapping`, {
      invoice_id: invoiceId ?? null,
      comments,
    });
    return data;
  },

  /** Finance's decision on a record: ACCEPTED, ON_HOLD or CLEARED. */
  async reviewMatch(matchId, { decision, remarks }) {
    const { data } = await api.patch(`${BASE}/matches/${encodeURIComponent(matchId)}/review`, { decision, remarks });
    return data;
  },

  async template() {
    const response = await api.get(`${BASE}/template`, { responseType: "blob" });
    return response.data;
  },

  /** The AP demo Excel template (sheet B2B) - imported with the Demo Excel Template mode only. */
  async demoTemplate() {
    const response = await api.get(`${BASE}/template/demo`, { responseType: "blob" });
    return response.data;
  },
};

export default gstr2bService;
