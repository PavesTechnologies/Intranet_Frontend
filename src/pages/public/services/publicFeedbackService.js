// Public, unauthenticated interview-feedback endpoints — an interviewer
// reaches this from an emailed link with no account and no session.
// Security is a signed, expiring token in the URL, not app auth.
//
// Deliberately NOT using src/api/axiosInstance.js: that instance attaches
// a Bearer token from localStorage whenever one happens to be sitting
// there (e.g. the same browser/device also used to log into the app),
// and its response interceptor can redirect to /login on a 401. Neither
// is acceptable here — this visitor was never logged in, and a stray
// token or an unrelated 401 must never hijack their flow. A bare axios
// instance with zero interceptors avoids both.
import axios from "axios";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const publicApi = axios.create();

// Exact field names on the context payload aren't pinned down yet beyond
// "candidate name/context, round's interview_type and date, the
// interviewer's own name" — read defensively (snake_case primary, camelCase
// fallback) so a minor naming mismatch doesn't blank the page.
const mapFeedbackContext = (raw) => ({
  candidateName: raw?.candidate_name ?? raw?.candidateName ?? "",
  interviewType: raw?.interview_type ?? raw?.interviewType ?? "",
  date: raw?.date ?? null,
  interviewerName: raw?.interviewer_name ?? raw?.interviewerName ?? "",
});

// Throws on any error — the page needs the specific status (404/410
// invalid-or-expired) to decide what to show, so it isn't swallowed here.
export const getFeedbackFormContext = async (token) => {
  const response = await publicApi.get(`${BASE_URL}/interviews/feedback/${token}`);
  const body = response.data?.data ?? response.data ?? {};
  return mapFeedbackContext(body);
};

// 201 on success. Throws on error — the page distinguishes a 409
// (already submitted) from anything else.
export const submitFeedback = async (token, { recommendation, notes }) => {
  const response = await publicApi.post(`${BASE_URL}/interviews/feedback/${token}`, {
    recommendation,
    notes,
  });
  return response.data;
};
