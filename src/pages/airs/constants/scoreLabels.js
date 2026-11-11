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
/** One-line explanations — pair each label with its tooltip. */
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
