import { AP_ROUTES } from "../../constants/routes";

/**
 * Notification presentation + navigation mapping.
 *
 * NOTHING here invents a notification: every type, priority and entity below is one the
 * backend already emits (Backend/Business_Layer/utils/notification_types.py). An unknown value
 * from the API is always rendered, never dropped — the maps are for labelling and routing only.
 */

/** ap.notification.priority — the backend's CHECK constraint values. */
export const PRIORITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

export const PRIORITY_ORDER = [
  PRIORITY.CRITICAL,
  PRIORITY.HIGH,
  PRIORITY.MEDIUM,
  PRIORITY.LOW,
];

export const PRIORITY_LABEL = {
  [PRIORITY.CRITICAL]: "Critical",
  [PRIORITY.HIGH]: "High",
  [PRIORITY.MEDIUM]: "Medium",
  [PRIORITY.LOW]: "Low",
};

/** Tones map onto the existing StatusPill vocabulary — no new colour system. */
export const PRIORITY_TONE = {
  [PRIORITY.CRITICAL]: "danger",
  [PRIORITY.HIGH]: "warning",
  [PRIORITY.MEDIUM]: "info",
  [PRIORITY.LOW]: "neutral",
};

/** Left accent bar per priority, matching the tones above. */
export const PRIORITY_ACCENT = {
  [PRIORITY.CRITICAL]: "bg-rose-500",
  [PRIORITY.HIGH]: "bg-orange-400",
  [PRIORITY.MEDIUM]: "bg-blue-400",
  [PRIORITY.LOW]: "bg-slate-300",
};

/** Entity types carried on the DTO (notification_types.py ENTITY_*). */
export const ENTITY = {
  PURCHASE_REQUISITION: "PURCHASE_REQUISITION",
  RFQ: "RFQ",
  QUOTATION: "QUOTATION",
  VENDOR_ONBOARDING_REQUEST: "VENDOR_ONBOARDING_REQUEST",
  VENDOR_NDA: "VENDOR_NDA",
  INVOICE: "INVOICE",
  INVOICE_APPROVAL_STEP: "INVOICE_APPROVAL_STEP",
  PAYMENT: "PAYMENT",
  // An exhausted UMS/EOS identity-sync event, raised as SYSTEM_CONFIGURATION_EXCEPTION.
  CDC_FAILURE: "CDC_FAILURE",
};

/** Readable entity wording for the card's reference line. */
export const ENTITY_LABEL = {
  [ENTITY.PURCHASE_REQUISITION]: "Purchase Requisition",
  [ENTITY.RFQ]: "RFQ",
  [ENTITY.QUOTATION]: "Quotation",
  [ENTITY.VENDOR_ONBOARDING_REQUEST]: "Onboarding Request",
  [ENTITY.VENDOR_NDA]: "NDA",
  [ENTITY.INVOICE]: "Invoice",
  [ENTITY.INVOICE_APPROVAL_STEP]: "Invoice Approval",
  [ENTITY.PAYMENT]: "Payment",
  [ENTITY.CDC_FAILURE]: "Identity Sync",
};

/**
 * Source AP module (notification_types.py MODULE_*). The backend derives it from
 * notification_type and sends it on every DTO as `module` — it is displayed as given and never
 * re-derived here from the entity or from the page the user happens to be on.
 */
export const MODULE = {
  PROCUREMENT: "PROCUREMENT",
  VENDOR_MANAGEMENT: "VENDOR_MANAGEMENT",
  INVOICE_MANAGEMENT: "INVOICE_MANAGEMENT",
  PAYMENTS: "PAYMENTS",
  SYSTEM_CONFIGURATION: "SYSTEM_CONFIGURATION",
};

/**
 * The modules the list endpoint accepts as a `module` filter. Only these are offered as filter
 * options: the backend rejects any other value with a 422, so a module it has not declared can
 * be rendered but never filtered on.
 */
