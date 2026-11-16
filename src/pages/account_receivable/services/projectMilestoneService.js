import api from "../../../api/axiosInstance";
import { asArray, unwrapData } from "./billingConfigurationService";

const BASE_URL = window.__APP_CONFIG__.AR_BASE_URL;

// Read-only API over the PMS milestones synchronised into AR (backend
// ProjectMilestoneController). The path variable is the PMS project id — the
// number PMS itself uses. In AR the project master key is that same PMS id (ProjectMasterReference.pmsProjectId), so the
// explicit pmsProjectId field is read rather than any other project field.
const PROJECT_MILESTONES_URL = `${BASE_URL}/api/projects`;

// PMS ids are positive integers. Anything else (blank, "", a UUID, 0, 1.5) is
// not a PMS project id and must never reach the endpoint.
export const toPmsProjectId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

// Date-only strings ("2026-12-15") are kept as-is; a datetime is cut to its
// date part so it can feed <input type="date"> and the billingDate field.
const toDateOnly = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

// ---------------------------------------------------------------------------------------------------------------
// Frozen state of a SAVED milestone payment entry.
//
// The backend decides it, per entry (BillingPaymentEntryResponseDto.frozen: true once the occurrence on the entry's
// billing date is invoiced or in TAX_PENDING / TAX_CALCULATED / INVOICED) - the same rule its update and delete enforce.
// Nothing is inferred here: not from the milestone-level billingState (an aggregate over every plan that holds the
// milestone, so it says nothing about THIS plan's entry), not from occurrenceStatus / invoiced (diagnostics only), and
// never from the PMS milestone being absent from the list.
//   frozen === true   -> FROZEN   : locked, cannot be edited or removed
//   frozen === false  -> UNFROZEN : the backend explicitly said the entry can change
//   no frozen, no paymentEntryId -> UNSAVED : a row the user just added, nothing exists on the server yet
//   no frozen, saved  -> UNKNOWN  : the backend did not say (older server, or a create response). Treated as locked in
//                                   the UI without claiming it is frozen; the server stays authoritative on save.
// There is deliberately no legacy fallback: the old entry.isFrozen flag and billingState rules are gone.
// ---------------------------------------------------------------------------------------------------------------
export const MILESTONE_ENTRY_STATE = Object.freeze({
  FROZEN: "FROZEN",
  UNFROZEN: "UNFROZEN",
  UNSAVED: "UNSAVED",
  UNKNOWN: "UNKNOWN",
});

export const getMilestoneEntryFrozenState = (entry) => {
  if (!entry) return MILESTONE_ENTRY_STATE.UNSAVED;
  if (entry.frozen === true) return MILESTONE_ENTRY_STATE.FROZEN;
  if (entry.frozen === false) return MILESTONE_ENTRY_STATE.UNFROZEN;
  const saved = entry.paymentEntryId !== null && entry.paymentEntryId !== undefined && entry.paymentEntryId !== "";
  return saved ? MILESTONE_ENTRY_STATE.UNKNOWN : MILESTONE_ENTRY_STATE.UNSAVED;
};

/** The backend confirmed the entry is frozen. */
export const isMilestoneEntryFrozen = (entry) => getMilestoneEntryFrozenState(entry) === MILESTONE_ENTRY_STATE.FROZEN;

/** The UI must not let the user edit or remove the entry: confirmed frozen, or a saved entry whose state is unknown. */
export const isMilestoneEntryLocked = (entry) => {
  const state = getMilestoneEntryFrozenState(entry);
  return state === MILESTONE_ENTRY_STATE.FROZEN || state === MILESTONE_ENTRY_STATE.UNKNOWN;
};

