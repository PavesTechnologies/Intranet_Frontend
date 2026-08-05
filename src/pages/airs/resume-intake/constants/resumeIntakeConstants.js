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

export const ACCEPTED_BULK_FILE_TYPES = [".zip"];
export const MAX_BULK_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB
