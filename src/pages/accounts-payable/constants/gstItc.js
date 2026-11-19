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
  NOT_RECORDED: { label: "Not recorded", tone: TONE.slate },
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

/** GSTR-2B import modes (backend import_mode). DEMO data is never a supplier filing and never feeds ITC. */
export const GSTR2B_IMPORT_MODES = {
  OFFICIAL: { label: "Official", tone: TONE.indigo, title: "Official GST Portal Excel" },
  DEMO: { label: "DEMO", tone: TONE.amber, title: "Demo Excel Template", hint: "Demo data - not a supplier filing, never used for ITC" },
};
export const importModeSpec = (code) => GSTR2B_IMPORT_MODES[code] || UNKNOWN(code);

/** Where an import came from (backend source_type). */
export const GSTR2B_SOURCE_TYPES = {
  GST_PORTAL_EXCEL: "GST portal Excel",
  GST_PORTAL_JSON: "GST portal JSON",
  CSV_TEMPLATE: "CSV template",
  AP_DEMO_EXCEL: "AP demo Excel template",
};

/** The AP demo Excel template - Backend gstr2b_excel.DEMO_COLUMNS. */
export const GSTR2B_DEMO_COLUMNS = [
  { header: "Supplier GSTIN", required: true }, { header: "Supplier Name" }, { header: "Document Type" },
  { header: "Document Number", required: true }, { header: "Document Date", required: true },
  { header: "Taxable Value", required: true }, { header: "IGST", required: true }, { header: "CGST", required: true },
  { header: "SGST", required: true }, { header: "Cess" }, { header: "ITC Available" }, { header: "Reason" },
];

/** Field names in GSTR-2B validation errors -> labels. */
export const GSTR2B_FIELD_LABELS = {
  supplier_gstin: "Supplier GSTIN", document_number: "Document number", document_date: "Document date",
  document_type: "Document type", taxable_value: "Taxable value", igst_amount: "IGST", cgst_amount: "CGST",
  sgst_amount: "SGST", cess_amount: "Cess", itc_available: "ITC available", original_document_number: "Original document number",
};

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

/**
 * The four reconciliation outcomes (`match_group` on GET /gstr2b/matches rows, `match_groups` counts on the
 * summary / import / workflow) - Backend gstr2b_service.MATCH_GROUP. The detailed status stays on each row.
 * `countKey` is the key in `match_groups`. AP invoices missing in GSTR-2B have no group.
 */
export const MATCH_GROUPS = [
  { value: "MATCHED", countKey: "matched", label: "Matched", hint: "Agrees with the books (incl. amended)", tone: TONE.green },
  { value: "PARTIALLY_MATCHED", countKey: "partially_matched", label: "Partially matched", hint: "Differences to check", tone: TONE.sky },
  { value: "UNMATCHED", countKey: "unmatched", label: "Unmatched", hint: "Filed by the supplier, not in AP", tone: TONE.slate },
  { value: "REVIEW_REQUIRED", countKey: "review_required", label: "Review required", hint: "Ambiguous - resolve by hand", tone: TONE.amber },
];
export const matchGroupSpec = (code) => MATCH_GROUPS.find((g) => g.value === code) || UNKNOWN(code);

/**
 * State of the AP invoice matching stage on the workflow dashboard - read off the backend's import status, its
 * match-group counts and next_step (see reconciliationState in ItcOverview), never from the counts' values.
 */
export const RECON_STAGE_STATE = {
  NOT_IMPORTED: { label: "Awaiting GSTR-2B import", tone: TONE.slate },
  PENDING: { label: "Reconciliation pending", tone: TONE.sky },
  REVIEW: { label: "Requires review", tone: TONE.amber },
  COMPLETED: { label: "Reconciled", tone: TONE.green },
};

/** Where an invoice's credit stands (`itc_position.position` on GET /itc/{id}) - Backend ITC_POSITIONS. */
export const ITC_POSITION = {
  ELIGIBLE: { label: "Eligible", hint: "Approvable for GSTR-3B now", tone: TONE.green },
  PENDING_REVIEW: { label: "Pending review", hint: "Held - see the reasons", tone: TONE.amber },
  INELIGIBLE: { label: "Ineligible", tone: TONE.rose },
  ALREADY_CLAIMED: { label: "Already claimed", hint: "Claimed in a verified GSTR-3B", tone: TONE.indigo },
};
export const ITC_POSITION_ORDER = ["ELIGIBLE", "PENDING_REVIEW", "INELIGIBLE", "ALREADY_CLAIMED"];
export const itcPositionSpec = (code) => ITC_POSITION[code] || UNKNOWN(code);
/** itc_position reason codes meaning Finance has not reviewed / confirmed the eligibility yet. */
export const FINANCE_REVIEW_REASONS = ["ELIGIBILITY_NOT_CONFIRMED", "ELIGIBILITY_REVIEW"];

/**
 * The six stages of GET /itc/workflow, in order. `step` lists the backend next_step codes that point at the stage;
 * `tab` is the GstItcPage tab that holds it.
 */
export const WORKFLOW_STAGES = [
  { key: "gstr2b_import", label: "GSTR-2B upload", tab: "gstr2b", steps: ["UPLOAD_GSTR2B"] },
  { key: "reconciliation", label: "AP invoice matching", tab: "gstr2b", steps: ["RESOLVE_RECONCILIATION"] },
  { key: "itc_eligibility", label: "ITC eligibility", tab: "review", steps: ["REVIEW_ELIGIBILITY"] },
  { key: "approval", label: "ITC approval", tab: "review", steps: ["APPROVE_ITC"] },
  { key: "itc_register", label: "ITC register", tab: "register", steps: [] },
  { key: "gstr3b_claim", label: "GSTR-3B filing", tab: "filings", steps: ["RECORD_GSTR3B_FILING", "VERIFY_GSTR3B_FILING"] },
];

/**
 * Backend `next_step` (GstItcWorkflowService._next_step) -> the action offered. The backend decides the step; this
 * only says where it is done. `view` pre-selects the eligibility worklist view.
 */
export const NEXT_STEPS = {
  UPLOAD_GSTR2B: { label: "Upload GSTR-2B", tab: "gstr2b", action: "import" },
  RESOLVE_RECONCILIATION: { label: "Resolve GSTR-2B reconciliation", tab: "gstr2b" },
  REVIEW_ELIGIBILITY: { label: "Review ITC eligibility", tab: "review", view: "eligibility" },
  APPROVE_ITC: { label: "Approve ITC", tab: "review", view: "ready" },
  RECORD_GSTR3B_FILING: { label: "Record GSTR-3B filing", tab: "filings", action: "record" },
  VERIFY_GSTR3B_FILING: { label: "Verify GSTR-3B filing", tab: "filings", action: "verify" },
  COMPLETE: { label: "Workflow completed", tab: "register", done: true },
};

/** Finance's decision on a reconciliation record (PATCH /gstr2b/matches/{id}/review). */
export const RECON_REVIEW = {
  ACCEPTED: { label: "Accepted", tone: TONE.green },
  ON_HOLD: { label: "On hold", tone: TONE.amber },
};
