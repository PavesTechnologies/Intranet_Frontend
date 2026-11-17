import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: { approveAllocation: vi.fn() },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

const authState = { roles: [] };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ hasRole: (roles) => roles.some((r) => authState.roles.includes(r)) }),
}));

import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import AllocationApprovalForm from "../AllocationApprovalForm";

const advance = { advanceId: "adv-new", currencyCode: "INR", additionalAmountRequested: 6000 };
const balance = {
  otherOpenAdvances: [
    { advanceId: "old-1", title: "Pune trip", status: "DISBURSED", outstandingBalance: 4000 },
    { advanceId: "old-2", title: "Delhi", status: "OVERDUE", outstandingBalance: 3000 },
    { advanceId: "old-3", title: "Awaiting expenses", status: "EXPENSE_SUBMITTED", outstandingBalance: 1500 },
  ],
};

describe("AllocationApprovalForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.roles = [];
    cashAdvanceApi.approveAllocation.mockResolvedValue({});
  });

  it("shows the eligible balance, leaving out expenses still awaiting approval", () => {
    render(<AllocationApprovalForm advance={advance} balance={balance} />);
    expect(screen.getByText("INR 4,000.00")).toBeInTheDocument();
  });

  it("does not offer an overdue exception to someone who is not a Finance executive", () => {
    render(<AllocationApprovalForm advance={advance} balance={balance} />);
    expect(screen.queryByText(/Overdue exception/)).not.toBeInTheDocument();
  });

  it("offers the overdue exception to a Finance executive", () => {
    authState.roles = ["FINANCE_EXECUTIVE"];
    render(<AllocationApprovalForm advance={advance} balance={balance} />);
    expect(screen.getByText(/Overdue exception/)).toBeInTheDocument();
  });

  it("asks for a reason when the rollover is less than the eligible balance", () => {
    render(<AllocationApprovalForm advance={advance} balance={balance} />);
    fireEvent.change(screen.getByLabelText(/Rollover amount/), { target: { value: "2000" } });
    expect(screen.getByLabelText(/Why is the rollover less/)).toBeInTheDocument();
  });

  it("sends the figures Finance chose, and the server decides", async () => {
    render(<AllocationApprovalForm advance={advance} balance={balance} onApproved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Approved cash/), { target: { value: "4000" } });
    fireEvent.click(screen.getByRole("button", { name: /Approve allocation/ }));

    await waitFor(() => expect(cashAdvanceApi.approveAllocation).toHaveBeenCalledWith("adv-new", expect.objectContaining({
      rolloverAmount: null, approvedCashAmount: 4000, overdueSourceAdvanceId: null,
    })));
  });
});
