// The 7 real pipeline_stage values GET /campaign-candidates/campaign/{id}/board
// groups candidates into, in the board's own column order. HM_REVIEW/
// FRAUD_REVIEW candidates are excluded from these columns by the backend
// itself (rolled into the response's own other_count) — not a client-side
// filter.
export const PIPELINE_STAGES = ["UPLOADED", "SCREENING", "SHORTLISTED", "HOLD", "INTERVIEW", "SELECTED", "REJECTED"];

export const PIPELINE_STAGE_LABEL = {
  UPLOADED: "Uploaded",
  SCREENING: "Screening",
  SHORTLISTED: "Shortlisted",
  HOLD: "Hold",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  REJECTED: "Rejected",
};

export const PIPELINE_STAGE_COLOR = {
  UPLOADED: "#98A1AF",
  SCREENING: "#D97706",
  SHORTLISTED: "#2563EB",
  HOLD: "#9333EA",
  INTERVIEW: "#0EA5E9",
  SELECTED: "#16A34A",
  REJECTED: "#DC2626",
};
