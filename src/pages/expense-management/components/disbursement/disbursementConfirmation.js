/**
 * Disbursement confirmation shared by every Expense Management payout (cash advance disbursement,
 * AP reimbursement payment and settlement). A payout is only recorded as done once Finance has
 * captured how it was paid and the matching proof:
 * - CASH: name of the person who received the money and a signed acknowledgment file.
 * - BANK_TRANSFER: transaction reference, transfer date and transfer details. No cash receipt.
 * - UPI: UPI transaction ID, payee UPI ID, transfer date and a payment screenshot.
 */

export const DISBURSEMENT_MODE = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  UPI: "UPI",
};

export const DISBURSEMENT_MODE_OPTIONS = [
  { value: DISBURSEMENT_MODE.CASH, label: "Cash" },
  { value: DISBURSEMENT_MODE.BANK_TRANSFER, label: "Bank transfer" },
  { value: DISBURSEMENT_MODE.UPI, label: "UPI" },
];

export const ACK_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const ACK_MAX_BYTES = 10 * 1024 * 1024;

// Loose UPI VPA check (name@handle). The bank validates the exact address.
const UPI_ID_PATTERN = /^[\w.-]{2,256}@[A-Za-z]{2,64}$/;

export const EMPTY_DISBURSEMENT_CONFIRMATION = {
  mode: "",
  receivedByName: "",
  signedAcknowledgment: null,
  transactionReference: "",
  transferDate: "",
  transferDetails: "",
  upiTransactionId: "",
  payeeUpiId: "",
  paymentProof: null,
  confirmationNote: "",
};

const validateProofFile = (file, label) => {
  if (!file) return `Upload the ${label}.`;
  if (!ACK_ALLOWED_TYPES.includes(file.type)) return "Upload a PDF, JPG or PNG file.";
  if (file.size > ACK_MAX_BYTES) return "The file must be 10 MB or smaller.";
  return "";
};

/** Returns a map of field -> message. An empty object means the confirmation is complete. */
export const validateDisbursementConfirmation = (values) => {
  const errors = {};

  if (!values.mode) {
    errors.mode = "Select how the payment was made.";
    return errors;
  }

  if (values.mode === DISBURSEMENT_MODE.CASH) {
    if (!values.receivedByName.trim()) {
      errors.receivedByName = "Enter the name of the person who received the cash.";
    }
    const proofError = validateProofFile(values.signedAcknowledgment, "signed acknowledgment");
    if (proofError) errors.signedAcknowledgment = proofError;
  }

  if (values.mode === DISBURSEMENT_MODE.BANK_TRANSFER) {
    if (!values.transactionReference.trim()) {
      errors.transactionReference = "Enter the transaction reference.";
    }
    if (!values.transferDate) {
      errors.transferDate = "Enter the transfer date.";
    }
    if (!values.transferDetails.trim()) {
      errors.transferDetails = "Enter the transfer details (bank and beneficiary account).";
    }
  }

  if (values.mode === DISBURSEMENT_MODE.UPI) {
    if (!values.upiTransactionId.trim()) {
      errors.upiTransactionId = "Enter the UPI transaction ID.";
    }
    if (!UPI_ID_PATTERN.test(values.payeeUpiId.trim())) {
      errors.payeeUpiId = "Enter a valid payee UPI ID (for example name@bank).";
    }
    if (!values.transferDate) {
      errors.transferDate = "Enter the payment date.";
    }
    const proofError = validateProofFile(values.paymentProof, "payment screenshot");
    if (proofError) errors.paymentProof = proofError;
  }

  return errors;
};

/**
 * Multipart body for the disburse / payment-complete endpoints. Only the fields that apply to the
 * chosen mode are sent, so a bank transfer never carries a cash acknowledgment and vice versa.
 */
export const buildDisbursementFormData = (values) => {
  const formData = new FormData();
  formData.append("disbursementMode", values.mode);

  if (values.mode === DISBURSEMENT_MODE.CASH) {
    formData.append("receivedByName", values.receivedByName.trim());
    formData.append("signedAcknowledgment", values.signedAcknowledgment);
  }

  if (values.mode === DISBURSEMENT_MODE.BANK_TRANSFER) {
    formData.append("transactionReference", values.transactionReference.trim());
    formData.append("transferDate", values.transferDate);
    formData.append("transferDetails", values.transferDetails.trim());
  }

  if (values.mode === DISBURSEMENT_MODE.UPI) {
    formData.append("upiTransactionId", values.upiTransactionId.trim());
    formData.append("payeeUpiId", values.payeeUpiId.trim());
    formData.append("transferDate", values.transferDate);
    formData.append("paymentProof", values.paymentProof);
  }

  if (values.confirmationNote.trim()) {
    formData.append("confirmationNote", values.confirmationNote.trim());
  }

  return formData;
};
