// Central config for the Skill Ontology module — options, tones, and shared
// enums that mirror the backend contract described in the user stories.

// Categories are no longer hardcoded — both the list filter and the Add/Edit
// form fetch them live via getCategories() (see useSkillOntologyList.js and
// components/SkillForm.jsx).

// "confidence" is the skill's verification status, not a numeric score.
// Values are lowercase to match the backend's query-param/storage convention
// exactly (?confidence=verified / ?confidence=unverified).
export const SKILL_CONFIDENCE = {
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
};

export const CONFIDENCE_FILTER_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Verified", value: SKILL_CONFIDENCE.VERIFIED },
  { label: "Unverified", value: SKILL_CONFIDENCE.UNVERIFIED },
];

export const CONFIDENCE_FORM_OPTIONS = [
  { label: "Verified", value: SKILL_CONFIDENCE.VERIFIED },
  { label: "Unverified", value: SKILL_CONFIDENCE.UNVERIFIED },
];

// Raw backend values, kept as-is; SKILL_SOURCE_LABELS maps them to display text.
export const SKILL_SOURCES = ["seed", "admin", "auto_extracted"];

export const SKILL_SOURCE_LABELS = {
  seed: "Seed Import",
  admin: "Manual Entry",
  auto_extracted: "Auto Extracted",
};

export const SKILL_SOURCE_FILTER_OPTIONS = [
  { label: "All Sources", value: "All" },
  ...SKILL_SOURCES.map((s) => ({ label: SKILL_SOURCE_LABELS[s], value: s })),
];

export const SKILL_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

export const STATUS_FORM_OPTIONS = [
  { label: "Active", value: SKILL_STATUS.ACTIVE },
  { label: "Inactive", value: SKILL_STATUS.INACTIVE },
];

// List filter — three-way, because "Active only", "Inactive only" and "both"
// are three distinct backend states (is_active=true / false / omitted) that a
// two-state toggle cannot express.
export const STATUS_FILTER_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Active", value: SKILL_STATUS.ACTIVE },
  { label: "Inactive", value: SKILL_STATUS.INACTIVE },
];

export const EMBEDDING_STATUS = {
  GENERATED: "GENERATED",
  PENDING: "PENDING",
  OUTDATED: "OUTDATED",
};

export const EMBEDDING_STATUS_LABEL = {
  GENERATED: "Generated",
  PENDING: "Pending",
  OUTDATED: "Outdated",
};

export const SKILL_ONTOLOGY_PAGE_SIZE = 10;

export const BULK_IMPORT_ACCEPTED_TYPES = [".xlsx"];

// Blank/default shape for the Add/Edit Skill form.
export const EMPTY_SKILL_FORM = {
  canonicalName: "",
  category: "",
  aliases: [],
  parentSkillId: "",
  confidence: SKILL_CONFIDENCE.UNVERIFIED,
  status: SKILL_STATUS.ACTIVE,
};
