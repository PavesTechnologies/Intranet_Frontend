// Upload decisions: a resume uploaded for a candidate who is already in the
// campaign with a different file waits here until the uploader (or an
// HR_ADMIN) keeps the existing resume or uses the new file as a new version.
// Same conventions as settings/services/educationFieldService.js.
import api from "@/api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const unwrap = (data) => data?.data ?? data ?? {};

// Unlike apiErrorMessage, a 403/409 here carries the backend's own sentence
// (e.g. "only the uploader can decide", "already decided") - show it as is.
export const decisionErrorMessage = (error, fallback) => {
  const response = error?.response;
  if (!response) return "Can't reach the AIRS server. Check your connection and try again.";
  if (response.status === 401) return "Your session has expired. Please sign in again.";
  const data = response.data;
  const serverMessage =
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.detail === "string" && data.detail) ||
    "";
  if (response.status >= 500) return "Something went wrong on the server. Please try again.";
  return serverMessage || fallback;
};

// status: PENDING (default) | KEPT_EXISTING | NEW_VERSION_USED | EXPIRED_KEPT_EXISTING | ALL
// -> { items: [...], total }
export const getCampaignUploadDecisions = async (campaignId, status = "PENDING") => {
  const response = await api.get(`${BASE_URL}/campaigns/${campaignId}/upload-decisions`, {
    params: { status },
    headers: authHeaders(),
  });
  return unwrap(response.data);
};

// All statuses for one bulk upload job -> { items: [...], total }
export const getBulkUploadDecisions = async (jobId) => {
  const response = await api.get(`${BASE_URL}/bulk-uploads/${jobId}/decisions`, { headers: authHeaders() });
  return unwrap(response.data);
};

// choice: "keep_existing" | "use_new_version" -> { decision, new_resume_id, task_id }
export const decideUpload = async (decisionId, choice) => {
  const response = await api.post(
    `${BASE_URL}/upload-decisions/${decisionId}/decide`,
    { choice },
    { headers: authHeaders() },
  );
  return { message: response.data?.message, ...unwrap(response.data) };
};
