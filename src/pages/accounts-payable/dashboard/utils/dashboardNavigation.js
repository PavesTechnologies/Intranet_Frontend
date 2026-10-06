import { AP_ROUTES } from "../../constants/routes";
import { QUEUE_TYPES } from "../../constants/queueTypes";

/**
 * Maps a dashboard action-required item to an existing AP page — never invents a new URL/filter
 * mechanism. Confirmed via direct code research (not guessed):
 *   - Procurement's PR Approvals tab is the ONLY page in the AP module with real URL-driven
 *     filtering (`?tab=prApprovals`, read via useSearchParams in ProcurementPage.jsx) — safe to
 *     link to directly.
 *   - OCR Review and TDS Tracking are each their OWN dedicated route already (not a filter on
 *     another page), so linking straight to them needs no filter at all.
 *   - Invoice Management (`?queue=<QUEUE_TYPES value>`) and Payment Ready/History
 *     (`?status=<value>`) now both read an initial filter from the URL too (InvoiceQueueView.jsx,
 *     PaymentReadyPage.jsx, PaymentHistoryPage.jsx) — so these can link straight to the exact
 *     queue/tab a title describes instead of landing on each page's default view.
 *
 * Matched by `key` first (exact strings from the backend's examples, plus reasonable guesses for
 * the rest); `module` is the fallback so an unrecognized key still lands somewhere sensible
 * rather than rendering no link at all.
 */
const ACTION_ROUTE_BY_KEY = {
  invoice_ocr_review_pending: AP_ROUTES.INVOICE_OCR_REVIEW,
  ocr_review_pending: AP_ROUTES.INVOICE_OCR_REVIEW,
  invoices_pending_ocr: AP_ROUTES.INVOICE_OCR_REVIEW,

  invoice_approval_pending: `${AP_ROUTES.INVOICE_LIST}?queue=${QUEUE_TYPES.APPROVAL}`,
  invoices_awaiting_approval: `${AP_ROUTES.INVOICE_LIST}?queue=${QUEUE_TYPES.APPROVAL}`,

  payments_ready: `${AP_ROUTES.PAYMENT_READY}?status=READY_FOR_PAYMENT`,
  ready_for_payment: `${AP_ROUTES.PAYMENT_READY}?status=READY_FOR_PAYMENT`,

  tds_verification_pending: AP_ROUTES.TDS_TRACKING,
  tds_determination_pending: AP_ROUTES.INVOICE_LIST,

  pr_approval_pending: `${AP_ROUTES.PROCUREMENT}?tab=prApprovals`,
  pr_pending_approval: `${AP_ROUTES.PROCUREMENT}?tab=prApprovals`,
};

const MODULE_FALLBACK_ROUTE = {
  invoice: AP_ROUTES.INVOICE_LIST,
  payment: AP_ROUTES.PAYMENT_READY,
  tds: AP_ROUTES.TDS_TRACKING,
  tds_tracking: AP_ROUTES.TDS_TRACKING,
  procurement: AP_ROUTES.PROCUREMENT,
  pr: `${AP_ROUTES.PROCUREMENT}?tab=prApprovals`,
  vendor: AP_ROUTES.VENDOR_LIST,
};

/**
 * "invoice_ocr_review_pending" -> "Procurement" style grouping, inferred from a KPI's own title
 * since the backend sends no explicit category. Single source of truth for the dashboard's
 * cosmetic grouping (DashboardWidgets.jsx's KpiGrid), the permission gating, and the route
 * resolution below, so none of the three ever drift apart.
 */
export function categorizeKpiTitle(title = "") {
  const t = title.toLowerCase();
  if (/\bprs?\b/.test(t) || t.includes("rfq") || t.includes("purchase order") || t.includes("sourcing") || t.includes("vendor selection")) {
    return "Procurement";
  }
  if (t.includes("invoice")) return "Invoices";
  if (t.includes("vendor") || t.includes("onboarding")) return "Vendors";
  return "Other";
}

/**
 * The precise destination for a dashboard KPI tile (or, as a last-resort fallback, an
 * action-required item whose key/module don't resolve — see actionItemRoute below), inferred from
 * its own title text. More specific than a bare module route: "Approved Invoices" lands on the
 * Invoice Management's Approved tab itself (`?queue=approved`), not just Invoice Management at
 * its default tab — same for Procurement's per-stage `?tab=` and Payment's `?status=`, all using
 * queue/tab/status values read directly out of queueTypes.js / ProcurementPage.jsx /
 * PaymentReadyPage.jsx / PaymentHistoryPage.jsx, never guessed.
 *
 * Returns null where no page actually isolates what the title describes — a real, known gap
 * rather than a fabricated filter: "Draft"/"Disputed" invoices have no queue of their own in
 * Invoice Management, and vendor status ("Active"/"Pending Activation") is a numeric lookup id
 * with no frontend constant to filter by, so those fall through to the unfiltered list instead.
 *
 * @param {string} title
 */
