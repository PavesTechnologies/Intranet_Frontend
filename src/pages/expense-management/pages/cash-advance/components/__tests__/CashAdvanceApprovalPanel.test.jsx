import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: { getApprovalTrail: vi.fn(), approve: vi.fn(), reject: vi.fn() },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));
vi.mock("@/pages/expense-management/approval-engine/components/EmployeeLabel", () => ({
  default: ({ employeeId }) => <span>{`emp:${employeeId}`}</span>,
}));
vi.mock("@/pages/expense-management/pages/cash-advance/components/ManagerDecisionSummary", () => ({
  default: () => null,
  payoutOf: () => ({ cash: 0 }),
}));

import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import CashAdvanceApprovalPanel from "../CashAdvanceApprovalPanel";

const step = (action, fromStatus, toStatus, performedBy) => ({
  action,
  fromStatus,
  toStatus,
  performedBy,
  performedAt: "2026-11-20T10:30:00",
  reason: null,
});

const trailResponse = (steps) => ({ data: { success: true, data: steps } });

describe("CashAdvanceApprovalPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows who approved each level and marks a skipped cost center step as not needed", async () => {
    cashAdvanceApi.getApprovalTrail.mockResolvedValue(
      trailResponse([
        step("SUBMITTED", "DRAFT", "SUBMITTED", "EMP1"),
        step("APPROVED", "SUBMITTED", "PENDING_FINANCE_APPROVAL", "MGR1"),
        step("APPROVED", "PENDING_FINANCE_APPROVAL", "APPROVED", "FIN1"),
      ]),
    );

    render(<CashAdvanceApprovalPanel advance={{ advanceId: "a1", status: "IN_PROGRESS", managerId: "MGR1" }} canAct={false} onChanged={vi.fn()} />);

    expect(await screen.findByText("emp:FIN1")).toBeInTheDocument();
    expect(screen.getByText("emp:MGR1")).toBeInTheDocument();
    expect(screen.getByText("Not needed for this request")).toBeInTheDocument();
    expect(screen.getAllByText(/^Approved ·/)).toHaveLength(2);
  });

  it("shows the rejecting level and leaves later levels unreached", async () => {
    cashAdvanceApi.getApprovalTrail.mockResolvedValue(
      trailResponse([
        step("SUBMITTED", "DRAFT", "SUBMITTED", "EMP1"),
        step("APPROVED", "SUBMITTED", "PENDING_COST_CENTER_APPROVAL", "MGR1"),
        { ...step("REJECTED", "PENDING_COST_CENTER_APPROVAL", "REJECTED", "CC1"), reason: "Over budget" },
      ]),
    );

    render(<CashAdvanceApprovalPanel advance={{ advanceId: "a2", status: "REJECTED", managerId: "MGR1" }} canAct={false} onChanged={vi.fn()} />);

    expect(await screen.findByText("emp:CC1")).toBeInTheDocument();
    expect(screen.getByText("Reason: Over budget")).toBeInTheDocument();
    expect(screen.getByText("Not reached yet")).toBeInTheDocument();
  });

  it("shows the current level as awaiting a decision", async () => {
    cashAdvanceApi.getApprovalTrail.mockResolvedValue(
      trailResponse([
        step("SUBMITTED", "DRAFT", "SUBMITTED", "EMP1"),
        step("APPROVED", "SUBMITTED", "PENDING_COST_CENTER_APPROVAL", "MGR1"),
      ]),
    );

    render(<CashAdvanceApprovalPanel advance={{ advanceId: "a3", status: "PENDING_COST_CENTER_APPROVAL", managerId: "MGR1" }} canAct={false} onChanged={vi.fn()} />);

    expect(await screen.findByText(/^Approved ·/)).toBeInTheDocument();
    expect(screen.getByText("emp:MGR1")).toBeInTheDocument();
    expect(screen.getByText("Awaiting decision")).toBeInTheDocument();
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
  });
});
