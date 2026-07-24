export const PARSE_STAGE_ORDER = [
  "TEXT_EXTRACTION",
  "TEXT_CLEANING",
  "AI_EXTRACTION",
  "JSON_VALIDATION",
  "SKILL_NORMALIZATION",
  "EMBEDDING_GENERATION",
  "PERSISTENCE",
];

export const STAGE_LABELS = {
  TEXT_EXTRACTION: "Extracting text",
  TEXT_CLEANING: "Cleaning text",
  AI_EXTRACTION: "AI extraction",
  JSON_VALIDATION: "Validating structure",
  SKILL_NORMALIZATION: "Normalizing skills",
  EMBEDDING_GENERATION: "Generating embeddings",
  PERSISTENCE: "Saving record",
};

// Plain-language explanations shown to HR users when a stage fails, so they
// aren't left staring at a raw exception string.
export const STAGE_FAILURE_COPY = {
  TEXT_EXTRACTION: "We couldn't read any text out of this file. It may be corrupted, password-protected, or an empty document.",
  TEXT_CLEANING: "The extracted text couldn't be normalized for processing. This can happen with unusual character encodings.",
  AI_EXTRACTION:
    "The AI couldn't reliably pull structured fields out of this document. This is common with scanned or image-based PDFs, heavily templated resumes, or files with very little text.",
  JSON_VALIDATION: "The AI's extraction didn't match the expected data structure. The resume may have an unusual or non-standard layout.",
  SKILL_NORMALIZATION: "We extracted the resume but couldn't map its skills against our skill library. Scoring may be incomplete for this candidate.",
  EMBEDDING_GENERATION: "We couldn't generate the search embedding for this resume. It won't be searchable by similarity until this is retried.",
  PERSISTENCE: "The parsed data couldn't be saved. This is usually transient — retrying the upload will typically resolve it.",
};

export const PARSE_STATUS_BADGE_TONE = {
  PENDING: "bg-slate-100 text-slate-600 border-slate-200",
  PARSING: "bg-amber-50 text-amber-700 border-amber-200",
  PARSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
};

export const PARSE_STATUS_LABEL = {
  PENDING: "Pending",
  PARSING: "Parsing",
  PARSED: "Parsed",
  FAILED: "Failed",
};

export const STAGE_STATUS_STYLE = {
  PENDING: { dot: "bg-slate-300", text: "text-slate-400", line: "bg-slate-200" },
  RUNNING: { dot: "bg-blue-600", text: "text-blue-700", line: "bg-slate-200" },
  SUCCESS: { dot: "bg-emerald-600", text: "text-emerald-700", line: "bg-emerald-500" },
  FAILED: { dot: "bg-rose-600", text: "text-rose-700", line: "bg-slate-200" },
};

// Confidence-tier thresholds shared by the header badge and any other place
// parse_confidence_score needs a color/label treatment.
export function getConfidenceTier(score) {
  if (score === null || score === undefined) return { key: "unknown", label: "Not available", tone: "bg-slate-100 text-slate-500 border-slate-200" };
  const pct = Math.round(score * 100);
  if (pct >= 80) return { key: "high", label: "High confidence", tone: "bg-emerald-50 text-emerald-700 border-emerald-200", pct };
  if (pct >= 50) return { key: "moderate", label: "Moderate confidence", tone: "bg-amber-50 text-amber-700 border-amber-200", pct };
  return { key: "low", label: "Manual review recommended", tone: "bg-rose-50 text-rose-700 border-rose-200", pct };
}

export const MATCH_TIER_STYLE = {
  alias: { label: "Alias match", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  case_insensitive: { label: "Exact match", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  fuzzy: { label: "Fuzzy match", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  vector: { label: "Semantic match", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  unknown: { label: "Unmatched", tone: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const SKILL_STATUS_STYLE = {
  AUTO_VERIFIED: { label: "Verified", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING_REVIEW: { label: "Needs review", tone: "bg-amber-50 text-amber-700 border-amber-200" },
};

export const ACCEPTED_FILE_TYPES = [".pdf", ".docx"];
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

// How the mock polling loop advances through stages, purely for the demo —
// a real integration replaces this with a setInterval hitting the status endpoint.
export const MOCK_POLL_INTERVAL_MS = 900;
