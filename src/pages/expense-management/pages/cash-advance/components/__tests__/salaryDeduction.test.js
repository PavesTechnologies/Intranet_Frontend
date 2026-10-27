import { describe, expect, it } from "vitest";
import {
  buildResultFormData,
  shortfallOf,
  validateRequestAmount,
  validateResult,
} from "@/pages/expense-management/pages/cash-advance/components/salaryDeduction";

describe("validateRequestAmount", () => {
  it("accepts the full balance and a partial amount", () => {
    expect(validateRequestAmount("4163", 4163)).toBe("");
    expect(validateRequestAmount("2000.50", 4163)).toBe("");
  });

  it("rejects zero, negative, too many decimals, and anything above the balance", () => {
    expect(validateRequestAmount("0", 4163)).toMatch(/greater than zero/);
    expect(validateRequestAmount("-5", 4163)).toMatch(/two decimal/);
    expect(validateRequestAmount("10.005", 4163)).toMatch(/two decimal/);
    expect(validateRequestAmount("5000", 4163)).toMatch(/cannot exceed/);
    expect(validateRequestAmount("", 4163)).toMatch(/two decimal/);
  });
});

describe("validateResult", () => {
  const base = { actualAmount: "3000", payrollMonthProcessed: "2026-11", payrollReference: "", evidenceType: "", evidenceNote: "", evidenceFile: null };

  it("accepts a zero result and a shortfall", () => {
    expect(validateResult({ ...base, actualAmount: "0", payrollReference: "PAY-1" }, 4163)).toEqual({});
    expect(validateResult({ ...base, payrollReference: "PAY-1" }, 4163)).toEqual({});
  });

  it("refuses an actual deduction above the requested amount", () => {
    expect(validateResult({ ...base, actualAmount: "5000", payrollReference: "X" }, 4163).actualAmount).toMatch(/cannot exceed/);
  });

  it("requires a reference or alternative evidence (type plus file or note)", () => {
    expect(validateResult(base, 4163).evidenceType).toBeTruthy();
    expect(validateResult({ ...base, evidenceType: "PAYSLIP" }, 4163).evidence).toBeTruthy();
    expect(validateResult({ ...base, evidenceType: "PAYSLIP", evidenceNote: "Payslip for Nov" }, 4163)).toEqual({});
  });
});

describe("buildResultFormData", () => {
  it("sends only the fields that have a value", () => {
    const form = buildResultFormData({ actualAmount: "3000", payrollMonthProcessed: "2026-11", payrollReference: " PAY-9 ", evidenceType: "", evidenceNote: "", evidenceFile: null });
    expect(form.get("actualAmount")).toBe("3000");
    expect(form.get("payrollReference")).toBe("PAY-9");
    expect(form.has("evidenceType")).toBe(false);
    expect(form.has("evidenceFile")).toBe(false);
  });
});

describe("shortfallOf", () => {
  it("is the requested amount minus what Payroll actually deducted", () => {
    expect(shortfallOf(4163, 3000)).toBe(1163);
    expect(shortfallOf(4163, 0)).toBe(4163);
  });
});
