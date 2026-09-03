import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;
const ROOT = `${BASE_URL}/exports`;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Turns a binary response into a browser download.
 * The filename comes from Content-Disposition when present — the server sets
 * it, including a UTF-8 form for campaign names with non-ASCII characters, and
 * guessing it here would produce a worse name than the one it already sent.
 */
const saveBlob = (response, fallbackName) => {
  const disposition = response.headers?.["content-disposition"] || "";
  let filename = fallbackName;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  if (utf8) filename = decodeURIComponent(utf8[1]);
  else if (plain) filename = plain[1];

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => window.URL.revokeObjectURL(url), 2000);
};

// A queued export comes back as JSON even though the request asked for a blob,
// so the arraybuffer has to be decoded to find out which one happened.
const parseIfJson = async (response) => {
  const type = response.headers?.["content-type"] || "";
  if (!type.includes("application/json")) return null;
  try {
    const text = await new Blob([response.data]).text();
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// ── candidate list ───────────────────────────────────────────────────

/**
 * Returns {queued: true,...} when the export exceeded EXPORT_ASYNC_THRESHOLD
 * and was handed to Celery, or {queued: false} once the file has downloaded.
 */
export const exportCandidateList = async (campaignId, {
  includeRejectedSheet = false, campaignCandidateIds = null,
} = {}) => {
  const params = new URLSearchParams();
  if (includeRejectedSheet) params.append("include_rejected_sheet", "true");
  (campaignCandidateIds || []).forEach((id) => params.append("campaign_candidate_ids", id));

  const response = await api.get(
    `${ROOT}/campaigns/${campaignId}/candidates?${params.toString()}`,
    { headers: authHeaders(), responseType: "arraybuffer" },
  );

  const queued = await parseIfJson(response);
  if (queued) return { queued: true, ...(queued.data || queued) };

  saveBlob(response, "candidates.xlsx");
  return { queued: false };
};

// ── scorecard ────────────────────────────────────────────────────────

export const exportScorecard = async (campaignId, campaignCandidateId) => {
  const response = await api.get(
    `${ROOT}/campaigns/${campaignId}/candidates/${campaignCandidateId}/scorecard`,
    { headers: authHeaders(), responseType: "arraybuffer" },
  );
  saveBlob(response, "scorecard.pdf");
};

// ── audit trail ──────────────────────────────────────────────────────

export const exportAuditTrail = async (campaignId) => {
  const response = await api.get(
    `${ROOT}/campaigns/${campaignId}/audit-trail`,
    { headers: authHeaders(), responseType: "arraybuffer" },
  );
  saveBlob(response, "audit_trail.xlsx");
};
