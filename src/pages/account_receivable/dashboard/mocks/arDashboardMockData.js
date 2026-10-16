// Sample figures for the AR dashboard layout. The AR backend does not yet
// expose collections, aging or ledger aggregates, so every value here is
// illustrative and the page labels it as sample data. All amounts are USD;
// the currency toggle converts them for display only.

// Period scaling applied to the period-sensitive amounts below.
export const PERIOD_MULTIPLIER = { MTD: 1, QTD: 2.8, YTD: 9.5 };

export const BASE_METRICS = {
  totalOutstanding: 2845000,
  totalOutstandingChange: 8.4,
  outstandingInvoiceCount: 62,
  overdueAmount: 432500,
  overdueShare: 15.2,
  criticalOverdueAmount: 235000,
  unbilledWip: 924000,
  unbilledWipChange: 12.1,
  unbilledProjectCount: 18,
  dsoDays: 39.2,
  dsoTarget: 45,
  collected: 1780000,
  collectionRate: 94.6,
  collectionTarget: 95,
  inApprovalAmount: 642000,
  inApprovalCount: 14,
};

// Counts/amounts per pipeline stage. Setup counts are replaced by live
// billing-configuration stats when they load.
export const PIPELINE_SAMPLE = {
  setup: { count: 18, amount: 4850000 },
  approvals: { count: 3, amount: 820000 },
  acquisition: { count: 24 },
  tax: { count: 18, amount: 320000 },
  generation: { count: 12, amount: 1140000 },
  invoiceApproval: { count: 7 },
};

export const TREND_DATA = [
  { period: "May", invoiced: 1850000, collected: 1720000, projected: 1900000 },
  { period: "Jun", invoiced: 2100000, collected: 1950000, projected: 2050000 },
  { period: "Jul", invoiced: 2350000, collected: 2180000, projected: 2300000 },
  { period: "Aug", invoiced: 2500000, collected: 2420000, projected: 2550000 },
  { period: "Sep", invoiced: 2720000, collected: 2610000, projected: 2700000 },
  { period: "Oct", invoiced: 2845000, collected: 2780000, projected: 2900000 },
];

export const AGING_BUCKETS = [
  { key: "current", label: "Current (0–30 days)", amount: 1680000, count: 42, risk: "low" },
  { key: "d60", label: "31–60 days", amount: 620000, count: 18, risk: "watch" },
  { key: "d90", label: "61–90 days", amount: 310000, count: 8, risk: "elevated" },
  { key: "d120", label: "91–120 days", amount: 145000, count: 4, risk: "high" },
  { key: "d120plus", label: "Over 120 days", amount: 90000, count: 2, risk: "critical" },
];

export const BILLING_MODEL_MIX = [
  { key: "tm", name: "Time & Material", share: 48, amount: 1365600 },
  { key: "milestone", name: "Fixed Milestone", share: 26, amount: 739700 },
  { key: "retainer", name: "Retainer Services", share: 16, amount: 455200 },
  { key: "tools", name: "Software & Tool Billing", share: 10, amount: 284500 },
];

export const LEDGER_ROWS = [
  {
    invoiceId: "INV-2025-0891",
    clientName: "Acme Global Solutions",
    project: "Enterprise Core Migration",
    billingType: "T&M (Role-based)",
    dueDate: "2026-10-25",
    agingDays: 14,
    amount: 142500,
    total: 168150,
    status: "ISSUED",
  },
  {
    invoiceId: "INV-2025-0842",
    clientName: "Nexis Financial Corp",
    project: "Cloud Data Warehouse",
    billingType: "Fixed Milestone",
    dueDate: "2026-09-30",
    agingDays: 42,
    amount: 215000,
    total: 253700,
    status: "OVERDUE",
  },
  {
    invoiceId: "INV-2025-0904",
    clientName: "Vanguard Health Systems",
    project: "HIPAA Security Portal",
    billingType: "T&M (Standard)",
    dueDate: "2026-10-18",
    agingDays: 6,
    amount: 88400,
    total: 104312,
    status: "PARTIALLY_PAID",
  },
  {
    invoiceId: "INV-2025-0918",
    clientName: "Apex Retail Group",
    project: "Omnichannel POS Integration",
    billingType: "Software & Tools",
    dueDate: "2026-11-05",
    agingDays: 0,
    amount: 64200,
    total: 75756,
    status: "PENDING_APPROVAL",
  },
  {
    invoiceId: "INV-2025-0789",
    clientName: "Solaria Energy Tech",
    project: "Smart Grid Analytics",
    billingType: "Retainer",
    dueDate: "2026-08-15",
    agingDays: 88,
    amount: 125000,
    total: 147500,
    status: "OVERDUE",
  },
  {
    invoiceId: "INV-2025-0925",
    clientName: "Kinetix Robotics",
    project: "Automated Inspection AI",
    billingType: "T&M (Role-based)",
    dueDate: "2026-10-10",
    agingDays: 2,
    amount: 198000,
    total: 233640,
    status: "PAID",
  },
];

export const WORKLIST_ITEMS = [
  {
    id: "overdue-60",
    title: "2 invoices overdue by more than 60 days",
    subtitle: "Solaria Energy & Nexis Financial",
    tone: "danger",
    badge: "Action Required",
    cta: "Review Invoices",
    route: "invoiceApproval",
  },
  {
    id: "setup-approvals",
    title: "3 billing setups awaiting checker approval",
    subtitle: "Needs Finance Manager verification",
    tone: "warning",
    badge: "Pending Review",
    cta: "Open Approvals",
    route: "billingApprovals",
  },
  {
    id: "tax-ready",
    title: "6 billing snapshots ready for tax calculation",
    subtitle: "Acquisition locked for the September cycle",
    tone: "info",
    badge: "Tax Console",
    cta: "Calculate Tax",
    route: "tax",
  },
  {
    id: "draft-queue",
    title: "4 draft invoices awaiting maker submission",
    subtitle: "Drafted, waiting for a line-item check",
    tone: "neutral",
    badge: "Draft Queue",
    cta: "Open Drafts",
    route: "invoiceGeneration",
  },
];
