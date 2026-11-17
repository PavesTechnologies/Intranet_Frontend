import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toast = vi.hoisted(() => ({ showStatusToast: vi.fn() }));
vi.mock("../../../../components/toastfy/toast", () => toast);
const hooks = vi.hoisted(() => ({
  useMilestoneList: vi.fn(),
  useMilestoneSummary: vi.fn(),
  useProjectEpics: vi.fn(),
  useMilestoneHistory: vi.fn(),
  useMilestoneMutations: vi.fn(),
}));
vi.mock("../hooks/useMilestones", () => hooks);

import MilestonesTab from "../index";

const row = {
  id: 7, projectId: 10, milestoneCode: "PAY-M007", name: "Draft scope", executionStatus: "PLANNED", billable: true,
  allocationPercentage: 10, billingReadiness: "NOT_READY", readinessReasons: [], allowedStatusChanges: [],
  canComplete: false, canDelete: true, version: 0,
};
const ok = (data) => ({ data, isLoading: false, error: null, refetch: vi.fn() });

let remove;
beforeEach(() => {
  toast.showStatusToast.mockReset();
  remove = { mutateAsync: vi.fn(), isPending: false };
  const m = () => ({ mutateAsync: vi.fn(), isPending: false });
  hooks.useMilestoneMutations.mockReturnValue({ create: m(), update: m(), changeStatus: m(), complete: m(), remove });
  hooks.useMilestoneSummary.mockReturnValue(ok({ total: 1 }));
  hooks.useProjectEpics.mockReturnValue({ data: [], isLoading: false });
  hooks.useMilestoneHistory.mockReturnValue({ data: [], isLoading: false, isError: false });
});

describe("MilestonesTab error handling (mocked hooks)", () => {
  it("offers Try again for a server error, refetching list and summary, and hides Add milestone", async () => {
    const user = userEvent.setup();
    const list = ok(undefined);
    list.error = { response: { status: 500, data: { message: "boom" } } };
    const summary = ok(undefined);
    hooks.useMilestoneList.mockReturnValue(list);
    hooks.useMilestoneSummary.mockReturnValue(summary);
    render(<MilestonesTab projectId={10} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load milestones/i);
    expect(screen.queryByRole("button", { name: /add milestone/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(list.refetch).toHaveBeenCalled();
    expect(summary.refetch).toHaveBeenCalled();
  });

  it("treats a 403 from the summary call as access denied too (no retry button)", () => {
    hooks.useMilestoneList.mockReturnValue(ok({ content: [], totalPages: 0, totalElements: 0 }));
    const summary = ok(undefined);
    summary.error = { response: { status: 403 } };
    hooks.useMilestoneSummary.mockReturnValue(summary);
    render(<MilestonesTab projectId={10} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/don't have access/i);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("keeps the milestone and reports an error when a delete is rejected", async () => {
    const user = userEvent.setup();
    hooks.useMilestoneList.mockReturnValue(ok({ content: [row], totalPages: 1, totalElements: 1 }));
    remove.mutateAsync.mockRejectedValue({ response: { status: 409, data: { message: "Milestone is referenced" } } });
    render(<MilestonesTab projectId={10} />);

    await user.click(screen.getByRole("button", { name: "Delete Draft scope" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(remove.mutateAsync).toHaveBeenCalledWith({ milestoneId: 7 });
    expect(toast.showStatusToast).toHaveBeenCalledWith(expect.any(String), "error");
    expect(toast.showStatusToast).not.toHaveBeenCalledWith("Milestone deleted", "success");
    expect(screen.getByText("Draft scope")).toBeInTheDocument();
  });
});
