/**
 * Frontend-only mock data for the AP System Configuration submodule.
 * No backend/API calls — everything here is local seed data consumed by
 * useLocalCrudList() and rendered/edited entirely in browser state.
 */

export const DATA_TYPE_OPTIONS = [
  { value: "STRING", label: "String" },
  { value: "INTEGER", label: "Integer" },
  { value: "DECIMAL", label: "Decimal" },
  { value: "BOOLEAN", label: "Boolean" },
];

export const GENERAL_CONFIG_MOCK = [
  { id: 1, configKey: "INVOICE_DUE_DAYS", value: "30", dataType: "INTEGER", description: "Default invoice due days", updatedBy: "AP Admin" },
  { id: 2, configKey: "INVOICE_TOLERANCE", value: "1.00", dataType: "DECIMAL", description: "Invoice matching tolerance", updatedBy: "AP Admin" },
  { id: 3, configKey: "AUTO_APPROVAL_ENABLED", value: "true", dataType: "BOOLEAN", description: "Enable automatic approval", updatedBy: "AP Admin" },
  { id: 4, configKey: "DEFAULT_CURRENCY", value: "INR", dataType: "STRING", description: "Default AP currency", updatedBy: "AP Admin" },
];

export const STATUS_MODULE_OPTIONS = [
  { value: "Vendor", label: "Vendor" },
  { value: "Purchase Order", label: "Purchase Order" },
  { value: "Invoice", label: "Invoice" },
  { value: "Invoice Issue", label: "Invoice Issue" },
  { value: "Payment", label: "Payment" },
];

export const STATUS_MASTER_MOCK = [
  // Vendor
  { id: 1, module: "Vendor", statusCode: "DRAFT", statusName: "Draft", displayOrder: 1 },
  { id: 2, module: "Vendor", statusCode: "PENDING_VERIFICATION", statusName: "Pending Verification", displayOrder: 2 },
  { id: 3, module: "Vendor", statusCode: "VERIFIED", statusName: "Verified", displayOrder: 3 },
  { id: 4, module: "Vendor", statusCode: "ACTIVE", statusName: "Active", displayOrder: 4 },
  { id: 5, module: "Vendor", statusCode: "INACTIVE", statusName: "Inactive", displayOrder: 5 },
  { id: 6, module: "Vendor", statusCode: "BLACKLISTED", statusName: "Blacklisted", displayOrder: 6 },
  // Purchase Order
  { id: 7, module: "Purchase Order", statusCode: "DRAFT", statusName: "Draft", displayOrder: 1 },
  { id: 8, module: "Purchase Order", statusCode: "PENDING_APPROVAL", statusName: "Pending Approval", displayOrder: 2 },
  { id: 9, module: "Purchase Order", statusCode: "APPROVED", statusName: "Approved", displayOrder: 3 },
  { id: 10, module: "Purchase Order", statusCode: "PARTIALLY_RECEIVED", statusName: "Partially Received", displayOrder: 4 },
  { id: 11, module: "Purchase Order", statusCode: "RECEIVED", statusName: "Received", displayOrder: 5 },
  { id: 12, module: "Purchase Order", statusCode: "CLOSED", statusName: "Closed", displayOrder: 6 },
  { id: 13, module: "Purchase Order", statusCode: "CANCELLED", statusName: "Cancelled", displayOrder: 7 },
  // Invoice
  { id: 14, module: "Invoice", statusCode: "RECEIVED", statusName: "Received", displayOrder: 1 },
  { id: 15, module: "Invoice", statusCode: "PROCESSING", statusName: "Processing", displayOrder: 2 },
  { id: 16, module: "Invoice", statusCode: "VALIDATED", statusName: "Validated", displayOrder: 3 },
  { id: 17, module: "Invoice", statusCode: "PENDING_APPROVAL", statusName: "Pending Approval", displayOrder: 4 },
  { id: 18, module: "Invoice", statusCode: "APPROVED", statusName: "Approved", displayOrder: 5 },
  { id: 19, module: "Invoice", statusCode: "REJECTED", statusName: "Rejected", displayOrder: 6 },
  { id: 20, module: "Invoice", statusCode: "PAID", statusName: "Paid", displayOrder: 7 },
  // Invoice Issue
  { id: 21, module: "Invoice Issue", statusCode: "OPEN", statusName: "Open", displayOrder: 1 },
  { id: 22, module: "Invoice Issue", statusCode: "IN_REVIEW", statusName: "In Review", displayOrder: 2 },
  { id: 23, module: "Invoice Issue", statusCode: "RESOLVED", statusName: "Resolved", displayOrder: 3 },
  { id: 24, module: "Invoice Issue", statusCode: "ESCALATED", statusName: "Escalated", displayOrder: 4 },
  { id: 25, module: "Invoice Issue", statusCode: "CLOSED", statusName: "Closed", displayOrder: 5 },
  // Payment
  { id: 26, module: "Payment", statusCode: "PENDING", statusName: "Pending", displayOrder: 1 },
  { id: 27, module: "Payment", statusCode: "PROCESSING", statusName: "Processing", displayOrder: 2 },
  { id: 28, module: "Payment", statusCode: "COMPLETED", statusName: "Completed", displayOrder: 3 },
  { id: 29, module: "Payment", statusCode: "FAILED", statusName: "Failed", displayOrder: 4 },
  { id: 30, module: "Payment", statusCode: "CANCELLED", statusName: "Cancelled", displayOrder: 5 },
];

