import { PARSE_STATUS_LABEL, PARSE_STATUS_BADGE_TONE } from "../intake/constants/intakeConstants";

export { PARSE_STATUS_LABEL, PARSE_STATUS_BADGE_TONE };

// Mirrors the backend's `ParseStatus` enum, used as the `parse_status` query param.
export const PARSE_STATUS_FILTER_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: PARSE_STATUS_LABEL.PENDING, value: "PENDING" },
  { label: PARSE_STATUS_LABEL.PARSING, value: "PARSING" },
  { label: PARSE_STATUS_LABEL.PARSED, value: "PARSED" },
  { label: PARSE_STATUS_LABEL.FAILED, value: "FAILED" },
];

// Mirrors the backend's `source` query param: Literal["individual", "bulk"].
export const SOURCE_FILTER_OPTIONS = [
  { label: "All Sources", value: "" },
  { label: "Individual", value: "individual" },
  { label: "Bulk", value: "bulk" },
];

export const SOURCE_LABEL = {
  individual: "Individual",
  bulk: "Bulk",
};

// Combines the backend's `sort_by` + `sort_dir` query params into one dropdown value ("field:dir").
export const RESUME_SORT_OPTIONS = [
  { label: "Newest first", value: "created_at:desc" },
  { label: "Oldest first", value: "created_at:asc" },
  { label: "Status (A-Z)", value: "parse_status:asc" },
  { label: "Status (Z-A)", value: "parse_status:desc" },
];

export const RESUME_LIST_PAGE_SIZE = 10;

// Mirrors the backend's `campaign_candidate.pipeline_stage` enum, returned
// by GET /resumes/pipeline-status.
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
  SCREENING: "bg-blue-50 text-blue-700 border-blue-200",
  SHORTLISTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  HM_REVIEW: "bg-indigo-50 text-indigo-700 border-indigo-200",
  INTERVIEW: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SELECTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  FRAUD_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  HOLD: "bg-amber-50 text-amber-700 border-amber-200",
};

// `decision_source` values: the 3 automated screening layers, or a manual
// decision made by a person/system.
export const DECISION_SOURCE_LABEL = {
  DETERMINISTIC: "Rule-based",
  SEMANTIC: "Semantic match",
  AI: "AI screening",
  RECRUITER: "Recruiter",
  HIRING_MANAGER: "Hiring Manager",
  HR_ADMIN: "HR Admin",
  SYSTEM: "System",
};

export const ACCEPTED_BULK_FILE_TYPES = [".zip"];
export const MAX_BULK_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB
