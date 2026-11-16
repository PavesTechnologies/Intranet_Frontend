import {
  DISBURSEMENT_MODE,
  EMPTY_DISBURSEMENT_CONFIRMATION,
  buildDisbursementFormData,
  validateDisbursementConfirmation,
} from "../disbursementConfirmation";

const base = { ...EMPTY_DISBURSEMENT_CONFIRMATION };
const pdf = new File(["x"], "ack.pdf", { type: "application/pdf" });
const png = new File(["x"], "shot.png", { type: "image/png" });

describe("validateDisbursementConfirmation", () => {
  it("requires a mode first", () => {
    expect(validateDisbursementConfirmation(base)).toEqual({ mode: "Select how the payment was made." });
  });

  it("cash needs the receiver and a signed acknowledgment", () => {
    const errors = validateDisbursementConfirmation({ ...base, mode: DISBURSEMENT_MODE.CASH });
    expect(errors.receivedByName).toBeDefined();
    expect(errors.signedAcknowledgment).toBe("Upload the signed acknowledgment.");
    expect(validateDisbursementConfirmation({ ...base, mode: DISBURSEMENT_MODE.CASH, receivedByName: "John", signedAcknowledgment: pdf })).toEqual({});
  });

  it("rejects an acknowledgment that is not PDF, JPG or PNG", () => {
    const docx = new File(["x"], "ack.docx", { type: "application/msword" });
    const errors = validateDisbursementConfirmation({ ...base, mode: DISBURSEMENT_MODE.CASH, receivedByName: "John", signedAcknowledgment: docx });
    expect(errors.signedAcknowledgment).toBe("Upload a PDF, JPG or PNG file.");
  });

  it("bank transfer needs reference, date and details, and no cash proof", () => {
    const errors = validateDisbursementConfirmation({ ...base, mode: DISBURSEMENT_MODE.BANK_TRANSFER });
    expect(Object.keys(errors).sort()).toEqual(["transactionReference", "transferDate", "transferDetails"]);
    expect(
      validateDisbursementConfirmation({
        ...base,
        mode: DISBURSEMENT_MODE.BANK_TRANSFER,
        transactionReference: "UTR1",
        transferDate: "2026-10-01",
        transferDetails: "HDFC 1234",
      }),
    ).toEqual({});
  });

  it("UPI needs a valid payee ID and a screenshot", () => {
    const bad = validateDisbursementConfirmation({
      ...base,
      mode: DISBURSEMENT_MODE.UPI,
      upiTransactionId: "T1",
      payeeUpiId: "not-an-id",
      transferDate: "2026-10-01",
      paymentProof: png,
    });
    expect(bad.payeeUpiId).toBe("Enter a valid payee UPI ID (for example name@bank).");

    const ok = validateDisbursementConfirmation({
      ...base,
      mode: DISBURSEMENT_MODE.UPI,
      upiTransactionId: "T1",
      payeeUpiId: "asha@hdfcbank",
      transferDate: "2026-10-01",
      paymentProof: png,
    });
    expect(ok).toEqual({});
  });
});

describe("buildDisbursementFormData", () => {
  it("sends only the fields for the chosen mode", () => {
    const form = buildDisbursementFormData({
      ...base,
      mode: DISBURSEMENT_MODE.BANK_TRANSFER,
      transactionReference: " UTR1 ",
      transferDate: "2026-10-01",
      transferDetails: "HDFC",
      signedAcknowledgment: pdf,
    });
    expect(form.get("disbursementMode")).toBe("BANK_TRANSFER");
    expect(form.get("transactionReference")).toBe("UTR1");
    expect(form.has("signedAcknowledgment")).toBe(false);
    expect(form.has("receivedByName")).toBe(false);
  });

  it("omits an empty confirmation note", () => {
    const form = buildDisbursementFormData({ ...base, mode: DISBURSEMENT_MODE.CASH, receivedByName: "J", signedAcknowledgment: pdf, confirmationNote: "  " });
    expect(form.has("confirmationNote")).toBe(false);
  });
});