export function routeForTitle(title = "") {
  const t = title.toLowerCase();
  const group = categorizeKpiTitle(title);

  if (group === "Invoices") {
    if (t.includes("ocr")) return AP_ROUTES.INVOICE_OCR_REVIEW;
    if (t.includes("approved")) return `${AP_ROUTES.INVOICE_LIST}?queue=${QUEUE_TYPES.APPROVED}`;
    if (t.includes("pending approval") || t.includes("returned for review") || t.includes("rejected")) {
      return `${AP_ROUTES.INVOICE_LIST}?queue=${QUEUE_TYPES.APPROVAL}`;
    }
    if (t.includes("ready for payment")) return `${AP_ROUTES.PAYMENT_READY}?status=READY_FOR_PAYMENT`;
    if (t.includes("partially paid")) return `${AP_ROUTES.PAYMENT_READY}?status=PARTIALLY_PAID`;
    if (t.includes("paid")) return `${AP_ROUTES.PAYMENT_HISTORY}?status=PAID`;
    // Draft / Disputed / Total — no queue isolates these today; land on the full invoice list.
    return AP_ROUTES.INVOICE_LIST;
  }

  if (group === "Procurement") {
    if (t.includes("pending approval")) return `${AP_ROUTES.PROCUREMENT}?tab=prApprovals`;
    if (t.includes("sourcing") || t.includes("rfq")) return `${AP_ROUTES.PROCUREMENT}?tab=quotation`;
    if (t.includes("vendor selection")) return `${AP_ROUTES.PROCUREMENT}?tab=vendorSelection`;
    if (t.includes("purchase order")) return `${AP_ROUTES.PROCUREMENT}?tab=purchaseOrders`;
    // "My Open PRs" and anything else PR-flavored but unmatched above.
    return `${AP_ROUTES.PROCUREMENT}?tab=prRequest`;
  }

  if (group === "Vendors") {
    if (t.includes("onboarding")) return AP_ROUTES.VENDOR_INTERNAL_REQUESTS;
    // "Active Vendors" / "Vendors Pending Activation" — no frontend-safe status filter (see doc
    // comment above); lands on the unfiltered vendor list.
    return AP_ROUTES.VENDOR_LIST;
  }

  return null;
}

/** @param {{title?: string}} kpi @returns {string|null} */
export function kpiRoute(kpi) {
  return routeForTitle(kpi?.title);
}

/** @param {{key?: string, module?: string, title?: string}} item @returns {string|null} */
export function actionItemRoute(item) {
  if (!item) return null;
  return ACTION_ROUTE_BY_KEY[item.key] || MODULE_FALLBACK_ROUTE[item.module] || routeForTitle(item.title) || null;
}

/**
 * Whether the current user may click through a dashboard KPI tile to its target page.
 * Permission-driven, never role-driven — this codebase has no "Approver"/"Finance Executive"
 * role to branch on (see apRoles.js and useApPermissions.js's own doc comment); those are just
 * users whose JWT happens to carry approval or payment permission codes. Mirrors the
 * canSeeAll/canSeeApproval/canSeePayment pattern already used for Invoice Management's own tabs
 * in constants/queueTypes.js's getVisibleQueueTypes().
 *
 * A tile can resolve a route via actionItemRoute() and still be non-navigable for a user who
 * lacks the permission that target page actually requires — the link would otherwise just land
 * them on a page they can't use. Matched by the kpi's own title text (same signal already used
 * for grouping/icon/tone in DashboardWidgets.jsx) since the backend gives no per-KPI permission
 * code. An unrecognized title is left navigable rather than silently blocked, so a new KPI the
 * backend adds tomorrow doesn't go dead until this map is updated.
 *
 * @param {{title?: string}} kpi
 * @param {Record<string, boolean>} permissions useApPermissions() result
 */
export function canNavigateToKpi(kpi, permissions = {}) {
  const title = kpi?.title || "";
  const t = title.toLowerCase();
  const group = categorizeKpiTitle(title);
  const p = permissions;

  if (group === "Invoices") {
    // Intake/OCR pipeline — AP Executive / whoever uploads or reviews OCR.
    if (t.includes("draft") || t.includes("ocr")) {
      return Boolean(p.canUploadInvoice || p.canReviewOcr);
    }
    // Approval workflow (pending/approved/returned/rejected) — an Approver, not Finance.
    if (t.includes("pending approval") || t.includes("returned for review") || t.includes("rejected") || t.includes("approved")) {
      return Boolean(p.canViewInvoiceApproval || p.canApproveInvoice || p.canRejectInvoice || p.canSendBackInvoice || p.canSendForApproval);
    }
    // Payment stage — Finance Executive.
    if (t.includes("ready for payment") || t.includes("partially paid") || t.includes("paid")) {
      return Boolean(p.canMarkPaid || p.canViewPayment || p.canViewPaymentManagement);
    }
    // Disputed invoices can surface during either approval review or payment reconciliation —
    // visible to either side rather than guessing a single owner.
    if (t.includes("disputed")) {
      return Boolean(p.canViewInvoiceApproval || p.canMarkPaid || p.canViewPayment);
    }
    // "Total Invoices" and anything else invoice-flavored but unmatched above.
    return Boolean(p.canViewInvoice);
  }

  if (group === "Procurement") {
    if (t.includes("pending approval")) {
      return Boolean(p.canViewPRApprovals || p.canApprovePR || p.canRejectPR || p.canReturnPR);
    }
    if (t.includes("rfq")) return Boolean(p.canViewQuotation);
    if (t.includes("vendor selection")) return Boolean(p.canViewVendorSelection || p.canSelectVendor);
    if (t.includes("purchase order")) return Boolean(p.canViewPO);
    // "My Open PRs", "Approved PRs Awaiting Sourcing".
    return Boolean(p.canViewPR);
  }

  if (group === "Vendors") {
    if (t.includes("onboarding")) return Boolean(p.canViewOnboarding || p.canProcessOnboarding || p.canAssignOnboarding);
    return Boolean(p.canViewVendor);
  }

  return true;
}

