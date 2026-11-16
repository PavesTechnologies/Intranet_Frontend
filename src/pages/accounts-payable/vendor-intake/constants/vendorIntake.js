// src/pages/accounts-payable/vendor-intake/constants/vendorIntake.js

/**
 * Values the Vendor Intake / Pre-Screen backend returns, mirrored here so the UI can look a
 * check up and pick a label/tone for it. Nothing in this file decides an outcome — every
 * result rendered by the Pre-Screen UI comes from the API response itself
 * (see Backend/Business_Layer/services/vendor_intake_service.py).
 */

/** engagement.pre_screen_status, PreScreenResultResponse.result and PreScreenCheckResult.status */
export const PRE_SCREEN_RESULT = {
  PENDING: "PENDING",
  PASS: "PASS",
  NEED_INFORMATION: "NEED_INFORMATION",
  FAIL: "FAIL",
};

export const PRE_SCREEN_RESULT_LABEL = {
  [PRE_SCREEN_RESULT.PENDING]: "Pre-Screen Pending",
  [PRE_SCREEN_RESULT.PASS]: "PASS",
  [PRE_SCREEN_RESULT.NEED_INFORMATION]: "NEED INFORMATION",
  [PRE_SCREEN_RESULT.FAIL]: "FAIL",
};

export const PRE_SCREEN_RESULT_TONE = {
  [PRE_SCREEN_RESULT.PENDING]: "neutral",
  [PRE_SCREEN_RESULT.PASS]: "success",
  [PRE_SCREEN_RESULT.NEED_INFORMATION]: "warning",
  [PRE_SCREEN_RESULT.FAIL]: "danger",
};

/** NDA document status, derived and returned by the backend — never computed here. */
export const NDA_DOCUMENT_STATUS = {
  PENDING: "PENDING",
  NOT_REQUIRED: "NOT_REQUIRED",
};

/** Exact `name` values on PreScreenCheckResult — used to match a check, never to re-derive it. */
export const PRE_SCREEN_CHECK = {
  DUPLICATE: "Duplicate/Existing Engagement Check",
  ELIGIBILITY: "Basic Eligibility Check",
  BUSINESS_RULE: "Category/Business Rule Check",
};

/** Titles shown on the numbered cards (the backend names, spelled out for the UI). */
export const PRE_SCREEN_CHECK_TITLE = {
  [PRE_SCREEN_CHECK.DUPLICATE]: "Duplicate / Existing Engagement Check",
  [PRE_SCREEN_CHECK.ELIGIBILITY]: "Basic Eligibility Check",
  [PRE_SCREEN_CHECK.BUSINESS_RULE]: "Category / Business Rule Check",
};

/** @param {{name:string}[]} checks @returns {{name:string, passed:boolean, status:string, reason?:string}|null} */
export const findCheck = (checks, name) =>
  (checks || []).find((check) => check.name === name) || null;

/**
 * Badge tone for one check, from the per-check `status` the backend sends
 * (PASS / NEED_INFORMATION / FAIL). Falls back to `passed` only if a response ever
 * arrives without a status.
 */
export const checkTone = (check) => {
  if (!check) return "neutral";
  return PRE_SCREEN_RESULT_TONE[check.status] ?? (check.passed ? "success" : "danger");
};

/** Badge label for one check — the backend's own status wording. */
export const checkStatusLabel = (check) => {
  if (!check) return "Not run";
  return PRE_SCREEN_RESULT_LABEL[check.status] || check.status || (check.passed ? "PASS" : "FAIL");
};

/**
 * The eligibility check reports two facts (vendor not blocked, intake data complete) through
 * one status. The backend distinguishes them itself — FAIL is the blocked-vendor branch,
 * NEED_INFORMATION is the missing-data branch — so this reads that status rather than
 * re-testing anything. An unknown status leaves both rows unknown instead of asserting.
 * @returns {{vendorBlocked: boolean|null, intakeDataComplete: boolean|null}}
 */
export const readEligibilityFacts = (check) => {
  if (!check) return { vendorBlocked: null, intakeDataComplete: null };

  switch (check.status) {
    case PRE_SCREEN_RESULT.PASS:
      return { vendorBlocked: false, intakeDataComplete: true };
    case PRE_SCREEN_RESULT.FAIL:
      return { vendorBlocked: true, intakeDataComplete: null };
    case PRE_SCREEN_RESULT.NEED_INFORMATION:
      return { vendorBlocked: false, intakeDataComplete: false };
    default:
      return { vendorBlocked: null, intakeDataComplete: null };
  }
};

/**
 * True when a failed intake save was rejected because this vendor is already engaged for the
 * selected department + category. The backend reports it two ways: a 409 from the unique
 * constraint, or a 422 from the service's own pre-check.
 */
export const isDuplicateEngagementError = (error) => {
  if (error?.response?.status === 409) return true;

  const detail = error?.response?.data?.detail;
  return (
    error?.response?.status === 422 &&
    typeof detail === "string" &&
    detail.toLowerCase().includes("engagement already exists")
  );
};

export const DUPLICATE_ENGAGEMENT_MESSAGE =
  "This vendor is already engaged for the selected department and purchase category. " +
  "The same vendor can be onboarded again under a different department or category.";
