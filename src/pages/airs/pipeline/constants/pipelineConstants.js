// Pipeline funnel stages span the full sourcing lifecycle (upload → hire decision),
// a superset of the post-screening CANDIDATE_STAGES used by the Candidates & Ranking module.
export const PIPELINE_STAGES = ["Uploaded", "Parsing", "Screening", "Shortlisted", "Interview", "Selected", "Rejected", "Hold"];

export const PIPELINE_STAGE_COLOR = {
  Uploaded: "#98A1AF",
  Parsing: "#7C3AED",
  Screening: "#D97706",
  Shortlisted: "#2563EB",
  Interview: "#0EA5E9",
  Selected: "#16A34A",
  Rejected: "#DC2626",
  Hold: "#9333EA",
};

export const PIPELINE_BOARD_SIZE = 40;
