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
  { value: "HALF_YEARLY", label: "Half-Yearly" },
  { value: "ANNUALLY", label: "Annually" },
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

// --- Recurring billing (BillingRecurringConfiguration, via /api/billing-recurring) ---
// These mirror the backend enums verbatim — never rename/duplicate these values.

// Shared duration-unit enum (backend: RenewalDurationUnit) — used both for the
// primary billing frequency's durationUnit and for a custom renewal duration.
export const DURATION_UNIT_OPTIONS = [
  { value: "DAYS", label: "Day(s)" },
  { value: "MONTHS", label: "Month(s)" },
  { value: "YEARS", label: "Year(s)" },
];

// Backend: ContractValueSource — also reused by Fixed Price (see
// billingConfigurationService's CONTRACT_VALUE_SOURCE_TO_API/FROM_API map).
export const CONTRACT_VALUE_SOURCE_OPTIONS = [
  { value: "PMS_BUDGET", label: "Use Project Budget" },
  { value: "MANUAL", label: "Manual" },
];

// Backend: RenewalType
export const RENEWAL_TYPE_OPTIONS = [
  { value: "MANUAL", label: "Manual" },
  { value: "AUTO", label: "Automatic" },
];

// Backend: RenewalDurationType
export const RENEWAL_DURATION_TYPE_OPTIONS = [
  { value: "SAME_DURATION", label: "Same as Primary Duration" },
  { value: "CUSTOM", label: "Custom Duration" },
];

// Backend: RenewalPricingType
export const RENEWAL_PRICING_TYPE_OPTIONS = [
  { value: "SAME_PRICE", label: "Same as Current Price" },
  { value: "REVISED_PRICE", label: "Revised Price" },
];

// Used only for Standalone (non-PMS) projects, where no currency master-data API
// exists yet. Enterprise projects always source currency from the synced PMS project.
export const CURRENCY_OPTIONS = [
  { value: "", label: "Select currency" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AED", label: "AED — UAE Dirham" },
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

export const SOURCE_FILTER_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "Enterprise", label: "Enterprise" },
  { value: "Standalone", label: "Standalone" },
];

export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Draft", label: "Draft" },
  { value: "Pending Approval", label: "Pending Approval" },
  { value: "Active", label: "Active" },
  { value: "Rejected", label: "Rejected" },
  { value: "Inactive", label: "Inactive" },
];
