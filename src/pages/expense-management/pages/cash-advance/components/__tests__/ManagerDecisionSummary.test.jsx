import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: { approvalBalance: vi.fn() },
}));
vi.mock("@/pages/expense-management/api/carryForwardApi", () => ({
  carryForwardApi: { getReady: vi.fn(), markReady: vi.fn() },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { carryForwardApi } from "@/pages/expense-management/api/carryForwardApi";
import ManagerDecisionSummary from "../ManagerDecisionSummary";

const SOURCE = "aaaaaaaa-1111-2222-3333-444444444444";
const NEW = "bbbbbbbb-1111-2222-3333-444444444444";

const balanceWith = (overrides = {}) => ({
  advanceId: NEW,
  employeeId: "E001",
  currencyCode: "INR",
  requestedAmount: 8000,
  pendingBalanceTotal: 3000,
  committedAmount: 0,
  potentialExposure: 11000,
  exposureLimit: null,
  excessOverLimit: 0,
  exceedsLimit: false,
  otherOpenAdvances: [{ advanceId: SOURCE, title: "Pune client visit", status: "DISBURSED", amount: 10000, outstandingBalance: 3000 }],
  managerDecision: null,
  ...overrides,
});

const advance = { advanceId: NEW, currencyCode: "INR" };

describe("manager decision summary for Finance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    carryForwardApi.getReady.mockResolvedValue({ readyAmount: 0 });
    carryForwardApi.markReady.mockResolvedValue({ readyAmount: 3000 });
  });

  it("shows the live exposure and says no recommendation was recorded", async () => {
    cashAdvanceApi.approvalBalance.mockResolvedValue(balanceWith());
    render(<ManagerDecisionSummary advance={advance} canAct />);

    expect(await screen.findByText(/No recommendation recorded/)).toBeInTheDocument();
    expect(screen.getByText("Total exposure").nextSibling.textContent).toMatch(/11,000/);
    expect(screen.getByText(/No exposure limit is configured/)).toBeInTheDocument();
  });

  it("set-off not yet in place: names the source advance and lets Finance propose exactly the recommended amount", async () => {
    cashAdvanceApi.approvalBalance.mockResolvedValue(balanceWith({
      managerDecision: {
        treatment: "SET_OFF", justification: "Trip 1 is confirmed", decidedBy: "M1", decidedAt: "2026-11-10T09:00:00",
        setOffSourceAdvanceId: SOURCE, setOffAmount: 3000,
        exposureExceptionJustification: null, exposureExceptionAuthorized: false,
      },
    }));
    render(<ManagerDecisionSummary advance={advance} canAct />);

    expect(await screen.findByText(/Not in place yet/)).toBeInTheDocument();
    expect(screen.getByText("Pune client visit")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Propose carry-forward of INR 3,000.00/ }));

    await waitFor(() => expect(carryForwardApi.markReady).toHaveBeenCalledTimes(1));
    const payload = carryForwardApi.markReady.mock.calls[0][0];
    expect(payload.advanceId).toBe(SOURCE);
    expect(payload.amount).toBe(3000);
  });

  it("set-off already in place: says Finance can approve, with no propose button", async () => {
    carryForwardApi.getReady.mockResolvedValue({ readyAmount: 3000 });
    cashAdvanceApi.approvalBalance.mockResolvedValue(balanceWith({
      managerDecision: {
        treatment: "SET_OFF", setOffSourceAdvanceId: SOURCE, setOffAmount: 3000,
        exposureExceptionAuthorized: false,
      },
    }));
    render(<ManagerDecisionSummary advance={advance} canAct />);

    expect(await screen.findByText(/Carry-forward is in place/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Propose carry-forward/ })).not.toBeInTheDocument();
  });

  it("shows a read-only set-off to a viewer who cannot act", async () => {
    cashAdvanceApi.approvalBalance.mockResolvedValue(balanceWith({
      managerDecision: { treatment: "SET_OFF", setOffSourceAdvanceId: SOURCE, setOffAmount: 3000, exposureExceptionAuthorized: false },
    }));
    render(<ManagerDecisionSummary advance={advance} canAct={false} />);

    expect(await screen.findByText(/Not in place yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Propose carry-forward/ })).not.toBeInTheDocument();
  });

  it("above the limit: shows the manager's reason and that approving authorises it", async () => {
    cashAdvanceApi.approvalBalance.mockResolvedValue(balanceWith({
      exposureLimit: 10000, excessOverLimit: 1000, exceedsLimit: true,
      managerDecision: {
        treatment: "FULL_ADVANCE", justification: "Urgent client trip",
        exposureExceptionJustification: "Urgent client trip", exposureExceptionAuthorized: false,
      },
    }));
    render(<ManagerDecisionSummary advance={advance} canAct />);

    expect(await screen.findByText(/Above the limit by INR 1,000.00/)).toBeInTheDocument();
    expect(screen.getByText(/Approving authorises this exception/)).toBeInTheDocument();
  });

  it("says so clearly when the balance cannot be loaded, rather than showing nothing", async () => {
    cashAdvanceApi.approvalBalance.mockRejectedValue(new Error("forbidden"));
    render(<ManagerDecisionSummary advance={advance} canAct />);

    expect(await screen.findByText(/Could not load the manager's recommendation/)).toBeInTheDocument();
  });
});
