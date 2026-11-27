import { receiptAmountMismatch, scanFoundNothing, scanNeedsReview } from "../receiptScanChecks";

describe("receiptAmountMismatch", () => {
  const receipt = { receiptTotal: 123.45, receiptCurrencyCode: "INR", enteredCurrencyCode: "INR" };

  it("is null when the claim matches the receipt total, within a cent", () => {
    expect(receiptAmountMismatch({ ...receipt, enteredAmount: "123.45" })).toBeNull();
    expect(receiptAmountMismatch({ ...receipt, enteredAmount: "123.46" })).toBeNull();
  });

  it("flags a claim above the receipt total and asks for a reason", () => {
    const result = receiptAmountMismatch({ ...receipt, enteredAmount: "150" });
    expect(result.direction).toBe("HIGHER");
    expect(result.needsReason).toBe(true);
    expect(result.message).toContain("INR 123.45");
  });

  it("flags a claim below the receipt total without requiring a reason", () => {
    const result = receiptAmountMismatch({ ...receipt, enteredAmount: "100" });
    expect(result.direction).toBe("LOWER");
    expect(result.needsReason).toBe(false);
  });

  it("doesn't compare across currencies", () => {
    expect(receiptAmountMismatch({ ...receipt, enteredCurrencyCode: "USD", enteredAmount: "1.50" })).toBeNull();
  });

  it("is null with no scanned total or nothing entered yet", () => {
    expect(receiptAmountMismatch({ ...receipt, receiptTotal: null, enteredAmount: "50" })).toBeNull();
    expect(receiptAmountMismatch({ ...receipt, enteredAmount: "" })).toBeNull();
  });
});

describe("scanFoundNothing", () => {
  it("is true when no merchant, date or total was read", () => {
    expect(scanFoundNothing({ merchantName: " ", receiptDate: null, totalAmount: 0 })).toBe(true);
  });

  it("is false when any core field was read", () => {
    expect(scanFoundNothing({ merchantName: "Spice Route" })).toBe(false);
    expect(scanFoundNothing({ receiptDate: "2026-10-10" })).toBe(false);
    expect(scanFoundNothing({ totalAmount: 500 })).toBe(false);
  });
});

describe("scanNeedsReview", () => {
  it("follows the backend's reviewRecommended flag", () => {
    expect(scanNeedsReview({ reviewRecommended: true, confidenceScore: 0.99 })).toBe(true);
    expect(scanNeedsReview({ reviewRecommended: false, confidenceScore: 0.5 })).toBe(false);
  });

  it("falls back to the backend's default 0.80 confidence threshold", () => {
    expect(scanNeedsReview({ confidenceScore: 0.79 })).toBe(true);
    expect(scanNeedsReview({ confidenceScore: 0.82 })).toBe(false);
    expect(scanNeedsReview({ confidenceScore: 79 })).toBe(true);
  });
});
