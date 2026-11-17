import { invoiceStatusLabel } from "../../constants/invoiceStatus";
import { PAYMENT_TERM_STATUS_META, REFERENCE_SOURCE_LABELS } from "../../constants/paymentTerms";
import { formatDate, parseBackendDateTime } from "../../utils/formatters";

/**
 * Business-friendly reading of the invoice audit trail (GET /invoice-details/invoice/{id}/history
 * -> InvoiceHistoryEventDTO[] {action, changed_by, changed_at, old_values, new_values}, oldest
 * first, from ap.audit_log where table_name='invoice').
 *
 * EVENT_CATALOG covers every action the backend actually writes against an invoice record:
 *   invoice_process_service / invoice_extraction_service  INVOICE_CREATED, INVOICE_OCR_REVIEWED, INVOICE_RESUBMITTED
 *   work_assignment_service                               INVOICE_ASSIGNED
 *   ap_automation_service                                 AP_AUTOMATION_RESULT
 *   invoice_po_link_service                               INVOICE_PO_LINKED
 *   payment_term_compliance_service                       INVOICE_PAYMENT_TERMS_CHECKED / _VERIFIED
 *   recurring_service                                     RECURRING_INVOICE_MATCHED
 *   tds_determination_service / tds_tracking_service      INVOICE_TDS_*
 *   gst_itc_service                                       GST_ITC_*, GST_IRN_RECORDED
 *   invoice_approval_service                              INVOICE_SENT_FOR_APPROVAL, INVOICE_APPROVAL_STEP_DECISION,
 *                                                         INVOICE_APPROVED, INVOICE_AUTO_APPROVED, INVOICE_REJECTED, INVOICE_SENT_BACK
 *   payment_service / payment_tracking_service            INVOICE_READY_FOR_PAYMENT, INVOICE_PAYMENT_*
 *   vendor_note_service                                   CREDIT_NOTE_RECEIVED, DEBIT_NOTE_RAISED, *_NOTE_APPLIED,
 *                                                         INVOICE_TDS_ADJUSTED, INVOICE_SETTLED_BY_NOTE
 * Anything else still renders, under a readable label derived from its code — a new backend
 * event never disappears silently. The original code is always kept on the item (eventType).
 */

export const ACTIVITY_CATEGORY = {
  PROCESSING: "processing",
  VALIDATION: "validation",
  TAX: "tax",
  APPROVAL: "approval",
  PAYMENT: "payment",
  OTHER: "other",
};

export const ACTIVITY_CATEGORY_LABEL = {
  [ACTIVITY_CATEGORY.PROCESSING]: "Processing",
  [ACTIVITY_CATEGORY.VALIDATION]: "Validation",
  [ACTIVITY_CATEGORY.TAX]: "Tax and Compliance",
  [ACTIVITY_CATEGORY.APPROVAL]: "Approval",
  [ACTIVITY_CATEGORY.PAYMENT]: "Payment",
  [ACTIVITY_CATEGORY.OTHER]: "Other",
};

export const ACTIVITY_FILTERS = [
  { key: "all", label: "All Activities" },
  { key: ACTIVITY_CATEGORY.PROCESSING, label: ACTIVITY_CATEGORY_LABEL.processing },
  { key: ACTIVITY_CATEGORY.VALIDATION, label: ACTIVITY_CATEGORY_LABEL.validation },
  { key: ACTIVITY_CATEGORY.TAX, label: ACTIVITY_CATEGORY_LABEL.tax },
  { key: ACTIVITY_CATEGORY.APPROVAL, label: ACTIVITY_CATEGORY_LABEL.approval },
  { key: ACTIVITY_CATEGORY.PAYMENT, label: ACTIVITY_CATEGORY_LABEL.payment },
];

/** success = completed (green), info = informational (blue), warning = needs attention (amber),
 * danger = rejected / failed (red), neutral = unknown event. */
