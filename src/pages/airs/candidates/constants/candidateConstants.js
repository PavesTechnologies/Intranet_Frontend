import { CANDIDATE_STAGES } from "../mock/candidateMockData";

export const CANDIDATE_STAGE_FILTER_OPTIONS = [
  { label: "All Stages", value: "All" },
  ...CANDIDATE_STAGES.map((s) => ({ label: s, value: s })),
];

export const CANDIDATE_STAGE_BADGE_TONE = {
  Screening: "bg-amber-50 text-amber-700 border-amber-100",
  Shortlisted: "bg-blue-50 text-blue-700 border-blue-100",
  Interview: "bg-sky-50 text-sky-700 border-sky-100",
  Selected: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Rejected: "bg-rose-50 text-rose-700 border-rose-100",
};

export { CANDIDATE_STAGES };

// Mirrors the backend's `pipeline_stage` enum on campaign_candidate (real
// API values are UPPER_SNAKE_CASE, unlike the title-case CANDIDATE_STAGES
// mock above).
export const PIPELINE_STAGE_LABEL = {
  UPLOADED: "Uploaded",
  SCREENING: "Screening",
  SHORTLISTED: "Shortlisted",
  HM_REVIEW: "HM Review",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  FRAUD_REVIEW: "Fraud Review",
  HOLD: "On Hold",
};

export const PIPELINE_STAGE_BADGE_TONE = {
  UPLOADED: "bg-slate-100 text-slate-600 border-slate-200",
  SCREENING: "bg-amber-50 text-amber-700 border-amber-100",
  SHORTLISTED: "bg-blue-50 text-blue-700 border-blue-100",
  HM_REVIEW: "bg-indigo-50 text-indigo-700 border-indigo-100",
  INTERVIEW: "bg-sky-50 text-sky-700 border-sky-100",
  SELECTED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-100",
  FRAUD_REVIEW: "bg-amber-50 text-amber-700 border-amber-100",
  HOLD: "bg-amber-50 text-amber-700 border-amber-100",
};

// `ai_recommendation` on campaign_candidate — the AI layer's suggested call,
// independent of the actual decision_type recorded below.
export const AI_RECOMMENDATION_BADGE_TONE = {
  SHORTLIST: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECT: "bg-rose-50 text-rose-700 border-rose-100",
  HOLD: "bg-amber-50 text-amber-700 border-amber-100",
};

// `decision_type` — the recorded outcome for a candidate at their current
// stage: REJECTED = failed, SHORTLISTED/SELECTED = succeeded, HOLD/
// FRAUD_REVIEW = pending review, RESET = an HR override reversing a prior
// rejection.
export const DECISION_TYPE_BADGE_TONE = {
  SHORTLISTED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  SELECTED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-100",
  HOLD: "bg-amber-50 text-amber-700 border-amber-100",
  FRAUD_REVIEW: "bg-amber-50 text-amber-700 border-amber-100",
  RESET: "bg-blue-50 text-blue-700 border-blue-100",
};

// `decision_source` — which layer/person made the call.
export const DECISION_SOURCE_LABEL = {
  DETERMINISTIC: "Rule-based",
  SEMANTIC: "Semantic match",
  AI: "AI screening",
  RECRUITER: "Recruiter",
  HIRING_MANAGER: "Hiring Manager",
  HR_ADMIN: "HR Admin",
  SYSTEM: "System",
};

export const CANDIDATE_SORT_OPTIONS = [
  { label: "Overall score (high to low)", value: "composite:desc" },
  { label: "Overall score (low to high)", value: "composite:asc" },
  { label: "ATS score", value: "ats:desc" },
  { label: "Semantic score", value: "semantic:desc" },
  { label: "Experience", value: "experience:desc" },
  { label: "Risk (high to low)", value: "risk:desc" },
];

export const CANDIDATE_DETAIL_TABS = ["Summary", "Resume", "Evaluation", "Timeline", "Comments"];

export const CANDIDATE_PAGE_SIZE = 8;
