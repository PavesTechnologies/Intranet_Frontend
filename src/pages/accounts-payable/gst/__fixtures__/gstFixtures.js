import { vi } from "vitest";

/**
 * Test fixtures shaped like the real responses of gstr2b_route.py / gst_itc_route.py, and a
 * helper that gives every mocked hook of ../hooks/useGstItc a sensible default.
 */
export const GSTIN = "36AADCH8710J1ZH";
export const OTHER_GSTIN = "29ABCDE1234F1Z5";
const C = (igst, cgst, sgst, cess = 0) => ({ igst, cgst, sgst, cess, total: igst + cgst + sgst + cess });

export const PERIODS = [
  { period: "2026-11", display_name: "Purchase Invoices · Nov 2026", financial_year: "2026-27", gstr2b_imported: false, import_status: "NOT_IMPORTED", gstr2b_available_from: "2026-12-14" },
  { period: "2026-10", display_name: "Purchase Invoices · Oct 2026", financial_year: "2026-27", gstr2b_imported: true, import_id: 3, import_status: "COMPLETED", gstr2b_available_from: "2026-11-14" },
  { period: "2026-03", display_name: "Purchase Invoices · Mar 2026", financial_year: "2025-26", gstr2b_imported: false, import_status: "NOT_IMPORTED", gstr2b_available_from: "2026-04-14" },
];

export const SUMMARY = {
  return_period: "2026-10", import_id: 3, import_status: "COMPLETED", file_name: "GSTR2B_102026.xlsx", imported_at: "2026-11-14T10:00:00Z",
  total_ap_invoices: 14, total_gstr2b_records: 15, matched: 9, matched_count: 8, amended_count: 1, partially_matched: 1,
  mismatched: 2, mismatched_count: 2, credit_note_mismatch_count: 0, missing_in_gstr2b: 1, missing_in_ap: 1, duplicates: 1,
  review_required_count: 1, match_groups: { matched: 9, partially_matched: 3, unmatched: 1, review_required: 2 },
  eligible_itc: C(0, 51750, 51750), eligible_itc_unconfirmed: C(0, 0, 0), ineligible_itc: C(0, 900, 900),
  pending_review_itc: C(18000, 0, 0), pending_review_amount: 18000, eligibility_pending_review_count: 1,
  approved_for_gstr3b: C(0, 5715, 5715), approved_for_gstr3b_amount: 11430, approved_for_gstr3b_count: 1,
  claimed_in_gstr3b: C(0, 24300, 24300), claimed_in_gstr3b_amount: 48600, claimed_in_gstr3b_count: 1,
};

const invoice = (extra) => ({
  invoice_id: 40, invoice_number: "WWIM/HYD/26-27/02902", invoice_date: "2026-10-01", vendor_name: "WEWORK INDIA",
  supplier_gstin: GSTIN, invoice_status: "APPROVED", taxable_value: 270000, igst: 0, cgst: 24300, sgst: 24300, cess: 0,
  gst_total: 48600, invoice_total: 318600, ...extra,
});
const doc = (extra) => ({
  supplier_gstin: GSTIN, supplier_name: "WEWORK INDIA", document_type: "INV", document_number: "WWIM/HYD/26-27/02902",
  document_date: "2026-10-01", taxable_value: 270000, igst: 0, cgst: 24300, sgst: 24300, cess: 0, gst_total: 48600, section: "B2B", source_row: 7, ...extra,
});

export const matchItem = (extra) => ({
  match_id: 1, import_id: 3, reconciliation_status: "MATCHED", match_status: "MATCHED", review_status: null,
  purchase_invoice_details: invoice(), supplier_gstr2b_details: doc(), mismatch_reasons: [], tax_difference: 0,
  itc_eligibility_status: "ELIGIBLE", itc_approval_status: "NOT_REVIEWED", itc_approval_period: null, ...extra,
});

