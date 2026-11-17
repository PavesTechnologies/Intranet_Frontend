import { INVOICE_STATUS, invoiceStatusLabel } from "../../constants/invoiceStatus";
import { formatMoney } from "./invoiceActivityEvents";

/**
 * Derives the five business stages of the invoice workflow from real data only:
 *  - invoice.status — the backend's status_code, mapped by invoiceMapper (authoritative)
 *  - the latest approval instance (GET /invoice/{id}/approval) — current level of N
 *  - the audit history — stage completion timestamps and the latest payment attempt outcome
 *
 * There is no backend "validation" status (field validation runs inside the upload job, before
 * the invoice exists). The Validation stage here is the pre-approval checkpoint: an invoice is
 * past it once it has been submitted for approval. Payment is only ever "complete" at PAID —
 * an approved, ready, scheduled or sent invoice is never shown as paid.
 */

export const STAGE_STATE = {
  COMPLETE: "complete",
  CURRENT: "current",
  PENDING: "pending",
  REJECTED: "rejected",
  FAILED: "failed",
  BLOCKED: "blocked",
  SKIPPED: "skipped",
};

export const WORKFLOW_STAGES = [
  { key: "upload", label: "Invoice Upload" },
  { key: "review", label: "Initial Review" },
  { key: "validation", label: "Validation" },
  { key: "approval", label: "Approval" },
  { key: "payment", label: "Payment" },
];

const STAGE_COMPLETION_EVENTS = {
  upload: ["INVOICE_CREATED"],
  review: ["INVOICE_OCR_REVIEWED", "INVOICE_RESUBMITTED"],
  validation: ["INVOICE_SENT_FOR_APPROVAL"],
  approval: ["INVOICE_APPROVED", "INVOICE_AUTO_APPROVED"],
  payment: ["INVOICE_PAYMENT_CLEARED", "INVOICE_PAYMENT_RECORDED", "INVOICE_SETTLED_BY_NOTE"],
};

const PAYMENT_ATTEMPT_EVENTS = [
  "INVOICE_READY_FOR_PAYMENT",
  "INVOICE_PAYMENT_SCHEDULED",
  "INVOICE_PAYMENT_SENT",
  "INVOICE_PAYMENT_CLEARED",
  "INVOICE_PAYMENT_RECORDED",
  "INVOICE_PAYMENT_FAILED",
];

function lastEvent(history, actions) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (actions.includes(history[i]?.action)) return history[i];
  }
  return null;
}

/**
 * How far along the happy path the status says the invoice is: index of the stage that is
 * currently active (stages before it are complete). 5 = everything complete.
 */
const STATUS_POSITION = {
  [INVOICE_STATUS.DRAFT]: 0,
  [INVOICE_STATUS.OCR_REVIEW_PENDING]: 1,
  [INVOICE_STATUS.OCR_FAILED]: 1,
  [INVOICE_STATUS.RETURNED_FOR_REVIEW]: 1,
  [INVOICE_STATUS.OCR_REVIEWED]: 2,
  [INVOICE_STATUS.PENDING_APPROVAL]: 3,
  [INVOICE_STATUS.REJECTED]: 3,
  [INVOICE_STATUS.APPROVED]: 4,
  [INVOICE_STATUS.READY_FOR_PAYMENT]: 4,
  [INVOICE_STATUS.PARTIALLY_PAID]: 4,
  [INVOICE_STATUS.PAID]: 5,
};

/**
 * @param {{
 *   status: string,
 *   history?: Array<{action: string, changed_at?: string, new_values?: object}>,
 *   approval?: {status?: string, steps?: Array<{level_number: number, status: string}>}|null,
 *   amountPaid?: number|null,
 *   netAmount?: number|null,
 * }} input
 * @returns {Array<{key, label, state, note: string|null, timestamp: string|null}>}
 */
