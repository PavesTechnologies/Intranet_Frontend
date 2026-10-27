import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettlementModal, { toSettlementAdvance } from "@/components/settlement/SettlementModal";
import { recoveryApi } from "@/pages/expense-management/api/recoveryApi";
import { showStatusToast } from "@/components/toastfy/toast";

vi.mock("@/pages/expense-management/api/recoveryApi", () => ({
  recoveryApi: {
    payrollMonths: vi.fn(),
    listSalaryDeductions: vi.fn(),
    createSalaryDeduction: vi.fn(),
  },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

const ADVANCE = toSettlementAdvance({
  advanceId: "adv-1",
  advanceNumber: "#c294b31c",
  employeeName: "Sindhu Yanala",
  amount: 3000,
  verifiedExpenseAmount: 0,
  outstandingBalance: 3000,
  currencyCode: "INR",
});

describe("SettlementModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recoveryApi.payrollMonths.mockResolvedValue([{ value: "2026-11", label: "November 2026" }]);
    recoveryApi.listSalaryDeductions.mockResolvedValue([]);
  });

  it("offers only salary deduction and carry forward", () => {
    render(<SettlementModal isOpen advance={ADVANCE} onClose={vi.fn()} onSettled={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /Salary deduction/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Carry forward/ })).toBeInTheDocument();
    expect(screen.queryByText(/Settle now/)).toBeNull();
    expect(screen.queryByRole("radio", { name: /Recover from salary/ })).toBeNull();
  });

  it("opens the salary deduction form by default, with the balance as the amount", async () => {
    render(<SettlementModal isOpen advance={ADVANCE} onClose={vi.fn()} onSettled={vi.fn()} />);

    expect(await screen.findByLabelText(/Amount to deduct/)).toHaveValue(3000);
    await waitFor(() => expect(recoveryApi.payrollMonths).toHaveBeenCalled());
  });

  it("does not send a salary request for an amount above the balance", async () => {
    render(<SettlementModal isOpen advance={ADVANCE} onClose={vi.fn()} onSettled={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText(/Amount to deduct/), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Send to Payroll" }));

    expect(await screen.findByText(/cannot exceed the outstanding balance/)).toBeInTheDocument();
    expect(recoveryApi.createSalaryDeduction).not.toHaveBeenCalled();
  });

  it("explains that carry forward is not enabled, and sends nothing", () => {
    render(<SettlementModal isOpen advance={ADVANCE} onClose={vi.fn()} onSettled={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: /Carry forward/ }));

    expect(screen.getByText(/Carry forward is not enabled yet/)).toBeInTheDocument();
    expect(recoveryApi.createSalaryDeduction).not.toHaveBeenCalled();
  });

  it("creates a salary deduction request and reports it", async () => {
    recoveryApi.createSalaryDeduction.mockResolvedValue({ payrollRequestId: "PR-2026-2027-AAAA1111" });
    render(<SettlementModal isOpen advance={ADVANCE} onClose={vi.fn()} onSettled={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Send to Payroll" }));

    await waitFor(() =>
      expect(recoveryApi.createSalaryDeduction).toHaveBeenCalledWith("adv-1", { amount: 3000, payrollMonth: "2026-11" }),
    );
    expect(showStatusToast).toHaveBeenCalledWith(expect.stringContaining("PR-2026-2027-AAAA1111"), "success");
  });
});
