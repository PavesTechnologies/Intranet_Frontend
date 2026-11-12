import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: { submit: vi.fn() },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => navigateMock,
}));

import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import DecisionNotice from "../DecisionNotice";

const rejected = {
  advanceId: "adv-1", employeeId: "E001", status: "REJECTED", title: "Pune trip", purpose: "Client visit",
  amount: 5000, currencyId: "cur-1", costCenterId: "cc-1", notes: "n", rejectionReason: "Receipts missing",
};
const deferred = {
  advanceId: "adv-2", employeeId: "E001", status: "DEFERRED", deferredReason: "Wait for the earlier balance",
  deferredAt: "2026-11-10T09:00:00",
};

describe("decision notice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the rejection reason and lets the owner request again, with the earlier details filled in", () => {
    render(<MemoryRouter><DecisionNotice advance={rejected} isOwner onChanged={vi.fn()} /></MemoryRouter>);

    expect(screen.getByText("This request was rejected")).toBeInTheDocument();
    expect(screen.getByText(/Receipts missing/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Request again/ }));

    expect(navigateMock).toHaveBeenCalledWith(
      "/expense-management/cash-advance/request",
      expect.objectContaining({
        state: { prefill: expect.objectContaining({ title: "Pune trip", purpose: "Client visit", amount: 5000, currencyId: "cur-1" }) },
      }),
    );
  });

  it("does not offer the owner's actions to someone else who can see the request", () => {
    render(<MemoryRouter><DecisionNotice advance={rejected} isOwner={false} onChanged={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText(/Receipts missing/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Request again/ })).not.toBeInTheDocument();
  });

  it("deferred request: shows the reason, and sending it again submits it and reloads", async () => {
    cashAdvanceApi.submit.mockResolvedValue({ data: {} });
    const onChanged = vi.fn();
    render(<MemoryRouter><DecisionNotice advance={deferred} isOwner onChanged={onChanged} /></MemoryRouter>);

    expect(screen.getByText(/This request was deferred/)).toBeInTheDocument();
    expect(screen.getByText(/Wait for the earlier balance/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Send to manager again/ }));

    await waitFor(() => expect(cashAdvanceApi.submit).toHaveBeenCalledWith("adv-2"));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("renders nothing for an advance that is not rejected or deferred", () => {
    const { container } = render(<MemoryRouter><DecisionNotice advance={{ advanceId: "x", status: "SUBMITTED" }} isOwner onChanged={vi.fn()} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});
