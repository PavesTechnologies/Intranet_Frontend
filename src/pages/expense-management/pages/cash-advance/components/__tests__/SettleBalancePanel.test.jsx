import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettleBalancePanel from "@/pages/expense-management/pages/cash-advance/components/SettleBalancePanel";
import { recoveryApi } from "@/pages/expense-management/api/recoveryApi";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
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
  cashAdvanceApi: { repay: vi.fn(), getSettlement: vi.fn() },
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
    expect(await screen.findByText("Ask the employee to pay the balance")).toBeInTheDocument();
  });

  it("sends the payment request to the employee from the first step", async () => {
    recoveryApi.sendPaymentRequest.mockResolvedValue({ dueAt: "2026-10-27T18:00:00" });
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Send payment request" }));

    await waitFor(() => expect(recoveryApi.sendPaymentRequest).toHaveBeenCalledWith("adv-1"));
    expect(showStatusToast).toHaveBeenCalledWith(expect.stringContaining("Payment request sent"), "success", 6000);
  });

  it("shows the open payment request with its due time and the automatic salary fallback", async () => {
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

  it("carry forward explains why it cannot be submitted, and sends nothing", async () => {
    renderPanel();
    fireEvent.click(screen.getByRole("radio", { name: /Carry forward/ }));
    fireEvent.click(screen.getByRole("button", { name: "Carry forward" }));

    expect(showStatusToast).toHaveBeenCalledWith(expect.any(String), "error", 8000);
    expect(recoveryApi.createSalaryDeduction).not.toHaveBeenCalled();
    expect(cashAdvanceApi.repay).not.toHaveBeenCalled();
  });
});
