/** GST input tax credit (ITC) register - mirrors Backend gst_itc_service.py. */
export const GST_ITC_MANAGE_PERMISSIONS = ["GST_ITC_MANAGE", "AP_AUTOMATION_MANAGE"];
export const GST_ITC_VIEW_PERMISSIONS = ["GST_ITC_VIEW", ...GST_ITC_MANAGE_PERMISSIONS, "PAYMENT_VIEW", "PAYMENT_PROCESS"];

export const TAX_COMPONENTS = ["igst", "cgst", "sgst", "cess"];
export const TAX_COMPONENT_LABELS = { igst: "IGST", cgst: "CGST", sgst: "SGST", cess: "Cess" };

const TONE = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};
const UNKNOWN = (code) => ({ label: code || "—", tone: TONE.slate });

/** Eligibility as stored (`itc_eligibility`) and in the API vocabulary (`itc_eligibility_api_status`). */
export const ELIGIBILITY = {
  ELIGIBLE: { label: "Eligible", tone: TONE.green },
  REVIEW: { label: "Pending review", tone: TONE.amber },
  PENDING_REVIEW: { label: "Pending review", tone: TONE.amber },
  REQUIRES_CLARIFICATION: { label: "Requires clarification", tone: TONE.amber },
  BLOCKED: { label: "Blocked (s.17(5))", tone: TONE.rose },
  INELIGIBLE: { label: "Ineligible", tone: TONE.rose },
  NOT_CLAIMABLE: { label: "Not claimable", tone: TONE.slate },
};
export const eligibilitySpec = (code) => ELIGIBILITY[code] || UNKNOWN(code);

/** What Finance can record (PUT /itc/{id}/eligibility). */
export const ELIGIBILITY_DECISIONS = [
  { value: "ELIGIBLE", label: "Eligible" },
  { value: "INELIGIBLE", label: "Ineligible" },
  { value: "BLOCKED", label: "Blocked under s.17(5)" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "REQUIRES_CLARIFICATION", label: "Requires clarification" },
];

/** invoice_gst.itc_status - kept for the register / reports. */
export const ITC_STATUS = {
  PENDING: "Not yet claimed",
  CLAIMED: "Claimed",
  PARTIALLY_CLAIMED: "Partially claimed",
  REVERSED: "Reversed",
  NOT_CLAIMABLE: "—",
};

/** Internal approval for GSTR-3B - never proof that the credit was claimed. */
export const APPROVAL_STATUS = {
  NOT_REVIEWED: { label: "Not reviewed", tone: TONE.slate },
  UNDER_REVIEW: { label: "Under review", tone: TONE.amber },
  APPROVED_FOR_GSTR3B: { label: "Approved for GSTR-3B", tone: TONE.indigo },
  REJECTED_FOR_CLAIM: { label: "Rejected for claim", tone: TONE.rose },
};
export const approvalSpec = (code) => APPROVAL_STATUS[code || "NOT_REVIEWED"] || UNKNOWN(code);

/** Claim status from GET /itc/{id} (`claim_status`). */
export const CLAIM_STATUS = {
  NOT_CLAIMED: { label: "Not claimed", tone: TONE.slate },
  APPROVED_FOR_GSTR3B: { label: "Approved for GSTR-3B", tone: TONE.indigo },
  CLAIMED_IN_GSTR3B: { label: "Claimed in GSTR-3B", tone: TONE.green },
  PARTIALLY_CLAIMED: { label: "Partially claimed", tone: TONE.sky },
  REVERSED: { label: "Reversed", tone: TONE.rose },
  RECLAIMED: { label: "Re-claimed", tone: TONE.violet },
};
export const claimSpec = (code) => CLAIM_STATUS[code] || UNKNOWN(code);

/** Claimed with the old one-click claim, before GSTR-3B filings were recorded - there is no ARN on file. */
export const LEGACY_CLAIM_LABEL = "Legacy Claim – No Filing Recorded";

export const FILING_STATUS = {
  FILED: { label: "Awaiting verification", tone: TONE.amber },
  VERIFIED: { label: "Verified", tone: TONE.green },
};
export const filingSpec = (code) => FILING_STATUS[code] || UNKNOWN(code);

export const ALLOCATION_TYPE = { CLAIM: "Claim", REVERSAL: "Reversal", RECLAIM: "Re-claim" };

export const IMPORT_STATUS = {
  COMPLETED: { label: "Imported", tone: TONE.green },
  COMPLETED_WITH_ERRORS: { label: "Imported with errors", tone: TONE.amber },
  FAILED: { label: "Failed", tone: TONE.rose },
  NOT_IMPORTED: { label: "Not imported", tone: TONE.slate },
};
export const importSpec = (code) => IMPORT_STATUS[code] || UNKNOWN(code);

export const IRN_STATUS = {
  PRESENT: { label: "IRN ✓", tone: "text-emerald-700" },
  MISSING: { label: "IRN missing", tone: "font-medium text-rose-600" },
  NOT_REQUIRED: { label: "Not e-invoice", tone: "text-slate-400" },
  UNKNOWN: { label: "Unknown", tone: "text-slate-400" },
};

/** Why pending credit cannot be approved / claimed yet (`claim_blockers`) - BLOCKER_LABELS in gst_itc_service.py. */
export const CLAIM_BLOCKERS = {
  RETURN_NOT_OPEN: "Month not over - its GSTR-3B cannot be filed yet",
  NOT_APPROVED: "Invoice not approved yet",
  IRN_MISSING: "E-invoice IRN not recorded (s.31 / rule 48(5))",
  GSTR2B_MISSING: "Not in the supplier's GSTR-2B yet (s.16(2)(aa))",
  GSTR2B_NOT_RECONCILED: "GSTR-2B differs from the books - review the match",
  GSTR2B_ITC_UNAVAILABLE: "GSTR-2B says ITC not available",
  ELIGIBILITY_REVIEW: "Eligibility under review (s.17(5))",
  ITC_INELIGIBLE: "Ineligible / blocked credit",
};

