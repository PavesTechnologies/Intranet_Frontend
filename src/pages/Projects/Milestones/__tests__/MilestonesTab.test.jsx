import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../../components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
const hooks = vi.hoisted(() => ({
  useMilestoneList: vi.fn(),
  useMilestoneSummary: vi.fn(),
  useProjectEpics: vi.fn(),
  useMilestoneHistory: vi.fn(),
  useMilestoneMutations: vi.fn(),
}));
vi.mock("../hooks/useMilestones", () => hooks);

import MilestonesTab from "../index";

const milestone = (overrides = {}) => ({
  id: 1,
  projectId: 10,
  milestoneCode: "PAY-M001",
  name: "UAT sign-off",
  epicId: null,
  epicName: null,
  plannedStartDate: null,
  plannedDueDate: "2026-11-30",
  actualCompletionDate: null,
  executionStatus: "IN_PROGRESS",
  billable: true,
  allocationPercentage: 60,
  estimatedAmount: 600000,
  currency: "INR",
  billingReadiness: "NOT_READY",
  readinessReasons: ["Milestone is not completed"],
  allowedStatusChanges: ["ON_HOLD", "CANCELLED"],
  canComplete: true,
  canDelete: false,
  version: 0,
  ...overrides,
});

const summary = {
  total: 1,
  planned: 0,
  inProgress: 1,
  onHold: 0,
  completed: 0,
  cancelled: 0,
  readyForBilling: 0,
  allocatedPercentage: 60,
  remainingPercentage: 40,
  allocationComplete: false,
  projectBudget: 1000000,
  currency: "INR",
};

const listResult = (rows, extra = {}) => ({
  data: { content: rows, totalPages: 1, totalElements: rows.length },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  ...extra,
});

let mutations;
beforeEach(() => {
  mutations = {
    create: mutation(),
    update: mutation(),
    changeStatus: mutation(),
    complete: mutation(),
    remove: mutation(),
  };
  hooks.useMilestoneMutations.mockReturnValue(mutations);
  hooks.useMilestoneSummary.mockReturnValue({ data: summary, isLoading: false, error: null, refetch: vi.fn() });
  hooks.useProjectEpics.mockReturnValue({ data: [{ id: 5, name: "Payments" }], isLoading: false });
  hooks.useMilestoneHistory.mockReturnValue({ data: [], isLoading: false, isError: false });
});

