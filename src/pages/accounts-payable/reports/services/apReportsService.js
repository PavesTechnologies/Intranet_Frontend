import { VENDORS, INVOICES, PAYMENT_BATCHES } from "../../mocks/apFixtures";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";

const MOCK_RESPONSE_DELAY_MS = 350;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Kept in sync with the dashboard's mock "asOf" timestamp so aging buckets
// stay deterministic regardless of the machine's real clock.
const REPORT_AS_OF = "2026-07-20T09:45:00Z";

const AGING_BUCKETS = [
  { key: "0-30d", label: "0-30 Days" },
  { key: "31-60d", label: "31-60 Days" },
  { key: "61-90d", label: "61-90 Days" },
  { key: "90+d", label: "90+ Days" },
];

const bucketForDueDate = (dueDate) => {
  const asOfMs = new Date(REPORT_AS_OF).getTime();
  const dueMs = new Date(dueDate).getTime();
  const daysPastDue = Math.floor((asOfMs - dueMs) / (1000 * 60 * 60 * 24));

  if (daysPastDue <= 30) return "0-30d";
  if (daysPastDue <= 60) return "31-60d";
  if (daysPastDue <= 90) return "61-90d";
  return "90+d";
};

const buildAgingReport = () => {
  const totals = AGING_BUCKETS.reduce((acc, bucket) => {
    acc[bucket.key] = { count: 0, totalAmount: 0 };
    return acc;
  }, {});

  INVOICES.filter((invoice) => invoice.status !== INVOICE_STATUS.PAID && invoice.dueDate).forEach((invoice) => {
    const bucketKey = bucketForDueDate(invoice.dueDate);
    totals[bucketKey].count += 1;
    totals[bucketKey].totalAmount += invoice.amount;
  });

  return AGING_BUCKETS.map((bucket) => ({
    bucket: bucket.key,
    label: bucket.label,
    count: totals[bucket.key].count,
    totalAmount: totals[bucket.key].totalAmount,
  }));
};

const buildVendorSpendReport = () => {
  const rows = VENDORS.map((vendor) => {
    const vendorInvoices = INVOICES.filter((invoice) => invoice.vendorId === vendor.id);
    const totalInvoiced = vendorInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      category: vendor.category,
      status: vendor.status,
      totalInvoiced,
      invoiceCount: vendorInvoices.length,
      outstandingBalance: vendor.outstandingBalance,
    };
  });

  return rows.sort((a, b) => b.totalInvoiced - a.totalInvoiced);
};

const buildPaymentMethodReport = () => {
  const totalBatchAmount = PAYMENT_BATCHES.reduce((sum, batch) => sum + batch.totalAmount, 0);

  const methodTotals = {};
  PAYMENT_BATCHES.forEach((batch) => {
    batch.methodBreakdown.forEach(({ method, pct }) => {
      const amount = batch.totalAmount * (pct / 100);
      methodTotals[method] = (methodTotals[method] || 0) + amount;
    });
  });

  return Object.entries(methodTotals).map(([method, amount]) => ({
    method,
    amount,
    pct: totalBatchAmount > 0 ? (amount / totalBatchAmount) * 100 : 0,
  }));
};

export const apReportsService = {
  getAgingReport: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return buildAgingReport();
    } catch (error) {
      console.error("Error in getAgingReport:", error);
      throw error;
    }
  },

  getVendorSpendReport: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return buildVendorSpendReport();
    } catch (error) {
      console.error("Error in getVendorSpendReport:", error);
      throw error;
    }
  },

  getPaymentMethodReport: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return buildPaymentMethodReport();
    } catch (error) {
      console.error("Error in getPaymentMethodReport:", error);
      throw error;
    }
  },
};

export default apReportsService;
