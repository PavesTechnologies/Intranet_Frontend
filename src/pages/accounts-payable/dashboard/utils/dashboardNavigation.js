import { AP_ROUTES } from "../../constants/routes";

/**
 * Maps a dashboard action-required item to an existing AP page — never invents a new URL/filter
 * mechanism. Confirmed via direct code research (not guessed):
 *   - Procurement's PR Approvals tab is the ONLY page in the AP module with real URL-driven
 *     filtering (`?tab=prApprovals`, read via useSearchParams in ProcurementPage.jsx) — safe to
 *     link to directly.
 *   - OCR Review and TDS Tracking are each their OWN dedicated route already (not a filter on
 *     another page), so linking straight to them needs no filter at all.
 *   - Payment Ready is already permanently scoped to READY_FOR_PAYMENT invoices by the page
 *     itself (PaymentReadyPage.jsx filters to PAYMENT_QUEUE_STATUSES), so it needs no filter
 *     either — landing there IS landing on exactly the right data.
 *   - Invoice Management, by contrast, has NO url/filter support today (its queue/status state
 *     is local useState only) — linking there lands on "All Invoices", not a specific queue.
 *     This is a real, known gap, not something worked around here.
 *
 * Matched by `key` first (exact strings from the backend's examples, plus reasonable guesses for
 * the rest); `module` is the fallback so an unrecognized key still lands somewhere sensible
 * rather than rendering no link at all.
 */
const ACTION_ROUTE_BY_KEY = {
  invoice_ocr_review_pending: AP_ROUTES.INVOICE_OCR_REVIEW,
  ocr_review_pending: AP_ROUTES.INVOICE_OCR_REVIEW,
  invoices_pending_ocr: AP_ROUTES.INVOICE_OCR_REVIEW,

  // No dedicated "my approvals" queue/filter exists for Invoice Management today — known gap,
  // lands on the plain Invoice Management page rather than a pre-filtered one.
  invoice_approval_pending: AP_ROUTES.INVOICE_LIST,
  invoices_awaiting_approval: AP_ROUTES.INVOICE_LIST,

  payments_ready: AP_ROUTES.PAYMENT_READY,
  ready_for_payment: AP_ROUTES.PAYMENT_READY,

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

/** @param {{key?: string, module?: string}} item @returns {string|null} */
export function actionItemRoute(item) {
  if (!item) return null;
  return ACTION_ROUTE_BY_KEY[item.key] || MODULE_FALLBACK_ROUTE[item.module] || null;
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
