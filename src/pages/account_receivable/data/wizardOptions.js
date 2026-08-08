// Static option lists for the Project Billing Setup wizard and landing page filters.
// Will be replaced by lookup/reference-data APIs once Epic 1 endpoints are available.

export const BILLING_TYPES = [
  {
    value: "TIME_MATERIAL",
    label: "Time & Material",
    description: "Bill based on actual hours worked at agreed rates.",
  },
  {
    value: "FIXED_PRICE",
    label: "Fixed Price",
    description: "Bill a fixed total contract value across a defined schedule.",
  },
  {
    value: "MILESTONE",
    label: "Milestone",
    description: "Bill against completion of agreed project milestones.",
  },
  {
    value: "RECURRING",
    label: "Recurring",
    description: "Bill a fixed recurring amount as a monthly retainer or subscription.",
  },
];

export const BILLING_TYPE_LABELS = BILLING_TYPES.reduce((acc, type) => {
  acc[type.value] = type.label;
  return acc;
}, {});

// Recurring billing is further split by billing mode — shown only when billingType is RECURRING.
export const RECURRING_BILLING_MODE_OPTIONS = [
  {
    value: "MONTHLY_RETAINER",
    label: "Monthly Retainer",
    description: "Bill a fixed recurring amount every billing period.",
  },
  {
    value: "SUBSCRIPTION",
    label: "Subscription",
    description: "Bill a recurring subscription fee for ongoing services.",
  },
];

// Covers every billingMode code that can appear across all billing types (used for
// read-only display in the Existing Enterprise Project flow, where billingMode is
// synchronized master data rather than something the user picks from the list above).
export const BILLING_MODE_LABELS = {
  STANDARD: "Standard Rate",
  ROLE_BASED: "Role-Based Rates",
  FIXED: "Fixed Price",
  MILESTONE: "Milestone-Based",
  MONTHLY_RETAINER: "Monthly Retainer",
  SUBSCRIPTION: "Subscription",
};

export const BILLING_FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Biweekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "ON_DEMAND", label: "On Demand" },
];

export const BILLING_CYCLE_OPTIONS = [
  { value: "", label: "Select billing cycle" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

export const ROUNDING_RULE_OPTIONS = [
  { value: "NONE", label: "No Rounding" },
  { value: "NEAREST_15_MIN", label: "Round to Nearest 15 Minutes" },
  { value: "NEAREST_30_MIN", label: "Round to Nearest 30 Minutes" },
  { value: "NEAREST_HOUR", label: "Round to Nearest Hour" },
];

export const INVOICE_SCHEDULE_TYPE_OPTIONS = [
  { value: "ONE_TIME", label: "One-Time Invoice", description: "Raise a single invoice for the full contract value." },
  {
    value: "PERCENTAGE",
    label: "Percentage-Based Schedule",
    description: "Split the contract value into invoices by percentage.",
  },
  {
    value: "DATE_BASED",
    label: "Date-Based Schedule",
    description: "Raise invoices on a pre-agreed set of dates.",
  },
];

export const RECOGNITION_TRIGGER_OPTIONS = [
  {
    value: "CONTRACT_APPROVAL",
    label: "Bill on Contract Approval",
    description: "Trigger invoicing as soon as the contract is approved.",
  },
  {
    value: "PLANNED_INVOICE_DATE",
    label: "Bill on Planned Invoice Date",
    description: "Trigger invoicing on the planned invoice date instead.",
  },
];

export const MILESTONE_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
];

export const RATE_CARD_OPTIONS = [
  { value: "", label: "Select rate card" },
  { value: "STANDARD", label: "Standard Rate Card" },
  { value: "PREMIUM", label: "Premium Rate Card" },
  { value: "OFFSHORE", label: "Offshore Rate Card" },
];

export const OVERTIME_RULE_OPTIONS = [
  { value: "NONE", label: "Not Applicable" },
  { value: "1_5X", label: "1.5x Standard Rate" },
  { value: "2X", label: "2x Standard Rate" },
];

export const PRORATION_RULE_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "DAILY", label: "Daily" },
  { value: "NONE", label: "None" },
];

export const TAX_PREFERENCE_OPTIONS = [
  { value: "", label: "Select tax preference" },
  { value: "TAXABLE", label: "Taxable" },
  { value: "EXEMPT", label: "Tax Exempt" },
  { value: "REVERSE_CHARGE", label: "Reverse Charge" },
];

export const PAYMENT_TERMS_OPTIONS = [
  { value: "", label: "Select payment terms" },
  { value: "NET_15", label: "Net 15" },
  { value: "NET_30", label: "Net 30" },
  { value: "NET_45", label: "Net 45" },
  { value: "NET_60", label: "Net 60" },
  { value: "IMMEDIATE", label: "Immediate" },
];

export const APPROVAL_WORKFLOW_OPTIONS = [
  { value: "", label: "Select approval workflow" },
  { value: "SINGLE_APPROVER", label: "Single Approver" },
  { value: "TWO_LEVEL", label: "Two-Level Approval" },
  { value: "FINANCE_COMMITTEE", label: "Finance Committee Review" },
];

export const FINANCE_REVIEWER_OPTIONS = [
  { value: "", label: "Select finance reviewer" },
  { value: "ANANYA_RAO", label: "Ananya Rao" },
  { value: "RAHUL_MEHTA", label: "Rahul Mehta" },
  { value: "PRIYA_NAIR", label: "Priya Nair" },
];

export const FINANCE_APPROVER_OPTIONS = [
  { value: "", label: "Select finance approver" },
  { value: "VIKRAM_SINGH", label: "Vikram Singh" },
  { value: "DIVYA_SHARMA", label: "Divya Sharma" },
  { value: "KARTHIK_IYER", label: "Karthik Iyer" },
];

export const INVOICE_NUMBER_SERIES_OPTIONS = [
  { value: "", label: "Select invoice number series" },
  { value: "AR_2026", label: "AR-2026 Series" },
  { value: "AR_EXPORT_2026", label: "AR-Export-2026 Series" },
];

export const CURRENCY_OPTIONS = [
  { value: "", label: "Select currency" },
  { value: "INR", label: "INR" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
];

export const SOURCE_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "Enterprise", label: "Enterprise" },
  { value: "Standalone", label: "Standalone" },
];

export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Draft", label: "Draft" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];
