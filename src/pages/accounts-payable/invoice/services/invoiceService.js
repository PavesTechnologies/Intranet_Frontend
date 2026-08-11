import { INVOICE_FIXTURES } from "../../mocks/invoiceMockData";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import { ISSUE_STATUS, ISSUE_SOURCE, ISSUE_SEVERITY } from "../../constants/invoiceIssues";
import { createEmptyInvoice } from "../../types/invoice";
import { calculateBalance } from "../../utils/formatters";
import api from "../../../../api/axiosInstance.js";

/**
 * Mock-backed invoice service. Every method matches the call signature a real endpoint would
 * have (params in, plain data out — no axios response envelope), so swapping to the real FastAPI
 * backend later means rewriting method bodies to call the shared axiosInstance, not touching any
 * caller (hooks/components never know which backend a method is talking to).
 *
 * NO REAL BACKEND EXISTS YET for any of these endpoints — see the implementation report for the
 * exact list of assumed routes.
 */

const MOCK_RESPONSE_DELAY_MS = 350;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

api.defaults.baseURL = "http://localhost:8000/apm"; // Base URL for the API

// In-memory store, seeded from the fixtures once per app session (not per call) so
// uploads/edits/resolutions persist across navigation within the same browser session.
let invoiceStore = JSON.parse(JSON.stringify(INVOICE_FIXTURES));
let nextInvoiceSeq = invoiceStore.length + 1;

function cloneInvoice(invoice) {
  return invoice ? JSON.parse(JSON.stringify(invoice)) : invoice;
}

function matchesSearch(invoice, search) {
  if (!search) return true;
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (
    invoice.invoiceNumber?.toLowerCase().includes(term) ||
    invoice.vendor?.name?.toLowerCase().includes(term) ||
    invoice.purchaseOrder?.poNumber?.toLowerCase().includes(term)
  );
}

function matchesDateRange(invoice, dateField, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return true;
  const raw = invoice[dateField];
  if (!raw) return false;
  const value = new Date(raw).getTime();
  if (dateFrom && value < new Date(dateFrom).getTime()) return false;
  if (dateTo && value > new Date(dateTo).getTime()) return false;
  return true;
}

let mockIssueSeq = 9000;
function buildIssue({ source, type, severity, result, description }) {
  return { id: `iss-${mockIssueSeq++}`, issueSource: source, issueType: type, severity, result, description, status: ISSUE_STATUS.OPEN, resolvedBy: "", resolvedAt: "" };
}

/**
 * Picks one of the four possible post-processing outcomes for a freshly uploaded invoice.
 * High OCR confidence never fast-tracks straight to APPROVED/READY_FOR_PAYMENT — the best
 * outcome a mock upload can land in is PENDING_APPROVAL, which still requires a human approval
 * decision (see InvoiceApprovalPanel and the "no auto-approve" business rule).
 */
function pickUploadOutcome() {
  const roll = Math.random() * 100;
  if (roll < 40) {
    const confidenceScore = 0.55 + Math.random() * 0.23; // 55–78%
    return {
      type: "ocr_review",
      status: INVOICE_STATUS.OCR_REVIEW_PENDING,
      confidenceScore,
      issues: [
        buildIssue({
          source: ISSUE_SOURCE.OCR,
          type: "LOW_CONFIDENCE_FIELD",
          severity: ISSUE_SEVERITY.WARNING,
          result: "WARNING",
          description: "One or more extracted fields have low OCR confidence and need manual review.",
        }),
      ],
      historyNote: `OCR confidence below threshold (${Math.round(confidenceScore * 100)}%)`,
    };
  }
  if (roll < 55) {
    const confidenceScore = 0.1 + Math.random() * 0.2; // 10–30%
    return {
      type: "ocr_failed",
      status: INVOICE_STATUS.OCR_FAILED,
      confidenceScore,
      issues: [
        buildIssue({
          source: ISSUE_SOURCE.OCR,
          type: "EXTRACTION_FAILED",
          severity: ISSUE_SEVERITY.ERROR,
          result: "ERROR",
          description: "Unable to extract invoice fields — the document quality is too low.",
        }),
      ],
      historyNote: "OCR extraction failed — document quality too low",
    };
  }
  if (roll < 70) {
    const confidenceScore = 0.85 + Math.random() * 0.13; // 85–98%
    return {
      type: "validation_failed",
      status: INVOICE_STATUS.VALIDATION_FAILED,
      confidenceScore,
      issues: [
        buildIssue({
          source: ISSUE_SOURCE.VALIDATION,
          type: "AMOUNT_MISMATCH",
          severity: ISSUE_SEVERITY.ERROR,
          result: "ERROR",
          description: "Automated validation found a discrepancy between the extracted amount and vendor records.",
        }),
      ],
      historyNote: "Automated validation found a discrepancy",
    };
  }
  const confidenceScore = 0.9 + Math.random() * 0.09; // 90–99%
  return {
    type: "pending_approval",
    status: INVOICE_STATUS.PENDING_APPROVAL,
    confidenceScore,
    issues: [],
    historyNote: "Validation passed — submitted for approval",
  };
}

