// Service layer for interview scheduling (Epic 4). Same conventions as
// src/pages/airs/prompt-templates/services/promptTemplateService.js — service
// owns request/response shape mapping; callers (hooks/components) own toasts.
//
// Contract (confirmed live against the real backend) — a candidate can have
// several interview rounds, freely: HM_REVIEW decides count/order.
//   GET   /campaign-candidates/{campaign_candidate_id}/interviews  -> list, ordered by round (item 0 = round 1)
//   POST  /campaign-candidates/{campaign_candidate_id}/interviews  -> round-aware: completes the latest round
//         (if SCHEDULED/RESCHEDULED) and starts a new one, or starts round 1 if the candidate has none yet
//   PATCH /interviews/{id}/reschedule                              -> operates on one specific round by id
//   PATCH /interviews/{id}/cancel                                  -> operates on one specific round by id
// Schedule/reschedule also require a `timezone` field (IANA zone name,
// e.g. "Asia/Kolkata") as of an urgent backend contract change — 422
// without it. See getBrowserTimeZone() below; EditInterviewersModal's
// flow reuses rescheduleInterview() directly, so it's covered too.
import api from "@/api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// The backend stores start_time/end_time as HH:MM:SS; the UI only ever
// works in HH:MM.
const toApiTime = (hhmm) => (hhmm && hhmm.length === 5 ? `${hhmm}:00` : hhmm);

const mapInterviewersForApi = (interviewers) => (interviewers || []).map((i) => ({ name: i.name, email: i.email }));

