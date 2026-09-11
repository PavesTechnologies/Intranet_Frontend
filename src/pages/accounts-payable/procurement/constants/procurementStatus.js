/**
 * Mirrors PR_TRANSITIONS in Backend/Business_Layer/services/procurement_service.py exactly —
 * used only to decide which actions to show/enable in the UI. The backend re-validates every
 * transition server-side regardless; this is not a second source of truth.
 */
export const PR_TRANSITIONS = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "RETURNED", "CANCELLED"],
  RETURNED: ["PENDING_APPROVAL"],
  APPROVED: ["VENDOR_SELECTION", "CANCELLED"],
  VENDOR_SELECTION: ["PO_GENERATED", "CANCELLED"],
  PO_GENERATED: [],
  REJECTED: [],
  CANCELLED: [],
};

/**
 * Mirrors RFQ_TRANSITIONS in Backend/Business_Layer/services/rfq_service.py exactly — used
 * only to decide which actions to show/enable in the UI. The backend re-validates every
 * transition server-side regardless; this is not a second source of truth.
 */
export const RFQ_TRANSITIONS = {
  DRAFT: ["SENT"],
  SENT: ["RESPONSE_RECEIVED", "CLOSED"],
  RESPONSE_RECEIVED: ["CLOSED"],
  CLOSED: [],
};

/** Matches VALID_PRIORITIES in procurement_service.py. */
export const PR_PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

/** A quotation can only be created while the PR is in one of these statuses. */
export const QUOTATION_ELIGIBLE_PR_STATUSES = ["APPROVED", "VENDOR_SELECTION"];

/** A vendor can only be selected while the PR is in this status. */
export const VENDOR_SELECTION_ELIGIBLE_PR_STATUS = "VENDOR_SELECTION";

/** A PO can only be generated while the PR is in this status and already has a selection. */
export const PO_GENERATION_ELIGIBLE_PR_STATUS = "VENDOR_SELECTION";

/**
 * Display labels for PR workflow timeline events (GET /purchase-requisitions/{pr_id}/timeline).
 * Mirrors Backend/Business_Layer/utils/pr_workflow_events.py exactly — that file is the single
 * source of truth for the event string values themselves.
 */
export const PR_TIMELINE_EVENT_LABELS = {
  PR_REQUEST_RAISED: "PR Request Raised",
  SUBMITTED_FOR_APPROVAL: "Submitted for Approval",
  PR_UPDATED: "PR Updated",
  PR_APPROVED: "PR Approved",
  PR_REJECTED: "PR Rejected",
  PR_SENT_BACK_FOR_CLARIFICATION: "Sent Back for Clarification",
  PR_RESUBMITTED: "PR Resubmitted",
  VENDOR_INVITED: "Vendor Invited",
  RFQ_SENT: "RFQ Sent",
  QUOTATION_RECEIVED: "Quotation Received",
  VENDOR_SELECTED: "Vendor Selected",
};
