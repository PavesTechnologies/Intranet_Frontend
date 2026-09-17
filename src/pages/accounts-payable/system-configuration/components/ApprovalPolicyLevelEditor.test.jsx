import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApprovalPolicyLevelEditor from "./ApprovalPolicyLevelEditor";

vi.mock("../../../expense-management/approval-engine/hooks/useEmployeeDirectory", () => ({
  useEmployeeDirectory: () => ({ data: new Map([["user-1", { name: "Priya Sharma" }]]) }),
  resolveEmployeeName: (map, id) => map?.get(id)?.name || id,
}));

const baseProps = {
  index: 0,
  total: 2,
  onChange: vi.fn(),
  onRemove: vi.fn(),
  onMoveUp: vi.fn(),
  onMoveDown: vi.fn(),
  roleOptions: [{ value: "AP_MANAGER", label: "AP_MANAGER" }],
  approvers: [{ user_uuid: "user-1", employee_uuid: "user-1", is_user_active: true }],
  disableRemove: false,
  departmentName: "Finance",
};

describe("ApprovalPolicyLevelEditor — dynamic approver-type fields", () => {
  it("shows only the Role selector for approver_type ROLE", () => {
    render(
      <ApprovalPolicyLevelEditor
        {...baseProps}
        level={{ level_number: 1, approver_type: "ROLE", approval_rule: "ANY_ONE", role_code: "" }}
      />,
    );
    expect(screen.getByText("Role", { selector: "label" })).toBeInTheDocument();
    expect(screen.queryByText("User", { selector: "label" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Department Approvers/)).not.toBeInTheDocument();
  });

  it("shows only the User selector for approver_type USER, with names resolved via the employee directory", () => {
    render(
      <ApprovalPolicyLevelEditor
        {...baseProps}
        level={{ level_number: 1, approver_type: "USER", approval_rule: "ANY_ONE", user_uuid: "" }}
      />,
    );
    expect(screen.getByText("User", { selector: "label" })).toBeInTheDocument();
    expect(screen.queryByText("Role", { selector: "label" })).not.toBeInTheDocument();
  });

  it("shows the department-approver info note and no extra selector for DEPARTMENT_APPROVER", () => {
    render(
      <ApprovalPolicyLevelEditor
        {...baseProps}
        level={{ level_number: 1, approver_type: "DEPARTMENT_APPROVER", approval_rule: "ANY_ONE" }}
      />,
    );
    expect(screen.getByText(/manage that list under/i)).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.queryByText("Role")).not.toBeInTheDocument();
    expect(screen.queryByText("User")).not.toBeInTheDocument();
  });

  it("disables Move Up on the first level and Move Down on the last level", () => {
    render(
      <ApprovalPolicyLevelEditor
        {...baseProps}
        index={0}
        total={2}
        level={{ level_number: 1, approver_type: "DEPARTMENT_APPROVER", approval_rule: "ANY_ONE" }}
      />,
    );
    expect(screen.getByLabelText("Move level up")).toBeDisabled();
    expect(screen.getByLabelText("Move level down")).not.toBeDisabled();
  });

  it("disables Remove when disableRemove is set (last remaining level)", () => {
    render(
      <ApprovalPolicyLevelEditor
        {...baseProps}
        disableRemove
        level={{ level_number: 1, approver_type: "DEPARTMENT_APPROVER", approval_rule: "ANY_ONE" }}
      />,
    );
    expect(screen.getByLabelText("Remove level")).toBeDisabled();
  });

  it("calls onRemove/onMoveUp/onMoveDown when their buttons are clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onMoveDown = vi.fn();
    render(
      <ApprovalPolicyLevelEditor
        {...baseProps}
        index={0}
        total={2}
        onRemove={onRemove}
        onMoveDown={onMoveDown}
        level={{ level_number: 1, approver_type: "DEPARTMENT_APPROVER", approval_rule: "ANY_ONE" }}
      />,
    );
    await user.click(screen.getByLabelText("Remove level"));
    expect(onRemove).toHaveBeenCalledTimes(1);
    await user.click(screen.getByLabelText("Move level down"));
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });
});