export const getMilestoneIneligibilityReason = (milestone = {}) => {
  // Authoritative backend eligibility signal
  if (milestone.eligibleForBilling === true) {
    return null;
  }
  // Authoritative backend ineligibility reason
  if (milestone.ineligibilityReason) {
    return milestone.ineligibilityReason;
  }

  // Clear fallbacks only when backend reason is absent
  const state = milestone.billingState ? String(milestone.billingState).toUpperCase() : "";
  if (state === "INVOICED" || state === "BILLED" || milestone.alreadyBilled || milestone.billed || milestone.isBilled) {
    return "Milestone has already been invoiced.";
  }
  if (state === "IN_BILLING") {
    return "Milestone is currently in billing.";
  }
  if (state === "RESERVED" || milestone.reserved || milestone.reservedBy) {
    return milestone.billingConfigurationId || milestone.reservedBy
      ? `Reserved by billing plan ${milestone.billingConfigurationId || milestone.reservedBy}`
      : "Reserved by another billing plan";
  }
  if (milestone.billable === false) {
    return "Not billable in PMS";
  }
  if (milestone.billingReadiness && milestone.billingReadiness !== "READY_FOR_BILLING") {
    if (milestone.billingReadiness === "NOT_READY") {
      return "Not ready for billing in PMS";
    }
    return `Not ready for billing in PMS (${milestone.billingReadiness})`;
  }
  if (milestone.eligibleForBilling === false) {
    return "Not eligible for billing.";
  }
  return null;
};

// ProjectMilestoneResponseDto -> the milestone view model used by the billing
// wizard. Every field is mapped explicitly; nothing the API does not provide
// (sequence, deliverables, stage, approval status, invoice number) is invented.
// `pmsMilestoneId` is the only identifier (always a number); `id` is just an
// alias of it for React keys.
export const mapProjectMilestone = (dto = {}) => {
  const pmsMilestoneId = toNumberOrNull(dto.pmsMilestoneId);
  const milestone = {
    id: pmsMilestoneId,
    pmsMilestoneId,
    pmsProjectId: toNumberOrNull(dto.pmsProjectId),
    code: dto.milestoneCode || "",
    name: dto.milestoneName || "",
    description: dto.description || "",
    plannedStartDate: toDateOnly(dto.plannedStartDate),
    // The UI's planned-date field.
    plannedCompletionDate: toDateOnly(dto.plannedDueDate),
    actualCompletionDate: toDateOnly(dto.actualCompletionDate),
    executionStatus: dto.executionStatus || "",
    billable: dto.billable === null || dto.billable === undefined ? null : Boolean(dto.billable),
    // PMS's own proposed share of the contract. Reference only: it is NOT the
    // AR billing percentage, which the user enters per selected milestone.
    pmsAllocationPercentage: toNumberOrNull(dto.allocationPercentage),
    billingReadiness: dto.billingReadiness || "",
    sourceVersion: toNumberOrNull(dto.sourceVersion),
    lastSyncedAt: dto.lastSyncedAt || null,
  };

  // Authoritative backend contract fields
  if (dto.billingState || dto.billingStatus) {
    milestone.billingState = String(dto.billingState || dto.billingStatus).toUpperCase();
  }
  if (dto.billingConfigurationId) {
    milestone.billingConfigurationId = String(dto.billingConfigurationId);
  }
  if (dto.eligibleForBilling !== undefined && dto.eligibleForBilling !== null) {
    milestone.eligibleForBilling = Boolean(dto.eligibleForBilling);
  }
  if (dto.ineligibilityReason !== undefined && dto.ineligibilityReason !== null) {
    milestone.ineligibilityReason = String(dto.ineligibilityReason);
  }

  // Backward compatibility fallbacks for legacy test mocks
  if (dto.alreadyBilled !== undefined || dto.billed !== undefined || dto.isBilled !== undefined) {
    milestone.alreadyBilled = Boolean(dto.alreadyBilled || dto.billed || dto.isBilled);
  }
  if (dto.reserved !== undefined || dto.isReserved !== undefined) {
    milestone.reserved = Boolean(dto.reserved || dto.isReserved);
  }
  if (dto.reservedBy || dto.conflictingPlan) {
    milestone.reservedBy = String(dto.reservedBy || dto.conflictingPlan);
  }

  return milestone;
};

// GET /api/projects/{pmsProjectId}/milestones. Rejects (never falls back to
// stored/sample data) when the id is not a valid PMS project id or the call
// fails. `signal` lets the caller cancel a request that is no longer wanted.
export const getProjectMilestones = async (pmsProjectId, { signal } = {}) => {
  const id = toPmsProjectId(pmsProjectId);
  if (id === null) {
    throw new Error("This project is not linked to a PMS project, so its milestones cannot be loaded.");
  }
  const response = await api.get(`${PROJECT_MILESTONES_URL}/${id}/milestones`, signal ? { signal } : undefined);
  return asArray(unwrapData(response))
    .map(mapProjectMilestone)
    .filter((milestone) => milestone.pmsMilestoneId !== null);
};