export const MODULE_ORDER = [
  MODULE.PROCUREMENT,
  MODULE.VENDOR_MANAGEMENT,
  MODULE.INVOICE_MANAGEMENT,
  MODULE.PAYMENTS,
  MODULE.SYSTEM_CONFIGURATION,
];

export const MODULE_LABEL = {
  [MODULE.PROCUREMENT]: "Procurement",
  [MODULE.VENDOR_MANAGEMENT]: "Vendor Management",
  [MODULE.INVOICE_MANAGEMENT]: "Invoice Management",
  [MODULE.PAYMENTS]: "Payments",
  [MODULE.SYSTEM_CONFIGURATION]: "System Configuration",
};

/** Compact chip colours — distinct per module, muted so the title stays the primary hierarchy. */
export const MODULE_BADGE_CLASS = {
  [MODULE.PROCUREMENT]: "border-indigo-200 bg-indigo-50 text-indigo-700",
  [MODULE.VENDOR_MANAGEMENT]: "border-teal-200 bg-teal-50 text-teal-700",
  [MODULE.INVOICE_MANAGEMENT]: "border-sky-200 bg-sky-50 text-sky-700",
  [MODULE.PAYMENTS]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [MODULE.SYSTEM_CONFIGURATION]: "border-violet-200 bg-violet-50 text-violet-700",
};

export const OTHER_MODULE_BADGE_CLASS = "border-gray-200 bg-gray-50 text-gray-600";

/**
 * Readable module name. A module this build does not know is shown as the backend sent it
 * (SOME_NEW_MODULE -> "Some New Module"); a notification without one reads "Other".
 */
export function moduleLabel(module) {
  if (!module) return "Other";
  if (MODULE_LABEL[module]) return MODULE_LABEL[module];
  return String(module)
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Notification types that represent work the recipient still has to do — every type in the
 * backend CATALOG (notification_types.py). VENDOR_ONBOARDING_COMPLETED is included: it asks the
 * requesting PO Officer to "Continue procurement", and the backend resolves it once that vendor
 * is invited to the PR's RFQ (or the PR closes). A type missing from this set is still listed
 * under All/Unread, it just is never called out as action required.
 *
 * The type alone is not enough — use isActionRequired(), which also honours `is_resolved`.
 */
export const ACTION_REQUIRED_TYPES = new Set([
  "PR_APPROVAL_REQUIRED",
  "PR_RETURNED",
  "PR_APPROVED_SOURCING",
  "VENDOR_ONBOARDING_COMPLETED",
  "VENDOR_ONBOARDING_FAILED",
  "NDA_REQUIRED",
  "NDA_PENDING",
  "NDA_SIGNED_REVIEW_PENDING",
  "NDA_EXPIRED_RFQ_BLOCKED",
  "RFQ_VENDOR_EMAIL_FAILURE",
  "QUOTATION_RECEIVED",
  "RFQ_DEADLINE_REACHED",
  "VENDOR_SELECTION_REQUIRED",
  "QUOTATION_VALIDITY_ENDING",
  "PO_GENERATION_REQUIRED",
  "PROCUREMENT_BLOCKED",
  "VENDOR_ONBOARDING_REQUESTED",
  "VENDOR_ONBOARDING_ASSIGNED",
  "VENDOR_INFORMATION_REQUIRED",
  "VENDOR_PRESCREEN_REQUIRED",
  "INVOICE_REVIEW_REQUIRED",
  "INVOICE_VALIDATION_EXCEPTION",
  "INVOICE_RETURNED",
  "INVOICE_PAYMENT_ACTION_REQUIRED",
  "INVOICE_DUE",
  "INVOICE_OVERDUE",
  "INVOICE_APPROVAL_REQUIRED",
  "INVOICE_APPROVAL_AGEING",
  "PAYMENT_READY",
  "PAYMENT_DUE",
  "PAYMENT_FAILED",
  "PAYMENT_EXCEPTION",
  "FINANCE_ACTION_REQUIRED",
  "FINANCE_ESCALATION",
  "WORKFLOW_CONFIGURATION_BLOCKED",
  "SYSTEM_CONFIGURATION_EXCEPTION",
]);

/**
 * Whether a notification is still outstanding work for the user.
 *
 * Driven by backend state only: an action-oriented type that the backend has not resolved.
 * Read/unread plays no part — reading a notification does not do the work, and an unread
 * notice is not work because it is unread. Once the backend resolves it (the PR was sourced,
 * the invoice paid, …) it stays in history but is never action required again.
 */
export const isActionRequired = (notification) =>
  Boolean(notification) &&
  !notification.is_resolved &&
  ACTION_REQUIRED_TYPES.has(notification.notification_type);

/**
 * Overdue = the notification carries a deadline the backend set (payload.deadline) and that
 * date has passed. It is never inferred from the type or from how old the notification is,
 * and a resolved notification is never overdue — the work it asked for is done.
 * @param {{deadline?: string|null, is_resolved?: boolean}} notification
 */
export const isOverdue = (notification) => {
  if (!notification?.deadline || notification.is_resolved) return false;
  const deadline = new Date(notification.deadline);
  if (Number.isNaN(deadline.getTime())) return false;
  // Compare on the date, not the instant: a deadline of "today" is not yet overdue.
  const endOfDeadlineDay = new Date(deadline);
  endOfDeadlineDay.setHours(23, 59, 59, 999);
  return endOfDeadlineDay.getTime() < Date.now();
};

const metadataOf = (notification) => notification?.payload?.metadata || {};

const asId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
};

