import { INVOICE_FIXTURES } from "../../mocks/invoiceMockData";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import { QUEUE_STATUS_FILTERS } from "../../constants/queueTypes";
import { INVOICE_ACTIONS, INVOICE_ACTION_RESULT_STATUS } from "../../constants/invoiceActions";
import { ISSUE_STATUS } from "../../constants/invoiceIssues";
import { createEmptyInvoice } from "../../types/invoice";

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

export const invoiceService = {
  /**
   * @param {Object} [params]
   * @param {string} [params.search] - matches invoice number, vendor name, or PO number
   * @param {string} [params.status] - one of INVOICE_STATUS, or a QUEUE_TYPES key handled by the caller
   * @param {string[]} [params.statuses] - explicit status allowlist (used by queue views)
   * @param {string} [params.invoiceType] - one of INVOICE_TYPES
   * @param {string} [params.dateField] - "invoiceDate" | "dueDate", defaults to "invoiceDate"
   * @param {string} [params.dateFrom] - ISO date string
   * @param {string} [params.dateTo] - ISO date string
   * @param {number} [params.page=1]
   * @param {number} [params.pageSize=10]
   * @returns {Promise<{items: Array, total: number, page: number, pageSize: number, totalPages: number}>}
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

      const allowedStatuses = statuses ?? (status ? [status] : QUEUE_STATUS_FILTERS.all_invoices);

      const filtered = invoiceStore.filter((invoice) => {
        if (allowedStatuses && !allowedStatuses.includes(invoice.status)) return false;
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
   * Uploads a new invoice document. Real backend would accept multipart/form-data and kick off
   * an async OCR job; this mock creates the record as UPLOADED then immediately (after the
   * simulated delay) flips it to OCR_PROCESSING, mirroring INVOICE_ACTION_RESULT_STATUS.
   * @param {File} file
   * @returns {Promise<Object>} the created invoice
   */
  async uploadInvoice(file) {
    await wait(MOCK_RESPONSE_DELAY_MS);
    try {
      const invoice = {
        ...createEmptyInvoice(),
        id: `inv-${10000 + nextInvoiceSeq}`,
        invoiceNumber: `INV-${10000 + nextInvoiceSeq}`,
        status: INVOICE_ACTION_RESULT_STATUS[INVOICE_ACTIONS.UPLOAD] ?? INVOICE_STATUS.OCR_PROCESSING,
        attachments: [
          { id: `att-${file.name}`, fileName: file.name, fileType: file.type || "unknown", uploadedAt: new Date().toISOString(), fileUrl: "" },
        ],
        uploadedAt: new Date().toISOString(),
      };
      nextInvoiceSeq += 1;
      invoiceStore = [invoice, ...invoiceStore];
      return cloneInvoice(invoice);
    } catch (error) {
      console.error("Error in invoiceService.uploadInvoice:", error);
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
   * recording a validation outcome. Callers pass the fields that changed plus any status
   * transition; see useInvoiceMutations.js for the named wrappers around this.
   * @param {string} invoiceId
   * @param {Object} payload - partial Invoice fields to merge
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
      invoiceStore[index] = { ...invoiceStore[index], ...payload };
      return cloneInvoice(invoiceStore[index]);
    } catch (error) {
      console.error("Error in invoiceService.updateInvoice:", error);
      throw error;
    }
  },
};

export default invoiceService;