export const ACTIVITY_TONE = {
  SUCCESS: "success",
  INFO: "info",
  WARNING: "warning",
  DANGER: "danger",
  NEUTRAL: "neutral",
};

const DEFAULT_STATUS_LABEL = {
  success: "Completed",
  info: "Recorded",
  warning: "Needs attention",
  danger: "Failed",
  neutral: "Recorded",
};

// Non-human actors the backend writes as changed_by (each service's ACTOR constant).
const SYSTEM_ACTOR_LABELS = {
  AP_AUTOMATION: "AP automation",
  RECURRING_SCHEDULE: "Recurring schedule",
  EMAIL_INTAKE: "Email intake",
  SHAREPOINT_IMPORT: "SharePoint import",
  SYSTEM: "System",
};

const AUTOMATION_OUTCOME = {
  AUTO_APPROVED: { title: "Automated checks passed — auto-approved", tone: ACTIVITY_TONE.SUCCESS },
  AUTO_SENT: { title: "Automated checks passed — sent for approval", tone: ACTIVITY_TONE.SUCCESS },
  REVIEWED_NOT_SENT: { title: "Automated checks passed", tone: ACTIVITY_TONE.SUCCESS },
  EXCEPTION: { title: "Automated checks raised exceptions", tone: ACTIVITY_TONE.WARNING, status: "Exception" },
};

const TERM_TONE = {
  COMPLIANT: ACTIVITY_TONE.SUCCESS,
  VERIFIED_OVERRIDE: ACTIVITY_TONE.SUCCESS,
  MISMATCH: ACTIVITY_TONE.WARNING,
  REVIEW_REQUIRED: ACTIVITY_TONE.WARNING,
};

