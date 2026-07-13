import { UPLOAD_STATUSES } from "../mock/resumeIntakeMockData";

export const UPLOAD_STATUS_FILTER_OPTIONS = [
  { label: "All Statuses", value: "All" },
  ...UPLOAD_STATUSES.map((s) => ({ label: s, value: s })),
];

export const UPLOAD_STATUS_BADGE_TONE = {
  Parsed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Parsing: "bg-amber-50 text-amber-700 border-amber-100",
  Queued: "bg-slate-100 text-slate-700 border-slate-200",
  "Duplicate flagged": "bg-rose-50 text-rose-700 border-rose-100",
  Failed: "bg-rose-100 text-rose-800 border-rose-200",
};

export { UPLOAD_STATUSES };

export const UPLOAD_SORT_OPTIONS = [
  { label: "Newest first", value: "uploadedAt:desc" },
  { label: "Oldest first", value: "uploadedAt:asc" },
  { label: "Name (A-Z)", value: "name:asc" },
  { label: "Progress", value: "progress:desc" },
];

export const RESUME_INTAKE_PAGE_SIZE = 6;

// How fast the mock progress simulation advances per tick (ms) and per step (%).
export const MOCK_UPLOAD_TICK_MS = 500;
export const MOCK_UPLOAD_STEP_PERCENT = 20;