export const MATCH_ITEMS = [
  matchItem(),
  matchItem({ match_id: 2, reconciliation_status: "MISMATCHED", match_status: "MISMATCH", tax_difference: 500,
    supplier_gstr2b_details: doc({ document_number: "WWIM/HYD/26-27/02950", gst_total: 49100 }),
    purchase_invoice_details: invoice({ invoice_id: 41, invoice_number: "WWIM/HYD/26-27/02950" }),
    mismatch_reasons: ["CGST: supplier filed 24,550.00 vs 24,300.00 in the books (difference +250.00)"] }),
  matchItem({ match_id: 3, reconciliation_status: "MISSING_IN_AP", match_status: "NOT_IN_BOOKS", purchase_invoice_details: null,
    supplier_gstr2b_details: doc({ document_number: "WWIM/HYD/26-27/03001" }), mismatch_reasons: ["Filed by the supplier but not in the books"] }),
  matchItem({ match_id: null, reconciliation_status: "MISSING_IN_GSTR2B", match_status: null, supplier_gstr2b_details: null,
    purchase_invoice_details: invoice({ invoice_id: 42, invoice_number: "KTPL/26-27/0527", supplier_gstin: GSTIN }),
    mismatch_reasons: ["Not in the supplier's GSTR-2B yet - credit cannot be claimed until the supplier files it (s.16(2)(aa))"] }),
  matchItem({ match_id: 5, reconciliation_status: "PARTIALLY_MATCHED", supplier_gstr2b_details: doc({ document_number: "P-5" }) }),
  matchItem({ match_id: 6, reconciliation_status: "DUPLICATE", match_status: "POTENTIAL_DUPLICATE", supplier_gstr2b_details: doc({ document_number: "D-6" }) }),
  // Historical record still carrying the older API name
  matchItem({ match_id: 7, reconciliation_status: "REVIEW_REQUIRED", supplier_gstr2b_details: doc({ document_number: "R-7" }) }),
];

export const MATCH_DETAIL = {
  ...MATCH_ITEMS[2],
  return_period: "2026-10", import_is_current: true, mapping: { source: "AUTO" }, field_level_comparison: null, review_history: [],
};

export const registerRow = (extra) => ({
  invoice_id: 9, invoice_number: "WWIM/HYD/26-27/02604", invoice_date: "2026-10-09", vendor_name: "WEWORK INDIA MANAGEMENT LIMITED",
  supplier_gstin: GSTIN, supply_type: "INTRA", invoice_status: "APPROVED", taxable_value: 63500, cgst: 5715, sgst: 5715, igst: 0, cess: 0,
  itc: 11430, itc_eligibility: "ELIGIBLE", itc_eligibility_api_status: "ELIGIBLE", eligibility_basis: "FINANCE_DECISION",
  eligibility_reason: null, itc_status: "PENDING", claim_period: null, irn_status: "PRESENT", risk: null, gstr2b: "MATCHED",
  claim_blockers: [], approval_status: "NOT_REVIEWED", approval_period: null, claim_source: null, ...extra,
});

export const REGISTER = {
  summary: { claimable_now: 156331.8, claimable_count: 12, claim_period: "2026-10-01", claim_due: "2026-11-20", irn_missing: 1,
    review: 0, blocked_itc: 0, at_risk: 0, reversal_due: 0, reclaim: 0, gstr2b: "CHECKED", gstr2b_period: "2026-10-01", gstr2b_held: 0 },
  invoices: [
    registerRow(),
    registerRow({ invoice_id: 10, invoice_number: "OLD/1", itc_status: "CLAIMED", claim_period: "2026-09-01", claim_source: "LEGACY" }),
    registerRow({ invoice_id: 11, invoice_number: "SUG/1", itc_eligibility: "REVIEW", itc_eligibility_api_status: "PENDING_REVIEW", eligibility_basis: "SYSTEM_SUGGESTION" }),
  ],
  attention: [registerRow({ irn_status: "MISSING" })],
  periods: [{ period: "2026-10-01", label: "Oct 2026", claimed: 0, invoices: 0, due_date: "2026-11-20" }],
};

export const itcDetail = (extra) => ({
  ...registerRow(),
  itc_eligibility_basis: "FINANCE_DECISION",
  itc_eligible: C(0, 5715, 5715), itc_ineligible: C(0, 0, 0),
  itc_eligibility_reviewed_by: "fin-maker", itc_eligibility_reviewed_at: "2026-11-02T09:00:00Z",
  itc_approval_status: "NOT_REVIEWED", itc_approval_period: null, itc_approved: null,
  eligibility_suggestion: { status: "ELIGIBLE", reasons: ["Receipt of goods / services (s.16(2)(b)) is confirmed by Finance - not checked automatically"] },
  net_claimed: C(0, 0, 0), claim_status: "NOT_CLAIMED", allocations: [],
  ...extra,
});