/** "SOME_FUTURE_ACTION" -> "Some future action". */
export function humanizeCode(code) {
  if (code == null) return "";
  const text = String(code).replace(/[_-]+/g, " ").trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

export function formatMoney(value) {
  const amount = Number(value);
  if (value == null || value === "" || !Number.isFinite(amount)) return value == null ? "" : String(value);
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const joinParts = (...parts) => parts.filter(Boolean).join(" · ") || null;
const quoted = (text) => (text ? `"${text}"` : null);
const paymentRef = (v) => (v.payment_id != null ? `Payment #${v.payment_id}` : null);
const amountOf = (value) => (value != null && value !== "" ? formatMoney(value) : null);

/**
 * action -> { title, category, tone, status?, describe?(newValues, oldValues, ctx) }
 * title/tone/status may be functions of newValues where the meaning depends on the payload.
 */
export const EVENT_CATALOG = {
  // ── Processing ────────────────────────────────────────────────────────
  INVOICE_CREATED: {
    title: "Invoice uploaded",
    category: ACTIVITY_CATEGORY.PROCESSING,
    tone: ACTIVITY_TONE.SUCCESS,
    describe: (v) =>
      v.invoice_number
        ? `Invoice ${v.invoice_number} was uploaded to Accounts Payable.`
        : "Invoice was uploaded to Accounts Payable.",
  },
  INVOICE_OCR_REVIEWED: {
    title: "Initial review completed",
    category: ACTIVITY_CATEGORY.PROCESSING,
    tone: ACTIVITY_TONE.SUCCESS,
    describe: () => "Extracted invoice details were reviewed and saved.",
  },
  INVOICE_RESUBMITTED: {
    title: "Corrected and resubmitted",
    category: ACTIVITY_CATEGORY.PROCESSING,
    tone: ACTIVITY_TONE.INFO,
    status: "Resubmitted",
    describe: () => "Invoice details were corrected after being sent back, and saved again.",
  },
  INVOICE_ASSIGNED: {
    title: "Invoice assigned",
    category: ACTIVITY_CATEGORY.PROCESSING,
    tone: ACTIVITY_TONE.INFO,
    describe: (v, _old, ctx) =>
      v.assignee ? `Assigned to ${ctx.resolveName(String(v.assignee))}${v.source ? ` (${humanizeCode(v.source).toLowerCase()})` : ""}.` : null,
  },

  // ── Validation ────────────────────────────────────────────────────────
  AP_AUTOMATION_RESULT: {
    title: (v) => AUTOMATION_OUTCOME[v.outcome]?.title || "Automated invoice check",
    category: ACTIVITY_CATEGORY.VALIDATION,
    tone: (v) => AUTOMATION_OUTCOME[v.outcome]?.tone || ACTIVITY_TONE.INFO,
    status: (v) => AUTOMATION_OUTCOME[v.outcome]?.status,
    describe: (v) => {
      const reasons = Array.isArray(v.reasons) ? v.reasons : [];
      if (reasons.length === 0) return "PO, goods receipt and amount checks were run automatically.";
      if (reasons.length === 1) return reasons[0];
      return `${reasons[0]} (+${reasons.length - 1} more)`;
    },
  },
  INVOICE_PO_LINKED: {
    title: "Purchase order linked",
    category: ACTIVITY_CATEGORY.VALIDATION,
    tone: ACTIVITY_TONE.INFO,
    describe: (v) => (v.po_number ? `Invoice associated with purchase order ${v.po_number}.` : "Invoice associated with its purchase order."),
  },
  INVOICE_PAYMENT_TERMS_CHECKED: {
    title: "Payment terms checked",
    category: ACTIVITY_CATEGORY.VALIDATION,
    tone: (v) => TERM_TONE[v.validation_status] || ACTIVITY_TONE.INFO,
    status: (v) => PAYMENT_TERM_STATUS_META[v.validation_status]?.label,
    describe: (v) =>
      joinParts(
        v.validation_status ? `Result: ${PAYMENT_TERM_STATUS_META[v.validation_status]?.label || humanizeCode(v.validation_status)}` : null,
        v.reference_source ? `Checked against ${(REFERENCE_SOURCE_LABELS[v.reference_source] || humanizeCode(v.reference_source)).toLowerCase()}` : null,
        v.effective_due_date ? `Due ${formatDate(v.effective_due_date)}` : null,
      ) || "Vendor payment terms were checked.",
  },
  INVOICE_PAYMENT_TERMS_VERIFIED: {
    title: "Payment terms verified",
    category: ACTIVITY_CATEGORY.VALIDATION,
    tone: ACTIVITY_TONE.SUCCESS,
    status: "Verified",
    describe: (v) =>
      joinParts(v.effective_due_date ? `Due date confirmed as ${formatDate(v.effective_due_date)}` : "Payment terms confirmed by Finance", quoted(v.remarks)),
  },
  RECURRING_INVOICE_MATCHED: {
    title: "Matched to recurring schedule",
    category: ACTIVITY_CATEGORY.VALIDATION,
    tone: ACTIVITY_TONE.INFO,
    describe: (v) =>
      joinParts(v.schedule ? `Schedule: ${v.schedule}` : null, v.period ? `Period from ${formatDate(v.period)}` : null),
  },

  // ── Tax and compliance ────────────────────────────────────────────────
  INVOICE_TDS_DETERMINED: {
    title: "TDS determination completed",
    category: ACTIVITY_CATEGORY.TAX,
    tone: ACTIVITY_TONE.INFO,
    describe: (v) => {
      if (v.tds_applicable === false) return "TDS is not applicable to this invoice.";
      if (v.tds_amount != null) {
        const rate = v.tds_rate != null ? `${v.tds_rate}% · ` : "";
        const nature = v.payment_nature_code ? ` (${humanizeCode(v.payment_nature_code)})` : "";
        return `${rate}${formatMoney(v.tds_amount)}${nature}`;
      }
      return v.determination_reason || "Applicable TDS details were evaluated.";
    },
  },
  INVOICE_TDS_VERIFIED: {
    title: "TDS verified",
    category: ACTIVITY_CATEGORY.TAX,
    tone: ACTIVITY_TONE.SUCCESS,
    status: "Verified",
    describe: (v) => {
      if (v.tds_applicable === false) return "No TDS to verify.";
      return joinParts(v.tds_amount != null ? `${formatMoney(v.tds_amount)} verified` : "TDS details verified", quoted(v.remarks));
    },
  },
  INVOICE_TDS_ADJUSTED: {
    title: "TDS adjusted",
    category: ACTIVITY_CATEGORY.TAX,
    tone: ACTIVITY_TONE.INFO,
    describe: (v, old) =>
      joinParts(
        old?.tds_amount != null && v.tds_amount != null ? `TDS ${formatMoney(old.tds_amount)} → ${formatMoney(v.tds_amount)}` : null,
        v.note_number ? `via note ${v.note_number}` : null,
      ),
  },
  INVOICE_TDS_DEDUCTION_RECORDED: {
    title: "TDS deduction recorded",
    category: ACTIVITY_CATEGORY.TAX,
    tone: ACTIVITY_TONE.SUCCESS,
    describe: (v) => quoted(v.remarks),
  },
  INVOICE_TDS_DEPOSIT_RECORDED: {
    title: "TDS deposit recorded",
    category: ACTIVITY_CATEGORY.TAX,
    tone: ACTIVITY_TONE.SUCCESS,
    describe: (v) => quoted(v.remarks),
  },
  INVOICE_TDS_FILING_RECORDED: {
    title: "TDS return filing recorded",
    category: ACTIVITY_CATEGORY.TAX,
    tone: ACTIVITY_TONE.SUCCESS,
    describe: (v) => quoted(v.remarks),
  },
  INVOICE_TDS_DOCUMENT_UPLOADED: {
    title: "TDS document uploaded",
    category: ACTIVITY_CATEGORY.TAX,
    tone: ACTIVITY_TONE.INFO,
    describe: (v) => joinParts(v.document_type ? humanizeCode(v.document_type) : null, v.file_name),
  },
  GST_ITC_ELIGIBILITY_SET: {
    title: "GST input credit eligibility set",
    category: ACTIVITY_CATEGORY.TAX,
    tone: (v) => (v.itc_eligibility === "BLOCKED" ? ACTIVITY_TONE.WARNING : ACTIVITY_TONE.INFO),
    describe: (v) => joinParts(v.itc_eligibility ? humanizeCode(v.itc_eligibility) : null, quoted(v.reason)),
  },
  GST_IRN_RECORDED: {
    title: "e-Invoice IRN recorded",
    category: ACTIVITY_CATEGORY.TAX,
    tone: ACTIVITY_TONE.INFO,
    describe: () => "Invoice Reference Number recorded for GST compliance.",
  },
  GST_ITC_CLAIMED: {
    title: "GST input credit claimed",
    category: ACTIVITY_CATEGORY.TAX,
    tone: ACTIVITY_TONE.SUCCESS,
    describe: (v) => (v.period ? `Claimed for the period from ${formatDate(v.period)}.` : null),
  },
  GST_ITC_REVERSED: {
    title: "GST input credit reversed",
    category: ACTIVITY_CATEGORY.TAX,
    tone: ACTIVITY_TONE.WARNING,
    status: "Reversed",
    describe: (v) => joinParts(v.period ? `Period from ${formatDate(v.period)}` : null, quoted(v.reason)),
  },
  GST_ITC_RECLAIMED: {
    title: "GST input credit reclaimed",
    category: ACTIVITY_CATEGORY.TAX,
    tone: ACTIVITY_TONE.SUCCESS,
    describe: (v) => (v.period ? `Reclaimed for the period from ${formatDate(v.period)}.` : null),
  },

  // ── Approval ──────────────────────────────────────────────────────────
  INVOICE_SENT_FOR_APPROVAL: {
    title: "Submitted for approval",
    category: ACTIVITY_CATEGORY.APPROVAL,
    tone: ACTIVITY_TONE.INFO,
    status: "Submitted",
    describe: () => "Invoice was forwarded to the assigned approver.",
  },
  INVOICE_APPROVAL_STEP_DECISION: {
    title: (v) => {
      const level = v.level_number != null ? `Level ${v.level_number}` : "Approval level";
      if (v.decision === "APPROVED") return `${level} approved`;
      if (v.decision === "REJECTED") return `${level} rejected`;
      return `${level} decision recorded`;
    },
    category: ACTIVITY_CATEGORY.APPROVAL,
    tone: (v) => (v.decision === "REJECTED" ? ACTIVITY_TONE.DANGER : v.decision === "APPROVED" ? ACTIVITY_TONE.SUCCESS : ACTIVITY_TONE.INFO),
    status: (v) => (v.decision ? humanizeCode(v.decision) : undefined),
    describe: (v) => (v.comments ? `Comment: "${v.comments}"` : "Approver recorded a decision on this level."),
  },
  INVOICE_APPROVED: {
    title: "Invoice approved",
    category: ACTIVITY_CATEGORY.APPROVAL,
    tone: ACTIVITY_TONE.SUCCESS,
    status: "Approved",
    describe: () => "All required approval levels are complete.",
  },
  INVOICE_AUTO_APPROVED: {
    title: "Invoice auto-approved",
    category: ACTIVITY_CATEGORY.APPROVAL,
    tone: ACTIVITY_TONE.SUCCESS,
    status: "Approved",
    describe: (v) => v.reason || "Approved automatically under the configured automation rules.",
  },
  INVOICE_REJECTED: {
    title: "Invoice rejected",
    category: ACTIVITY_CATEGORY.APPROVAL,
    tone: ACTIVITY_TONE.DANGER,
    status: "Rejected",
    describe: (v) =>
      joinParts(v.level_number != null ? `Rejected at level ${v.level_number}` : "Rejected by the approver", v.comments ? `Reason: "${v.comments}"` : null),
  },
  INVOICE_SENT_BACK: {
    title: "Sent back for correction",
    category: ACTIVITY_CATEGORY.APPROVAL,
    tone: ACTIVITY_TONE.WARNING,
    status: "Returned",
    describe: (v) =>
      joinParts(v.level_number != null ? `Returned at level ${v.level_number}` : "Returned to the AP team", v.comments ? `Reason: "${v.comments}"` : null),
  },

  // ── Payment ───────────────────────────────────────────────────────────
  INVOICE_READY_FOR_PAYMENT: {
    title: "Marked ready for payment",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.INFO,
    status: "Released",
    describe: () => "Finance released the invoice for payment.",
  },
  INVOICE_PAYMENT_SCHEDULED: {
    title: "Payment scheduled",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.INFO,
    status: "Scheduled",
    describe: (v) => joinParts(amountOf(v.allocated_amount), paymentRef(v)),
  },
  INVOICE_PAYMENT_SENT: {
    title: "Payment sent to bank",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.INFO,
    status: "Sent",
    describe: (v) => joinParts(amountOf(v.allocated_amount), paymentRef(v)),
  },
  INVOICE_PAYMENT_CLEARED: {
    title: "Payment cleared",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.SUCCESS,
    status: "Cleared",
    describe: (v) => joinParts(amountOf(v.allocated_amount), paymentRef(v)),
  },
  INVOICE_PAYMENT_RECORDED: {
    title: "Payment recorded",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.SUCCESS,
    status: "Recorded",
    describe: (v) => joinParts(amountOf(v.allocated_amount), paymentRef(v)),
  },
  INVOICE_PAYMENT_FAILED: {
    title: "Payment attempt failed",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.DANGER,
    status: "Failed",
    describe: (v) => joinParts(amountOf(v.allocated_amount), paymentRef(v)),
  },
  INVOICE_PAYMENT_DOCUMENT_UPLOADED: {
    title: "Payment document uploaded",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.INFO,
    describe: (v) => joinParts(v.document_type ? humanizeCode(v.document_type) : null, v.file_name, paymentRef(v)),
  },
  CREDIT_NOTE_RECEIVED: {
    title: "Credit note received",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.INFO,
    describe: (v) => joinParts(v.note_number, amountOf(v.total_amount)),
  },
  DEBIT_NOTE_RAISED: {
    title: "Debit note raised",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.INFO,
    describe: (v) => joinParts(v.note_number, amountOf(v.total_amount)),
  },
  CREDIT_NOTE_APPLIED: {
    title: "Credit note applied",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.SUCCESS,
    describe: (v) => joinParts(v.note_number, amountOf(v.amount), v.outstanding_after != null ? `Outstanding after: ${formatMoney(v.outstanding_after)}` : null),
  },
  DEBIT_NOTE_APPLIED: {
    title: "Debit note applied",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.SUCCESS,
    describe: (v) => joinParts(v.note_number, amountOf(v.amount), v.outstanding_after != null ? `Outstanding after: ${formatMoney(v.outstanding_after)}` : null),
  },
  INVOICE_SETTLED_BY_NOTE: {
    title: "Invoice settled by note",
    category: ACTIVITY_CATEGORY.PAYMENT,
    tone: ACTIVITY_TONE.SUCCESS,
    status: "Settled",
    describe: (v) => (v.note_number ? `Outstanding balance settled by note ${v.note_number}.` : "Outstanding balance settled by a vendor note."),
  },
};

const resolve = (valueOrFn, values) => (typeof valueOrFn === "function" ? valueOrFn(values) : valueOrFn);

/**
 * changed_by -> { name, isSystem }. Humans are numeric employee ids (str(user_id)) resolved via
 * the employee directory; service actors are UPPER_SNAKE constants; null means the system.
 */
export function resolveActor(changedBy, resolveName = (id) => id) {
  if (changedBy == null || String(changedBy).trim() === "") return { name: "System", isSystem: true };
  const raw = String(changedBy).trim();
  if (SYSTEM_ACTOR_LABELS[raw]) return { name: SYSTEM_ACTOR_LABELS[raw], isSystem: true };
  if (/^[A-Z][A-Z0-9_]*$/.test(raw)) return { name: humanizeCode(raw), isSystem: true };
  return { name: resolveName(raw) || raw, isSystem: false };
}

// ── Detail fields ────────────────────────────────────────────────────────

// Free-text remarks are already part of the item's description where relevant, so the details
// panel doesn't repeat them as their own rows.
const REMARK_KEYS = ["comments", "remarks", "reason", "note"];
const REFERENCE_KEYS = {
  invoice_number: "Invoice number",
  payment_id: "Payment reference",
  po_number: "Purchase order",
  note_number: "Note number",
  file_name: "Document",
  irn: "IRN",
  ack_no: "Acknowledgement no.",
};
const AMOUNT_KEYS = new Set([
  "allocated_amount",
  "amount_paid",
  "tds_amount",
  "total_amount",
  "amount",
  "taxable_base",
  "expected_amount",
  "received_amount",
  "outstanding_after",
  "tds_adjusted",
]);
const DATE_KEYS = new Set(["effective_due_date", "period"]);
const PERCENT_KEYS = new Set(["tds_rate", "variance_pct"]);
const FIELD_LABELS = {
  status_code: "Invoice status",
  validation_status: "Payment terms result",
  reference_source: "Reference source",
  effective_due_date: "Effective due date",
  applied_term_days: "Applied term (days)",
  due_basis: "Due date basis",
  allocated_amount: "Amount",
  amount_paid: "Total paid to date",
  tds_applicable: "TDS applicable",
  tds_rate: "TDS rate",
  tds_amount: "TDS amount",
  tds_rule_code: "TDS rule",
  payment_nature_code: "Nature of payment",
  gstin_status: "GSTIN status",
  determination_reason: "Determination basis",
  level_number: "Approval level",
  decision: "Decision",
  outcome: "Outcome",
  reasons: "Findings",
  assignee: "Assigned to",
  source: "Source",
  itc_eligibility: "ITC eligibility",
  tracking_status: "TDS tracking status",
  correction: "Correction of earlier entry",
  document_type: "Document type",
  schedule: "Recurring schedule",
  period: "Period start",
  variance_pct: "Variance",
  variance_status: "Variance status",
  prefilled: "Coding pre-filled",
  manual: "Matched manually",
  taxable_base: "Taxable base",
  outstanding_after: "Outstanding after",
  tds_adjusted: "TDS adjusted by",
  total_amount: "Total amount",
};

/** Internal surrogate keys (rule ids, vendor ids, …) — not shown in the business details. */
function isInternalKey(key) {
  return /_id$/.test(key) && !REFERENCE_KEYS[key];
}

export function fieldLabel(key) {
  return FIELD_LABELS[key] || REFERENCE_KEYS[key] || humanizeCode(key);
}

/** One raw audit value -> display string (or string[] for lists). Empty -> null. */
export function formatFieldValue(key, value, ctx = {}) {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) return value.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item)));
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  if (AMOUNT_KEYS.has(key)) return formatMoney(value);
  if (DATE_KEYS.has(key)) return formatDate(String(value));
  if (PERCENT_KEYS.has(key)) return `${value}%`;
  if (key === "status_code") return invoiceStatusLabel(value);
  if (key === "validation_status") return PAYMENT_TERM_STATUS_META[value]?.label || humanizeCode(value);
  if (key === "reference_source") return REFERENCE_SOURCE_LABELS[value] || humanizeCode(value);
  if (key === "assignee" && ctx.resolveName) return ctx.resolveName(String(value));
  if (key === "payment_id") return `#${value}`;
  if (typeof value === "string" && /^[A-Z][A-Z0-9_]+$/.test(value)) return humanizeCode(value);
  return String(value);
}