const ACTION_PERMISSION_BY_KEY = {
  invoice_ocr_review_pending: (p) => Boolean(p.canUploadInvoice || p.canReviewOcr),
  ocr_review_pending: (p) => Boolean(p.canUploadInvoice || p.canReviewOcr),
  invoices_pending_ocr: (p) => Boolean(p.canUploadInvoice || p.canReviewOcr),

  invoice_approval_pending: (p) => Boolean(p.canViewInvoiceApproval || p.canApproveInvoice || p.canRejectInvoice || p.canSendBackInvoice || p.canSendForApproval),
  invoices_awaiting_approval: (p) => Boolean(p.canViewInvoiceApproval || p.canApproveInvoice || p.canRejectInvoice || p.canSendBackInvoice || p.canSendForApproval),

  payments_ready: (p) => Boolean(p.canMarkPaid || p.canViewPayment || p.canViewPaymentManagement),
  ready_for_payment: (p) => Boolean(p.canMarkPaid || p.canViewPayment || p.canViewPaymentManagement),

  tds_verification_pending: (p) => Boolean(p.canVerifyTds || p.canViewTdsTracking),
  tds_determination_pending: (p) => Boolean(p.canDetermineTds || p.canViewTds),

  pr_approval_pending: (p) => Boolean(p.canViewPRApprovals || p.canApprovePR || p.canRejectPR || p.canReturnPR),
  pr_pending_approval: (p) => Boolean(p.canViewPRApprovals || p.canApprovePR || p.canRejectPR || p.canReturnPR),
};

const MODULE_PERMISSION_FALLBACK = {
  invoice: (p) => Boolean(p.canViewInvoice),
  payment: (p) => Boolean(p.canViewPayment || p.canMarkPaid || p.canViewPaymentManagement),
  tds: (p) => Boolean(p.canViewTds),
  tds_tracking: (p) => Boolean(p.canViewTdsTracking),
  procurement: (p) => Boolean(p.canViewPR),
  pr: (p) => Boolean(p.canViewPRApprovals || p.canViewPR),
  vendor: (p) => Boolean(p.canViewVendor),
};

/**
 * Same permission gating as canNavigateToKpi, for the "Action Required" list — these items carry
 * a `key`/`module` (matched the same way actionItemRoute() resolves their URL) rather than only a
 * title, so key/module matching is tried first and is the more reliable signal here. Falls back to
 * canNavigateToKpi's title-based check (not a blind `true`) for an item whose key/module don't
 * resolve — e.g. "Approved PRs Awaiting Sourcing" has no confirmed backend key yet, so it's gated
 * the same way the equivalent KPI tile would be.
 * @param {{key?: string, module?: string, title?: string}} item
 * @param {Record<string, boolean>} permissions useApPermissions() result
 */
export function canNavigateToActionItem(item, permissions = {}) {
  if (!item) return false;
  const byKey = item.key && ACTION_PERMISSION_BY_KEY[item.key];
  if (byKey) return byKey(permissions);
  const byModule = item.module && MODULE_PERMISSION_FALLBACK[item.module];
  if (byModule) return byModule(permissions);
  return canNavigateToKpi(item, permissions);
}

const ENTITY_DETAIL_ROUTE = {
  invoice: AP_ROUTES.INVOICE_DETAIL,
  purchase_requisition: AP_ROUTES.PROCUREMENT_PR_DETAIL,
  pr: AP_ROUTES.PROCUREMENT_PR_DETAIL,
  purchase_order: AP_ROUTES.PROCUREMENT_PO_DETAIL,
  po: AP_ROUTES.PROCUREMENT_PO_DETAIL,
  rfq: AP_ROUTES.PROCUREMENT_RFQ_DETAIL,
  vendor: AP_ROUTES.VENDOR_DETAIL,
};

/** @param {{entity_type?: string, entity_id?: number|string}} item @returns {string|null} */
export function recentActivityRoute(item) {
  if (!item?.entity_type || item.entity_id == null) return null;
  const builder = ENTITY_DETAIL_ROUTE[item.entity_type.toLowerCase()];
  return builder ? builder(item.entity_id) : null;
}
