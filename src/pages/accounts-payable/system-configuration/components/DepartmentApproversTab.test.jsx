import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DepartmentApproversTab from "./DepartmentApproversTab";
import { useDepartmentApprovers, useAddDepartmentApprover, useRemoveDepartmentApprover } from "../hooks/useDepartmentApprovers";
import { useApprovers } from "../hooks/useApprovalMetadata";

vi.mock("../hooks/useDepartments", () => ({
  default: () => ({
    data: [
      { id: 1, code: "FIN", name: "Finance", is_active: true },
      { id: 2, code: "IT", name: "IT", is_active: true },
    ],
  }),
}));

vi.mock("../hooks/useApprovalMetadata", () => ({
  useApprovers: vi.fn(),
}));

vi.mock("../hooks/useDepartmentApprovers", () => ({
  useDepartmentApprovers: vi.fn(),
  useAddDepartmentApprover: vi.fn(),
  useRemoveDepartmentApprover: vi.fn(),
}));

vi.mock("../../../expense-management/approval-engine/hooks/useEmployeeDirectory", () => ({
  useEmployeeDirectory: () => ({ data: new Map([["user-1", { name: "Priya Sharma" }]]) }),
  resolveEmployeeName: (map, id) => map?.get(id)?.name || id,
}));

vi.mock("./ApproverLabel", () => ({
  default: ({ userUuid }) => <span>{`Approver:${userUuid}`}</span>,
}));

const idleMutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });

beforeEach(() => {
  vi.clearAllMocks();
  useAddDepartmentApprover.mockReturnValue(idleMutation());
  useRemoveDepartmentApprover.mockReturnValue(idleMutation());
  useApprovers.mockReturnValue({
    data: [
      { user_uuid: "user-1", employee_uuid: "user-1", is_user_active: true },
      { user_uuid: "user-2", employee_uuid: "user-2", is_user_active: true },
    ],
  });
});

describe("DepartmentApproversTab", () => {
  it("prompts to select a department before showing any approver list", () => {
    useDepartmentApprovers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    render(<DepartmentApproversTab />);
    expect(screen.getByText("Select a department to manage its approvers.")).toBeInTheDocument();
  });

  it("shows an empty state for a department with no approvers configured", async () => {
    useDepartmentApprovers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    const user = userEvent.setup();
    render(<DepartmentApproversTab />);

    await user.click(screen.getByRole("button", { name: /select a department/i }));
    await user.click(await screen.findByText("FIN — Finance"));

    expect(await screen.findByText(/No approvers configured for this department yet/)).toBeInTheDocument();
  });

  it("lists existing approvers for the selected department, resolved by name", async () => {
    useDepartmentApprovers.mockReturnValue({
      data: [{ id: 1, department_id: 1, user_uuid: "user-1", is_active: true, created_at: "2026-01-01T00:00:00Z" }],
      isLoading: false,
      isError: false,
      error: null,
    });
    const user = userEvent.setup();
    render(<DepartmentApproversTab />);
    await user.click(screen.getByRole("button", { name: /select a department/i }));
    await user.click(await screen.findByText("FIN — Finance"));

    expect(await screen.findByText("Approver:user-1")).toBeInTheDocument();
  });

  it("adds a new approver by selecting an eligible user and confirming", async () => {
    const addMutateAsync = vi.fn().mockResolvedValue({});
    useAddDepartmentApprover.mockReturnValue({ mutateAsync: addMutateAsync, isPending: false });
    useDepartmentApprovers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });

    const user = userEvent.setup();
    render(<DepartmentApproversTab />);
    await user.click(screen.getByRole("button", { name: /select a department/i }));
    await user.click(await screen.findByText("FIN — Finance"));

    await user.click(screen.getByRole("button", { name: /add approver/i }));
    await user.click(screen.getByRole("button", { name: /select user/i }));
    // user-1 resolves to "Priya Sharma" via the mocked employee directory; user-2 has no
    // directory entry and falls back to a "User <id>" label.
    await user.click(await screen.findByText("Priya Sharma"));
    // Both the page's "Add Approver" trigger and the modal's own submit button share this
    // accessible name — the modal's is the one added last.
    const addApproverButtons = screen.getAllByRole("button", { name: "Add Approver" });
    await user.click(addApproverButtons[addApproverButtons.length - 1]);

    expect(addMutateAsync).toHaveBeenCalledWith({ departmentId: 1, userUuid: "user-1" });
  });

  it("removes an approver after confirming", async () => {
    const removeMutateAsync = vi.fn().mockResolvedValue({});
    useRemoveDepartmentApprover.mockReturnValue({ mutateAsync: removeMutateAsync, isPending: false });
    useDepartmentApprovers.mockReturnValue({
      data: [{ id: 7, department_id: 1, user_uuid: "user-1", is_active: true, created_at: "2026-01-01T00:00:00Z" }],
      isLoading: false,
      isError: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<DepartmentApproversTab />);
    await user.click(screen.getByRole("button", { name: /select a department/i }));
    await user.click(await screen.findByText("FIN — Finance"));

    await user.click(screen.getByTitle("Remove Approver"));
    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(removeMutateAsync).toHaveBeenCalledWith(7);
  });
});