export const invoiceService = {
  /**
   * @param {Object} [params]
   * @param {string} [params.search] - matches invoice number, vendor name, or PO number
   * @param {string} [params.status] - one exact INVOICE_STATUS to filter to (from the Status filter)
   * @param {string[]} [params.statuses] - status allowlist for the active queue/tab
   * @param {string} [params.invoiceType] - one of INVOICE_TYPES
   * @param {string} [params.dateField] - "invoiceDate" | "dueDate", defaults to "invoiceDate"
   * @param {string} [params.dateFrom] - ISO date string
   * @param {string} [params.dateTo] - ISO date string
   * @param {number} [params.page=1]
   * @param {number} [params.pageSize=10]
   * @returns {Promise<{items: Array, total: number, page: number, pageSize: number, totalPages: number}>}
   *
   * `status` and `statuses` compose (AND), they don't override each other — a tab's status
   * allowlist and a manually chosen Status filter value can both be active at once, e.g.
   * Approval tab (statuses=[PENDING_APPROVAL, REJECTED]) narrowed further by status=REJECTED.
   */
  async getInvoices(params = {}) {
    await wait(MOCK_RESPONSE_DELAY_MS);
    try {
      const {
        search = "",
        status = "",
        statuses = null,
        invoiceType = "",
        dateField = "invoiceDate",
        dateFrom = "",
        dateTo = "",
        page = 1,
        pageSize = 10,
      } = params;

      const filtered = invoiceStore.filter((invoice) => {
        if (statuses && !statuses.includes(invoice.status)) return false;
        if (status && invoice.status !== status) return false;
        if (invoiceType && invoice.invoiceType !== invoiceType) return false;
        if (!matchesSearch(invoice, search)) return false;
        if (!matchesDateRange(invoice, dateField, dateFrom, dateTo)) return false;
        return true;
      });

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const start = (safePage - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize).map(cloneInvoice);

      return { items, total, page: safePage, pageSize, totalPages };
    } catch (error) {
      console.error("Error in invoiceService.getInvoices:", error);
      throw error;
    }
  },

  /** @param {string} invoiceId @returns {Promise<Object>} */
  async getInvoice(invoiceId) {
    await wait(MOCK_RESPONSE_DELAY_MS);
    try {
      const invoice = invoiceStore.find((inv) => inv.id === invoiceId);
      if (!invoice) {
        const error = new Error("Invoice not found");
        error.status = 404;
        throw error;
      }
      return cloneInvoice(invoice);
    } catch (error) {
      console.error("Error in invoiceService.getInvoice:", error);
      throw error;
    }
  },

  /**
   * Uploads a new invoice document and simulates the backend pipeline (OCR extraction, then
   * validation) that a real async OCR/validation job would run. Real backend would accept
   * multipart/form-data and return immediately with a DRAFT record, with the OCR/validation
   * outcome arriving later via polling or a webhook; this mock compresses that into one call and
   * returns the already-settled outcome plus a UI hint (`outcome.type`) for which toast to show.
   * @param {File} file
   * @returns {Promise<{invoice: Object, outcome: {type: string}}>}
   */
  async uploadInvoice(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(
      "/invoice/process-invoice",
      formData
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error in invoiceService.uploadInvoice:",
      error
    );
    throw error;
  }
},

  /** @param {string} invoiceId @returns {Promise<Array>} */
  async getInvoiceIssues(invoiceId) {
    await wait(MOCK_RESPONSE_DELAY_MS);
    try {
      const invoice = invoiceStore.find((inv) => inv.id === invoiceId);
      if (!invoice) {
        const error = new Error("Invoice not found");
        error.status = 404;
        throw error;
      }
      return cloneInvoice(invoice.issues);
    } catch (error) {
      console.error("Error in invoiceService.getInvoiceIssues:", error);
      throw error;
    }
  },

  /**
   * @param {string} issueId
   * @param {Object} [payload]
   * @param {string} [payload.resolvedBy]
   * @returns {Promise<Object>} the updated issue
   */
  async resolveInvoiceIssue(issueId, payload = {}) {
    await wait(MOCK_RESPONSE_DELAY_MS);
    try {
      for (const invoice of invoiceStore) {
        const issueIndex = invoice.issues.findIndex((iss) => iss.id === issueId);
        if (issueIndex === -1) continue;
        invoice.issues[issueIndex] = {
          ...invoice.issues[issueIndex],
          status: ISSUE_STATUS.RESOLVED,
          resolvedBy: payload.resolvedBy || "current_user",
          resolvedAt: new Date().toISOString(),
        };
        return cloneInvoice(invoice.issues[issueIndex]);
      }
      const error = new Error("Issue not found");
      error.status = 404;
      throw error;
    } catch (error) {
      console.error("Error in invoiceService.resolveInvoiceIssue:", error);
      throw error;
    }
  },

  /**
   * Generic partial update — used for saving OCR corrections, submitting for validation, and
   * recording a validation/approval outcome. Callers pass the fields that changed plus any
   * status transition; see useInvoiceMutations.js for the named wrappers around this.
   *
   * When `payload.status` differs from the invoice's current status, an audit history entry is
   * appended automatically (using `payload.historyNote` if given) — callers don't each need to
   * manage the history array themselves.
   * @param {string} invoiceId
   * @param {Object} payload - partial Invoice fields to merge; `historyNote` is consumed here, not stored
   * @returns {Promise<Object>} the updated invoice
   */
  async updateInvoice(invoiceId, payload = {}) {
    await wait(MOCK_RESPONSE_DELAY_MS);
    try {
      const index = invoiceStore.findIndex((inv) => inv.id === invoiceId);
      if (index === -1) {
        const error = new Error("Invoice not found");
        error.status = 404;
        throw error;
      }
      const { historyNote, ...fields } = payload;
      const previous = invoiceStore[index];
      const history =
        fields.status && fields.status !== previous.status
          ? [...(previous.history || []), { status: fields.status, at: new Date().toISOString(), note: historyNote || "" }]
          : previous.history;

      invoiceStore[index] = { ...previous, ...fields, history };
      return cloneInvoice(invoiceStore[index]);
    } catch (error) {
      console.error("Error in invoiceService.updateInvoice:", error);
      throw error;
    }
  },

  /**
   * Aggregate KPIs for the Invoice Management header cards. Computed over the full store (not
   * the current page/filter), matching what a real backend summary/stats endpoint would return.
   * @returns {Promise<{totalInvoicesThisMonth: number, pendingApprovalCount: number,
   *   readyForPaymentCount: number, readyForPaymentBalance: number, paidThisMonthCount: number,
   *   paidThisMonthAmount: number}>}
   */
  async getInvoiceSummary() {
    await wait(MOCK_RESPONSE_DELAY_MS);
    try {
      const now = new Date();
      const isThisMonth = (isoDate) => {
        if (!isoDate) return false;
        const d = new Date(isoDate);
        return !Number.isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      };

      const totalInvoicesThisMonth = invoiceStore.filter((invoice) => isThisMonth(invoice.uploadedAt)).length;
      const pendingApprovalCount = invoiceStore.filter((invoice) => invoice.status === INVOICE_STATUS.PENDING_APPROVAL).length;

      const readyForPayment = invoiceStore.filter((invoice) => invoice.status === INVOICE_STATUS.READY_FOR_PAYMENT);
      const readyForPaymentBalance = readyForPayment.reduce(
        (sum, invoice) => sum + calculateBalance(invoice.netAmount, invoice.amountPaid),
        0
      );

      const paidThisMonthInvoiceIds = new Set();
      let paidThisMonthAmount = 0;
      invoiceStore.forEach((invoice) => {
        (invoice.payments || []).forEach((payment) => {
          if (isThisMonth(payment.paidAt)) {
            paidThisMonthInvoiceIds.add(invoice.id);
            paidThisMonthAmount += payment.amount;
          }
        });
      });

      return {
        totalInvoicesThisMonth,
        pendingApprovalCount,
        readyForPaymentCount: readyForPayment.length,
        readyForPaymentBalance,
        paidThisMonthCount: paidThisMonthInvoiceIds.size,
        paidThisMonthAmount,
      };
    } catch (error) {
      console.error("Error in invoiceService.getInvoiceSummary:", error);
      throw error;
    }
  },
};

export default invoiceService;
