import {
  adjustmentErrorMessage,
  AdjustmentRequestError,
  buildAdjustmentRequest,
  getSettlementBlockReason,
  UNSUPPORTED_SETTLEMENT_MESSAGE,
} from "@/pages/expense-management/api/adjustmentRequest";

const ADVANCE_ID = "6f1f0c2e-1111-4a2b-9c3d-000000000001";
const REPORT_ID = "6f1f0c2e-2222-4a2b-9c3d-000000000002";

describe("buildAdjustmentRequest - the backend's CashAdvanceAdjustmentRequest", () => {
  it("returns exactly the server's field names", () => {
    const body = buildAdjustmentRequest({
      advanceId: ADVANCE_ID,
      reportId: REPORT_ID,
      adjustedAmount: "250",
      adjustedBy: " FIN001 ",
      idempotencyKey: "K-9",
    });

    expect(body).toEqual({
      advanceId: ADVANCE_ID,
      reportId: REPORT_ID,
      adjustedAmount: 250,
      adjustedBy: "FIN001",
      idempotencyKey: "K-9",
    });
  });

  it("generates an idempotency key when the caller does not pass one, and keeps a given key for retries", () => {
    const first = buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: REPORT_ID, adjustedAmount: 10 });
    expect(first.idempotencyKey).toEqual(expect.any(String));
    expect(first.idempotencyKey.length).toBeGreaterThan(0);

    const retry = buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: REPORT_ID, adjustedAmount: 10, idempotencyKey: "K-7" });
    const again = buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: REPORT_ID, adjustedAmount: 10, idempotencyKey: "K-7" });
    expect(retry.idempotencyKey).toBe("K-7");
    expect(again).toEqual(retry);
  });

  it("leaves adjustedBy out so the server uses the signed-in user", () => {
    const body = buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: REPORT_ID, adjustedAmount: 10 });
    expect(body).not.toHaveProperty("adjustedBy");
  });

  it("rounds the amount to two decimals", () => {
    expect(buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: REPORT_ID, adjustedAmount: "10.126" }).adjustedAmount).toBe(10.13);
  });

  it("does not carry the form-only fields the server would reject or ignore", () => {
    const body = buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: REPORT_ID, adjustedAmount: 10 });
    for (const key of ["cashAdvanceId", "expenseReportId", "adjustmentAmount", "notes", "settlementAction", "currencyCode"]) {
      expect(body).not.toHaveProperty(key);
    }
  });

  it("refuses a missing advance before anything is sent", () => {
    expect(() => buildAdjustmentRequest({ advanceId: "", reportId: REPORT_ID, adjustedAmount: 10 }))
      .toThrow(AdjustmentRequestError);
    expect(() => buildAdjustmentRequest({ advanceId: "", reportId: REPORT_ID, adjustedAmount: 10 }))
      .toThrow("Select a cash advance.");
  });

  it("refuses a missing report, which the server requires", () => {
    expect(() => buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: null, adjustedAmount: 10 }))
      .toThrow("Select the approved expense report to settle against this advance.");
  });

  it.each([
    ["zero", 0],
    ["negative", -5],
    ["empty", ""],
    ["not a number", "abc"],
    ["undefined", undefined],
  ])("refuses an amount that is %s", (_label, amount) => {
    expect(() => buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: REPORT_ID, adjustedAmount: amount }))
      .toThrow("Enter an adjustment amount greater than zero.");
  });
});

describe("adjustmentErrorMessage", () => {
  it("shows the client-side reason for a refused request", () => {
    let caught;
    try {
      buildAdjustmentRequest({ advanceId: ADVANCE_ID, reportId: "", adjustedAmount: 10 });
    } catch (err) {
      caught = err;
    }
    expect(adjustmentErrorMessage(caught, "fallback")).toBe("Select the approved expense report to settle against this advance.");
  });

  it("shows the server's message for a rejected request", () => {
    const serverError = { response: { status: 422, data: { message: "Expense report must be fully approved." } } };
    expect(adjustmentErrorMessage(serverError, "fallback")).toBe("Expense report must be fully approved.");
  });

  it("falls back when there is no message at all", () => {
    expect(adjustmentErrorMessage(new Error("Network Error"), "Failed to create reimbursement adjustment"))
      .toBe("Failed to create reimbursement adjustment");
  });
});

describe("settlement actions the endpoint cannot record", () => {
  it.each(["SETTLE", "ADJUST", "PAYROLL_DEDUCTION"])("blocks %s with a reason", (action) => {
    expect(getSettlementBlockReason(action)).toBe(UNSUPPORTED_SETTLEMENT_MESSAGE[action]);
    expect(getSettlementBlockReason(action)).toBeTruthy();
  });

  it("returns null for an unknown action rather than guessing", () => {
    expect(getSettlementBlockReason("SOMETHING_ELSE")).toBeNull();
  });
});
