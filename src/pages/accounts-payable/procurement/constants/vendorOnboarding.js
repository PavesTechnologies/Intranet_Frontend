/**
 * Vendor Onboarding / NDA / RFQ-eligibility vocabularies, mirrored from the backend so the UI
 * can label and colour a state. Nothing here decides an outcome — availability, onboarding
 * status, NDA requirement and RFQ eligibility all come from the API responses themselves
 * (Backend/Business_Layer/services/vendor_onboarding_service.py, nda_service.py,
 * rfq_eligibility_service.py).
 */

/** vendor_onboarding_request.status.status_code (module_name "VENDOR_ONBOARDING"). */
export const ONBOARDING_STATUS = {
  CREATED: "CREATED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  PRE_SCREEN_PENDING: "PRE_SCREEN_PENDING",
  NEED_INFORMATION: "NEED_INFORMATION",
  PASSED: "PASSED",
  FAILED: "FAILED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const ONBOARDING_STATUS_LABEL = {
  [ONBOARDING_STATUS.CREATED]: "Created",
  [ONBOARDING_STATUS.ASSIGNED]: "Assigned",
  [ONBOARDING_STATUS.IN_PROGRESS]: "Onboarding In Progress",
  [ONBOARDING_STATUS.PRE_SCREEN_PENDING]: "Pre-Screen Pending",
  [ONBOARDING_STATUS.NEED_INFORMATION]: "Need Information",
  [ONBOARDING_STATUS.PASSED]: "Pre-Screen Passed",
  [ONBOARDING_STATUS.FAILED]: "Failed",
  [ONBOARDING_STATUS.COMPLETED]: "Onboarding Completed",
  [ONBOARDING_STATUS.CANCELLED]: "Cancelled",
};

export const ONBOARDING_STATUS_TONE = {
  [ONBOARDING_STATUS.CREATED]: "neutral",
  [ONBOARDING_STATUS.ASSIGNED]: "info",
  [ONBOARDING_STATUS.IN_PROGRESS]: "info",
  [ONBOARDING_STATUS.PRE_SCREEN_PENDING]: "warning",
  [ONBOARDING_STATUS.NEED_INFORMATION]: "warning",
  [ONBOARDING_STATUS.PASSED]: "success",
  [ONBOARDING_STATUS.FAILED]: "danger",
  [ONBOARDING_STATUS.COMPLETED]: "success",
  [ONBOARDING_STATUS.CANCELLED]: "neutral",
};

/**
 * Reaching one of these closes the request — it is what frees the PR+department+category
 * slot server-side (TERMINAL_STATUS_CODES in vendor_onboarding_service.py).
 */
export const ONBOARDING_TERMINAL_STATUSES = [
  ONBOARDING_STATUS.COMPLETED,
  ONBOARDING_STATUS.FAILED,
  ONBOARDING_STATUS.CANCELLED,
];

export const isOnboardingOpen = (statusCode) =>
  Boolean(statusCode) && !ONBOARDING_TERMINAL_STATUSES.includes(statusCode);

/** ap.vendor_nda status codes (module_name "NDA"). */
export const NDA_STATUS = {
  NOT_REQUIRED: "NOT_REQUIRED",
  PENDING: "PENDING",
  SENT: "SENT",
  SIGNED: "SIGNED",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
};

export const NDA_STATUS_LABEL = {
  [NDA_STATUS.NOT_REQUIRED]: "Not Required",
  [NDA_STATUS.PENDING]: "Pending",
  [NDA_STATUS.SENT]: "Sent",
  [NDA_STATUS.SIGNED]: "Signed",
  [NDA_STATUS.COMPLETED]: "Completed",
  [NDA_STATUS.REJECTED]: "Rejected",
  [NDA_STATUS.EXPIRED]: "Expired",
};

export const NDA_STATUS_TONE = {
  [NDA_STATUS.NOT_REQUIRED]: "success",
  [NDA_STATUS.PENDING]: "warning",
  [NDA_STATUS.SENT]: "info",
  [NDA_STATUS.SIGNED]: "info",
  [NDA_STATUS.COMPLETED]: "success",
  [NDA_STATUS.REJECTED]: "danger",
  [NDA_STATUS.EXPIRED]: "danger",
};

