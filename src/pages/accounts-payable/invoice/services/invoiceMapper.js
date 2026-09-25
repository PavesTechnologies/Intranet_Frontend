import { INVOICE_STATUS } from "../../constants/invoiceStatus";

/**
 * Backend `status_code` is a machine code (e.g. "PENDING_APPROVAL"), not the frontend's display
 * label — the rest of the app (StatusBadge, tab/queue filtering) already keys off
 * INVOICE_STATUS.* display values, so map the code through that lookup. Falls back to the raw
 * code unchanged if it doesn't match a known key, rather than hiding an unrecognized status.
 */
function mapStatusCode(statusCode) {
  if (!statusCode) return "";
  return INVOICE_STATUS[statusCode.toUpperCase()] ?? statusCode;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Maps a backend InvoiceDetailsResponse record (snake_case) to the frontend's camelCase Invoice
 * model. Used for both the list and detail endpoints — they return the same shape (see
 * invoiceService.js). InvoiceDetailsResponse now includes amount_paid/department_id/
 * purchase_category_id/vendor_id/currency_id/po_id/payment_term_id (previously missing — every
 * consumer had to default these client-side; see InvoiceReviewEditor.jsx and
 * PaymentMarkAsPaidPage.jsx for the workarounds this closes). Fields still genuinely absent from
 * the response (vendor GSTIN/email, line items, attachments, issues, approval, payments,
 * currency symbol/code) keep safe empty/null defaults — never invented values.
 * @param {Object} raw - InvoiceDetailsResponse
 * @returns {Object} mapped Invoice
 */
export function mapInvoiceRecord(raw = {}) {
  const vendorName = raw.vendor_name ?? null;

  return {
    // Canonical API-aligned fields
    id: raw.invoice_id,
    invoiceId: raw.invoice_id,
    invoiceNumber: raw.invoice_number ?? "",
    vendorId: raw.vendor_id ?? null,
    vendorName,
    inboundDocumentId: raw.inbound_document_id ?? null,
    invoiceType: raw.invoice_type ?? "",
    invoiceDate: raw.invoice_date ?? "",
    dueDate: raw.due_date ?? "",
    currencyId: raw.currency_id ?? null,
    grossAmount: toNumber(raw.gross_amount),
    discountAmount: toNumber(raw.discount_amount),
    taxAmount: toNumber(raw.tax_amount),
    netAmount: toNumber(raw.net_amount),
    amountPaid: toNumber(raw.amount_paid),
    // TDS-adjusted payable figure — present once TDS has been determined for this invoice, on
    // both the list and detail responses (same shape, see this file's own header comment).
    // tds_applicable is genuinely tri-state on the wire (true/false/absent-until-determined) —
    // preserved as-is rather than coerced to a boolean, so "not yet determined" stays
    // distinguishable from "determined, not applicable" wherever that matters.
    tdsApplicable: raw.tds_applicable ?? null,
    tdsAmount: raw.tds_amount != null ? toNumber(raw.tds_amount) : null,
    payableAmount: raw.payable_amount != null ? toNumber(raw.payable_amount) : null,
    poId: raw.po_id ?? null,
    paymentTermId: raw.payment_term_id ?? null,
    departmentId: raw.department_id ?? null,
    purchaseCategoryId: raw.purchase_category_id ?? null,
    status: mapStatusCode(raw.status_code),

    // Compatibility defaults for existing UI components — not returned by
    // InvoiceDetailsResponse. Do not replace these with invented values.
    vendor: vendorName ? { name: vendorName, gstin: null, email: null } : null,
    paymentTerms: null,
    invoiceLines: [],
    attachments: [],
    issues: [],
    history: [],
    approval: null,
    payments: [],
    // InvoiceDetailsResponse only has currency_id (above), not a resolved symbol/code — every
    // consumer already falls back to the rupee sign via `invoice.currency?.symbol || "₹"` when
    // this is null; resolving currencyId -> symbol needs the currency lookup, done at the
    // component level (useApLookups), not in this pure mapper.
    currency: null,
    uploadedAt: null,
  };
}