describe("MilestonesTab", () => {
  it("renders summary cards and milestone rows with text-labelled badges", () => {
    hooks.useMilestoneList.mockReturnValue(listResult([milestone()]));
    render(<MilestonesTab projectId={10} projectName="Payments" />);

    expect(screen.getByRole("heading", { name: "Milestones" })).toBeInTheDocument();
    expect(screen.getByText("40% unallocated")).toBeInTheDocument();
    const row = screen.getByRole("button", { name: "UAT sign-off" }).closest("tr");
    expect(within(row).getByText("PAY-M001")).toBeInTheDocument();
    expect(within(row).getByText("In progress")).toBeInTheDocument();
    expect(within(row).getByText("Not ready")).toBeInTheDocument();
    expect(within(row).getByText("60%")).toBeInTheDocument();
  });

  it("shows an empty state with a create action", () => {
    hooks.useMilestoneList.mockReturnValue(listResult([]));
    render(<MilestonesTab projectId={10} />);
    expect(screen.getByText("No milestones yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /add milestone/i })).toHaveLength(2);
  });

  it("explains a 403 instead of showing the table", () => {
    hooks.useMilestoneList.mockReturnValue(listResult([], { data: undefined, error: { response: { status: 403 } } }));
    render(<MilestonesTab projectId={10} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/don't have access/i);
    expect(screen.queryByRole("button", { name: /add milestone/i })).not.toBeInTheDocument();
  });

  it("validates the create form and links the error summary to fields", async () => {
    const user = userEvent.setup();
    hooks.useMilestoneList.mockReturnValue(listResult([milestone()]));
    render(<MilestonesTab projectId={10} />);

    await user.click(screen.getByRole("button", { name: /add milestone/i }));
    await user.type(screen.getByLabelText(/allocation/i), "50");
    await user.click(screen.getByRole("button", { name: "Create milestone" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("link", { name: /enter a milestone name/i })).toHaveAttribute("href", "#ms-name");
    expect(within(alert).getByText(/only 40% is left/i)).toBeInTheDocument();
    expect(mutations.create.mutateAsync).not.toHaveBeenCalled();
  });

  it("submits a valid milestone with backend-shaped payload", async () => {
    const user = userEvent.setup();
    hooks.useMilestoneList.mockReturnValue(listResult([milestone()]));
    render(<MilestonesTab projectId={10} />);

    await user.click(screen.getByRole("button", { name: /add milestone/i }));
    await user.type(screen.getByLabelText(/milestone name/i), "Go live");
    await user.selectOptions(screen.getByLabelText(/linked epic/i), "5");
    await user.type(screen.getByLabelText(/allocation/i), "40");
    await user.click(screen.getByRole("button", { name: "Create milestone" }));

    expect(mutations.create.mutateAsync).toHaveBeenCalledWith({
      projectId: 10,
      payload: expect.objectContaining({ name: "Go live", epicId: 5, billable: true, allocationPercentage: 40 }),
    });
  });

  it("asks before discarding unsaved edits", async () => {
    const user = userEvent.setup();
    hooks.useMilestoneList.mockReturnValue(listResult([milestone()]));
    render(<MilestonesTab projectId={10} />);

    await user.click(screen.getByRole("button", { name: /add milestone/i }));
    await user.type(screen.getByLabelText(/milestone name/i), "Draft");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/discard your unsaved changes/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText(/milestone name/i)).toHaveValue("Draft");
  });

  it("offers only the actions the backend allows in the detail drawer", async () => {
    const user = userEvent.setup();
    hooks.useMilestoneList.mockReturnValue(listResult([milestone()]));
    render(<MilestonesTab projectId={10} />);

    await user.click(screen.getByRole("button", { name: "UAT sign-off" }));
    const drawer = screen.getByRole("dialog", { name: "UAT sign-off" });
    expect(within(drawer).getByRole("button", { name: /mark completed/i })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: /put on hold/i })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: /cancel milestone/i })).toBeInTheDocument();
    expect(within(drawer).queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(within(drawer).getByText("Milestone is not completed")).toBeInTheDocument();
  });

  it("opens the details panel when any part of the row is clicked, but not from the edit icon", async () => {
    const user = userEvent.setup();
    hooks.useMilestoneList.mockReturnValue(listResult([milestone()]));
    render(<MilestonesTab projectId={10} />);

    await user.click(screen.getByRole("button", { name: "Edit UAT sign-off" }));
    expect(screen.queryByRole("dialog", { name: "UAT sign-off" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByText("PAY-M001"));
    expect(screen.getByRole("dialog", { name: "UAT sign-off" })).toBeInTheDocument();
  });

  it("makes completed milestones read-only in the table and the details panel", async () => {
    const user = userEvent.setup();
    hooks.useMilestoneList.mockReturnValue(
      listResult([
        milestone({
          executionStatus: "COMPLETED",
          actualCompletionDate: "2026-10-16",
          billingReadiness: "READY_FOR_BILLING",
          readinessReasons: [],
          allowedStatusChanges: [],
          canComplete: false,
          canEdit: false,
        }),
      ])
    );
    render(<MilestonesTab projectId={10} />);

    expect(screen.queryByRole("button", { name: "Edit UAT sign-off" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /edit unavailable/i })).toBeInTheDocument();

    await user.click(screen.getByText("PAY-M001"));
    const drawer = screen.getByRole("dialog", { name: "UAT sign-off" });
    expect(within(drawer).getByRole("button", { name: /edit/i })).toBeDisabled();
    expect(within(drawer).getByText(/can no longer be changed/i)).toBeInTheDocument();
    expect(within(drawer).queryByRole("button", { name: /cancel milestone|delete|start|put on hold/i })).not.toBeInTheDocument();
  });

  it("shows an Actions column with delete enabled only for planned milestones", async () => {
    const user = userEvent.setup();
    hooks.useMilestoneList.mockReturnValue(
      listResult([
        milestone({ id: 7, name: "Draft scope", milestoneCode: "PAY-M007", executionStatus: "PLANNED", canDelete: true }),
        milestone(),
      ])
    );
    render(<MilestonesTab projectId={10} />);

    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    // In-progress row: delete is shown but unavailable.
    expect(screen.queryByRole("button", { name: "Delete UAT sign-off" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /only planned milestones can be deleted/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Draft scope" }));
    expect(screen.getByText(/Delete PAY-M007 “Draft scope”\?/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(mutations.remove.mutateAsync).toHaveBeenCalledWith({ milestoneId: 7 });
  });

  it("completes a milestone with the selected date and current version", async () => {
    const user = userEvent.setup();
    hooks.useMilestoneList.mockReturnValue(listResult([milestone({ version: 3 })]));
    render(<MilestonesTab projectId={10} />);

    await user.click(screen.getByRole("button", { name: "UAT sign-off" }));
    await user.click(screen.getByRole("button", { name: /mark completed/i }));
    const dateInput = screen.getByLabelText(/completion date/i);
    await user.clear(dateInput);
    await user.type(dateInput, "2026-10-01");
    await user.click(screen.getAllByRole("button", { name: /mark completed/i }).at(-1));

    expect(mutations.complete.mutateAsync).toHaveBeenCalledWith({
      milestoneId: 1,
      actualCompletionDate: "2026-10-01",
      version: 3,
    });
  });
});
