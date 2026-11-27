import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeadlineOverridePanel from "@/pages/expense-management/components/expense-reports/DeadlineOverridePanel";
import { deadlineOverrideApi } from "@/pages/expense-management/api/deadlineOverrideApi";
import { showStatusToast } from "@/components/toastfy/toast";

vi.mock("@/pages/expense-management/api/deadlineOverrideApi", async () => {
  const actual = await vi.importActual("@/pages/expense-management/api/deadlineOverrideApi");
  return { ...actual, deadlineOverrideApi: { apply: vi.fn() } };
});

vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

const GOOD_REASON = "Client visit delayed the receipts by a month";

describe("DeadlineOverridePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers extend and reopen, and extends by default", () => {
    render(<DeadlineOverridePanel reportId="r-1" currentDeadline={null} onApplied={vi.fn()} />);

    expect(screen.getByLabelText("Extend deadline")).toBeChecked();
    expect(screen.getByLabelText("Reopen (lift the deadline check)")).not.toBeChecked();
    expect(screen.getByLabelText(/New submission date/)).toBeInTheDocument();
  });

  it("hides the date field when reopening", () => {
    render(<DeadlineOverridePanel reportId="r-1" currentDeadline={null} onApplied={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Reopen (lift the deadline check)"));

    expect(screen.queryByLabelText(/New submission date/)).not.toBeInTheDocument();
  });

  it("does not call the server when the reason is too short, and says why", () => {
    render(<DeadlineOverridePanel reportId="r-1" currentDeadline={null} onApplied={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Extend deadline" }));

    expect(screen.getByRole("alert")).toHaveTextContent("at least 10 characters");
    expect(deadlineOverrideApi.apply).not.toHaveBeenCalled();
  });

  it("sends an extension with the date and reason, then refreshes the report", async () => {
    deadlineOverrideApi.apply.mockResolvedValue({ data: { success: true } });
    const onApplied = vi.fn();
    render(<DeadlineOverridePanel reportId="r-1" currentDeadline={null} onApplied={onApplied} />);

    fireEvent.change(screen.getByLabelText(/New submission date/), { target: { value: "2099-12-31" } });
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: GOOD_REASON } });
    fireEvent.click(screen.getByRole("button", { name: "Extend deadline" }));

    await waitFor(() => expect(onApplied).toHaveBeenCalled());
    expect(deadlineOverrideApi.apply).toHaveBeenCalledWith("r-1", {
      action: "EXTEND",
      extendedUntil: "2099-12-31",
      reason: GOOD_REASON,
    });
    expect(showStatusToast).toHaveBeenCalledWith(expect.stringContaining("audit log"), "success");
  });

  it("shows the server's refusal message and keeps the form", async () => {
    deadlineOverrideApi.apply.mockRejectedValue({
      response: { data: { message: "The extended deadline cannot be in the past." } },
    });
    const onApplied = vi.fn();
    render(<DeadlineOverridePanel reportId="r-1" currentDeadline={null} onApplied={onApplied} />);

    fireEvent.change(screen.getByLabelText(/New submission date/), { target: { value: "2099-12-31" } });
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: GOOD_REASON } });
    fireEvent.click(screen.getByRole("button", { name: "Extend deadline" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The extended deadline cannot be in the past.");
    expect(onApplied).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Reason/)).toHaveValue(GOOD_REASON);
  });
});
