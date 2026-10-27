import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MoneyMovements, { buildMovements } from "@/pages/expense-management/pages/cash-advance/components/MoneyMovements";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: { getProofFile: vi.fn() },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

const settlement = {
  totalAmount: 4163,
  outstandingBalance: 1163,
  disbursement: { mode: "BANK_TRANSFER", paymentDate: "2026-10-01", reference: "UTR123", proofOnFile: true },
  repayments: [
    { repaymentId: "r2", amount: 2000, paymentMode: "PAYROLL", repaidAt: "2026-11-05T10:00:00", paymentReference: "PAY-7" },
    { repaymentId: "r1", amount: 1000, paymentMode: "UPI", repaidAt: "2026-10-20T10:00:00", paymentReference: "UPI-1", proofAttached: true },
  ],
};

describe("buildMovements", () => {
  it("lists the payout first, then employee payments and payroll deductions in date order", () => {
    const rows = buildMovements(settlement);
    expect(rows.map((r) => r.direction)).toEqual(["OUT", "IN", "PAYROLL"]);
    expect(rows[0]).toMatchObject({ mode: "BANK_TRANSFER", reference: "UTR123", amount: 4163 });
    expect(rows[2]).toMatchObject({ mode: "PAYROLL", reference: "PAY-7", amount: 2000 });
  });

  it("is empty when nothing has moved", () => {
    expect(buildMovements({ repayments: [], disbursement: null })).toEqual([]);
    expect(buildMovements(null)).toEqual([]);
  });
});

describe("MoneyMovements", () => {
  it("shows totals and each movement with its mode and reference", () => {
    render(<MoneyMovements settlement={settlement} currencyCode="INR" />);

    expect(screen.getByText("Out to employee")).toBeInTheDocument();
    expect(screen.getByText("In from employee")).toBeInTheDocument();
    expect(screen.getByText("Salary deduction")).toBeInTheDocument();
    expect(screen.getByText("UTR123")).toBeInTheDocument();
    expect(screen.getByText("INR 1,163.00")).toBeInTheDocument();
  });

  it("says so when no money has moved", () => {
    render(<MoneyMovements settlement={{ repayments: [] }} />);
    expect(screen.getByText(/No money has moved/)).toBeInTheDocument();
  });
});

describe("MoneyMovements proof view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the proof path for the payout and for each repayment", () => {
    const rows = buildMovements(settlement, "adv-9");
    expect(rows.find((r) => r.direction === "OUT").proofPath).toBe("/xms/employee/cash-advances/adv-9/disbursement/proof");
    expect(rows.find((r) => r.key === "r1").proofPath).toBe("/xms/employee/cash-advances/adv-9/repayments/r1/proof");
  });

  it("offers a view button only where a proof is on file, and fetches that proof with the login token", async () => {
    cashAdvanceApi.getProofFile.mockResolvedValue({ data: new Blob(["x"], { type: "application/pdf" }) });
    const openSpy = vi.spyOn(window, "open").mockReturnValue({ location: { href: "" }, close: vi.fn() });
    global.URL.createObjectURL = vi.fn(() => "blob:proof");
    global.URL.revokeObjectURL = vi.fn();
    render(<MoneyMovements settlement={settlement} currencyCode="INR" advanceId="adv-9" />);

    const views = screen.getAllByRole("button", { name: "View proof" });
    expect(views).toHaveLength(2); // the payout and the one repayment with a proof
    fireEvent.click(views[0]);

    await waitFor(() =>
      expect(cashAdvanceApi.getProofFile).toHaveBeenCalledWith("/xms/employee/cash-advances/adv-9/disbursement/proof"),
    );
    openSpy.mockRestore();
  });
});
