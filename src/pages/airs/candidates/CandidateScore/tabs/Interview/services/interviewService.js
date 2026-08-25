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

// Urgent backend contract addition: schedule/reschedule now require an
// IANA zone name (e.g. "Asia/Kolkata") in the request body — 422 without
// it. Additive only: date/start_time/end_time keep being sent as UTC
// exactly as before (see localToUtcParts below); this is a new required
// field alongside them, not a change to what those values mean.
const getBrowserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// The backend has no server-side timezone concept — it stores whatever
// date/start_time/end_time it's given as-is, as UTC, by design. The UI
// only ever collects/displays local wall-clock time, so every value has to
// cross that boundary exactly once, at the two functions below, rather
// than at each call site. Everything else in this module (formatTimeLabel,
// hasRoundStarted, the schedule modal's pre-fill logic) keeps treating
// date/start_time/end_time as plain local values — that's still true,
// it's just true on both sides of a conversion that happens right here.

// Local date "YYYY-MM-DD" + local time "HH:MM" -> the UTC equivalents,
// for sending. New Date(y, m, d, h, min) is constructed in the browser's
// own timezone; toISOString() always renders UTC.
function localToUtcParts(dateStr, timeStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const localInstant = new Date(year, month - 1, day, hour, minute);
  return { date: localInstant.toISOString().slice(0, 10), time: localInstant.toISOString().slice(11, 16) };
}

// The reverse, for display: UTC date + UTC time (HH:MM or HH:MM:SS, the
// trailing :SS is simply ignored by the two-element destructure below) ->
// local date + local time. Date.UTC gives the instant; the plain getters
// then read it back in whichever timezone the viewer's browser is in.
function utcToLocalParts(dateStr, timeStr) {
  if (!dateStr || !timeStr) return { date: dateStr, time: timeStr };
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`,
    time: `${pad(instant.getHours())}:${pad(instant.getMinutes())}`,
  };
}

const mapApiInterviewToInternal = (raw) => {
  // Both derived from the round's single `date` + their own time — in the
  // (unlikely, business-hours-only) case a round's start/end straddle a
  // UTC calendar-day boundary, the schema's one date field can only hold
  // one of the two; start's date wins, matching what's sent on the way up.
  const start = utcToLocalParts(raw.date, raw.start_time);
  const end = utcToLocalParts(raw.date, raw.end_time);
  return {
    id: raw.id,
    campaign_candidate_id: raw.campaign_candidate_id,
    interview_type: raw.interview_type,
    status: raw.status,
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
    const startUtc = localToUtcParts(payload.date, payload.startTime);
    const endUtc = localToUtcParts(payload.date, payload.endTime);
    const response = await api.post(
      `${BASE_URL}/campaign-candidates/${campaignCandidateId}/interviews`,
      {
        interview_type: payload.interviewType,
        interviewers: mapInterviewersForApi(payload.interviewers),
        date: startUtc.date,
        start_time: toApiTime(startUtc.time),
        end_time: toApiTime(endUtc.time),
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
    const startUtc = localToUtcParts(payload.date, payload.startTime);
    const endUtc = localToUtcParts(payload.date, payload.endTime);
    const response = await api.patch(
      `${BASE_URL}/interviews/${interviewId}/reschedule`,
      {
        interviewers: mapInterviewersForApi(payload.interviewers),
        date: startUtc.date,
        start_time: toApiTime(startUtc.time),
        end_time: toApiTime(endUtc.time),
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