// Schedule/reschedule require an IANA zone name (e.g. "Asia/Kolkata") in
// the request body — 422 without it. The backend does the one and only
// UTC conversion itself, from this zone + the raw date/start_time/end_time
// below; the frontend must send the picked values exactly as entered, not
// pre-converted, or the offset gets applied twice (see scheduleInterview/
// rescheduleInterview below).
const getBrowserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// raw.start_at/raw.end_at are real UTC instants ("...Z") straight from the
// backend. `new Date(iso)` parses that correctly; its plain getters
// (getFullYear, getHours, ...) then read it back in whichever timezone the
// current viewer's own browser is in — never raw.timezone (the scheduler's
// zone, informational only) and never raw.date/start_time/end_time (which
// are relative to *that* zone, not the viewer's). This is what the date/
// time inputs below get pre-filled from on reschedule, and it's also what
// hasRoundStarted/hasRoundEnded in interviewMock.js compare against.
function isoToLocalParts(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return { date: null, time: null };
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

const mapApiInterviewToInternal = (raw) => {
  const start = isoToLocalParts(raw.start_at);
  const end = isoToLocalParts(raw.end_at);
  return {
    id: raw.id,
    campaign_candidate_id: raw.campaign_candidate_id,
    interview_type: raw.interview_type,
    status: raw.status,
    // The true UTC instants — every genuine *display* of this round's
    // date/time should format these directly (formatInterviewDate/
    // formatInterviewTime in interviewMock.js), not the local fields below.
    start_at: raw.start_at,
    end_at: raw.end_at,
    // Viewer-local wall-clock, derived from start_at/end_at above — only
    // for pre-filling the reschedule form's Date/Start Time/End Time
    // inputs, which need plain local values to bind to.
    date: start.date,
    start_time: start.time,
    end_time: end.time,
    duration_minutes: raw.duration_minutes,
    interviewers: raw.interviewers || [],
    platform: raw.platform,
    location: raw.location,
    notes: raw.notes,
    cancel_reason: raw.cancel_reason,
    meeting_link: raw.meeting_link,
    created_at: raw.created_at,
    history: raw.history || [],
  };
};

// Returns [] for a 404 ("no rows at all" — a candidate who hasn't had a
// single round created yet) rather than throwing, since that's a real,
// expected state the tab treats the same as an empty list. Any other error
// (auth, 500, ...) still throws — a 404 is the only status this silently
// absorbs. Items come back ordered by round already (item 0 = round 1).
export const getInterviews = async (campaignCandidateId) => {
  try {
    const response = await api.get(`${BASE_URL}/campaign-candidates/${campaignCandidateId}/interviews`, {
      headers: authHeaders(),
    });
    const items = response.data?.data;
    return Array.isArray(items) ? items.map(mapApiInterviewToInternal) : [];
  } catch (error) {
    if (error?.response?.status === 404) return [];
    console.error("Error fetching interviews:", error);
    throw error;
  }
};

// InterviewScheduleModal's onSubmit payload — {interviewType, interviewers,
// date, startTime, endTime, durationMinutes, platform, location, notes,
// reason} — maps 1:1 onto the request body below, just camelCase -> snake_case.
export const scheduleInterview = async (campaignCandidateId, payload) => {
  try {
    const response = await api.post(
      `${BASE_URL}/campaign-candidates/${campaignCandidateId}/interviews`,
      {
        interview_type: payload.interviewType,
        interviewers: mapInterviewersForApi(payload.interviewers),
        // Raw picked values, unconverted — the backend converts these to
        // UTC itself using `timezone` below; converting here too would
        // double-apply the offset.
        date: payload.date,
        start_time: toApiTime(payload.startTime),
        end_time: toApiTime(payload.endTime),
        duration_minutes: payload.durationMinutes,
        platform: payload.platform,
        location: payload.location,
        notes: payload.notes,
        timezone: getBrowserTimeZone(),
      },
      { headers: authHeaders() }
    );
    return mapApiInterviewToInternal(response.data?.data || {});
  } catch (error) {
    console.error("Error scheduling interview:", error);
    throw error;
  }
};

export const rescheduleInterview = async (interviewId, payload) => {
  try {
    const response = await api.patch(
      `${BASE_URL}/interviews/${interviewId}/reschedule`,
      {
        interviewers: mapInterviewersForApi(payload.interviewers),
        // Raw picked values, unconverted — see scheduleInterview above.
        date: payload.date,
        start_time: toApiTime(payload.startTime),
        end_time: toApiTime(payload.endTime),
        duration_minutes: payload.durationMinutes,
        platform: payload.platform,
        location: payload.location,
        notes: payload.notes,
        reason: payload.reason,
        timezone: getBrowserTimeZone(),
      },
      { headers: authHeaders() }
    );
    return mapApiInterviewToInternal(response.data?.data || {});
  } catch (error) {
    console.error("Error rescheduling interview:", error);
    throw error;
  }
};

export const cancelInterview = async (interviewId, reason) => {
  try {
    const response = await api.patch(
      `${BASE_URL}/interviews/${interviewId}/cancel`,
      { reason },
      { headers: authHeaders() }
    );
    return mapApiInterviewToInternal(response.data?.data || {});
  } catch (error) {
    console.error("Error cancelling interview:", error);
    throw error;
  }
};

const mapFeedbackEntry = (raw) => ({
  id: raw.id,
  interviewerName: raw.interviewer_name,
  interviewerEmail: raw.interviewer_email,
  recommendation: raw.recommendation,
  notes: raw.notes,
  submittedAt: raw.submitted_at,
});

// One entry per interviewer who has submitted for this round — a round
// with 2 interviewers who both submitted returns both. Read defensively
// (bare array or {data: [...]}) since this codebase's list endpoints have
// disagreed with their own docs on wrapping before (see oauthService.js).
export const getRoundFeedback = async (campaignCandidateId, interviewId) => {
  try {
    const response = await api.get(
      `${BASE_URL}/campaign-candidates/${campaignCandidateId}/interviews/${interviewId}/feedback`,
      { headers: authHeaders() }
    );
    const items = Array.isArray(response.data) ? response.data : response.data?.data;
    return Array.isArray(items) ? items.map(mapFeedbackEntry) : [];
  } catch (error) {
    console.error("Error fetching round feedback:", error);
    throw error;
  }
};

// Manually triggers the feedback-request email for whichever interviewers
// on this round haven't already submitted or been emailed. Returns
// queued_count — 0 is a valid, non-error outcome (everyone's already been
// asked or has responded), not a failure the caller should treat as one.
export const requestFeedback = async (interviewId) => {
  try {
    const response = await api.post(`${BASE_URL}/interviews/${interviewId}/request-feedback`, {}, { headers: authHeaders() });
    const body = response.data?.data ?? response.data ?? {};
    return body.queued_count ?? 0;
  } catch (error) {
    console.error("Error requesting feedback:", error);
    throw error;
  }
};

// Marks a round COMPLETED and queues feedback requests for whichever
// interviewers don't already have one, in a single call.
export const completeInterview = async (interviewId) => {
  try {
    const response = await api.post(`${BASE_URL}/interviews/${interviewId}/complete`, {}, { headers: authHeaders() });
    const body = response.data?.data ?? response.data ?? {};
    return { status: body.status, feedbackQueuedCount: body.feedback_queued_count ?? 0 };
  } catch (error) {
    console.error("Error completing interview:", error);
    throw error;
  }
};
