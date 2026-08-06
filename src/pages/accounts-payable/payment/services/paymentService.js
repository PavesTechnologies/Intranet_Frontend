import { INVOICES, PAYMENT_BATCHES, getVendorNameById } from "../../mocks/apFixtures";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import { PAYMENT_BATCH_STATUS } from "../../constants/paymentStatus";

const MOCK_RESPONSE_DELAY_MS = 400;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates the next sequential payment batch id, e.g. PB-2026-019,
 * based on the highest existing numeric suffix in PAYMENT_BATCHES.
 */
const getNextBatchId = () => {
  const year = new Date().getFullYear();
  const highest = PAYMENT_BATCHES.reduce((max, batch) => {
    const match = /PB-\d{4}-(\d+)/.exec(batch.id || "");
    const num = match ? parseInt(match[1], 10) : 0;
    return Math.max(max, num);
  }, 0);
  return `PB-${year}-${String(highest + 1).padStart(3, "0")}`;
};

/**
 * Payment Service (mock)
 *
 * Reads/mutates the shared AP fixtures directly (not clones) so payment
 * activity is visible to any other AP workspace reading the same fixtures
 * during this session.
 */
export const paymentService = {
  /**
   * Fetches invoices that are Approved and ready to be included in a payment run.
   */
  getApprovedInvoicesForPayment: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return INVOICES.filter((invoice) => invoice.status === INVOICE_STATUS.APPROVED).map((invoice) => ({
        ...invoice,
        vendorName: getVendorNameById(invoice.vendorId),
      }));
    } catch (error) {
      console.error("Error in getApprovedInvoicesForPayment:", error);
      throw error;
    }
  },

  /**
   * Fetches all payment batches.
   */
  getPaymentBatches: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return [...PAYMENT_BATCHES];
    } catch (error) {
      console.error("Error in getPaymentBatches:", error);
      throw error;
    }
  },

  /**
   * Fetches a single payment batch along with the invoices allocated to it.
   * @param {string} id
   */
  getPaymentBatchById: async (id) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);

      const batch = PAYMENT_BATCHES.find((b) => b.id === id);
      if (!batch) {
        throw new Error(`Payment batch ${id} not found`);
      }

      const invoices = INVOICES.filter((invoice) => invoice.paymentBatchId === id).map((invoice) => ({
        ...invoice,
        vendorName: getVendorNameById(invoice.vendorId),
      }));

      return { ...batch, invoices };
    } catch (error) {
      console.error(`Error in getPaymentBatchById for ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Creates a new payment batch out of the selected invoices.
   * Mutates the shared fixtures in place: marks each invoice Paid,
   * stamps paymentBatchId/paidDate, and pushes the new batch record.
   * @param {{invoiceIds: string[], scheduledDate: string, methodBreakdown: {method:string, pct:number}[]}} payload
   */
  createPaymentBatch: async ({ invoiceIds, scheduledDate, methodBreakdown }) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);

      if (!invoiceIds || invoiceIds.length === 0) {
        throw new Error("At least one invoice must be selected to create a payment batch");
      }

      const batchId = getNextBatchId();
      const paidDate = new Date().toISOString().slice(0, 10);

      let totalAmount = 0;
      let invoiceCount = 0;

      invoiceIds.forEach((invoiceId) => {
        const invoice = INVOICES.find((inv) => inv.id === invoiceId);
        if (!invoice) return;

        invoice.status = INVOICE_STATUS.PAID;
        invoice.paymentBatchId = batchId;
        invoice.paidDate = paidDate;

        totalAmount += invoice.amount;
        invoiceCount += 1;
      });

      const newBatch = {
        id: batchId,
        status: PAYMENT_BATCH_STATUS.SCHEDULED,
        scheduledDate,
        totalAmount,
        invoiceCount,
        methodBreakdown,
      };

      PAYMENT_BATCHES.push(newBatch);

      return newBatch;
    } catch (error) {
      console.error("Error in createPaymentBatch:", error);
      throw error;
    }
  },
};

export default paymentService;
