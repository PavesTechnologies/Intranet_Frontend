import api from "@/api/axiosInstance";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { buildDisbursementFormData, DISBURSEMENT_MODE } from "@/pages/expense-management/components/disbursement/disbursementConfirmation";

/**
 * Runs the real axios request pipeline (transformRequest + headers) and only swaps the network
 * adapter, so the assertions are about the body and headers that would actually be sent.
 */
describe("cashAdvanceApi.disburse - multipart request", () => {
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

  it("sends FormData as multipart, not flattened into JSON", async () => {
    const formData = buildDisbursementFormData({
      mode: DISBURSEMENT_MODE.BANK_TRANSFER,
      receivedByName: "",
      signedAcknowledgment: null,
      transactionReference: "UTR123",
      transferDate: "2026-10-01",
      transferDetails: "HDFC A/C 1234",
      upiTransactionId: "",
      payeeUpiId: "",
      paymentProof: null,
      confirmationNote: "",
    });

    await cashAdvanceApi.disburse("adv-1", formData);

    expect(sent.data).toBeInstanceOf(FormData);
    expect(sent.data.get("disbursementMode")).toBe("BANK_TRANSFER");
    expect(sent.data.get("transactionReference")).toBe("UTR123");
    // axios would otherwise send application/x-www-form-urlencoded (POST default). With no Content-Type
    // set, the browser adds the multipart boundary itself.
    expect(sent.headers.getContentType()).toBeFalsy();
    expect(sent.headers.toJSON()).not.toHaveProperty("Content-Type");
    expect(sent.url).toContain("/cash-advances/adv-1/disburse");
  });

  it("keeps uploaded proof files in the body", async () => {
    const ack = new File(["ack"], "ack.pdf", { type: "application/pdf" });
    const formData = buildDisbursementFormData({
      mode: DISBURSEMENT_MODE.CASH,
      receivedByName: "John Doe",
      signedAcknowledgment: ack,
      transactionReference: "",
      transferDate: "",
      transferDetails: "",
      upiTransactionId: "",
      payeeUpiId: "",
      paymentProof: null,
      confirmationNote: "",
    });

    await cashAdvanceApi.disburse("adv-2", formData);

    const file = sent.data.get("signedAcknowledgment");
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("ack.pdf");
    expect(sent.data.get("receivedByName")).toBe("John Doe");
  });
});
