// "What you do here" guides for the Accounts Payable pages, and the terms they use.
// Each page lists the flows of the roles that work there; a flow shows only to someone whose
// permissions allow it (`when` gets useApPermissions()), so each person sees their own part.
// The same content builds the "How Accounts Payable works" page (AP_ROUTES.GUIDE).
import { AP_ROUTES } from "./routes";

export const GLOSSARY = {
  TDS: "Tax Deducted at Source - part of a vendor's payment (e.g. 10% of rent) kept back and paid to the government on the vendor's behalf.",
  Section: "The TDS rule that applies - 194J professional / technical fees, 194I rent, 194C contractors. It sets the rate.",
  Challan: "The receipt for depositing TDS with the government (ITNS 281). One challan per section per month.",
  "BSR code": "7-digit code of the bank branch that took the TDS deposit - printed on the challan.",
  CIN: "Challan Identification Number = BSR code + deposit date + challan serial number.",
  "26Q": "The quarterly TDS return listing every vendor's TDS - filed after each quarter (due 31 Jul, 31 Oct, 31 Jan, 31 May).",
  UTR: "Unique Transaction Reference - the 16-character bank reference of an NEFT / RTGS payment, printed on the receipt.",
  GST: "Goods and Services Tax charged by the vendor on the invoice - CGST + SGST within the state, IGST across states.",
  ITC: "Input Tax Credit - GST paid to vendors that the company recovers in its own GST return.",
  "GSTR-3B": "The monthly GST return (due the 20th) in which input credit is claimed.",
  "GSTR-2B": "The government's monthly statement of the invoices your vendors actually filed - credit is claimable only for those.",
  IRN: "Invoice Reference Number of an e-invoice (64 characters, with a QR code). Without it, GST credit is not allowed for e-invoicing vendors.",
  MSME: "Micro or small enterprise vendor - must be paid within 45 days (MSMED Act); late payment means interest and lost tax deduction.",
  "Payment terms": "How many days after the invoice date the vendor must be paid - from the PO, the agreement or the vendor master.",
};

const INVOICES_AP = {
  role: "AP Executive",
  when: (p) => p.canUploadInvoice || p.canBulkUploadInvoices || p.canReviewOcr,
  steps: [
    { label: "Bring invoices in", detail: "Upload one or many - or the mailbox / SharePoint pickup brings them in for you.", to: AP_ROUTES.INVOICE_UPLOAD },
    { label: "Review what was read", detail: "Check vendor, amounts and GST in To review. TDS is worked out for you.", to: AP_ROUTES.INVOICE_REVIEW_WORKBENCH },
    { label: "Send for approval", detail: "One click per invoice, or many at once from Review & send.", to: AP_ROUTES.INVOICE_REVIEW_WORKBENCH },
    { label: "Fix returned invoices", detail: "An approver sent it back with a comment - correct it and resubmit.", to: `${AP_ROUTES.INVOICE_LIST}?queue=approval` },
  ],
};
const INVOICES_APPROVER = {
  role: "Approver",
  when: (p) => p.canApproveInvoice || p.canRejectInvoice || p.canSendBackInvoice,
  steps: [
    { label: "Open invoices waiting for you", detail: "Each shows the document, amounts, TDS and who approved before you.", to: `${AP_ROUTES.INVOICE_LIST}?queue=approval` },
    { label: "Approve, send back or reject", detail: "Send back with a comment when something needs fixing; reject only if it should not be paid." },
  ],
};
const INVOICES_FINANCE = {
  role: "Finance Executive",
  when: (p) => p.canVerifyTds || p.canRecordPayment || p.canUpdateTdsTracking,
  steps: [
    { label: "Verify TDS", detail: "On approved invoices, confirm the TDS section and amount.", to: `${AP_ROUTES.INVOICE_LIST}?queue=approved`, terms: ["TDS", "Section"] },
    { label: "Mark ready for payment", detail: "Payment terms are checked; the invoice moves to Payment Management.", to: `${AP_ROUTES.INVOICE_LIST}?queue=approved`, terms: ["Payment terms"] },
    { label: "Pay and upload the receipt", detail: "Pay in the bank portal, then upload the receipt - one or many at once.", to: AP_ROUTES.BULK_IMPORT, terms: ["UTR"] },
    { label: "Deposit TDS", detail: "Monthly, by the 7th - one challan per section for all the month's payments.", to: AP_ROUTES.TDS_CHALLANS, terms: ["Challan"] },
    { label: "File the TDS return", detail: "Quarterly 26Q, after the quarter ends.", to: AP_ROUTES.TDS_CHALLANS, terms: ["26Q"] },
  ],
};

const PAY = (p) => p.canViewPayment || p.canRecordPayment || p.canViewPaymentManagement;