/** Audit actions returned by GET /itc/{id}/history. */
export const ITC_HISTORY_ACTIONS = {
  GST_ITC_ELIGIBILITY_SET: "Eligibility decision",
  GST_ITC_APPROVED_FOR_GSTR3B: "Approved for GSTR-3B",
  GST_ITC_REJECTED_FOR_CLAIM: "Rejected for claim",
  GST_ITC_APPROVAL_UNDER_REVIEW: "Approval under review",
  GST_ITC_APPROVAL_RESET: "Approval reset",
  GST_ITC_CLAIMED: "Claimed in verified GSTR-3B",
  GST_ITC_RECLAIMED: "Re-claimed in verified GSTR-3B",
  GST_ITC_RECLAIM_RECORDED: "Re-claim recorded",
  GST_ITC_REVERSED: "Reversed",
  GST_IRN_RECORDED: "IRN recorded",
};

export const RISK = {
  AT_RISK: "Pay soon: 180-day ITC deadline",
  REVERSAL_DUE: "Unpaid > 180 days: reverse ITC",
  RECLAIM: "Paid: re-claim reversed ITC",
};

/**
 * GSTR-2B outcome of an invoice in the ITC register (`gstr2b` on the register rows) - mirrors
 * Gstr2bService.status_by_invoice.
 */
export const GSTR2B_MATCH = {
  MATCHED: { label: "Matched", hint: "Filed by the supplier, tax agrees", tone: TONE.green },
  MISMATCH: { label: "Not reconciled", hint: "Tax filed differs from the books", tone: TONE.amber },
  MISSING: { label: "Missing in GSTR-2B", hint: "In the books, not filed by the supplier - credit held", tone: TONE.rose },
  ITC_UNAVAILABLE: { label: "ITC not available", hint: "GSTR-2B reports the credit as not available", tone: TONE.rose },
  NOT_IN_BOOKS: { label: "Missing in AP", hint: "Filed against us, not booked", tone: TONE.slate },
};

/**
 * Reconciliation status of a GSTR-2B record (`reconciliation_status` from GET /gstr2b/matches).
 * Historical records and older API revisions use other names - see RECON_STATUS_ALIASES.
 */
export const RECON_STATUS = {
  MATCHED: { label: "Matched", hint: "Supplier's filing agrees with the books", tone: TONE.green },
  PARTIALLY_MATCHED: { label: "Partially Matched", hint: "Tax agrees; date or taxable value differ", tone: TONE.sky },
  AMENDED: { label: "Amended", hint: "Supplier amended the document - reconciles", tone: TONE.green },
  MISMATCHED: { label: "Mismatched", hint: "Tax filed differs from the books", tone: TONE.amber },
  CREDIT_NOTE_MISMATCH: { label: "Credit note mismatch", hint: "Supplier's credit note differs from the books", tone: TONE.amber },
  MISSING_IN_GSTR2B: { label: "Missing in GSTR-2B", hint: "In the books, not filed by the supplier", tone: TONE.rose },
  MISSING_IN_AP: { label: "Missing in AP", hint: "Filed by the supplier, not booked", tone: TONE.slate },
  DUPLICATE: { label: "Duplicate", hint: "More than one document could match", tone: TONE.violet },
  REQUIRES_REVIEW: { label: "Requires Review", hint: "Needs a Finance decision", tone: TONE.amber },
};
export const RECON_STATUS_ALIASES = {
  MISMATCH: "MISMATCHED",
  NOT_IN_BOOKS: "MISSING_IN_AP",
  MISSING_IN_BOOKS: "MISSING_IN_AP",
  POTENTIAL_DUPLICATE: "DUPLICATE",
  REVIEW_REQUIRED: "REQUIRES_REVIEW",
  MISSING: "MISSING_IN_GSTR2B",
  MISSING_IN_2B: "MISSING_IN_GSTR2B",
};
export const normalizeReconStatus = (code) => RECON_STATUS_ALIASES[code] || code;
export const reconSpec = (code) => RECON_STATUS[normalizeReconStatus(code)] || UNKNOWN(code);

/** Status filter chips, in workflow order; `countKey` is the matching field of GET /gstr2b/matches/summary. */
export const RECON_FILTERS = [
  { value: "MATCHED", countKey: "matched_count" },
  { value: "PARTIALLY_MATCHED", countKey: "partially_matched" },
  { value: "MISMATCHED", countKey: "mismatched_count" },
  { value: "MISSING_IN_GSTR2B", countKey: "missing_in_gstr2b" },
  { value: "MISSING_IN_AP", countKey: "missing_in_ap" },
  { value: "DUPLICATE", countKey: "duplicates" },
  { value: "REQUIRES_REVIEW", countKey: "review_required_count" },
  // Shown only when the period has any (see Gstr2bPanel).
  { value: "AMENDED", countKey: "amended_count", optional: true },
  { value: "CREDIT_NOTE_MISMATCH", countKey: "credit_note_mismatch_count", optional: true },
];

/** Finance's decision on a reconciliation record (PATCH /gstr2b/matches/{id}/review). */
export const RECON_REVIEW = {
  ACCEPTED: { label: "Accepted", tone: TONE.green },
  ON_HOLD: { label: "On hold", tone: TONE.amber },
};
