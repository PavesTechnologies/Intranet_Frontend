import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import WorkAssignmentPage from "./WorkAssignmentPage";
import * as hooks from "../hooks/useWorkAssignment";
import useDepartments from "../../system-configuration/hooks/useDepartments";

vi.mock("../hooks/useWorkAssignment", () => ({
  useWorkload: vi.fn(), useApTeam: vi.fn(), useReassignAll: vi.fn(), useRemoveRule: vi.fn(), useSetRule: vi.fn(),
}));
vi.mock("../../system-configuration/hooks/useDepartments", () => ({ default: vi.fn() }));
vi.mock("../../vendor/components/VendorPicker", () => ({ default: () => <div>vendor picker</div> }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const TEAM = [{ user_id: "5100007", name: "Venkatesh Gali" }, { user_id: "5100027", name: "Kalasagar P" }];
const member = (user_id, name, open) => ({ user_id, name, to_review: open, returned: 0, reviewed: 0, in_approval: 2, open,
  oldest_days: 4.5, in_team: true });
const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({ reassigned: [1, 2], skipped: [] }), isPending: false });

beforeEach(() => {
  vi.clearAllMocks();
  hooks.useWorkload.mockReturnValue({
    data: { members: [member("5100007", "Venkatesh Gali", 2), member("5100027", "Kalasagar P", 0)],
            unassigned: { total: 3 }, rules: [{ rule_id: 9, scope: "VENDOR", vendor_name: "WEWORK INDIA MANAGEMENT LIMITED", assignee_name: "Kalasagar P" }] },
    isLoading: false, isError: false });
  hooks.useApTeam.mockReturnValue({ data: TEAM });
  for (const name of ["useReassignAll", "useRemoveRule", "useSetRule"]) hooks[name].mockReturnValue(mutation());
  useDepartments.mockReturnValue({ data: [{ id: 5, code: "ADMIN", name: "Administration", is_active: true }] });
});

const renderPage = () => render(<WorkAssignmentPage />, { wrapper: MemoryRouter });

describe("WorkAssignmentPage", () => {
  it("shows workload, the unassigned pool and the rules", () => {
    renderPage();
    expect(within(screen.getByRole("table")).getByText("Venkatesh Gali")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /3 unassigned invoice/ })).toHaveAttribute("href", "/accounts-payable/invoices/review-workbench?assigned=unassigned");
    expect(screen.getByText("WEWORK INDIA MANAGEMENT LIMITED")).toBeInTheDocument();
  });

  it("moves everything a person holds to a teammate (leave cover)", async () => {
    const moveAll = mutation();
    hooks.useReassignAll.mockReturnValue(moveAll);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Move all (leave)" }));
    await userEvent.selectOptions(screen.getByLabelText("Move Venkatesh Gali's work to"), "5100027");
    await userEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(moveAll.mutateAsync).toHaveBeenCalledWith({ fromUserId: "5100007", toUserId: "5100027" });
  });

  it("saves a department routing rule", async () => {
    const setRule = mutation();
    hooks.useSetRule.mockReturnValue(setRule);
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText("Route by"), "DEPARTMENT");
    await userEvent.selectOptions(screen.getByLabelText("Department"), "5");
    await userEvent.selectOptions(screen.getByLabelText("Goes to"), "5100027");
    await userEvent.click(screen.getByRole("button", { name: "Save rule" }));
    expect(setRule.mutateAsync).toHaveBeenCalledWith({ scope: "DEPARTMENT", targetId: "5", assigneeUserId: "5100027" });
  });
});
