/** GST input tax credit (ITC) register - mirrors Backend gst_itc_service.py. */
export const GST_ITC_MANAGE_PERMISSIONS = ["GST_ITC_MANAGE", "AP_AUTOMATION_MANAGE"];
export const GST_ITC_VIEW_PERMISSIONS = ["GST_ITC_VIEW", ...GST_ITC_MANAGE_PERMISSIONS, "PAYMENT_VIEW", "PAYMENT_PROCESS"];

export const ELIGIBILITY = {
  ELIGIBLE: { label: "Eligible", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  REVIEW: { label: "Review", tone: "bg-amber-50 text-amber-700 ring-amber-200" },
  BLOCKED: { label: "Blocked (s.17(5))", tone: "bg-rose-50 text-rose-700 ring-rose-200" },
  NOT_CLAIMABLE: { label: "Not claimable", tone: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export const ITC_STATUS = {
  PENDING: "Not yet claimed",
  CLAIMED: "Claimed",
  REVERSED: "Reversed",
  NOT_CLAIMABLE: "—",
};

export const IRN_STATUS = {
  PRESENT: { label: "IRN ✓", tone: "text-emerald-700" },
  MISSING: { label: "IRN missing", tone: "font-medium text-rose-600" },
  NOT_REQUIRED: { label: "Not e-invoice", tone: "text-slate-400" },
  UNKNOWN: { label: "Unknown", tone: "text-slate-400" },
};

export const RISK = {
  AT_RISK: "Pay soon: 180-day ITC deadline",
  REVERSAL_DUE: "Unpaid > 180 days: reverse ITC",
  RECLAIM: "Paid: re-claim reversed ITC",
};

/** GSTR-2B match of a document / invoice - mirrors Backend gstr2b_service.py. */
export const GSTR2B_MATCH = {
  MATCHED: { label: "Matched", hint: "Filed by the supplier, tax agrees - claimable", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  MISMATCH: { label: "Mismatch", hint: "Tax filed differs from the books - ask the supplier to amend", tone: "bg-amber-50 text-amber-700 ring-amber-200" },
  MISSING: { label: "Missing in 2B", hint: "In the books, not filed by the supplier - credit held", tone: "bg-rose-50 text-rose-700 ring-rose-200" },
  NOT_IN_BOOKS: { label: "Not in books", hint: "Filed against us, not booked - get the invoice or dispute", tone: "bg-slate-100 text-slate-700 ring-slate-200" },
};