export const TAX_COUNTRY_OPTIONS = [
  { value: "India", label: "India" },
  { value: "USA", label: "USA" },
  { value: "UK", label: "UK" },
  { value: "Singapore", label: "Singapore" },
];

export const TAX_CALCULATION_TYPE_OPTIONS = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FIXED", label: "Fixed Amount" },
];

export const TAX_TYPES_MOCK = [
  { id: 1, country: "India", taxCode: "GST", taxName: "Goods & Service Tax", calculationType: "PERCENTAGE", rateValue: 18, withholding: false, effectiveFrom: "2026-04-01", effectiveTo: "", systemDefault: true, active: true },
  { id: 2, country: "India", taxCode: "IGST", taxName: "Integrated GST", calculationType: "PERCENTAGE", rateValue: 18, withholding: false, effectiveFrom: "2026-04-01", effectiveTo: "", systemDefault: false, active: true },
  { id: 3, country: "India", taxCode: "CGST", taxName: "Central GST", calculationType: "PERCENTAGE", rateValue: 9, withholding: false, effectiveFrom: "2026-04-01", effectiveTo: "", systemDefault: false, active: true },
  { id: 4, country: "India", taxCode: "SGST", taxName: "State GST", calculationType: "PERCENTAGE", rateValue: 9, withholding: false, effectiveFrom: "2026-04-01", effectiveTo: "", systemDefault: false, active: true },
  { id: 5, country: "India", taxCode: "TDS", taxName: "TDS", calculationType: "PERCENTAGE", rateValue: 10, withholding: true, effectiveFrom: "2026-04-01", effectiveTo: "", systemDefault: false, active: true },
];

export const PAYMENT_TERMS_MOCK = [
  { id: 1, termName: "Immediate", dueDays: 0, discountPercent: "0.00", discountDays: 0, systemDefault: false, active: true },
  { id: 2, termName: "Net 15", dueDays: 15, discountPercent: "0.00", discountDays: 0, systemDefault: false, active: true },
  { id: 3, termName: "Net 30", dueDays: 30, discountPercent: "0.00", discountDays: 0, systemDefault: true, active: true },
  { id: 4, termName: "2/10 Net 30", dueDays: 30, discountPercent: "2.00", discountDays: 10, systemDefault: false, active: true },
  { id: 5, termName: "Net 45", dueDays: 45, discountPercent: "0.00", discountDays: 0, systemDefault: false, active: true },
  { id: 6, termName: "Net 60", dueDays: 60, discountPercent: "0.00", discountDays: 0, systemDefault: false, active: true },
];

/**
 * Tax type codes are sourced from TAX_TYPES_MOCK above. In the real API this
 * dropdown should query the Tax Types master (GET /system/tax-type) instead
 * of a static list, so a tax rule always targets a tax type that actually
 * exists.
 */
export const TAX_TYPE_CODE_OPTIONS = TAX_TYPES_MOCK.map((t) => ({
  value: t.taxCode,
  label: `${t.taxCode} — ${t.taxName}`,
}));

/**
 * Fiscal Year master.
 * Intended backend contract:
 *   GET    /system/fiscal-year                -> FiscalYear[]
 *   POST   /system/fiscal-year                 <- { fiscalYearCode, startDate, endDate, status, isCurrent }
 *   PUT    /system/fiscal-year/{id}             <- same body as POST
 *   DELETE /system/fiscal-year/{id}             (only when status = FUTURE and unreferenced)
 *   POST   /system/fiscal-year/{id}/close        -> closes this year and, if a FUTURE year exists,
 *                                                    promotes the earliest one to OPEN/current
 * Tax rate lookups must key off tax_rule.effective_from/effective_to against the invoice date —
 * NOT off the fiscal year — so fiscal year here is for period bookkeeping/close status only.
 */
