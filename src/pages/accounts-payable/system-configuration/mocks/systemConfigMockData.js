/**
 * Frontend-only mock data for the AP System Configuration submodule.
 * No backend/API calls — everything here is local seed data consumed by
 * useLocalCrudList() and rendered/edited entirely in browser state.
 *
 * Status Master is the exception: it is now backed by the real
 * GET /system/status and GET /system/status/{id} endpoints — see
 * services/statusMasterService.js and hooks/useStatusMasters.js.
 */

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
