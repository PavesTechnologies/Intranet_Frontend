import { Video, MapPin, Phone } from "lucide-react";

// Mock data for the Interview tab (E04 preview) — no backend exists yet for
// interview_schedules / interview_schedule_history, so this seeds a plausible
// preview from the candidate alone. Every export here is a pure function:
// nothing is cached at module scope, so one candidate's preview state can
// never leak into another's, and InterviewTab.jsx owns all edits in local
// React state from here on (see the resume-intake mock/ tab for the anti-
// pattern this is deliberately avoiding — a module-level mock store wired to
// a Save button that silently discards edits).
//
// A candidate can go through several interview rounds (Screening, Technical,
// Managerial, ...), so the mock model is a *list* of rounds per candidate
// rather than a single active schedule — closer to how interview_schedules
// will actually work once the backend exists.
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) {
    h = (h * 31 + String(str).charCodeAt(i)) >>> 0;
  }
  return h;
}

export const INTERVIEW_TYPE_OPTIONS = [
  { value: "SCREENING", label: "Screening Interview" },
  { value: "TECHNICAL", label: "Technical Interview" },
  { value: "HR", label: "HR Interview" },
  { value: "MANAGERIAL", label: "Managerial Interview" },
  { value: "FINAL", label: "Final Interview" },
];
export const INTERVIEW_TYPE_LABEL = INTERVIEW_TYPE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {}
);

export const PLATFORM_OPTIONS = [
  {
    value: "TEAMS",
    label: "Microsoft Teams",
    subtitle: "Video meeting",
    icon: Video,
    note: "A Microsoft Teams meeting link will be generated when calendar integration is connected.",
  },
  {
    value: "MEET",
    label: "Google Meet",
    subtitle: "Video meeting",
    icon: Video,
    note: "A Google Meet link will be generated when calendar integration is connected.",
  },
  {
    value: "ONSITE",
    label: "Onsite",
    subtitle: "In-person meeting",
    icon: MapPin,
    note: "Share the interview location with the candidate and interviewers.",
  },
  {
    value: "PHONE",
    label: "Phone Call",
    subtitle: "Voice call",
    icon: Phone,
    note: "A dial-in number will be shared with the candidate and interviewers.",
  },
];
export const PLATFORM_LABEL = PLATFORM_OPTIONS.reduce((acc, o) => ({ ...acc, [o.value]: o.label }), {});

export const STATUS_TONE = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-100",
  RESCHEDULED: "bg-violet-50 text-violet-700 border-violet-100",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-800 border-rose-200",
};