export const FISCAL_YEAR_STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "FUTURE", label: "Future" },
];

export const FISCAL_YEARS_MOCK = [
  { id: 1, fiscalYearCode: "FY2025-26", startDate: "2025-04-01", endDate: "2026-03-31", status: "CLOSED", isCurrent: false },
  { id: 2, fiscalYearCode: "FY2026-27", startDate: "2026-04-01", endDate: "2027-03-31", status: "OPEN", isCurrent: true },
  { id: 3, fiscalYearCode: "FY2027-28", startDate: "2027-04-01", endDate: "2028-03-31", status: "FUTURE", isCurrent: false },
];

/**
 * Tax & Compliance global switches — enable/disable which validations run
 * during invoice processing. These do NOT carry rates or thresholds; those
 * live on Tax Rules below.
 * Intended backend contract:
 *   GET /system/tax-compliance-settings  -> TaxComplianceSettings
 *   PUT /system/tax-compliance-settings  <- TaxComplianceSettings (full object, single row)
 */
export const TAX_COMPLIANCE_TOGGLE_FIELDS = [
  { key: "taxValidationEnabled", label: "Tax Validation", description: "Master switch for tax validation during invoice processing." },
  { key: "gstValidationEnabled", label: "GST Validation", description: "Validate GST/CGST/SGST/IGST amounts on invoices against tax rules." },
  { key: "tdsValidationEnabled", label: "TDS Validation", description: "Validate withholding tax deduction on applicable invoices." },
  { key: "vendorGstinValidationEnabled", label: "Vendor GSTIN Validation", description: "Verify the vendor's GSTIN against the GST registry before processing." },
  { key: "taxRateValidationEnabled", label: "Tax Rate Validation", description: "Compare invoice tax amounts against the applicable tax rule rate." },
  { key: "taxRegistrationValidationEnabled", label: "Tax Registration Validation", description: "Require a valid tax registration on file for the vendor." },
  { key: "eInvoiceValidationEnabled", label: "E-Invoice Validation", description: "Validate e-invoice / IRN details where applicable." },
];

export const TAX_COMPLIANCE_TOGGLES_MOCK = {
  taxValidationEnabled: true,
  gstValidationEnabled: true,
  tdsValidationEnabled: true,
  vendorGstinValidationEnabled: true,
  taxRateValidationEnabled: true,
  taxRegistrationValidationEnabled: true,
  eInvoiceValidationEnabled: false,
};

/**
 * Tax Rules — TaxType -> TaxRule -> TaxRuleCondition, with an effective-dated
 * rate on the rule itself. Invoice tax validation resolves rules by
 * invoice_date falling within [effectiveFrom, effectiveTo], then evaluates
 * every condition on the rule (AND) against the invoice/vendor context.
 * Intended backend contract:
 *   GET    /system/tax-rule                    -> TaxRule[] (conditions nested)
 *   POST   /system/tax-rule                     <- TaxRule (conditions nested, no ids)
 *   PUT    /system/tax-rule/{id}                 <- TaxRule (conditions nested)
 *   DELETE /system/tax-rule/{id}
 * TaxRule shape: { ruleCode, ruleName, taxTypeCode, rateValue, effectiveFrom,
 *   effectiveTo, active, conditions: [{ conditionType, operator, value }] }
 * Changing a rate/effective-date should create a NEW rule (or a new
 * effective-dated version) rather than overwriting history — see the
 * IGST/CGST/SGST seed rules for the shape of a real rule.
 */
export const TAX_RULE_CONDITION_TYPE_OPTIONS = [
  { value: "SUPPLIER_STATE", label: "Supplier State" },
  { value: "BUYER_STATE", label: "Buyer State" },
  { value: "PLACE_OF_SUPPLY", label: "Place of Supply" },
  { value: "GST_REGISTRATION_TYPE", label: "GST Registration Type" },
  { value: "GSTIN_STATUS", label: "GSTIN Status" },
  { value: "SAC_CODE", label: "SAC Code" },
  { value: "HSN_CODE", label: "HSN Code" },
  { value: "VENDOR_CONSTITUTION", label: "Vendor Constitution" },
  { value: "INVOICE_AMOUNT", label: "Invoice Amount" },
  { value: "ANNUAL_VENDOR_AMOUNT", label: "Annual Vendor Amount" },
  { value: "SERVICE_TYPE", label: "Service Type" },
  { value: "PRODUCT_TYPE", label: "Product Type" },
  { value: "PAN_STATUS", label: "PAN Status" },
  { value: "TDS_SECTION", label: "TDS Section" },
  { value: "REVERSE_CHARGE", label: "Reverse Charge" },
];

