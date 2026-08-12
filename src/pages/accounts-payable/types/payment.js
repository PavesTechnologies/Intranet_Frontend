import { PAYMENT_METHODS } from "../constants/paymentStatus";

/**
 * @typedef {Object} Payment
 * @property {string} id
 * @property {string} invoiceId
 * @property {string} vendorId
 * @property {number} amount
 * @property {string} method - one of PAYMENT_METHODS (see constants/paymentStatus.js)
 * @property {string} referenceNumber - bank/UPI/cheque reference recorded when marking as paid
 * @property {string} paidAt - ISO date string, empty until the invoice is marked paid
 * @property {string} paidBy - user who marked the invoice as paid
 */

/** @returns {Payment} a blank payment record, created when an invoice is marked as paid */
export function createEmptyPayment() {
  return {
    id: "",
    invoiceId: "",
    vendorId: "",
    amount: 0,
    method: PAYMENT_METHODS.BANK_TRANSFER,
    referenceNumber: "",
    paidAt: "",
    paidBy: "",
  };
}
