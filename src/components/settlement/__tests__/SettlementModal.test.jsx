import { carryForwardApi } from "@/pages/expense-management/api/carryForwardApi";
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
vi.mock("@/pages/expense-management/api/carryForwardApi", () => ({
  carryForwardApi: { getReady: vi.fn(), markReady: vi.fn(), cancelReady: vi.fn() },
}));

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

  it("carry forward marks the full balance ready with one click, and shows the confirmation", async () => {
    carryForwardApi.getReady.mockResolvedValue({ readyAmount: null });
    carryForwardApi.markReady.mockResolvedValue({ readyAmount: 1503.85 });
    render(<SettlementModal isOpen advance={ADVANCE} onClose={vi.fn()} onSettled={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: /Carry forward/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Carry forward/ }));

    expect(carryForwardApi.markReady).toHaveBeenCalledWith(expect.objectContaining({ amount: 3000 }));
    expect(await screen.findByText(/is carried forward and held in the employee.s outstanding/)).toBeInTheDocument();
  });

  it("uses the list's figures, so expenses and outstanding match the row", async () => {
    const advance = toSettlementAdvance(
      { advanceId: "adv-2", employeeName: "Sindhu Yanala", employeeId: "5100014", amount: 8000, outstandingBalance: 8000 },
      { owed: 8000, carriedIn: 0, consumed: 5474, approvedConsumed: 5474, reports: [{}], remaining: 2526,
        salaryDeducted: 0, otherRepaid: 0, carriedForward: 0, owedToEmployee: 0, outstanding: 2526 },
    );
    render(<SettlementModal isOpen advance={advance} onClose={vi.fn()} onSettled={vi.fn()} />);

    expect(screen.getAllByText(/INR 5,474\.00/).length).toBeGreaterThan(0);
    expect(await screen.findByLabelText(/Amount to deduct/)).toHaveValue(2526);
    expect(screen.getByText(/Sindhu Yanala \(5100014\)/)).toBeInTheDocument();
  });

  it("creates a salary deduction request and reports it", async () => {
    recoveryApi.createSalaryDeduction.mockResolvedValue({ payrollRequestId: "PR-2026-2027-AAAA1111" });
    render(<SettlementModal isOpen advance={ADVANCE} onClose={vi.fn()} onSettled={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Send to Payroll" }));

    await waitFor(() =>
      expect(recoveryApi.createSalaryDeduction).toHaveBeenCalledWith("adv-1", { amount: 3000, payrollMonth: "2026-11", amountChangeReason: null }),
    );
    expect(showStatusToast).toHaveBeenCalledWith(expect.stringContaining("PR-2026-2027-AAAA1111"), "success");
  });

  it("asks for a reason when the amount is changed, and sends it", async () => {
    recoveryApi.createSalaryDeduction.mockResolvedValue({ payrollRequestId: "PR-2026-2027-BBBB2222" });
    render(<SettlementModal isOpen advance={ADVANCE} onClose={vi.fn()} onSettled={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText(/Amount to deduct/), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Send to Payroll" }));

    expect(await screen.findByText(/Enter the reason for changing the amount/)).toBeInTheDocument();
    expect(recoveryApi.createSalaryDeduction).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Reason for changing the amount/), { target: { value: "Two instalments" } });
    fireEvent.click(screen.getByRole("button", { name: "Send to Payroll" }));

    await waitFor(() =>
      expect(recoveryApi.createSalaryDeduction).toHaveBeenCalledWith("adv-1", {
        amount: 1000, payrollMonth: "2026-11", amountChangeReason: "Two instalments",
      }),
    );
  });
});
