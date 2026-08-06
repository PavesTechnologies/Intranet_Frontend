const MOCK_RESPONSE_DELAY_MS = 400;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mockDashboardSummary = {
  asOf: "2026-07-20T09:45:00Z",

  kpis: {
    totalOutstanding: { value: 2847320, deltaPct: 4.2, trend: "up", tone: "neutral" },
    pendingProcessing: { count: 142, value: 1204600 },
    pendingApproval: { count: 68, value: 486200 },
    overdue: { count: 23, value: 198450, tone: "critical" },
    openExceptions: { count: 17, types: 6, tone: "warning" },
    straightThroughRate: { pct: 76.4, deltaPts: 2.1, trend: "up", tone: "good" },
  },

  pipeline: {
    stages: [
      { key: "received", label: "Received", count: 486 },
      { key: "validated", label: "Validated", count: 401 },
      { key: "matched", label: "Matched", count: 358 },
      { key: "approval", label: "Pending Approval", count: 68 },
      { key: "approved", label: "Approved (MTD)", count: 612 },
      { key: "paid", label: "Paid (MTD)", count: 1204 },
    ],
    exceptionBranch: { count: 17, label: "Diverted to Exceptions" },
  },

  workQueue: [
    { id: "wq1", type: "Approval", reference: "INV-2026-04801", vendor: "BrightPath IT Services", amount: 34900.0, ageDays: 5, priority: "critical", action: "Review" },
    { id: "wq2", type: "Matching Exception", reference: "INV-2026-04855", vendor: "Meridian Logistics", amount: 8230.0, ageDays: 3, priority: "high", action: "Resolve" },
    { id: "wq3", type: "Bank Verification", reference: "Apex Office Solutions", vendor: null, amount: null, ageDays: 2, priority: "high", action: "Verify" },
    { id: "wq4", type: "Validation", reference: "INV-2026-04871", vendor: "Global Supplies Inc.", amount: 12450.0, ageDays: 1, priority: "normal", action: "Validate" },
    { id: "wq5", type: "Validation", reference: "INV-2026-04888", vendor: "Coastal Freight Partners", amount: 5120.0, ageDays: 0, priority: "normal", action: "Validate" },
  ],

  approvalSummary: {
    pendingTotal: 68,
    avgTurnaroundDays: 2.6,
    byTier: [
      { tier: "Level 1", range: "< $10,000", count: 31 },
      { tier: "Level 2", range: "$10,000–$50,000", count: 24 },
      { tier: "Level 3", range: "> $50,000", count: 13 },
    ],
    byAge: [
      { bucket: "0-2 days", count: 38 },
      { bucket: "3-5 days", count: 21 },
      { bucket: ">5 days", count: 9 },
    ],
  },

  paymentSummary: {
    nextRun: { batchId: "PB-2026-018", scheduledDate: "2026-07-24", amount: 612400, invoiceCount: 84, status: "draft" },
    lastCompleted: { batchId: "PB-2026-017", amount: 498120, status: "completed" },
    byMethod: [
      { method: "ACH", pct: 61 },
      { method: "Wire", pct: 28 },
      { method: "Check", pct: 11 },
    ],
  },

  exceptionSummary: {
    openTotal: 17,
    oldestDays: 6,
    byType: [
      { type: "Price mismatch", count: 6 },
      { type: "Quantity mismatch", count: 4 },
      { type: "Missing PO", count: 3 },
      { type: "Duplicate invoice", count: 2 },
      { type: "Missing GRN/receipt", count: 1 },
      { type: "Tax discrepancy", count: 1 },
    ],
  },

  charts: {
    aging: [
      { bucket: "0-30d", count: 312, value: 1400000 },
      { bucket: "31-60d", count: 94, value: 420000 },
      { bucket: "61-90d", count: 31, value: 156000 },
      { bucket: "90+d", count: 23, value: 198000, flag: "critical" },
    ],
    payablesTrend: [
      { month: "Feb", value: 2410000 },
      { month: "Mar", value: 2580000 },
      { month: "Apr", value: 2490000 },
      { month: "May", value: 2630000 },
      { month: "Jun", value: 2710000 },
      { month: "Jul", value: 2850000 },
    ],
    exceptionsByType: [
      { type: "Price mismatch", count: 6 },
      { type: "Quantity mismatch", count: 4 },
      { type: "Missing PO", count: 3 },
      { type: "Duplicate invoice", count: 2 },
      { type: "Missing GRN/receipt", count: 1 },
      { type: "Tax discrepancy", count: 1 },
    ],
    topVendors: [
      { vendor: "Global Supplies Inc.", value: 412000 },
      { vendor: "Meridian Logistics", value: 358000 },
      { vendor: "BrightPath IT Services", value: 301000 },
      { vendor: "Coastal Freight Partners", value: 276000 },
      { vendor: "Sterling Packaging Co.", value: 210000 },
    ],
  },

  recentActivity: [
    { id: "act1", time: "2026-07-20T09:42:00Z", type: "approval", text: "Invoice INV-2026-04812 approved by R. Mehta", amount: 22100.0 },
    { id: "act2", time: "2026-07-20T09:15:00Z", type: "payment", text: "Payment batch PB-2026-017 released", amount: 498120.0, meta: "72 invoices" },
    { id: "act3", time: "2026-07-20T08:58:00Z", type: "inbound", text: "New invoice received via EDI from Sterling Packaging Co.", reference: "INV-2026-04901" },
    { id: "act4", time: "2026-07-20T08:30:00Z", type: "warning", text: "Bank details updated for Apex Office Solutions — pending verification" },
    { id: "act5", time: "2026-07-19T17:20:00Z", type: "approval", text: "Vendor registration approved — NorthGate Facilities Mgmt" },
    { id: "act6", time: "2026-07-19T16:05:00Z", type: "critical", text: "Exception flagged on INV-2026-04855 — quantity mismatch against PO-8834" },
  ],
};

export const apDashboardService = {
  getDashboardSummary: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return mockDashboardSummary;
    } catch (error) {
      console.error("Error in getDashboardSummary:", error);
      throw error;
    }
  },
};

export default apDashboardService;