export const FILINGS = {
  items: [
    { filing_id: 4, return_period: "2026-10", financial_year: "2026-27", filing_status: "FILED", filing_date: "2026-11-12", arn: "AA2910260012345",
      recorded_by: "fin-maker", recorded_at: "2026-11-12T10:00:00Z", verified_by: null, verified_at: null, claims_effective: false,
      totals: { claim: C(0, 5715, 5715), reversal: C(0, 0, 0), reclaim: C(0, 0, 0) } },
    { filing_id: 3, return_period: "2026-09", financial_year: "2026-27", filing_status: "VERIFIED", filing_date: "2026-10-18", arn: "AA2909260099999",
      recorded_by: "fin-maker", recorded_at: "2026-10-18T10:00:00Z", verified_by: "fin-checker", verified_at: "2026-10-19T10:00:00Z", claims_effective: true, totals: null },
  ],
  total: 2, page: 1, page_size: 200,
};

/** POST /gstr2b/import/preview - an importable official workbook. */
export const PREVIEW = {
  file_name: "GSTR2B_102026.xlsx", import_mode: "OFFICIAL", is_demo: false, source_type: "GST_PORTAL_EXCEL", source_format: "XLSX",
  return_period: "2026-10", total_records: 2, accepted_records: 2, skipped_records: 0, rejected_records: 0,
  validation_errors: [], duplicate_records: [], blocking_errors: [], warnings: [], can_import: true,
  replace_required: false, duplicate_file: false, existing_import: null, demo_notice: null,
  records: [
    { sheet: "B2B", row: 5, supplier_gstin: GSTIN, document_type: "INV", document_number: "WWIM/HYD/26-27/03001", document_date: "2026-10-01",
      taxable_value: 63500, igst_amount: 0, cgst_amount: 5715, sgst_amount: 5715, cess_amount: 0, itc_available: true },
    { sheet: "B2B", row: 6, supplier_gstin: GSTIN, document_type: "INV", document_number: "WWIM/HYD/26-27/03002", document_date: "2026-10-02",
      taxable_value: 1000, igst_amount: 0, cgst_amount: 90, sgst_amount: 90, cess_amount: 0, itc_available: null },
  ],
};

/** GET /itc/workflow?return_period=2026-10 - Backend GstItcWorkflowService.summary. */
const T4 = (row, label, v) => ({ row, label, ...v });
export const WORKFLOW = {
  return_period: "2026-10", financial_year: "2026-27", as_of: "2026-11-18",
  gstr2b_import: {
    import_status: "COMPLETED", import_id: 3, file_name: "GSTR2B_102026.xlsx", imported_at: "2026-11-14T10:00:00Z", imported_by: "fin-maker",
    source_type: "GST_PORTAL_EXCEL", total_records: 15, accepted_records: 15, rejected_records: 0, skipped_records: 0,
    available_from: "2026-11-14", documents: 15, credit_notes: 0, superseded_by_amendment: 0, invoice_value: 1250000,
    documents_without_invoice_value: 0, taxable_value: 1060000, igst: 18000, cgst: 86000, sgst: 86000, cess: 0, total_gst: 190000,
  },
  reconciliation: { total_records: 15, matched: 9, partially_matched: 3, unmatched: 1, review_required: 2, missing_in_gstr2b: 1,
    accepted_after_review: 0, on_hold: 0, partially_matched_tax_difference: 500 },
  itc_eligibility: {
    invoices: 14, invoice_counts: { eligible: 8, ineligible: 1, pending_review: 3, already_claimed: 2 },
    eligible_itc: C(0, 51750, 51750), ineligible_itc: C(0, 900, 900), pending_itc: C(18000, 0, 0), already_claimed_itc: C(0, 24300, 24300),
    awaiting_finance_confirmation_itc: C(18000, 0, 0),
    reasons: [{ position: "PENDING_REVIEW", code: "ELIGIBILITY_NOT_CONFIRMED", label: "System suggestion only - Finance has not confirmed the eligibility", invoices: 1, itc: 18000 }],
  },
  approval: { approved_itc: C(0, 5715, 5715), pending_approval_itc: C(0, 46035, 46035), rejected_itc: C(0, 0, 0),
    counts: { approved: 1, pending_approval: 7, under_review: 0, rejected: 0 },
    note: "Only ELIGIBLE credit can be approved, and only approved credit goes into a GSTR-3B filing" },
  itc_register: { total_itc_identified: C(18000, 77850, 77850), total_matched_itc: C(0, 70000, 70000), total_eligible_itc: C(0, 51750, 51750),
    total_approved_itc: C(0, 5715, 5715), total_claimed_itc: C(0, 24300, 24300), remaining_claimable_itc: C(0, 5715, 5715),
    reversed_itc: C(0, 0, 0), claim_status_counts: { NOT_CLAIMED: 11, APPROVED_FOR_GSTR3B: 1, CLAIMED_IN_GSTR3B: 2 } },
  gstr3b_claim: {
    return_period: "2026-10", due_date: "2026-11-20", return_open: true, filing_status: "NOT_RECORDED", filing: null,
    ready_for_claim_itc: C(0, 5715, 5715), ready_for_claim_count: 1, in_filing_awaiting_verification_itc: C(0, 0, 0),
    claimed_itc: C(0, 0, 0), reclaimed_itc: C(0, 0, 0), reversed_itc: C(0, 0, 0), credit_note_itc: C(0, 0, 0),
    table_4: { basis: "APPROVED_FOR_PERIOD", blocked_in_gstr2b: C(0, 0, 0), rows: [
      T4("4A3", "4(A)(3) Inward supplies liable to reverse charge", C(0, 0, 0)),
      T4("4A5", "4(A)(5) All other ITC", C(0, 5715, 5715)),
      T4("4B1", "4(B)(1) Reversed - rules 38, 42, 43 and section 17(5)", C(0, 0, 0)),
      T4("4B2", "4(B)(2) Reversed - others", C(0, 0, 0)),
      T4("4C", "4(C) Net ITC available (A) - (B)", C(0, 5715, 5715)),
      T4("4D1", "4(D)(1) ITC reclaimed which was reversed under 4(B)(2) in an earlier period", C(0, 0, 0)),
      T4("4D2", "4(D)(2) Ineligible ITC under section 16(4) and ITC restricted due to place-of-supply rules", C(0, 0, 0)),
    ] },
    net_tax_payable: null, net_tax_payable_note: "Not computed: needs the output tax liability (GSTR-1 / sales), outside Accounts Payable",
  },
  next_step: "REVIEW_ELIGIBILITY",
};

