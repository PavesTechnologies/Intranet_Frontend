import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: { getById: vi.fn(), getAll: vi.fn(), createReimbursementAdjustment: vi.fn() },
}));

import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import CashAdvanceOffsetSection from "../CashAdvanceOffsetSection";

const linked = { advanceId: "ca-0001-aaaa", purpose: "Pune client visit", disbursedAmount: 10000, outstandingBalance: 3000, currencyCode: "INR" };

const renderSection = (reportTotal = 7000) =>
  render(<CashAdvanceOffsetSection cashAdvanceId="ca-0001-aaaa" reportTotal={reportTotal} currencyCode="INR" />);

describe("cash advance offset (linked advance, read-only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cashAdvanceApi.getById.mockResolvedValue({ data: { data: linked } });
  });

  it("shows only the advance the report is linked to, with no picker", async () => {
    renderSection();
    expect(await screen.findByText("Pune client visit")).toBeInTheDocument();
    expect(cashAdvanceApi.getById).toHaveBeenCalledWith("ca-0001-aaaa");
    expect(cashAdvanceApi.getAll).not.toHaveBeenCalled();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("previews the split: the outstanding balance covers part, the rest is paid to the employee", async () => {
    renderSection(7000);
    await screen.findByText("Pune client visit");
    expect(screen.getByText("Covered by this advance").nextSibling.textContent).toMatch(/3,000/);
    expect(screen.getByText("Paid to the employee").nextSibling.textContent).toMatch(/4,000/);
  });

  it("covers no more than the report total when the advance is larger", async () => {
    renderSection(1500);
    await screen.findByText("Pune client visit");
    expect(screen.getByText("Covered by this advance").nextSibling.textContent).toMatch(/1,500/);
    expect(screen.getByText("Paid to the employee").nextSibling.textContent).toMatch(/0\.00/);
  });

  it("never records an offset itself - approval does that automatically", async () => {
    renderSection();
    expect(await screen.findByText(/recorded automatically against this advance when the report is approved/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(cashAdvanceApi.createReimbursementAdjustment).not.toHaveBeenCalled();
  });
});