export const TAX_RULE_OPERATOR_OPTIONS = [
  { value: "EQUALS", label: "= Equals" },
  { value: "NOT_EQUALS", label: "≠ Not Equals" },
  { value: "IN", label: "IN (one of)" },
  { value: "GREATER_THAN", label: "> Greater Than" },
  { value: "GREATER_THAN_OR_EQUAL", label: "≥ Greater Or Equal" },
  { value: "LESS_THAN", label: "< Less Than" },
  { value: "LESS_THAN_OR_EQUAL", label: "≤ Less Or Equal" },
];

export const TAX_RULES_MOCK = [
  {
    id: 1,
    ruleCode: "IGST_INTERSTATE_STANDARD",
    ruleName: "IGST - Interstate Standard Services",
    taxTypeCode: "IGST",
    rateValue: 18,
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    active: true,
    conditions: [
      { id: 1, conditionType: "SUPPLIER_STATE", operator: "NOT_EQUALS", value: "BUYER_STATE" },
      { id: 2, conditionType: "SAC_CODE", operator: "IN", value: "997331,998315" },
    ],
  },
  {
    id: 2,
    ruleCode: "CGST_INTRASTATE_STANDARD",
    ruleName: "CGST - Intrastate Standard Services",
    taxTypeCode: "CGST",
    rateValue: 9,
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    active: true,
    conditions: [
      { id: 1, conditionType: "SUPPLIER_STATE", operator: "EQUALS", value: "BUYER_STATE" },
      { id: 2, conditionType: "SAC_CODE", operator: "IN", value: "997331" },
    ],
  },
  {
    id: 3,
    ruleCode: "SGST_INTRASTATE_STANDARD",
    ruleName: "SGST - Intrastate Standard Services",
    taxTypeCode: "SGST",
    rateValue: 9,
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    active: true,
    conditions: [
      { id: 1, conditionType: "SUPPLIER_STATE", operator: "EQUALS", value: "BUYER_STATE" },
      { id: 2, conditionType: "SAC_CODE", operator: "IN", value: "997331" },
    ],
  },
  {
    id: 4,
    ruleCode: "TDS_194J_PROFESSIONAL",
    ruleName: "TDS 194J - Professional Services",
    taxTypeCode: "TDS",
    rateValue: 10,
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    active: true,
    conditions: [
      { id: 1, conditionType: "SERVICE_TYPE", operator: "EQUALS", value: "PROFESSIONAL" },
      { id: 2, conditionType: "ANNUAL_VENDOR_AMOUNT", operator: "GREATER_THAN", value: "30000" },
      { id: 3, conditionType: "PAN_STATUS", operator: "EQUALS", value: "VALID" },
    ],
  },
  {
    id: 5,
    ruleCode: "TDS_194C_CONTRACTOR",
    ruleName: "TDS 194C - Contractor Payments",
    taxTypeCode: "TDS",
    rateValue: 2,
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    active: true,
    conditions: [{ id: 1, conditionType: "SERVICE_TYPE", operator: "EQUALS", value: "CONTRACTOR" }],
  },
];

/**
 * Approval Rules — invoice amount range -> required approval level, used
 * in place of hardcoded approval thresholds in invoice workflow code.
 * Intended backend contract:
 *   GET    /system/approval-rule    -> ApprovalRule[]
 *   POST   /system/approval-rule     <- { minAmount, maxAmount, approvalLevel, active }
 *   PUT    /system/approval-rule/{id}
 *   DELETE /system/approval-rule/{id}
 * maxAmount = null means "and above" (no upper bound).
 */
export const APPROVAL_LEVEL_OPTIONS = [
  { value: "AUTO", label: "Auto" },
  { value: "AP_MANAGER", label: "AP Manager" },
  { value: "FINANCE_MANAGER", label: "Finance Manager" },
  { value: "CFO", label: "CFO" },
];

export const APPROVAL_RULES_MOCK = [
  { id: 1, minAmount: 0, maxAmount: 5000, approvalLevel: "AUTO", active: true },
  { id: 2, minAmount: 5001, maxAmount: 50000, approvalLevel: "AP_MANAGER", active: true },
  { id: 3, minAmount: 50001, maxAmount: 500000, approvalLevel: "FINANCE_MANAGER", active: true },
  { id: 4, minAmount: 500001, maxAmount: null, approvalLevel: "CFO", active: true },
];
