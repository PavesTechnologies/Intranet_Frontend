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

export const CANDIDATE_SORT_OPTIONS = [
  { label: "Composite (high to low)", value: "composite:desc" },
  { label: "Composite (low to high)", value: "composite:asc" },
  { label: "ATS score", value: "ats:desc" },
  { label: "Semantic score", value: "semantic:desc" },
  { label: "Experience", value: "experience:desc" },
  { label: "Risk (high to low)", value: "risk:desc" },
];

export const CANDIDATE_DETAIL_TABS = ["Summary", "Resume", "Evaluation", "Timeline", "Comments"];

export const CANDIDATE_PAGE_SIZE = 8;
