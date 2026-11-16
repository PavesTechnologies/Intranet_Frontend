import api from "../../../../api/axiosInstance";
import { logError } from "@/pages/airs/utils/logError";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const unwrap = (res) => res?.data?.data ?? res?.data;

// Email drafts (email plan phase 3): no email goes to a candidate or an interviewer on its own. Each is
// prepared as a draft; a person previews it, then sends it after a confirm step naming the recipient.

// GET /campaign-candidates/{id}/email-drafts - the candidate's emails waiting for Send.
export const listEmailDrafts = async (campaignCandidateId) => {
  try {
    const res = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/email-drafts`, {
      headers: authHeaders(),
    });
    return unwrap(res) || [];
  } catch (error) {
    logError("Error loading email drafts:", error);
    throw error;
  }
};

// POST /email-drafts/{id}/preview - the email exactly as it will be sent: recipient, subject, body,
// preview_hash, problems (why it can't be sent), can_send.
export const previewEmailDraft = async (draftId) => {
  const res = await api.post(`${BASE_URL}/email-drafts/${draftId}/preview`, {}, { headers: authHeaders() });
  return unwrap(res);
};

// POST /email-drafts/{id}/send - refused (409) when the email changed since the preview.
export const sendEmailDraft = async (draftId, previewHash) => {
  const res = await api.post(`${BASE_URL}/email-drafts/${draftId}/send`, { preview_hash: previewHash }, {
    headers: authHeaders(),
  });
  return unwrap(res);
};

// POST /email-drafts/{id}/discard
export const discardEmailDraft = async (draftId) => {
  const res = await api.post(`${BASE_URL}/email-drafts/${draftId}/discard`, {}, { headers: authHeaders() });
  return unwrap(res);
};

export const draftErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

export const draftErrorCode = (error) => error?.response?.data?.data?.code;
