import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/gst/itc`;

const id = (value) => encodeURIComponent(value);

/** Only the tax components the user actually entered; an omitted component uses the backend default. */
export function componentPayload(amounts) {
  if (!amounts) return null;
  const out = {};
  for (const c of ["igst", "cgst", "sgst", "cess"]) {
    if (amounts[c] !== undefined && amounts[c] !== null && amounts[c] !== "") out[c] = Number(amounts[c]);
  }
  return Object.keys(out).length ? out : null;
}

/**
 * GST input tax credit API (/apm/gst/itc - Backend API_Layer/routes/gst_itc_route.py).
 * Eligibility, approval and claim status are decided and calculated by the backend; credit only
 * counts as claimed once a recorded GSTR-3B filing is verified by a second Finance user.
 */
export const gstItcService = {
  /** The month's purchase invoices with their GST split, ITC status and what needs attention. */
  async register(month) {
    const { data } = await api.get(BASE, { params: month ? { month } : undefined });
    return data;
  },

  /** One invoice's credit: system suggestion vs Finance decision, approval, allocations, claim status. */
  async detail(invoiceId) {
    const { data } = await api.get(`${BASE}/${id(invoiceId)}`);
    return data;
  },

  /** Eligibility / approval / claim / reversal decisions on the invoice's credit. */
  async history(invoiceId) {
    const { data } = await api.get(`${BASE}/${id(invoiceId)}/history`);
    return data;
  },

  /** Finance's eligibility decision, optionally partial per component (ELIGIBLE only). */
  async setEligibility(invoiceId, { eligibility, reason, eligibleAmounts, comments }) {
    const { data } = await api.put(`${BASE}/${id(invoiceId)}/eligibility`, {
      eligibility,
      reason,
      eligible_amounts: componentPayload(eligibleAmounts),
      comments: comments || null,
    });
    return data;
  },

  async setIrn(invoiceId, irn, ackNo) {
    const { data } = await api.put(`${BASE}/${id(invoiceId)}/irn`, { irn, ack_no: ackNo || null });
    return data;
  },

  /**
   * Internal approval for a GSTR-3B period: APPROVE / REJECT / UNDER_REVIEW / RESET. `period` is
   * "YYYY-MM-01". Approval never marks credit as claimed.
   */
  async decideApproval(invoiceId, { decision, period, amounts, comments }) {
    const { data } = await api.post(`${BASE}/${id(invoiceId)}/approval`, {
      decision,
      period: period || null,
      amounts: componentPayload(amounts),
      comments: comments || null,
    });
    return data;
  },

  async filings({ financialYear, page = 1, pageSize = 50 } = {}) {
    const { data } = await api.get(`${BASE}/gstr3b/filings`, {
      params: { ...(financialYear ? { financial_year: financialYear } : {}), page, page_size: pageSize },
    });
    return data;
  },

  async filing(filingId) {
    const { data } = await api.get(`${BASE}/gstr3b/filings/${id(filingId)}`);
    return data;
  },

  /**
   * Records a GSTR-3B already filed on the GST portal (nothing is submitted to the portal from
   * here). `allocations` omitted = every invoice's approved credit for the period.
   */
  async recordFiling({ period, filingDate, arn, evidenceReference, remarks, allocations, nilReturn = false }) {
    const { data } = await api.post(`${BASE}/gstr3b/filings`, {
      period,
      filing_date: filingDate,
      arn,
      evidence_reference: evidenceReference || null,
      remarks: remarks || null,
      allocations: allocations
        ? allocations.map((a) => ({ invoice_id: a.invoiceId, ...(componentPayload(a.amounts) || {}) }))
        : null,
      nil_return: nilReturn,
    });
    return data;
  },

  /** A second Finance user verifies the filing; only then does its credit count as claimed. */
  async verifyFiling(filingId) {
    const { data } = await api.post(`${BASE}/gstr3b/filings/${id(filingId)}/verify`);
    return data;
  },

  /**
   * POST /claim now records the period's filed GSTR-3B (ARN + filing date are required) - it no
   * longer marks credit claimed in one click. The UI records filings through recordFiling (which
   * also takes allocations); this stays for callers of the old endpoint and refuses the old
   * period-only payload instead of sending it.
   */
  async claim({ period, arn, filingDate, evidenceReference, remarks }) {
    if (!arn || !filingDate) {
      throw new Error("The GSTR-3B ARN and filing date are required to record a claim.");
    }
    const { data } = await api.post(`${BASE}/claim`, {
      period,
      arn,
      filing_date: filingDate,
      evidence_reference: evidenceReference || null,
      remarks: remarks || null,
    });
    return data;
  },

  /** Reverses claimed credit in a return (default: all of it). `period` is "YYYY-MM-01". */
  async reverse(invoiceIds, period, { reason } = {}) {
    const { data } = await api.post(`${BASE}/reverse`, { invoice_ids: invoiceIds, period, reason: reason || null });
    return data;
  },

  /** Re-claims reversed credit of a paid invoice in a recorded GSTR-3B. */
  async reclaim(invoiceIds, period) {
    const { data } = await api.post(`${BASE}/reclaim`, { invoice_ids: invoiceIds, period });
    return data;
  },
};

export default gstItcService;
