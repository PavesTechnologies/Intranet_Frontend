import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettleBalancePanel from "@/pages/expense-management/pages/cash-advance/components/SettleBalancePanel";
import { recoveryApi } from "@/pages/expense-management/api/recoveryApi";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { carryForwardApi } from "@/pages/expense-management/api/carryForwardApi";
import { showStatusToast } from "@/components/toastfy/toast";

vi.mock("@/pages/expense-management/api/recoveryApi", () => ({
  recoveryApi: {
    listOpenNotices: vi.fn(),
    sendPaymentRequest: vi.fn(),
    cancelNotice: vi.fn(),
    payrollMonths: vi.fn(),
    listSalaryDeductions: vi.fn(),
    createSalaryDeduction: vi.fn(),
  },
}));
vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: { repay: vi.fn(), getSettlement: vi.fn(), getAll: vi.fn() },
}));
vi.mock("@/pages/expense-management/api/carryForwardApi", () => ({
  carryForwardApi: { getReady: vi.fn(), markReady: vi.fn(), cancelReady: vi.fn() },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

const renderPanel = () =>
  render(
    <SettleBalancePanel
      advanceId="adv-1"
      outstanding={4163}
      currencyCode="INR"
      advanceNumber="#ADV-1"
      onSettled={vi.fn()}
    />,
  );

describe("SettleBalancePanel - two settlement options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recoveryApi.listOpenNotices.mockResolvedValue([]);
    recoveryApi.payrollMonths.mockResolvedValue([{ value: "2026-11", label: "November 2026" }]);
    recoveryApi.listSalaryDeductions.mockResolvedValue([]);
    cashAdvanceApi.getSettlement.mockResolvedValue({ data: { data: { disbursement: null } } });
  });

  it("offers only salary deduction and carry forward; there is no return-from-employee option", async () => {
    renderPanel();

    expect(screen.getByRole("radio", { name: /Salary deduction/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Carry forward/ })).toBeInTheDocument();
    expect(screen.queryByText("Return from employee")).toBeNull();
    expect(screen.queryByText("Ask the employee to pay the balance")).toBeNull();
  });

  // Repayment by the employee is not part of the current flows (carry-forward and salary deduction only).
  it.skip("sends the payment request to the employee from the first step", async () => {
    recoveryApi.sendPaymentRequest.mockResolvedValue({ dueAt: "2026-10-27T18:00:00" });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Send payment request" }));

    await waitFor(() => expect(recoveryApi.sendPaymentRequest).toHaveBeenCalledWith("adv-1"));
    expect(showStatusToast).toHaveBeenCalledWith(expect.stringContaining("Payment request sent"), "success", 6000);
  });

  it.skip("shows the open payment request with its due time and the automatic salary fallback", async () => {
    recoveryApi.listOpenNotices.mockResolvedValue([
      {
        recoveryCaseId: "case-1",
        advanceId: "adv-1",
        status: "NOTICE_SENT",
        amountAtNotice: 4163,
        noticeSentAt: "2026-10-26T09:00:00",
        dueAt: "2026-10-27T09:00:00",
      },
    ]);
    renderPanel();

    expect(await screen.findByText(/If not paid by the due time, a salary deduction request is raised automatically/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record payment received" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel payment request" })).toBeInTheDocument();
  });

  it("carry forward marks the full balance ready in one click", async () => {
    carryForwardApi.getReady.mockResolvedValue({ readyAmount: null });
    carryForwardApi.markReady.mockResolvedValue({ readyAmount: 4163 });
    renderPanel();
    fireEvent.click(screen.getByRole("radio", { name: /Carry forward/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Carry forward INR/ }));

    expect(carryForwardApi.markReady).toHaveBeenCalledWith(expect.objectContaining({ amount: 4163 }));
    expect(recoveryApi.createSalaryDeduction).not.toHaveBeenCalled();
    expect(cashAdvanceApi.repay).not.toHaveBeenCalled();
  });

  it("shows the carry-forward confirmation once the balance is ready", async () => {
    carryForwardApi.getReady.mockResolvedValue({ readyAmount: 1503.85 });
    renderPanel();
    fireEvent.click(screen.getByRole("radio", { name: /Carry forward/ }));

    expect(await screen.findByText(/is ready to carry forward/)).toBeInTheDocument();
    expect(screen.getByText(/Carry-forward confirmation/)).toBeInTheDocument();
  });
});
