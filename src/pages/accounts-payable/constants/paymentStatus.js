import { INVOICE_STATUS } from "./invoiceStatus";

/**
 * A "payment status" is a view over the tail end of the invoice pipeline, re-exported here
 * (not redefined) so the Payments feature has its own import path without duplicating —
 * and risking drift from — the underlying status strings owned by invoiceStatus.js.
 */
export const PAYMENT_STATUS = {
  READY_FOR_PAYMENT: INVOICE_STATUS.READY_FOR_PAYMENT,
  PAID: INVOICE_STATUS.PAID,
};

export const PAYMENT_STATUS_OPTIONS = Object.values(PAYMENT_STATUS).map((value) => ({
  value,
  label: value,
}));

/** Recorded on the invoice when Finance marks it as paid. */
export const PAYMENT_METHODS = {
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  UPI: "UPI",
};

export const PAYMENT_METHOD_OPTIONS = Object.values(PAYMENT_METHODS).map((value) => ({
  value,
  label: value,
}));
