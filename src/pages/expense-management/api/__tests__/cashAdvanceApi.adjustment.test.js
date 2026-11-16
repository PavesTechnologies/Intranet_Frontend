import { AxiosError } from "axios";
import api from "@/api/axiosInstance";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { adjustmentErrorMessage, buildAdjustmentRequest } from "@/pages/expense-management/api/adjustmentRequest";

const ADVANCE_ID = "6f1f0c2e-1111-4a2b-9c3d-000000000001";
const REPORT_ID = "6f1f0c2e-2222-4a2b-9c3d-000000000002";

/**
 * Runs the real axios request pipeline and only swaps the network adapter, so the assertions are about the body
 * and headers that would actually be sent to POST /xms/finance/reimbursements.
 */
describe("cashAdvanceApi.createReimbursementAdjustment", () => {
  let sent;
  let respond;
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    sent = null;
    respond = () => ({ data: { success: true, data: {} }, status: 201, statusText: "Created", headers: {} });
    api.defaults.adapter = async (config) => {
      sent = config;
      const result = respond(config);
      if (result instanceof Error) throw result;
      return { ...result, config };
    };
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it("sends the body as JSON with the server's field names", async () => {
    const body = buildAdjustmentRequest({
      advanceId: ADVANCE_ID,
      reportId: REPORT_ID,
      adjustedAmount: 250,
      adjustedBy: "FIN001",
      idempotencyKey: "K-9",
    });

    await cashAdvanceApi.createReimbursementAdjustment(body);

    expect(sent.url).toContain("/xms/finance/reimbursements");
    expect(sent.method).toBe("post");
    expect(sent.headers.getContentType()).toMatch(/^application\/json/);
    expect(JSON.parse(sent.data)).toEqual({
      advanceId: ADVANCE_ID,
      reportId: REPORT_ID,
      adjustedAmount: 250,
      adjustedBy: "FIN001",
      idempotencyKey: "K-9",
    });
  });

  it("refuses FormData before any request is made, so it cannot reach the server as form-urlencoded", () => {
    const form = new FormData();
    form.append("advanceId", ADVANCE_ID);
    form.append("reportId", REPORT_ID);
    form.append("adjustedAmount", "250");

    expect(() => cashAdvanceApi.createReimbursementAdjustment(form)).toThrow(TypeError);
    expect(sent).toBeNull();
  });

  it("passes a server validation error through with its message", async () => {
    respond = (config) =>
      new AxiosError("Request failed with status code 400", "ERR_BAD_REQUEST", config, null, {
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config,
        data: { success: false, message: "Required parameter 'reportId' is missing" },
      });
    const body = buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: REPORT_ID, adjustedAmount: 250 });

    const err = await cashAdvanceApi.createReimbursementAdjustment(body).catch((e) => e);

    expect(err.response.status).toBe(400);
    expect(adjustmentErrorMessage(err, "fallback")).toBe("Required parameter 'reportId' is missing");
  });

  it("passes a business-rule rejection (422) through with the server's reason", async () => {
    respond = (config) =>
      new AxiosError("Request failed with status code 422", "ERR_BAD_REQUEST", config, null, {
        status: 422,
        statusText: "Unprocessable Entity",
        headers: {},
        config,
        data: { success: false, message: "Expense report must be fully approved and finance-verified before adjusting against a cash advance." },
      });
    const body = buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: REPORT_ID, adjustedAmount: 250 });

    const err = await cashAdvanceApi.createReimbursementAdjustment(body).catch((e) => e);

    expect(err.response.status).toBe(422);
    expect(adjustmentErrorMessage(err, "fallback")).toContain("fully approved");
  });

  it("falls back to the caller's message when the network fails and there is no response", async () => {
    respond = () => new AxiosError("Network Error", "ERR_NETWORK");
    const body = buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: REPORT_ID, adjustedAmount: 250 });

    const err = await cashAdvanceApi.createReimbursementAdjustment(body).catch((e) => e);

    expect(adjustmentErrorMessage(err, "Failed to create reimbursement adjustment")).toBe("Failed to create reimbursement adjustment");
  });
});
