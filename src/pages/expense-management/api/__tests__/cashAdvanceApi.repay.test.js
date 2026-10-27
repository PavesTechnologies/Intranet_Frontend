import api from "@/api/axiosInstance";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { buildDisbursementFormData, DISBURSEMENT_MODE } from "@/pages/expense-management/components/disbursement/disbursementConfirmation";

/**
 * Runs the real axios request pipeline (transformRequest + headers) and only swaps the network
 * adapter, so the assertions are about the body and headers that would actually be sent.
 * Repayment used to post FormData as form-urlencoded, which dropped every field and file.
 */
describe("cashAdvanceApi.repay - multipart request", () => {
  let sent;
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    sent = null;
    api.defaults.adapter = async (config) => {
      sent = config;
      return { data: { success: true, data: {} }, status: 200, statusText: "OK", headers: {}, config };
    };
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  const bankConfirmation = {
    mode: DISBURSEMENT_MODE.BANK_TRANSFER,
    receivedByName: "",
    signedAcknowledgment: null,
    transactionReference: "UTR-900",
    transferDate: "2026-10-02",
    transferDetails: "HDFC A/C 1234",
    upiTransactionId: "",
    payeeUpiId: "",
    paymentProof: null,
    confirmationNote: "",
  };

  it("posts to the repayments endpoint as multipart, not form-urlencoded", async () => {
    const formData = buildDisbursementFormData(bankConfirmation);
    formData.append("amount", "300");

    await cashAdvanceApi.repay("adv-7", formData);

    expect(sent.url).toContain("/cash-advances/adv-7/repayments");
    expect(sent.data).toBeInstanceOf(FormData);
    expect(sent.data.get("amount")).toBe("300");
    expect(sent.data.get("disbursementMode")).toBe("BANK_TRANSFER");
    expect(sent.data.get("transactionReference")).toBe("UTR-900");
    expect(sent.data.get("transferDate")).toBe("2026-10-02");
    // No Content-Type is set, so the browser adds the multipart boundary.
    expect(sent.headers.toJSON()).not.toHaveProperty("Content-Type");
  });

  it("keeps the cash acknowledgment file in the body", async () => {
    const ack = new File(["ack"], "ack.pdf", { type: "application/pdf" });
    const formData = buildDisbursementFormData({
      ...bankConfirmation,
      mode: DISBURSEMENT_MODE.CASH,
      receivedByName: "Ravi Kumar",
      signedAcknowledgment: ack,
      transactionReference: "",
      transferDate: "",
      transferDetails: "",
    });
    formData.append("amount", "100");

    await cashAdvanceApi.repay("adv-8", formData);

    const file = sent.data.get("signedAcknowledgment");
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("ack.pdf");
    expect(sent.data.get("receivedByName")).toBe("Ravi Kumar");
  });
});
