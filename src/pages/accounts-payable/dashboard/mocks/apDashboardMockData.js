/* -------------------------------------------------------------------------- */
/* Dashboard KPI Data                                                        */
/* -------------------------------------------------------------------------- */

export const dashboardKpis = [
  {
    title: "Total Invoices",
    value: "1,248",
    subtitle: "Invoices received",
    tone: "default",
    trend: "+8.4%",
    trendDirection: "up",
  },
  {
    title: "Pending Invoices",
    value: "186",
    subtitle: "Require processing",
    tone: "amber",
    trend: "-5.2%",
    trendDirection: "down",
  },
  {
    title: "Exceptions",
    value: "32",
    subtitle: "Require attention",
    tone: "rose",
    trend: "+3.1%",
    trendDirection: "up",
  },
  {
    title: "Pending Approvals",
    value: "27",
    subtitle: "Awaiting approval",
    tone: "indigo",
    trend: "-2.8%",
    trendDirection: "down",
  },
  {
    title: "Outstanding Payable",
    value: "₹2.84 Cr",
    subtitle: "Total unpaid balance",
    tone: "default",
    trend: "+4.6%",
    trendDirection: "up",
  },
  {
    title: "Overdue Payable",
    value: "₹18.4 L",
    subtitle: "Past due date",
    tone: "rose",
    trend: "+1.8%",
    trendDirection: "up",
  },
  {
    title: "Due in Next 7 Days",
    value: "₹32.8 L",
    subtitle: "41 invoices",
    tone: "amber",
    trend: "41 invoices",
    trendDirection: "neutral",
  },
  {
    title: "Paid This Month",
    value: "₹1.24 Cr",
    subtitle: "156 invoices",
    tone: "emerald",
    trend: "+12.4%",
    trendDirection: "up",
  },
];


/* -------------------------------------------------------------------------- */
/* Attention Queue                                                            */
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
/* Invoice Processing Pipeline                                                */
/* -------------------------------------------------------------------------- */

export const invoiceProcessingStages = [
  {
    label: "Received",
    count: 124,
    tone: "default",
  },
  {
    label: "Processing",
    count: 38,
    tone: "indigo",
  },
  {
    label: "Validation",
    count: 26,
    tone: "amber",
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
      tone: "default",
    },
    {
      label: "Not Due",
      value: "₹50.2 L",
      tone: "emerald",
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
      tone: "default",
    },
    {
      label: "31-60 Days",
      value: "₹18.2 L",
      amount: 18.2,
      tone: "default",
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
    tone: "default",
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
/* Exception Analysis                                                         */
/* -------------------------------------------------------------------------- */

export const exceptionAnalysis = [
  {
    label: "PO Mismatch",
    count: 12,
  },
  {
    label: "Duplicate Invoice",
    count: 8,
  },
  {
    label: "Amount Mismatch",
    count: 6,
  },
  {
    label: "GST / Tax Mismatch",
    count: 4,
  },
  {
    label: "Missing Information",
    count: 3,
  },
  {
    label: "OCR Low Confidence",
    count: 2,
  },
];


/* -------------------------------------------------------------------------- */
/* Top Vendors                                                                */
/* -------------------------------------------------------------------------- */

export const topVendors = [
  {
    vendor: "TechVision Distributors Pvt Ltd",
    invoices: 42,
    outstanding: "₹18.4 L",
    overdue: "₹2.1 L",
  },
  {
    vendor: "Amazon Web Services India",
    invoices: 31,
    outstanding: "₹12.6 L",
    overdue: "₹0",
  },
  {
    vendor: "ABC Technologies Pvt Ltd",
    invoices: 25,
    outstanding: "₹9.4 L",
    overdue: "₹1.2 L",
  },
];


/* -------------------------------------------------------------------------- */
/* Invoice Intake Quality                                                     */
/* -------------------------------------------------------------------------- */

export const invoiceIntakeQuality = {
  processed: 1245,
  highConfidence: 1102,
  mediumConfidence: 108,
  lowConfidence: 35,
  failed: 12,
};


/* -------------------------------------------------------------------------- */
/* Dashboard Date Filters                                                     */
/* -------------------------------------------------------------------------- */

export const dateRangeOptions = [
  "Today",
  "Last 7 Days",
  "Last 30 Days",
  "This Month",
  "This Quarter",
  "Custom Range",
];