export const STATUS_LABEL = {
  PENDING: "Pending",
  SCHEDULED: "Scheduled",
  RESCHEDULED: "Rescheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Directory of mock interviewers available for selection — stand-in for the
// backend's interviewer/employee lookup.
export const INTERVIEWER_DIRECTORY = [
  { id: 1, name: "Venipriya P", email: "venipriya.p@company.com" },
  { id: 2, name: "Rohit Lingarker", email: "rohit.lingarker@pavestechnologies.com" },
  { id: 3, name: "Arjun Mehta", email: "arjun.mehta@company.com" },
  { id: 4, name: "Swarna Raj", email: "swarna.raj@company.com" },
  { id: 5, name: "Ranga K", email: "ranga.k@company.com" },
];

export function formatTimeLabel(hhmm) {
  if (!hhmm) return "-";
  const d = new Date(`2000-01-01T${hhmm}:00`);
  if (Number.isNaN(d.getTime())) return hhmm;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDateLabel(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

// round.date/start_time/end_time have no timezone suffix by the time they
// reach here (interviewService.js already converted UTC -> local on the
// way in), so parsing them with no 'Z' suffix reads as local wall-clock
// time — exactly the comparison these two need against `new Date()`.
export function hasRoundStarted(round) {
  if (!round?.date || !round?.start_time) return false;
  const startAt = new Date(`${round.date}T${round.start_time}:00`);
  return !Number.isNaN(startAt.getTime()) && startAt.getTime() <= Date.now();
}

export function hasRoundEnded(round) {
  if (!round?.date || !round?.end_time) return false;
  const endAt = new Date(`${round.date}T${round.end_time}:00`);
  return !Number.isNaN(endAt.getTime()) && endAt.getTime() <= Date.now();
}


function randomToken(length) {
  return Math.random().toString(36).slice(2, 2 + length);
}

// Mock meeting link generator — stands in for the real Microsoft
// Graph / Google Calendar call that will eventually create these.
export function generateMeetingLink(platform) {
  if (platform === "TEAMS") return `https://teams.microsoft.com/mock/airs-${randomToken(8)}`;
  if (platform === "MEET") return `https://meet.google.com/mock-${randomToken(3)}-${randomToken(4)}`;
  return null;
}

// Fixed slot grid interviewers are checked against — a stand-in for a real
// calendar free/busy lookup.
export const AVAILABILITY_SLOTS = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
];

function interviewerAvailable(interviewerKey, dateStr, slotIndex) {
  // ~66% available, deterministic per interviewer/date/slot so the same
  // combination always renders the same mock availability.
  return hashStr(`${interviewerKey}|${dateStr}|${slotIndex}`) % 3 !== 0;
}

// Returns AVAILABILITY_SLOTS annotated with availability for the given set
// of interviewers (manually entered — {name, email}, no directory lookup)
// on the given date. A slot is only "available" if every selected
// interviewer is free, and otherwise lists who is conflicting so the UI can
// surface a real conflict message.
export function getAvailabilityMock(interviewers, dateStr) {
  if (!dateStr || !interviewers?.length) return [];

  return AVAILABILITY_SLOTS.map((slot, idx) => {
    const unavailable = interviewers.filter(
      (interviewer) => !interviewerAvailable(interviewer.email || interviewer.name, dateStr, idx)
    );

    return {
      ...slot,
      available: unavailable.length === 0,
      unavailableInterviewers: unavailable,
    };
  });
}

function interviewersFor(ids) {
  return ids.map((id) => INTERVIEWER_DIRECTORY.find((i) => i.id === id)).filter(Boolean);
}

// Seeds 2-4 plausible interview rounds for a candidate: an already-completed
// screening, an upcoming/rescheduled technical round, and — depending on the
// seed — a pending managerial/final round further out.
export function getInterviewRoundsMock(candidate) {
  const seed = hashStr(candidate?.id ?? "mock");
  const candidateId = candidate?.id ?? "mock";
  const roundsCount = 2 + (seed % 3); // 2, 3, or 4

  const rounds = [
    {
      id: `${candidateId}-r1`,
      interview_type: "SCREENING",
      status: "COMPLETED",
      date: "2026-08-05",
      start_time: "10:00",
      end_time: "10:30",
      duration_minutes: 30,
      interviewers: interviewersFor([INTERVIEWER_DIRECTORY[seed % INTERVIEWER_DIRECTORY.length].id]),
      platform: "TEAMS",
      meeting_link: generateMeetingLink("TEAMS"),
      location: null,
      notes: "Initial screening — background, notice period and expectations.",
      created_at: "2026-07-30T09:00:00Z",
      history: [],
    },
    {
      id: `${candidateId}-r2`,
      interview_type: "TECHNICAL",
      status: seed % 2 === 0 ? "SCHEDULED" : "RESCHEDULED",
      date: "2026-08-20",
      start_time: "15:00",
      end_time: "16:00",
      duration_minutes: 60,
      interviewers: interviewersFor([
        INTERVIEWER_DIRECTORY[(seed + 1) % INTERVIEWER_DIRECTORY.length].id,
        INTERVIEWER_DIRECTORY[(seed + 2) % INTERVIEWER_DIRECTORY.length].id,
      ]),
      platform: seed % 2 === 0 ? "TEAMS" : "MEET",
      meeting_link: generateMeetingLink(seed % 2 === 0 ? "TEAMS" : "MEET"),
      location: null,
      notes: "Technical discussion covering core stack, system design and problem solving.",
      created_at: "2026-08-06T09:00:00Z",
      history:
        seed % 2 === 0
          ? []
          : [
              {
                id: `${candidateId}-r2-hist-1`,
                old_scheduled_at: "2026-08-18T14:00:00.000Z",
                new_scheduled_at: "2026-08-20T15:00:00.000Z",
                rescheduled_by: "Venipriya P",
                reason: "Interviewer conflict",
                changed_at: "2026-08-17T09:00:00.000Z",
              },
            ],
    },
  ];

  if (roundsCount >= 3) {
    rounds.push({
      id: `${candidateId}-r3`,
      interview_type: "MANAGERIAL",
      status: "PENDING",
      date: "2026-08-27",
      start_time: "11:00",
      end_time: "12:00",
      duration_minutes: 60,
      interviewers: interviewersFor([INTERVIEWER_DIRECTORY[(seed + 3) % INTERVIEWER_DIRECTORY.length].id]),
      platform: "ONSITE",
      meeting_link: null,
      location: "Bengaluru Office, 4th Floor",
      notes: "",
      created_at: "2026-08-13T09:00:00Z",
      history: [],
    });
  }

  if (roundsCount >= 4) {
    rounds.push({
      id: `${candidateId}-r4`,
      interview_type: "FINAL",
      status: seed % 5 === 0 ? "CANCELLED" : "PENDING",
      date: "2026-09-03",
      start_time: "16:00",
      end_time: "17:00",
      duration_minutes: 60,
      interviewers: interviewersFor([INTERVIEWER_DIRECTORY[(seed + 4) % INTERVIEWER_DIRECTORY.length].id]),
      platform: "TEAMS",
      meeting_link: generateMeetingLink("TEAMS"),
      location: null,
      notes: "",
      created_at: "2026-08-13T09:00:00Z",
      history: [],
    });
  }

  return rounds;
}
