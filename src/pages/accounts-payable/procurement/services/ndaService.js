// src/pages/accounts-payable/procurement/services/ndaService.js
import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/nda`;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * NDA lifecycle API (Stage 2). Matches Backend/API_Layer/routes/nda_route.py, mounted at
 * /apm/nda.
 *
 * Whether an NDA is required at all, whether an existing one may be reused, and which status
 * transitions are legal are decided server-side — this service only carries the calls.
 */
export const ndaService = {
  /**
   * POST /apm/nda/generate — generates a new NDA, or reuses a valid existing one (the response's
   * `reused` flag says which). department/category may be omitted: the backend derives them from
   * the PR so the NDA scope always matches the engagement the requirement was decided against.
   * @param {{vendor_id:number, pr_id?:number|null, department_id?:number|null,
   *   purchase_category_id?:number|null, template_code?:string|null,
   *   recipient_email?:string|null}} payload
   * @returns {Promise<{nda_id:number, status_code:string|null, nda_required:boolean,
   *   reused:boolean, document_key:string|null, message:string}>}
   */
  generateNda: async (payload) => {
    const res = await api.post(`${BASE}/generate`, payload, { headers: authHeaders() });
    return res.data;
  },

  /**
   * GET /apm/nda/vendor/{vendor_id} — the existing-NDA lookup.
   * @returns {Promise<{vendor_id:number, outcome:"VALID"|"NOT_FOUND"|"INVALID"|"EXPIRED",
   *   reason:string|null, nda:object|null, ndas:object[]}>}
   */
  getVendorNda: async (vendorId, { departmentId, purchaseCategoryId } = {}) => {
    const res = await api.get(`${BASE}/vendor/${vendorId}`, {
      params: {
        department_id: departmentId || undefined,
        purchase_category_id: purchaseCategoryId || undefined,
      },
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * GET /apm/nda/vendor/{vendor_id}/history — every NDA version on file for the vendor, across
   * all department/category scopes. `active` can hold more than one record (one per scope).
   * @returns {Promise<{vendor_id:number, count:number, active:object[]|object|null,
   *   versions:object[]}>}
   */
  getVendorNdaHistory: async (vendorId) => {
    const res = await api.get(`${BASE}/vendor/${vendorId}/history`, { headers: authHeaders() });
    return res.data;
  },

  /**
   * POST /apm/nda/vendor/{vendor_id}/replace — uploads a new NDA PDF as the next version. The
   * backend deactivates the replaced record (it stays in history) and the new one starts out
   * PENDING; the resulting status is always read back from the server, never assumed here.
   *
   * `ndaId` pins exactly which NDA is replaced, so the department/category scope is only sent
   * when there is no NDA id to go on — sending both could replace a record in another scope.
   *
   * Multipart with the field named exactly `file`; Content-Type is left to the browser (see
   * uploadSignedDocument).
   *
   * @param {number|string} vendorId
   * @param {{file:File, ndaId?:number|null, departmentId?:number|null,
   *   purchaseCategoryId?:number|null, reason?:string|null}} payload
   * @param {{onUploadProgress?:(percent:number)=>void}} [options]
   */
  replaceNda: async (
    vendorId,
    { file, ndaId, departmentId, purchaseCategoryId, reason } = {},
    { onUploadProgress } = {},
  ) => {
    const formData = new FormData();
    formData.append("file", file);

    if (ndaId) {
      formData.append("nda_id", String(ndaId));
    } else {
      if (departmentId) formData.append("department_id", String(departmentId));
      if (purchaseCategoryId) formData.append("purchase_category_id", String(purchaseCategoryId));
    }
    if (reason) formData.append("reason", reason);

    const res = await api.post(`${BASE}/vendor/${vendorId}/replace`, formData, {
      onUploadProgress: (event) => {
        if (onUploadProgress && event.total) {
          onUploadProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
    return res.data;
  },

  getNda: async (ndaId) => {
    const res = await api.get(`${BASE}/${ndaId}`, { headers: authHeaders() });
    return res.data;
  },

  /**
   * GET /apm/nda/{nda_id}/document — short-lived access URL. `signed` asks for the
   * counter-signed copy instead of the generated one.
   * @returns {Promise<{nda_id:number, url:string, expires_in_seconds:number}>}
   */
  getNdaDocumentUrl: async (ndaId, { signed = false } = {}) => {
    const res = await api.get(`${BASE}/${ndaId}/document`, {
      params: { signed },
      headers: authHeaders(),
    });
    return res.data;
  },

  /**
   * POST /apm/nda/{nda_id}/signed-document — uploads the vendor-signed PDF and moves the NDA
   * to SIGNED ("received, pending internal review"). RFQ stays blocked until someone moves it
   * to COMPLETED.
   *
   * Multipart with the field named exactly `file`. Content-Type is deliberately not set here:
   * the axios request interceptor strips the default JSON header for FormData so the browser
   * can add its own multipart boundary (same as the quotation/invoice uploads).
   *
   * The backend uploads to S3 before touching the status and rolls back on failure, so a
   * failed call leaves the NDA exactly as it was.
   *
   * @returns {Promise<{nda_id:number, status_code:string|null, signed_document_key:string|null,
   *   signed_at:string|null, message:string, nda:object}>}
   */
  uploadSignedDocument: async (ndaId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post(`${BASE}/${ndaId}/signed-document`, formData);
    return res.data;
  },

  /**
   * PUT /apm/nda/{nda_id}/signed-document — replaces the signed PDF already on file (allowed
   * from COMPLETED / SIGNED / REJECTED). The backend keeps the previous version in S3, bumps
   * `signed_document_version` and moves the NDA back to SIGNED, so it has to be reviewed again;
   * nothing about the version or status is decided here.
   *
   * Multipart, Content-Type left to the browser exactly as for uploadSignedDocument.
   *
   * @param {number|string} ndaId
   * @param {{file:File, vendorId?:number|string|null, reason?:string|null}} payload
   * @returns {Promise<{nda_id:number, vendor_id:number, status_code:string,
   *   previous_status_code:string|null, signed_document_version:number|null,
   *   previous_signed_document_version:number|null, signed_at:string|null, message:string,
   *   nda:object}>}
   */
  replaceSignedDocument: async (ndaId, { file, vendorId, reason } = {}) => {
    const formData = new FormData();
    formData.append("file", file);
    if (vendorId) formData.append("vendor_id", String(vendorId));
    if (reason) formData.append("reason", reason);

    const res = await api.put(`${BASE}/${ndaId}/signed-document`, formData);
    return res.data;
  },

  /**
   * POST /apm/nda/{nda_id}/send — a delivery failure comes back as a 200 with `sent: false`
   * and an `error`, not as an HTTP error, so callers must check the flag.
   * @returns {Promise<{nda_id:number, status_code:string|null, sent:boolean,
   *   recipient_email:string|null, error:string|null, message:string}>}
   */
  sendNda: async (ndaId) => {
    const res = await api.post(`${BASE}/${ndaId}/send`, null, { headers: authHeaders() });
    return res.data;
  },

  /**
   * PUT /apm/nda/{nda_id}/content — persists the edited NDA body. This is what makes the
   * editor's content real: POST /send delivers the latest *persisted* content, so unsaved
   * edits must be saved through here first or they are simply not part of the agreement.
   *
   * `version` is the content version the edits were made against. The backend answers 409
   * when it no longer matches, which means someone else saved in the meantime — the caller
   * must reload rather than overwrite.
   *
   * @param {number|string} ndaId
   * @param {string} content
   * @param {number|null} [version]
   * @returns {Promise<{nda_id:number, version?:number, content?:string, message?:string}>}
   */
  updateNdaContent: async (ndaId, content, version = null) => {
    const res = await api.put(
      `${BASE}/${ndaId}/content`,
      { content, version: version ?? undefined },
      { headers: authHeaders() },
    );
    return res.data;
  },

  updateNdaStatus: async (ndaId, { statusCode, signedDocumentKey, reason } = {}) => {
    const res = await api.patch(
      `${BASE}/${ndaId}/status`,
      {
        status_code: statusCode,
        signed_document_key: signedDocumentKey || undefined,
        reason: reason || undefined,
      },
      { headers: authHeaders() },
    );
    return res.data;
  },
};

export default ndaService;
