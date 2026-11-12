import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: { getAll: vi.fn(), createReimbursementAdjustment: vi.fn() },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import CashAdvanceOffsetSection from "../CashAdvanceOffsetSection";

const advances = [
  { advanceId: "ca-0001-aaaa", employeeId: "E001", purpose: "Pune client visit", disbursedAmount: 10000, outstandingBalance: 3000 },
  { advanceId: "ca-0002-bbbb", employeeId: "E001", title: "Delhi training", disbursedAmount: 8000, outstandingBalance: 0 },
  { advanceId: "ca-0003-cccc", employeeId: "E999", purpose: "Other employee", disbursedAmount: 5000, outstandingBalance: 5000 },
];

const renderSection = (reportTotal = 7000) =>
  render(
    <CashAdvanceOffsetSection
      reportId="r-1"
      employeeId="E001"
      reportTotal={reportTotal}
      currencyCode="INR"
      onApplied={vi.fn()}
    />,
  );

describe("cash advance offset picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cashAdvanceApi.getAll.mockResolvedValue({ data: { data: advances } });
    cashAdvanceApi.createReimbursementAdjustment.mockResolvedValue({ data: {} });
  });

  it("lists only this employee's advances that still have an outstanding balance", async () => {
    renderSection();
    expect(await screen.findByText("Pune client visit")).toBeInTheDocument();
    expect(screen.queryByText("Delhi training")).not.toBeInTheDocument();
    expect(screen.queryByText("Other employee")).not.toBeInTheDocument();
  });

  it("previews the split before anything is recorded", async () => {
    renderSection(7000);
    fireEvent.click(await screen.findByRole("radio", { name: /Pune client visit/ }));

    // Outstanding 3,000 covers 3,000 of the 7,000 report; 4,000 is paid to the employee.
    expect(screen.getByText("Covered by this advance").nextSibling.textContent).toMatch(/3,000/);
    expect(screen.getByText("Paid to the employee").nextSibling.textContent).toMatch(/4,000/);
    expect(cashAdvanceApi.createReimbursementAdjustment).not.toHaveBeenCalled();
  });

  it("covers no more than the report total when the advance is larger", async () => {
    renderSection(1500);
    fireEvent.click(await screen.findByRole("radio", { name: /Pune client visit/ }));
    expect(screen.getByText("Covered by this advance").nextSibling.textContent).toMatch(/1,500/);
    expect(screen.getByText("Paid to the employee").nextSibling.textContent).toMatch(/0\.00/);
  });

  it("records the covered amount against the selected advance only", async () => {
    renderSection(7000);
    fireEvent.click(await screen.findByRole("radio", { name: /Pune client visit/ }));
    fireEvent.click(screen.getByRole("button", { name: /Record offset of INR 3,000.00/ }));

    await waitFor(() => expect(cashAdvanceApi.createReimbursementAdjustment).toHaveBeenCalledTimes(1));
    const payload = cashAdvanceApi.createReimbursementAdjustment.mock.calls[0][0];
    expect(JSON.stringify(payload)).toMatch(/ca-0001-aaaa/);
    expect(JSON.stringify(payload)).not.toMatch(/ca-0003-cccc/);
  });

  it("says the full amount is paid when the employee has no open advance", async () => {
    cashAdvanceApi.getAll.mockResolvedValue({ data: { data: [advances[1]] } });
    renderSection();
    expect(await screen.findByText(/has no open cash advance/)).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