export const PAGE_GUIDES = {
  invoices: {
    title: "What you do in Invoice Management",
    intro: "Every vendor invoice from arrival to payment. Your part depends on your role:",
    flows: [INVOICES_AP, INVOICES_APPROVER, INVOICES_FINANCE],
  },
  payments: {
    title: "What you do in Payment Management",
    intro: "Approved invoices that Finance marked ready, with the amount due after TDS and notes.",
    flows: [{
      role: "Finance Executive",
      when: PAY,
      steps: [
        { label: "See what to pay", detail: "Due dates, overdue and MSME deadlines are flagged.", terms: ["MSME"] },
        { label: "Pay in your bank portal", detail: "NEFT / RTGS / IMPS - put the invoice number in the remarks." },
        { label: "Upload the receipt", detail: "One invoice: Record payment on it. Many: Upload receipts - each is matched to its invoice.", to: AP_ROUTES.BULK_IMPORT, terms: ["UTR"] },
        { label: "Paid - TDS is next", detail: "The invoice becomes Paid and its TDS waits for the month's challan.", to: AP_ROUTES.TDS_CHALLANS, terms: ["TDS"] },
      ],
    }],
  },
  receipts: {
    title: "How receipt upload works",
    intro: "For payments you already made in the bank portal.",
    flows: [{
      role: "Finance Executive",
      when: (p) => p.canRecordPayment,
      steps: [
        { label: "Drop the receipts", detail: "One, many or a ZIP." },
        { label: "Each is matched", detail: "By the invoice number in the remarks, else the beneficiary and amount.", terms: ["UTR"] },
        { label: "Check and record", detail: "Matched payments are recorded with one click; anything unclear waits for you." },
      ],
    }],
  },
  tdsTracking: {
    title: "What you do in TDS Tracking",
    intro: "TDS kept back from vendors is paid to the government and reported.",
    flows: [{
      role: "Finance Executive",
      when: (p) => p.canViewTdsTracking || p.canUpdateTdsTracking,
      steps: [
        { label: "Deducted at payment", detail: "Recorded automatically when the vendor's payment is recorded.", terms: ["TDS", "Section"] },
        { label: "Deposit monthly", detail: "By the 7th of the next month (March: 30 April), one challan per section.", to: AP_ROUTES.TDS_CHALLANS, terms: ["Challan", "BSR code", "CIN"] },
        { label: "File quarterly", detail: "26Q after the quarter ends: 31 Jul, 31 Oct, 31 Jan, 31 May.", to: AP_ROUTES.TDS_CHALLANS, terms: ["26Q"] },
      ],
    }],
  },
  tdsChallans: {
    title: "Recording TDS deposits and returns",
    intro: "Upload the challan or the return acknowledgement - its details are read and the right invoices are picked for you.",
    flows: [{
      role: "Finance Executive",
      when: (p) => p.canUpdateTdsTracking,
      steps: [
        { label: "Record challan", detail: "Monthly, one per section. Upload it - amount, date and invoices fill in.", to: AP_ROUTES.TDS_CHALLAN_NEW, terms: ["Challan", "CIN"] },
        { label: "Record filing", detail: "Quarterly 26Q. Upload the acknowledgement - the quarter's invoices are selected.", to: AP_ROUTES.TDS_FILING_NEW, terms: ["26Q"] },
      ],
    }],
  },
  gst: {
    title: "What you do in GST Input Credit",
    intro: "Recover the GST paid to vendors - and keep it.",
    flows: [{
      role: "Finance Executive",
      when: (p) => p.canViewGstItc,
      steps: [
        { label: "Fix what blocks credit", detail: "Record missing IRNs; confirm credit that may be blocked (food, cabs...).", terms: ["IRN", "ITC"] },
        { label: "Match with GSTR-2B", detail: "On the 14th, import GSTR-2B - only invoices the vendor filed can be claimed.", terms: ["GSTR-2B"] },
        { label: "Claim by the 20th", detail: "File GSTR-3B on the GST portal, then mark the month claimed here.", terms: ["GSTR-3B"] },
      ],
    }],
  },
  recurring: {
    title: "What recurring invoices do",
    intro: "Rent and subscriptions the company expects every period.",
    flows: [{
      role: "Finance Executive",
      when: (p) => p.canViewRecurring,
      steps: [
        { label: "Set up a schedule", detail: "Vendor, amount, day of the month and tolerance." },
        { label: "Invoices are matched", detail: "Each month's invoice is linked to its period and its amount checked." },
        { label: "Chase missing ones", detail: "A period with no invoice after its grace days is flagged as missing." },
      ],
    }],
  },
  notes: {
    title: "What credit and debit notes do",
    intro: "Corrections to what we owe a vendor.",
    flows: [{
      role: "Finance Executive",
      when: (p) => p.canViewVendorNotes,
      steps: [
        { label: "Record the note", detail: "Credit note from the vendor (with GST), or our debit note for a shortfall.", terms: ["GST"] },
        { label: "Apply it to an invoice", detail: "The amount due drops by the note; TDS is adjusted if not yet deducted.", terms: ["TDS"] },
      ],
    }],
  },
  accountingExport: {
    title: "What accounting export does",
    intro: "Post AP to Tally or Zoho Books without re-typing it.",
    flows: [{
      role: "Finance Executive",
      when: (p) => p.canExportAccounting,
      steps: [
        { label: "Choose the period and format", detail: "Invoices, payments, notes and TDS deposits become balanced vouchers." },
        { label: "Download and import", detail: "Into Tally (XML) or Zoho Books (CSV). Exported vouchers are not exported twice." },
      ],
    }],
  },
};
