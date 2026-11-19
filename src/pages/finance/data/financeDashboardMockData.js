/**
 * Centralized, ILLUSTRATIVE mock data for the Finance Management landing dashboard.
 *
 * None of these figures are real company financials or actual tax liabilities —
 * they exist only so the layout can be reviewed before backend APIs exist.
 * All amounts are plain rupee numbers (not pre-formatted strings) so the shape
 * can later be swapped for an API response; formatting lives in
 * ../utils/financeFormatters.js.
 *
 * To connect a backend later, replace getFinanceDashboardData() with a hook that
 * fetches the s          ame shape — the UI components only consume this shape.
 */

export const FINANCE_PERIOD_OPTIONS = [
  { id: "last-5-months", label: "Jul – Nov 2026" },
  { id: "current-quarter", label: "Q3 FY 2026-27 (Oct – Dec)" },
  { id: "fy-to-date ", label: "FY 2026-27 to date" },
];

export const DEFAULT_FINANCE_PERIOD = FINANCE_PERIOD_OPTIONS[0].id;

const SAMPLE_DATA = {
  kpis: {
    totalReceivables: 4580000,
    totalPayables: 2850000,
    totalExpenses: 1820000,
    netCashFlow: 1240000,
  },

  // Illustrative % change vs the previous period, shown as comparison indicators on the KPI cards.
  // `goodWhenUp` decides whether an increase is shown as favourable.
  kpiTrends: {
    totalReceivables: { changePct: 6.4, goodWhenUp: false, note: "vs previous period" },
    totalPayables: { changePct: -3.1, goodWhenUp: false, note: "vs previous period" },
    totalExpenses: { changePct: 4.2, goodWhenUp: false, note: "vs previous period" },
    netCashFlow: { changePct: 9.8, goodWhenUp: true, note: "vs previous period" },
  },

  // Monthly cash movement. Sum(inflow) − Sum(outflow) = kpis.netCashFlow.
  cashFlow: [
    { month: "Jul", inflow: 3820000, outflow: 3610000 },
    { month: "Aug", inflow: 4150000, outflow: 3890000 },
    { month: "Sep", inflow: 3680000, outflow: 3740000 },
    { month: "Oct", inflow: 4490000, outflow: 4120000 },
    { month: "Nov", inflow: 4760000, outflow: 4300000 },
  ],

  // GST and TDS are kept strictly separate. TDS credit (receivable, from customers)
  // is never netted against TDS payable (deducted from vendors).
  tax: {
    gst: {
      outputGst: 824000, // AR — GST charged on customer sales
      eligibleItc: 513000, // AP — only eligible & available ITC, not all vendor GST
      gstDeposited: 265000,
    },
    tds: {
      creditFromCustomers: 192000, // AR — deducted by customers against company PAN
      payable: 86000, // AP — deducted by company from vendor payments
      deposited: 71000, // AP — vendor TDS already deposited
    },
  },

  // `module` decides where an alert can link to; the page only makes it clickable
  // when the user can actually open that module.
  actionItems: [
    { id: "overdue-vendor", label: "Overdue vendor payments", description: "Payments past their due dates", count: 7, severity: "high", module: "ap" },
    { id: "invoice-approval", label: "Invoices pending approval", description: "Waiting for approver action", count: 14, severity: "medium", module: "ap" },
    { id: "expense-review", label: "Expense claims to review", description: "Claims awaiting review or approval", count: 23, severity: "medium", module: "xms" },
    { id: "gst-recon", label: "GST reconciliation follow-ups", description: "Items requiring finance review", count: 5, severity: "low", module: "ap" },
  ],

  expenseCategories: [
    { id: "travel", label: "Travel and Accommodation", amount: 728000 },
    { id: "food", label: "Food and Allowances", amount: 455000 },
    { id: "office", label: "Office Expenses", amount: 364000 },
    { id: "other", label: "Other Expenses", amount: 273000 },
  ],

  recentActivity: [
    { id: "a1", activity: "Vendor payment processed — Sample Vendor A", module: "ap", amount: 245000, status: "completed", date: "2026-11-12" },
    { id: "a2", activity: "Customer invoice collected — Sample Client X", module: "ar", amount: 580000, status: "completed", date: "2026-11-12" },
    { id: "a3", activity: "Employee expense submitted — Travel", module: "xms", amount: 18400, status: "pending", date: "2026-11-11" },
    { id: "a4", activity: "Vendor invoice sent for approval", module: "ap", amount: 132500, status: "pending", date: "2026-11-11" },
    { id: "a5", activity: "Customer invoice raised — Sample Client Y", module: "ar", amount: 410000, status: "in-progress", date: "2026-11-10" },
    { id: "a6", activity: "Expense reimbursement rejected — Missing receipt", module: "xms", amount: 6200, status: "rejected", date: "2026-11-09" },
  ],
};

/**
 * Returns dashboard data for a period. Mock-only: every period currently returns
 * the same sample dataset — the period id is accepted so callers don't change
 * when this becomes an API call.
 */
export function getFinanceDashboardData(periodId = DEFAULT_FINANCE_PERIOD) {
  return SAMPLE_DATA;
}