/**
 * Statuses a user may move an NDA to by hand. Mirrors NDA_TRANSITIONS in nda_service.py purely
 * to decide which buttons to show — the backend re-validates every transition, so this is not
 * a second source of truth.
 *
 * Two deliberate narrowings of what the backend would accept:
 *  - SENT does not offer "Mark Signed". Reaching SIGNED is the job of the signed-document
 *    upload, so offering a manual jump would let an NDA claim to be signed with no document.
 *  - REJECTED offers nothing: it means "requires correction", and the only way forward is a
 *    corrected upload (the backend's REJECTED -> SIGNED edge).
 */
export const NDA_MANUAL_TRANSITIONS = {
  [NDA_STATUS.NOT_REQUIRED]: [],
  [NDA_STATUS.PENDING]: [NDA_STATUS.REJECTED, NDA_STATUS.EXPIRED],
  [NDA_STATUS.SENT]: [NDA_STATUS.COMPLETED, NDA_STATUS.REJECTED, NDA_STATUS.EXPIRED],
  [NDA_STATUS.SIGNED]: [NDA_STATUS.COMPLETED, NDA_STATUS.REJECTED, NDA_STATUS.EXPIRED],
  [NDA_STATUS.COMPLETED]: [NDA_STATUS.EXPIRED],
  [NDA_STATUS.REJECTED]: [],
  [NDA_STATUS.EXPIRED]: [],
};

/** Action wording for a manual transition, so SIGNED reads as an internal review decision. */
export const NDA_TRANSITION_ACTION_LABEL = {
  [NDA_STATUS.COMPLETED]: "Accept & Complete",
  [NDA_STATUS.REJECTED]: "Reject",
  [NDA_STATUS.EXPIRED]: "Mark Expired",
};

/**
 * Statuses a signed document may be uploaded against — mirrors SIGNED_UPLOAD_ALLOWED_FROM in
 * nda_service.py. SIGNED is included so a wrong file can be replaced before review, and
 * REJECTED so a correction can be resubmitted. The backend rejects anything else with its own
 * message, which is what the UI shows.
 */
export const NDA_SIGNED_UPLOAD_ALLOWED_FROM = [
  NDA_STATUS.SENT,
  NDA_STATUS.SIGNED,
  NDA_STATUS.REJECTED,
];

export const canUploadSignedNdaFor = (statusCode) =>
  NDA_SIGNED_UPLOAD_ALLOWED_FROM.includes(statusCode);

/**
 * Only a COMPLETED NDA clears the RFQ gate when one is required — SIGNED still means
 * "pending internal review". This is for labelling the UI; RFQ eligibility itself always
 * comes from the backend's own check (rfq_eligibility_service.py).
 */
export const NDA_CLEARS_RFQ = [NDA_STATUS.NOT_REQUIRED, NDA_STATUS.COMPLETED];

// Signed NDA uploads are PDF-only and share the app-wide 25 MB cap
// (MAX_UPLOAD_SIZE_BYTES in Backend/API_Layer/utils/file_validation.py). Checked here only to
// fail fast with a clear message; the backend validates the same rules regardless.
export const SIGNED_NDA_ACCEPT = ".pdf,application/pdf";
export const MAX_SIGNED_NDA_SIZE_BYTES = 25 * 1024 * 1024;

/** @returns {string} empty when valid, otherwise a user-facing message. */
export function validateSignedNdaFile(file) {
  if (!file) return "Select the signed NDA PDF to upload.";

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "The signed NDA must be a PDF document.";

  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_SIGNED_NDA_SIZE_BYTES) return "File is too large. Maximum size is 25MB.";

  return "";
}

/**
 * Row-level wording for a vendor's NDA state in the Invite Vendors list, where the label has
 * to say what the NDA *is* rather than just its status word ("Sent" alone reads ambiguously
 * next to a vendor name).
 *
 * The status itself always comes from the backend — the NDA gate of the RFQ eligibility
 * verdict (rfq_eligibility_service.py) — and an unrecognised code falls back to the plain
 * status label rather than being guessed at.
 */
