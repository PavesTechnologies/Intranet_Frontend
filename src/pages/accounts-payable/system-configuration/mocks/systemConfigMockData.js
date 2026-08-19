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
