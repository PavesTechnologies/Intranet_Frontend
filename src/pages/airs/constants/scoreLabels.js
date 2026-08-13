/**
 * Display names for the four scoring layers.
 *
 * AIRS is used by HR and recruiters, not engineers, so the pipeline's internal
 * vocabulary (deterministic / semantic / composite) is not what the UI shows.
 * These are display strings ONLY — every API field, DB column and enum value
 * keeps its original name, so nothing here changes what is sent or stored.
 *
 * Import from here rather than hardcoding a label, so the next rename is one
 * edit instead of fifty.
 */
export const SCORE_LABELS = {
  deterministic: "Requirements Score",
  semantic: "Relevance Score",
  ai: "AI Review Score",
  composite: "Overall Score",
};

/** Short forms, for table column headers where space is tight. */
export const SCORE_LABELS_SHORT = {
  deterministic: "Requirements",
  semantic: "Relevance",
  ai: "AI Review",
  composite: "Overall",
};

/** One-line explanations — pair each label with its tooltip. */
export const SCORE_HINTS = {
  deterministic:
    "Checks the must-have skills, experience and education listed in the job description.",
  semantic:
    "Compares the whole résumé against the whole job description by meaning, so a good match worded differently still counts.",
  ai: "An AI reviewer's assessment of the candidate, with its reasoning.",
  composite:
    "The single ranking number, combining the three checks using the weights set for this campaign.",
};

/**
 * Rejection layers as stored in decision_source. Keys are the backend enum
 * values and must not change; only the labels are for humans.
 */
export const REJECTION_LAYER_LABELS = {
  DETERMINISTIC: "Requirements",
  SEMANTIC: "Relevance",
  AI: "AI Review",
  MANUAL: "Manual",
  FRAUD: "Fraud check",
};
