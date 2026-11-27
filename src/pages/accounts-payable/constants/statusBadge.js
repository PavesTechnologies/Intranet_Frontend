import { INVOICE_STATUS, INVOICE_STATUS_DISPLAY, invoiceStatusLabel } from "./invoiceStatus";

/**
 * Colours and labels for the AP Invoice Status / TDS Status badge (components/ApStatusBadge.jsx),
 * kept in one place so every AP table and detail page shows a status the same way. Status values
 * themselves are the backend's — nothing here adds a status or changes what one means.
 *
 * Each colour pair is [background, text].
 */

const NEUTRAL = ["#F3F4F6", "#374151"];

export const INVOICE_STATUS_COLORS = {
  [INVOICE_STATUS.APPROVED]: ["#D1FAE5", "#047857"],
  [INVOICE_STATUS.PAID]: ["#DCFCE7", "#15803D"],
  [INVOICE_STATUS.READY_FOR_PAYMENT]: ["#EEF2FF", "#4338CA"],
  [INVOICE_STATUS.PENDING_APPROVAL]: ["#FEF3C7", "#92400E"],
  [INVOICE_STATUS.REJECTED]: ["#FEE2E2", "#B91C1C"],
  [INVOICE_STATUS.RETURNED_FOR_REVIEW]: ["#F1F5F9", "#475569"],
  // The remaining real invoice statuses, picked from the same palette.
  [INVOICE_STATUS.DRAFT]: ["#F1F5F9", "#475569"],
  [INVOICE_STATUS.OCR_REVIEW_PENDING]: ["#FEF3C7", "#92400E"],
  [INVOICE_STATUS.OCR_REVIEWED]: ["#E0F2FE", "#0369A1"],
  [INVOICE_STATUS.OCR_FAILED]: ["#FEE2E2", "#B91C1C"],
  [INVOICE_STATUS.PARTIALLY_PAID]: ["#CFFAFE", "#0E7490"],
  [INVOICE_STATUS.DISPUTED]: ["#FFE4E6", "#BE123C"],
};

/** invoice_tds_tracking.tracking_status (TRACKING_STATUSES in tds_tracking_service.py). */
export const TDS_TRACKING_STATUS = {
  PENDING: "TDS_PENDING",
  DEDUCTED: "TDS_DEDUCTED",
  DEPOSITED: "TDS_DEPOSITED",
  FILED: "TDS_FILED",
};

export const TDS_TRACKING_STATUS_LABEL = {
  [TDS_TRACKING_STATUS.PENDING]: "TDS Pending",
  [TDS_TRACKING_STATUS.DEDUCTED]: "TDS Deducted",
  [TDS_TRACKING_STATUS.DEPOSITED]: "TDS Deposited",
  [TDS_TRACKING_STATUS.FILED]: "TDS Return Filed",
};

/**
 * Not a tracking status: a TDS-pending invoice whose determination Finance hasn't verified yet.
 * Shown in place of "TDS Pending" so the cell carries one accurate badge instead of a badge plus
 * a note underneath.
 */
export const TDS_AWAITING_VERIFICATION_LABEL = "Awaiting Verification";
const TDS_AWAITING_VERIFICATION = "AWAITING_VERIFICATION";

export const TDS_STATUS_COLORS = {
  [TDS_TRACKING_STATUS.PENDING]: ["#FFF7ED", "#C2410C"],
  [TDS_AWAITING_VERIFICATION]: ["#FFF7ED", "#C2410C"],
  [TDS_TRACKING_STATUS.DEDUCTED]: ["#EDE9FE", "#6D28D9"],
  [TDS_TRACKING_STATUS.DEPOSITED]: ["#DBEAFE", "#1D4ED8"],
  [TDS_TRACKING_STATUS.FILED]: ["#CCFBF1", "#0F766E"],
};

const toKey = (value) => String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");

// Invoice status arrives as a code ("PENDING_APPROVAL"), a status_master name ("Pending
// Approval") or an already-displayed label ("To review"); all three resolve to the name.
const INVOICE_STATUS_BY_KEY = Object.fromEntries(
  Object.entries(INVOICE_STATUS).flatMap(([code, name]) => [
    [code, name],
    [toKey(name), name],
    [toKey(INVOICE_STATUS_DISPLAY[name] || name), name],
  ]),
);

const TDS_STATUS_BY_KEY = {
  ...Object.fromEntries(Object.values(TDS_TRACKING_STATUS).map((code) => [code, code])),
  ...Object.fromEntries(
    Object.entries(TDS_TRACKING_STATUS_LABEL).map(([code, label]) => [toKey(label), code]),
  ),
};

/** @returns {{label: string, colors: [string, string]}} */
export function resolveInvoiceStatus(status) {
  if (status === null || status === undefined || status === "") {
    return { label: "—", colors: NEUTRAL };
  }

  const name = INVOICE_STATUS_BY_KEY[toKey(status)];
  return {
    label: invoiceStatusLabel(name || status),
    colors: (name && INVOICE_STATUS_COLORS[name]) || NEUTRAL,
  };
}

/**
 * @param {{status?: string, label?: string, determinationStatus?: string}} input
 *   `status` is the tracking code (or its label); `label` the backend's own label, used when
 *   present; `determinationStatus` the TDS determination — only when it is supplied and not
 *   VERIFIED does a TDS-pending invoice read as Awaiting Verification.
 * @returns {{label: string, colors: [string, string]}}
 */
export function resolveTdsStatus({ status, label, determinationStatus } = {}) {
  const code = status ? TDS_STATUS_BY_KEY[toKey(status)] : undefined;

  if (
    code === TDS_TRACKING_STATUS.PENDING &&
    determinationStatus &&
    toKey(determinationStatus) !== "VERIFIED"
  ) {
    return {
      label: TDS_AWAITING_VERIFICATION_LABEL,
      colors: TDS_STATUS_COLORS[TDS_AWAITING_VERIFICATION],
    };
  }

  return {
    label: label || (code && TDS_TRACKING_STATUS_LABEL[code]) || status || "—",
    colors: (code && TDS_STATUS_COLORS[code]) || NEUTRAL,
  };
}