export const query = (data, extra) => ({ data, isLoading: false, isError: false, isFetching: false, error: null, ...extra });
export const mutation = (result = {}) => ({ mutateAsync: vi.fn().mockResolvedValue(result), isPending: false });

export const HOOK_NAMES = [
  "useGstRegister", "useItcDetail", "useItcDetails", "useItcHistory", "useSetIrn", "useSetEligibility", "useDecideApproval",
  "useReverseItc", "useReclaimItc", "useGstr3bFilings", "useGstr3bFiling", "useRecordFiling", "useVerifyFiling", "useGstPeriods",
  "useGstr2bSummary", "useGstr2bMatches", "useGstr2bMatchDetail", "useGstr2bImports", "useImportGstr2b", "useRematchGstr2b",
  "useMapGstr2bMatch", "useReviewGstr2bMatch", "usePreviewGstr2b", "useGstWorkflow",
];

/** Gives every mocked hook a default; returns the mutation mocks so tests can assert on them. */
export function setupGstHooks(hooks) {
  const m = {};
  hooks.useGstPeriods.mockReturnValue(query(PERIODS));
  hooks.useGstr2bSummary.mockReturnValue(query(SUMMARY));
  hooks.useGstWorkflow.mockReturnValue(query(WORKFLOW));
  hooks.useGstr2bMatches.mockReturnValue(query({ items: MATCH_ITEMS, total: MATCH_ITEMS.length, page: 1, page_size: 25 }));
  hooks.useGstr2bMatchDetail.mockReturnValue(query(MATCH_DETAIL));
  hooks.useGstr2bImports.mockReturnValue(query([]));
  hooks.useGstRegister.mockReturnValue(query(REGISTER));
  hooks.useItcDetail.mockReturnValue(query(itcDetail()));
  hooks.useItcDetails.mockReturnValue([]);
  hooks.useItcHistory.mockReturnValue(query([]));
  hooks.useGstr3bFilings.mockReturnValue(query(FILINGS));
  hooks.useGstr3bFiling.mockReturnValue(query({ ...FILINGS.items[0], allocations: [] }));
  for (const name of ["useSetIrn", "useSetEligibility", "useDecideApproval", "useReverseItc", "useReclaimItc", "useRecordFiling",
    "useVerifyFiling", "useImportGstr2b", "useRematchGstr2b", "useMapGstr2bMatch", "useReviewGstr2bMatch", "usePreviewGstr2b"]) {
    m[name] = mutation(name === "usePreviewGstr2b" ? PREVIEW : {});
    hooks[name].mockReturnValue(m[name]);
  }
  return m;
}