/**
 * Splits an event's payload into the sections the expandable panel shows. Only fields the API
 * actually returned are included; internal surrogate ids stay in the technical view.
 */
export function buildEventDetails(event, ctx = {}) {
  const newValues = isPlainObject(event?.new_values) ? event.new_values : {};
  const oldValues = isPlainObject(event?.old_values) ? event.old_values : {};

  const references = Object.keys(REFERENCE_KEYS)
    .filter((key) => newValues[key] != null && newValues[key] !== "")
    .map((key) => ({ key, label: REFERENCE_KEYS[key], value: formatFieldValue(key, newValues[key], ctx) }));

  const changes = Object.keys(oldValues)
    .filter((key) => !isInternalKey(key) || key === "po_id")
    .map((key) => ({
      key,
      label: key === "po_id" ? "Purchase order (internal id)" : fieldLabel(key),
      before: formatFieldValue(key, oldValues[key], ctx),
      after: key === "po_id" ? formatFieldValue(key, newValues.po_id, ctx) : formatFieldValue(key, newValues[key], ctx),
    }))
    .filter((change) => change.before != null || change.after != null);
  const changedKeys = new Set(changes.map((change) => change.key));

  const metadata = Object.keys(newValues)
    .filter((key) => !REMARK_KEYS.includes(key) && !REFERENCE_KEYS[key] && !changedKeys.has(key) && !isInternalKey(key))
    .map((key) => ({ key, label: fieldLabel(key), value: formatFieldValue(key, newValues[key], ctx) }))
    .filter((field) => field.value != null && !(Array.isArray(field.value) && field.value.length === 0));

  return { references, changes, metadata };
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

// ── Timeline items ──────────────────────────────────────────────────────

/**
 * One raw audit row -> a timeline item. The raw row is kept on `raw` (never mutated) so the
 * details panel can show exactly what the backend returned.
 * @param {object} event InvoiceHistoryEventDTO
 * @param {{resolveName?: (id: string) => string}} ctx
 */
export function mapActivityEvent(event, ctx = {}) {
  const context = { resolveName: ctx.resolveName || ((id) => id) };
  const action = event?.action ? String(event.action) : "UNKNOWN_EVENT";
  const newValues = isPlainObject(event?.new_values) ? event.new_values : {};
  const oldValues = isPlainObject(event?.old_values) ? event.old_values : null;
  const entry = EVENT_CATALOG[action];

  let description = null;
  if (entry?.describe) {
    try {
      description = entry.describe(newValues, oldValues, context) || null;
    } catch {
      description = null; // malformed payload — the title still renders, details show the raw values
    }
  }

  const tone = (entry && resolve(entry.tone, newValues)) || ACTIVITY_TONE.NEUTRAL;
  return {
    eventType: action,
    known: Boolean(entry),
    title: (entry && resolve(entry.title, newValues)) || humanizeCode(action) || "Activity recorded",
    description,
    category: entry?.category || ACTIVITY_CATEGORY.OTHER,
    tone,
    statusLabel: (entry && resolve(entry.status, newValues)) || DEFAULT_STATUS_LABEL[tone],
    actor: resolveActor(event?.changed_by, context.resolveName),
    timestamp: event?.changed_at || null,
    details: buildEventDetails(event, context),
    raw: event,
  };
}

function sameRecord(a, b) {
  return (
    a.action === b.action &&
    (a.changed_by ?? null) === (b.changed_by ?? null) &&
    JSON.stringify(a.new_values ?? null) === JSON.stringify(b.new_values ?? null) &&
    JSON.stringify(a.old_values ?? null) === JSON.stringify(b.old_values ?? null)
  );
}

/**
 * Chronological business timeline. Back-to-back records that are identical in every field but
 * time (same action, actor and values — e.g. a re-run check that reached the same result) are
 * shown once with every timestamp kept in `occurrences`; nothing else is merged or dropped.
 * Input order (the API's oldest-first order) is preserved.
 */
export function buildActivityItems(history, ctx = {}) {
  if (!Array.isArray(history)) return [];
  const items = [];
  history.forEach((event, index) => {
    const previous = items[items.length - 1];
    if (previous && sameRecord(previous.raw, event)) {
      previous.occurrences.push(event.changed_at || null);
      previous.rawRecords.push(event);
      return;
    }
    items.push({
      id: `activity-${index}`,
      ...mapActivityEvent(event, ctx),
      occurrences: [event?.changed_at || null],
      rawRecords: [event],
    });
  });
  return items;
}

/** Category -> item count, plus `all`. */
export function countByCategory(items) {
  const counts = { all: items.length };
  items.forEach((item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
  });
  return counts;
}

function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Groups consecutive items by local calendar day (consecutive, so the original order is never
 * re-sorted). `now` is injectable for tests.
 */
export function groupItemsByDate(items, now = new Date()) {
  const todayKey = localDayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = localDayKey(yesterday);

  const groups = [];
  items.forEach((item) => {
    const date = item.timestamp ? parseBackendDateTime(String(item.timestamp)) : null;
    const valid = date && !Number.isNaN(date.getTime());
    const key = valid ? localDayKey(date) : "unknown";
    let label = "Date not recorded";
    if (valid) {
      const formatted = date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
      label = key === todayKey ? `Today · ${formatted}` : key === yesterdayKey ? `Yesterday · ${formatted}` : formatted;
    }
    const last = groups[groups.length - 1];
    if (last && last.dayKey === key) last.items.push(item);
    else groups.push({ key: `${key}-${groups.length}`, dayKey: key, label, items: [item] });
  });
  return groups;
}
