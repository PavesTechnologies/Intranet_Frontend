import { INVOICES, getVendorNameById } from "../../mocks/apFixtures";
import { INVOICE_STATUS, MATCH_STATUS } from "../../constants/invoiceStatus";

const MOCK_RESPONSE_DELAY_MS = 400;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let invoiceSequence = INVOICES.length + 1;

const nextInvoiceId = () => {
  const id = `INV-2026-${String(4900 + invoiceSequence).padStart(5, "0")}`;
  invoiceSequence += 1;
  return id;
};

const matchesSearch = (invoice, search) => {
  if (!search) return true;
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const vendorName = getVendorNameById(invoice.vendorId).toLowerCase();
  return (
    invoice.id.toLowerCase().includes(term) ||
    vendorName.includes(term) ||
    (invoice.poNumber || "").toLowerCase().includes(term)
  );
};

/**
 * Builds 1-2 synthetic PO / Goods Receipt / Invoice line comparison rows.
 * Deterministic per invoice id so the same invoice always renders the same
 * illustrative line items during a session.
 */
const buildLineItems = (invoice) => {
  const baseQty = 10 + (invoice.id.charCodeAt(invoice.id.length - 1) % 15);
  const unitPrice = Math.round((invoice.amount / baseQty) * 100) / 100;
  const hasSecondLine = invoice.amount > 8000;

  const lines = [
    {
      lineNo: 1,
      description: "Line item derived from invoice total (illustrative only)",
      po: { quantity: baseQty, unitPrice },
      grn: {
        quantity: invoice.matchStatus === MATCH_STATUS.UNMATCHED ? 0 : baseQty,
        unitPrice,
      },
      invoice: {
        quantity: baseQty,
        unitPrice:
          invoice.matchStatus === MATCH_STATUS.PARTIAL
            ? Math.round(unitPrice * 1.05 * 100) / 100
            : unitPrice,
      },
    },
  ];

  if (hasSecondLine) {
    const qty2 = Math.max(1, Math.round(baseQty / 3));
    const price2 = Math.round((unitPrice * 0.6) * 100) / 100;
    lines.push({
      lineNo: 2,
      description: "Secondary illustrative line (derived, not sourced from a real PO)",
      po: { quantity: qty2, unitPrice: price2 },
      grn: { quantity: qty2, unitPrice: price2 },
      invoice: { quantity: qty2, unitPrice: price2 },
    });
  }

  return lines;
};

export const invoiceService = {
  getInvoices: async ({ search = "", status = "All", vendorId = "All" } = {}) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return INVOICES.filter((invoice) => {
        const statusMatch = status === "All" || invoice.status === status;
        const vendorMatch = vendorId === "All" || invoice.vendorId === vendorId;
        return statusMatch && vendorMatch && matchesSearch(invoice, search);
      });
    } catch (error) {
      console.error("Error in getInvoices:", error);
      throw error;
    }
  },

  getInboxInvoices: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return INVOICES.filter(
        (invoice) =>
          invoice.status === INVOICE_STATUS.PENDING_VALIDATION ||
          invoice.status === INVOICE_STATUS.PENDING_MATCH
      );
    } catch (error) {
      console.error("Error in getInboxInvoices:", error);
      throw error;
    }
  },

  getInvoiceById: async (id) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      const invoice = INVOICES.find((inv) => inv.id === id);
      if (!invoice) throw new Error(`Invoice ${id} not found`);
      return invoice;
    } catch (error) {
      console.error(`Error in getInvoiceById for ID ${id}:`, error);
      throw error;
    }
  },

  createInvoice: async (payload) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      const newInvoice = {
        id: nextInvoiceId(),
        vendorId: payload.vendorId,
        poNumber: payload.poNumber || null,
        amount: Number(payload.amount) || 0,
        status: INVOICE_STATUS.DRAFT,
        matchStatus: MATCH_STATUS.UNMATCHED,
        submittedDate: null,
        dueDate: payload.dueDate || null,
        paymentBatchId: null,
      };
      INVOICES.push(newInvoice);
      return newInvoice;
    } catch (error) {
      console.error("Error in createInvoice:", error);
      throw error;
    }
  },

  submitInvoiceForValidation: async (id) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      const invoice = INVOICES.find((inv) => inv.id === id);
      if (!invoice) throw new Error(`Invoice ${id} not found`);
      if (
        invoice.status !== INVOICE_STATUS.DRAFT &&
        invoice.status !== INVOICE_STATUS.PENDING_VALIDATION
      ) {
        throw new Error(`Invoice ${id} is not eligible for validation`);
      }
      invoice.status = INVOICE_STATUS.PENDING_MATCH;
      if (!invoice.submittedDate) {
        invoice.submittedDate = new Date().toISOString().slice(0, 10);
      }
      return invoice;
    } catch (error) {
      console.error(`Error in submitInvoiceForValidation for ID ${id}:`, error);
      throw error;
    }
  },

  markInvoiceMatched: async (id) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      const invoice = INVOICES.find((inv) => inv.id === id);
      if (!invoice) throw new Error(`Invoice ${id} not found`);
      invoice.status = INVOICE_STATUS.PENDING_APPROVAL;
      invoice.matchStatus = MATCH_STATUS.MATCHED;
      return invoice;
    } catch (error) {
      console.error(`Error in markInvoiceMatched for ID ${id}:`, error);
      throw error;
    }
  },

  getInvoiceLineItems: async (id) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      const invoice = INVOICES.find((inv) => inv.id === id);
      if (!invoice) throw new Error(`Invoice ${id} not found`);
      return {
        invoiceId: id,
        matchStatus: invoice.matchStatus,
        lines: buildLineItems(invoice),
      };
    } catch (error) {
      console.error(`Error in getInvoiceLineItems for ID ${id}:`, error);
      throw error;
    }
  },
};

export default invoiceService;
