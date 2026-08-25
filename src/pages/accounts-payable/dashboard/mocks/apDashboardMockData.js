export const dashboardKpis = [
  {
    title: "Total Invoices",
    value: "1,248",
    subtitle: "Invoices received",
    tone: "default",
  },
  {
    title: "Pending Invoices",
    value: "186",
    subtitle: "Require processing",
    tone: "amber",
  },
  {
    title: "Exceptions",
    value: "32",
    subtitle: "Require attention",
    tone: "rose",
  },
  {
    title: "Pending Approvals",
    value: "27",
    subtitle: "Awaiting approval",
    tone: "indigo",
  },
  {
    title: "Outstanding Payable",
    value: "₹2.84 Cr",
    subtitle: "Total unpaid balance",
    tone: "default",
  },
  {
    title: "Overdue Payable",
    value: "₹18.4 L",
    subtitle: "Past due date",
    tone: "rose",
  },
];

/* -------------------------------------------------------------------------- */
/* Requires Attention                                                         */
/* -------------------------------------------------------------------------- */

export const attentionQueue = [
  {
    invoice: "INV-1024",
    vendor: "ABC Technologies Pvt Ltd",
    amount: "₹2,40,000",
    issue: "PO Mismatch",
    priority: "High",
    status: "Exception",
    action: "Resolve",
  },
  {
    invoice: "INV-1032",
    vendor: "XYZ Solutions Pvt Ltd",
    amount: "₹85,000",
    issue: "Pending Approval",
    priority: "Medium",
    status: "Pending Approval",
    action: "Approve",
  },
  {
    invoice: "INV-1041",
    vendor: "Amazon Web Services India",
    amount: "₹3,605.75",
    issue: "Low OCR Confidence",
    priority: "High",
    status: "Validation",
    action: "Review",
  },
  {
    invoice: "INV-1052",
    vendor: "TechVision Distributors Pvt Ltd",
    amount: "₹1,20,000",
    issue: "Overdue Payment",
    priority: "Critical",
    status: "Overdue",
    action: "View",
  },
];

/* -------------------------------------------------------------------------- */
/* Invoice Processing                                                         */
/* -------------------------------------------------------------------------- */

export const invoiceProcessingStages = [
  {
    label: "Received",
    count: 124,
  },
  {
    label: "Processing",
    count: 38,
  },
  {
    label: "Validation",
    count: 26,
  },
  {
    label: "Exception",
    count: 18,
    tone: "rose",
  },
  {
    label: "Pending Approval",
    count: 27,
    tone: "amber",
  },
  {
    label: "Approved",
    count: 92,
    tone: "emerald",
  },
  {
    label: "Payment",
    count: 34,
    tone: "indigo",
  },
  {
    label: "Paid",
    count: 156,
    tone: "emerald",
  },
  {
    label: "Rejected",
    count: 7,
    tone: "rose",
  },
];

/* -------------------------------------------------------------------------- */
/* AP Aging                                                                   */
/* -------------------------------------------------------------------------- */

export const apAging = {
  summary: [
    {
      label: "Outstanding",
      value: "₹73.4 L",
    },
    {
      label: "Not Due",
      value: "₹50.2 L",
    },
    {
      label: "Overdue",
      value: "₹23.2 L",
      tone: "rose",
    },
  ],

  buckets: [
    {
      label: "0-30 Days",
      value: "₹42.5 L",
      amount: 42.5,
    },
    {
      label: "31-60 Days",
      value: "₹18.2 L",
      amount: 18.2,
    },
    {
      label: "61-90 Days",
      value: "₹8.6 L",
      amount: 8.6,
      tone: "amber",
    },
    {
      label: "90+ Days",
      value: "₹4.1 L",
      amount: 4.1,
      tone: "rose",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Payment Overview                                                           */
/* -------------------------------------------------------------------------- */

export const paymentOverview = [
  {
    label: "Pending Payment",
    value: "₹24.5 L",
    amount: 24.5,
    tone: "amber",
  },
  {
    label: "Scheduled",
    value: "₹18.2 L",
    amount: 18.2,
    tone: "indigo",
  },
  {
    label: "Processing",
    value: "₹7.4 L",
    amount: 7.4,
  },
  {
    label: "Paid",
    value: "₹52.8 L",
    amount: 52.8,
    tone: "emerald",
  },
  {
    label: "On Hold",
    value: "₹3.1 L",
    amount: 3.1,
    tone: "rose",
  },
];

/* -------------------------------------------------------------------------- */
/* Invoice Intake Health                                                      */
/* -------------------------------------------------------------------------- */

export const invoiceIntakeQuality = {
  processed: 1245,
  highConfidence: 1102,
  mediumConfidence: 108,
  lowConfidence: 35,
  failed: 12,
};

/*
 * Admin should see a simple health indicator instead of
 * a detailed OCR analytics dashboard.
 */

export const invoiceIntakeHealth = {
  processed: 1245,
  successRate: 97.8,
  needsReview: 2.8,
  failedRate: 1.0,
};

/* -------------------------------------------------------------------------- */
/* Date Range                                                                 */
/* -------------------------------------------------------------------------- */

export const dateRangeOptions = [
  "Today",
  "Last 7 Days",
  "Last 30 Days",
  "This Month",
  "This Quarter",
  "Custom Range",
];