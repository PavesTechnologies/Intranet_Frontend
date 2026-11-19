/** Accounting export (Tally / Zoho Books) - mirrors Backend accounting_export_service.py. */
export const ACCOUNTING_EXPORT_PERMISSIONS = ["ACCOUNTING_EXPORT", "PAYMENT_PROCESS", "AP_AUTOMATION_MANAGE"];
export const ACCOUNTING_LEDGER_PERMISSIONS = ["ACCOUNTING_EXPORT", "AP_AUTOMATION_MANAGE"];

export const EXPORT_FORMATS = [
  { value: "TALLY_XML", label: "Tally Prime / ERP 9 (XML)", hint: "Gateway of Tally → Import → Vouchers. Ledgers are created if missing." },
  { value: "ZOHO_CSV", label: "Zoho Books (CSV)", hint: "Accountant → Manual Journals → Import." },
  { value: "GENERIC_CSV", label: "Other software (CSV)", hint: "One row per ledger line - for any other accounting package." },
];

export const VOUCHER_TYPES = {
  INVOICE: "Invoices booked",
  PAYMENT: "Payments",
  NOTE: "Credit / debit notes",
  CHALLAN: "TDS deposits",
};