export const NDA_ROW_LABEL = {
  // The requirement stands but no NDA record exists yet — see NDA_NOT_GENERATED_STATUS below.
  NOT_FOUND: "NDA Required",
  [NDA_STATUS.NOT_REQUIRED]: "NDA Not Required",
  [NDA_STATUS.PENDING]: "NDA Generated",
  [NDA_STATUS.SENT]: "NDA Sent",
  [NDA_STATUS.SIGNED]: "Signed — Pending Review",
  [NDA_STATUS.COMPLETED]: "NDA Completed",
  [NDA_STATUS.REJECTED]: "NDA Rejected",
  [NDA_STATUS.EXPIRED]: "NDA Expired",
};

/**
 * The next NDA action for a vendor row. Each opens the NDA workspace, where the action is
 * actually carried out (and confirmed) — the label only says what is waiting to be done.
 *
 * `null` means no NDA action is offered: COMPLETED and NOT_REQUIRED need none, and an
 * unrecognised state must not offer Generate, because only the backend knows whether an NDA
 * is required at all.
 */
export const NDA_ROW_ACTION_LABEL = {
  [NDA_STATUS.PENDING]: "Send NDA",
  [NDA_STATUS.SENT]: "Upload Signed NDA",
  [NDA_STATUS.SIGNED]: "Review Signed NDA",
  [NDA_STATUS.REJECTED]: "Upload Signed NDA",
  [NDA_STATUS.EXPIRED]: "Generate New NDA",
};

/**
 * The NDA gate reports NOT_FOUND when the requirement stands but no NDA record exists yet —
 * that, and only that, is when the row offers to generate one.
 */
export const NDA_NOT_GENERATED_STATUS = "NOT_FOUND";

/**
 * Badge tone for a row's NDA state. NOT_FOUND is not an NDA status — it is the gate saying no
 * NDA exists yet — so it has no entry in NDA_STATUS_TONE and is coloured as outstanding work.
 */
export const NDA_ROW_TONE = {
  ...NDA_STATUS_TONE,
  [NDA_NOT_GENERATED_STATUS]: "warning",
};

/**
 * Whether an NDA already on file may be reused for another engagement.
 *
 * Only a COMPLETED agreement that has not run out counts. SIGNED is deliberately excluded —
 * it means "received, pending internal review", so treating it as reusable would let an
 * unreviewed document clear the RFQ gate. PENDING and SENT have not been agreed at all, and
 * REJECTED/EXPIRED are spent.
 *
 * This decides what the UI offers; the backend still re-checks reuse when the NDA is
 * requested (nda_service.py), so it is not a second source of truth.
 *
 * @param {{status_code?:string, valid_until?:string|null}|null} nda
 * @param {Date} [now]
 */
export const isReusableNda = (nda, now = new Date()) => {
  if (!nda || nda.status_code !== NDA_STATUS.COMPLETED) return false;

  if (!nda.valid_until) return true;

  const validUntil = new Date(nda.valid_until);
  if (Number.isNaN(validUntil.getTime())) return false;

  return validUntil >= now;
};

/** ExistingNdaResponse.outcome (LOOKUP_* in nda_service.py). */
export const NDA_LOOKUP_OUTCOME = {
  VALID: "VALID",
  NOT_FOUND: "NOT_FOUND",
  INVALID: "INVALID",
  EXPIRED: "EXPIRED",
};

/** EligibilityCheckDTO.check — the five gates RFQ eligibility reports on. */
export const ELIGIBILITY_CHECK_LABEL = {
  PR: "Purchase Requisition",
  VENDOR: "Vendor",
  ONBOARDING: "Vendor Onboarding",
  PRE_SCREEN: "Pre-Screen",
  NDA: "NDA",
};

/**
 * `status` on an eligibility check is a free-form backend code (PASS, NOT_REQUIRED, NOT_FOUND,
 * a vendor status, a pre-screen status, an NDA status...). It is displayed verbatim; only the
 * colour is derived, and only from the boolean the backend already set.
 */
export const eligibilityTone = (check) => (check?.passed ? "success" : "danger");

/** Turns a status code into readable text without inventing one for an unknown code. */
export const humanizeCode = (code) =>
  typeof code === "string" && code
    ? code
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";

/**
 * Ids arrive as route params (strings), from JSON responses (numbers) and from form state
 * (strings). Normalizing every id through this before it reaches a query key keeps
 * string-vs-number variants from producing two different cache entries for one record.
 */
export const asId = (value) =>
  value === null || value === undefined || value === "" ? null : String(value);
