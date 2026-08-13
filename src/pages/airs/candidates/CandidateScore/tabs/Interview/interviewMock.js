// Mock data for the Interview tab (E04 preview) — no backend exists yet for
// interview_schedules / interview_schedule_history, so this seeds a plausible
// preview from the candidate alone. Every export here is a pure function:
// nothing is cached at module scope, so one candidate's preview state can
// never leak into another's, and InterviewTab.jsx owns all edits in local
// React state from here on (see the resume-intake mock/ tab for the anti-
// pattern this is deliberately avoiding — a module-level mock store wired to
// a Save button that silently discards edits).
const PREVIEW_STATUS_BY_SEED = ["NOT_SCHEDULED", "SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"];

function previewSeed(candidateId) {
  const chars = String(candidateId ?? "").split("");
  return chars.reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function previewStatus(candidate) {
  return PREVIEW_STATUS_BY_SEED[previewSeed(candidate?.id) % PREVIEW_STATUS_BY_SEED.length];
}

export function getInterviewScheduleMock(candidate) {
  const status = previewStatus(candidate);

  if (status === "NOT_SCHEDULED") {
    return {
      campaign_candidate_id: candidate?.id ?? null,
      status,
      scheduled_at: null,
      duration_minutes: null,
      interviewer_names: [],
      mode: null,
      meeting_link: null,
      location: null,
      notes: "",
    };
  }

  return {
    campaign_candidate_id: candidate?.id ?? null,
    status,
    scheduled_at: "2026-08-20T10:00:00Z",
    duration_minutes: 45,
    interviewer_names: ["Venipriya P"],
    mode: "VIDEO",
    meeting_link: "https://meet.example.com/interview-preview",
    location: null,
    notes: "",
  };
}

export function getInterviewHistoryMock(candidate) {
  const status = previewStatus(candidate);
  if (status !== "SCHEDULED" && status !== "COMPLETED") return [];

  return [
    {
      id: `${candidate?.id ?? "mock"}-hist-1`,
      old_scheduled_at: "2026-08-18T14:00:00Z",
      new_scheduled_at: "2026-08-20T10:00:00Z",
      rescheduled_by: "Venipriya P",
      reason: "Interviewer conflict",
      changed_at: "2026-08-17T09:00:00Z",
    },
  ];
}

export const INTERVIEW_MODE_OPTIONS = [
  { value: "VIDEO", label: "Video Call" },
  { value: "ONSITE", label: "Onsite" },
  { value: "PHONE", label: "Phone" },
];

export const INTERVIEW_MODE_LABEL = INTERVIEW_MODE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {}
);

export const INTERVIEWER_OPTIONS = [
  { value: "Venipriya P", label: "Venipriya P" },
  { value: "Rohit Lingarker", label: "Rohit Lingarker" },
  { value: "Arjun Mehta", label: "Arjun Mehta" },
];
