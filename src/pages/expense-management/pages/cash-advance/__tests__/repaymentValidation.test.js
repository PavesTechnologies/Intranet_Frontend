import { describe, it, expect } from "vitest";
import { validateRepaymentAmount } from "../repaymentValidation";

const fmt = (n) => `INR ${Number(n).toFixed(2)}`;

describe("validateRepaymentAmount", () => {
  it("accepts a partial repayment within the outstanding balance", () => {
    expect(validateRepaymentAmount("5000", "15000", fmt)).toBe("");
  });

  it("accepts a repayment equal to the full outstanding balance", () => {
    expect(validateRepaymentAmount("15000.00", "15000.00", fmt)).toBe("");
  });

  it("rejects an amount one cent above the outstanding balance", () => {
    expect(validateRepaymentAmount("15000.01", "15000.00", fmt)).toBe(
      "Repayment cannot exceed the outstanding balance of INR 15000.00."
    );
  });

  it("compares in hundredths, so 0.30 against a 0.3 balance is not an overpayment", () => {
    expect(validateRepaymentAmount("0.30", "0.3", fmt)).toBe("");
  });

  it("rejects an empty or non-numeric amount", () => {
    expect(validateRepaymentAmount("", "100", fmt)).toBe("Enter a repayment amount.");
    expect(validateRepaymentAmount("abc", "100", fmt)).toBe("Enter a repayment amount.");
  });

  it("rejects zero and negative amounts with the positive-amount message", () => {
    expect(validateRepaymentAmount("0", "100", fmt)).toBe("Repayment amount must be greater than zero.");
    expect(validateRepaymentAmount("-5", "100", fmt)).toBe("Repayment amount must be greater than zero.");
  });

  it("rejects more than two decimal places", () => {
    expect(validateRepaymentAmount("10.005", "100", fmt)).toBe(
      "Repayment amount can have at most 2 decimal places."
    );
  });

  it("rejects any repayment when there is no outstanding balance", () => {
    expect(validateRepaymentAmount("1", "0", fmt)).toBe("This advance has no outstanding balance to repay.");
  });
});