export function deriveWorkflowStages({ status, history, approval = null, amountPaid = null, netAmount = null }) {
  const events = Array.isArray(history) ? history : [];
  const stages = WORKFLOW_STAGES.map((stage) => ({ ...stage, state: STAGE_STATE.PENDING, note: null, timestamp: null }));
  const byKey = Object.fromEntries(stages.map((stage) => [stage.key, stage]));

  const complete = (key, note = null) => {
    byKey[key].state = STAGE_STATE.COMPLETE;
    byKey[key].note = note;
    byKey[key].timestamp = lastEvent(events, STAGE_COMPLETION_EVENTS[key])?.changed_at || null;
  };
  const set = (key, state, note = null, timestamp = null) => Object.assign(byKey[key], { state, note, timestamp });

  // DISPUTED is a hold, not a position: place it from evidence in the trail.
  let position = STATUS_POSITION[status];
  if (status === INVOICE_STATUS.DISPUTED) {
    position = lastEvent(events, STAGE_COMPLETION_EVENTS.approval) ? 4 : lastEvent(events, STAGE_COMPLETION_EVENTS.validation) ? 3 : 1;
  }

  if (position === undefined) {
    // Unrecognised status: the invoice record exists, nothing else can be claimed.
    complete("upload");
    set("review", STAGE_STATE.BLOCKED, status ? `Status: ${invoiceStatusLabel(status)}` : "Status unavailable");
    return stages;
  }

  WORKFLOW_STAGES.slice(0, Math.min(position, WORKFLOW_STAGES.length)).forEach(({ key }) => complete(key));

  if (status === INVOICE_STATUS.DISPUTED) {
    const heldStage = WORKFLOW_STAGES[position]?.key;
    if (heldStage) set(heldStage, STAGE_STATE.BLOCKED, "On hold — invoice disputed");
    return stages;
  }

  const autoApproved = lastEvent(events, STAGE_COMPLETION_EVENTS.approval)?.action === "INVOICE_AUTO_APPROVED";
  if (position > 3) byKey.approval.note = autoApproved ? "Auto-approved" : null;

  switch (status) {
    case INVOICE_STATUS.DRAFT:
      set("upload", STAGE_STATE.CURRENT, "Upload in progress");
      break;

    case INVOICE_STATUS.OCR_REVIEW_PENDING:
      set("review", STAGE_STATE.CURRENT, "Awaiting review of extracted details");
      break;

    case INVOICE_STATUS.OCR_FAILED:
      set("review", STAGE_STATE.FAILED, "Document could not be read — manual entry needed");
      break;

    case INVOICE_STATUS.RETURNED_FOR_REVIEW: {
      const sentBack = lastEvent(events, ["INVOICE_SENT_BACK"]);
      set("review", STAGE_STATE.CURRENT, "Returned for correction");
      set("approval", STAGE_STATE.BLOCKED, "Sent back — resubmission required", sentBack?.changed_at || null);
      break;
    }

    case INVOICE_STATUS.OCR_REVIEWED:
      set("validation", STAGE_STATE.CURRENT, "Reviewed — awaiting submission for approval");
      break;

    case INVOICE_STATUS.PENDING_APPROVAL: {
      const steps = Array.isArray(approval?.steps) ? approval.steps : [];
      const activeStep = steps.find((step) => step.status === "PENDING");
      const resubmitted = Boolean(lastEvent(events, ["INVOICE_SENT_BACK"]));
      const levelNote = activeStep && steps.length ? `Level ${activeStep.level_number} of ${steps.length}` : "Awaiting approver decision";
      set("approval", STAGE_STATE.CURRENT, resubmitted ? `${levelNote} · resubmitted` : levelNote);
      break;
    }

    case INVOICE_STATUS.REJECTED: {
      const rejection = lastEvent(events, ["INVOICE_REJECTED"]);
      const level = rejection?.new_values?.level_number;
      set("approval", STAGE_STATE.REJECTED, level != null ? `Rejected at level ${level}` : "Rejected", rejection?.changed_at || null);
      set("payment", STAGE_STATE.SKIPPED, "Not applicable");
      break;
    }

    case INVOICE_STATUS.APPROVED:
      set("payment", STAGE_STATE.CURRENT, "Awaiting release for payment by Finance");
      break;

    case INVOICE_STATUS.READY_FOR_PAYMENT:
    case INVOICE_STATUS.PARTIALLY_PAID: {
      const latest = lastEvent(events, PAYMENT_ATTEMPT_EVENTS);
      const partial =
        status === INVOICE_STATUS.PARTIALLY_PAID
          ? Number.isFinite(Number(amountPaid)) && Number.isFinite(Number(netAmount)) && amountPaid != null && netAmount != null
            ? `Partially paid — ${formatMoney(amountPaid)} of ${formatMoney(netAmount)}`
            : "Partially paid"
          : null;
      if (latest?.action === "INVOICE_PAYMENT_FAILED") {
        set("payment", STAGE_STATE.FAILED, partial ? `${partial} · last attempt failed` : "Last payment attempt failed", latest.changed_at || null);
      } else if (latest?.action === "INVOICE_PAYMENT_SENT") {
        set("payment", STAGE_STATE.CURRENT, partial || "Sent to bank — awaiting confirmation");
      } else if (latest?.action === "INVOICE_PAYMENT_SCHEDULED") {
        set("payment", STAGE_STATE.CURRENT, partial || "Payment scheduled");
      } else {
        set("payment", STAGE_STATE.CURRENT, partial || "Ready for payment");
      }
      break;
    }

    case INVOICE_STATUS.PAID:
      byKey.payment.note = "Paid in full";
      break;

    default:
      break;
  }

  return stages;
}