/**
 * A Procurement page tab, pre-selecting the notification's PR when the backend supplied one —
 * ProcurementPage honours `?tab=`, and the Quotation / Vendor Selection tabs read `prId`.
 */
const procurementTab = (tab, prId) =>
  `${AP_ROUTES.PROCUREMENT}?tab=${tab}${prId ? `&prId=${encodeURIComponent(prId)}` : ""}`;

/**
 * Where a notification's action button should go, resolved against the routes this app
 * actually registers (see App.jsx / constants/routes.js).
 *
 * The DTO's `payload.deep_link` is deliberately IGNORED. The backend builds it from its own
 * `_DEEP_LINKS` table ("/procurement/rfq/{id}", "/invoices/{id}", …), which are placeholders
 * that do not exist in this frontend — following them would 404. The entity + metadata the
 * notification carries are the real contract, so they are what is mapped here.
 *
 * Returns null when no real page exists for the notification. The caller then renders the
 * notification without an action button rather than offering a dead link.
 *
 * @param {object} notification a NotificationDTO
 * @returns {string|null} an in-app path
 */
export function resolveNotificationRoute(notification) {
  if (!notification) return null;

  const { notification_type: type, entity_type: entityType, entity_id: entityId } = notification;
  const metadata = metadataOf(notification);
  const id = asId(entityId);

  // ── Type-level destinations, where the type says more than the entity does ──────────
  switch (type) {
    case "VENDOR_ONBOARDING_COMPLETED": {
      // Sent to the PO Officer who raised the request: "Continue procurement / RFQ". The PR it
      // was raised from is where that continues; without one, the vendor is live in Vendor
      // Management — never the closed onboarding request.
      const prId = asId(metadata.pr_id);
      return prId ? AP_ROUTES.PROCUREMENT_PR_DETAIL(prId) : AP_ROUTES.VENDOR_LIST;
    }

    case "VENDOR_SELECTION_REQUIRED":
      // Vendor Selection is a tab on the Procurement page, not a route of its own; the PR the
      // closed RFQ belongs to is pre-selected there.
      return procurementTab("vendorSelection", asId(metadata.pr_id));

    case "PO_GENERATION_REQUIRED":
      // "Generate PO" is an action on the PR detail page; the entity here is the PR.
      return id ? AP_ROUTES.PROCUREMENT_PR_DETAIL(id) : AP_ROUTES.PROCUREMENT;

    case "WORKFLOW_CONFIGURATION_BLOCKED":
      // Raised against an invoice, but what needs fixing is the approval policy.
      return AP_ROUTES.SYSTEM_CONFIG;

    case "SYSTEM_CONFIGURATION_EXCEPTION":
      // An identity-sync failure for an Admin. There is no sync-failure screen, so System
      // Configuration is the closest real page.
      return AP_ROUTES.SYSTEM_CONFIG;

    default:
      break;
  }

  // ── Entity-level destinations ───────────────────────────────────────────────────────
  switch (entityType) {
    case ENTITY.PURCHASE_REQUISITION:
      return id ? AP_ROUTES.PROCUREMENT_PR_DETAIL(id) : AP_ROUTES.PROCUREMENT;

    case ENTITY.RFQ:
      return id ? AP_ROUTES.PROCUREMENT_RFQ_DETAIL(id) : procurementTab("quotation", asId(metadata.pr_id));

    case ENTITY.QUOTATION: {
      // No quotation detail route exists. The RFQ detail page is where a quotation is
      // reviewed, so use the rfq_id the backend put in metadata when it is there.
      const rfqId = asId(metadata.rfq_id);
      if (rfqId) return AP_ROUTES.PROCUREMENT_RFQ_DETAIL(rfqId);
      return procurementTab("quotation", asId(metadata.pr_id));
    }

    case ENTITY.VENDOR_ONBOARDING_REQUEST:
      return id
        ? AP_ROUTES.VENDOR_INTERNAL_REQUEST_DETAIL(id)
        : AP_ROUTES.VENDOR_INTERNAL_REQUESTS;

    case ENTITY.VENDOR_NDA: {
      // NDAs have no route of their own — the NDA workflow lives inside the PR/RFQ screens
      // (VendorNdaModal on RFQ Detail), and the vendor's NDA history on Vendor Detail. Use
      // whichever the notification's metadata actually gives us.
      const prId = asId(metadata.pr_id);
      if (prId) return AP_ROUTES.PROCUREMENT_PR_DETAIL(prId);
      const vendorId = asId(metadata.vendor_id);
      if (vendorId) return AP_ROUTES.VENDOR_DETAIL(vendorId);
      return procurementTab("quotation");
    }

    case ENTITY.INVOICE:
      return id ? AP_ROUTES.INVOICE_DETAIL(id) : AP_ROUTES.INVOICE_LIST;

    case ENTITY.INVOICE_APPROVAL_STEP: {
      // entity_id is the approval STEP, which has no page; the invoice it belongs to does.
      const invoiceId = asId(metadata.invoice_id);
      return invoiceId ? AP_ROUTES.INVOICE_DETAIL(invoiceId) : AP_ROUTES.INVOICE_LIST;
    }

    case ENTITY.PAYMENT:
      // PAYMENT_FAILED / PAYMENT_DUE / PAYMENT_EXCEPTION / FINANCE_ESCALATION. There is no
      // payment detail route registered in App.jsx (PAYMENT_QUEUE_DETAIL is commented out);
      // Payment History lists every payment with its status and is where a payment's status
      // is updated, so it is the closest real page.
      return AP_ROUTES.PAYMENT_HISTORY;

    case ENTITY.CDC_FAILURE:
      return AP_ROUTES.SYSTEM_CONFIG;

    default:
      // Unknown or future entity type: no route, and the card renders without an action.
      return null;
  }
}

/** Reference line for a card, e.g. "Invoice INV-1024". Null when there is nothing to show. */
export function entityReference(notification) {
  const label = ENTITY_LABEL[notification?.entity_type];
  const display = notification?.entity_display_id;

  if (!label && !display) return null;
  if (!display) return label;
  return label ? `${label} ${display}` : display;
}
