import { INVOICE_STATUS } from "../constants/invoiceStatus";
import { INVOICE_TYPES } from "../constants/invoiceTypes";

/**
 * @typedef {Object} OcrExtractedFields
 * @property {string} invoiceNumber
 * @property {string} invoiceDate - ISO date string
 * @property {string} dueDate - ISO date string
 * @property {number} amount
 * @property {number} taxAmount
 * @property {string} currency
 * @property {number} confidenceScore - 0-1 OCR extraction confidence, drives review priority
 */

/**
 * @typedef {Object} ValidationChecklist
 * @property {boolean} vendorMatched
 * @property {boolean} amountMatched
 * @property {boolean} duplicateChecked
 * @property {string} notes
 */

/**
 * @typedef {Object} Invoice
 * @property {string} id
 * @property {string} vendorId
 * @property {string} invoiceType - one of INVOICE_TYPES (see constants/invoiceTypes.js)
 * @property {string} status - one of INVOICE_STATUS (see constants/invoiceStatus.js)
 * @property {string} fileUrl - uploaded invoice document
 * @property {OcrExtractedFields} ocrFields
 * @property {ValidationChecklist} validation
 * @property {string} uploadedBy
 * @property {string} uploadedAt - ISO date string
 */

/** @returns {Invoice} a blank invoice record, set immediately after file upload */
export function createEmptyInvoice() {
  return {
    id: "",
    vendorId: "",
    invoiceType: INVOICE_TYPES.TAX_INVOICE,
    status: INVOICE_STATUS.UPLOADED,
    fileUrl: "",
    ocrFields: {
      invoiceNumber: "",
      invoiceDate: "",
      dueDate: "",
      amount: 0,
      taxAmount: 0,
      currency: "INR",
      confidenceScore: 0,
    },
    validation: { vendorMatched: false, amountMatched: false, duplicateChecked: false, notes: "" },
    uploadedBy: "",
    uploadedAt: "",
  };
}
