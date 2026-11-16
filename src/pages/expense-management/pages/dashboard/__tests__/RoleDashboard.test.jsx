import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const { mockNavigate, state } = vi.hoisted(() => ({ mockNavigate: vi.fn(), state: { roles: [] } }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Asha Rao", employeeId: "M001" },
    hasRole: (roles) => roles.some((r) => state.roles.includes(r)),
  }),
}));
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/pages/expense-management/approval-engine/hooks/useEmployeeDirectory", () => ({
  useEmployeeDirectory: () => ({ data: new Map() }),
}));

import RoleDashboard from "@/pages/expense-management/components/dashboard/RoleDashboard";

const KPIS = [
  { key: "pending", label: "Waiting", value: 4, format: "count", hint: "", tone: "amber" },
  { key: "pendingValue", label: "Value", value: 18500, format: "money", hint: "", tone: "blue" },
];
const STEPS = [
  { key: "pending", label: "Waiting for you", help: "Requests for your decision.", tone: "amber" },
  { key: "pendingValue", label: "Value waiting", help: "Total waiting.", tone: "blue" },
];
const MANAGER_ACTIONS = [
  { key: "approvals", label: "Open approvals", hint: "Waiting for you", icon: "ClipboardCheck", to: "/expense-management/approvals", roles: ["MANAGER", "REPORTING_MANAGER"] },
  { key: "ca", label: "Cash advance approvals", hint: "Advances", icon: "Banknote", to: "/expense-management/cash-advance/approvals", roles: ["MANAGER"] },
];
const DATA = {
  kpis: KPIS,
  attention: [{ reportId: "r1", reportNumber: "ER-0100", title: "Client trip", status: "PENDING_APPROVAL", amount: 900, at: "2026-11-10T10:00:00", employeeId: "E9" }],
  activity: [{ reportId: "r2", reportNumber: "ER-0099", title: "Hotel", status: "APPROVED", amount: 400, at: "2026-11-09T10:00:00", employeeId: "E8" }],
  budgets: [
    { costCenterName: "Sales", fiscalYear: "2026", budgetAmount: 100000, usedAmount: 90000, warningThreshold: 0.8 },
    { costCenterName: "Ops", fiscalYear: "2026", budgetAmount: 50000, usedAmount: 10000, warningThreshold: 0.8 },
  ],
  breakdown: [{ key: "Travel", label: "Travel", count: 2, amount: 300 }],
  breakdownTitle: "Top categories (12 months)",
};
const CONFIG = {
  steps: STEPS,
  quickActions: MANAGER_ACTIONS,
  attentionTitle: "Waiting for your decision",
  attentionSubtitle: "Requests waiting",
  attentionEmpty: "No approvals waiting.",
  activityTitle: "Your recent decisions",
  activitySubtitle: "Recent",
  link: () => "/expense-management/approvals",
  showEmployee: true,
};

const renderIt = (config = {}, data = DATA) =>
  render(
    <MemoryRouter>
      <RoleDashboard data={data} config={{ ...CONFIG, ...config }} currency="INR" />
    </MemoryRouter>,
  );

describe("role dashboard body", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    state.roles = ["MANAGER"];
  });

  it("shows only the quick actions the role can open", () => {
    renderIt();
    expect(screen.getByRole("button", { name: /Open approvals/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cash advance approvals/ })).toBeInTheDocument();

    cleanup();
    state.roles = ["REPORTING_MANAGER"];
    renderIt();
    expect(screen.getAllByRole("button", { name: /Open approvals/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Cash advance approvals/ })).toBeNull();
  });

  it("a quick action opens its route", () => {
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: /Open approvals/ }));
    expect(mockNavigate).toHaveBeenLastCalledWith("/expense-management/approvals");
  });

  it("shows the headline figures for the role", () => {
    const { container } = renderIt();
    expect(container.querySelector('[data-kpi="pending"]').textContent).toMatch(/4/);
    expect(container.querySelector('[data-kpi="pendingValue"]').textContent).toMatch(/18,500/);
  });

  it("lists the items waiting for the role and its recent activity", () => {
    renderIt();
    expect(screen.getByText("Waiting for your decision")).toBeInTheDocument();
    expect(screen.getByText(/ER-0100/)).toBeInTheDocument();
    expect(screen.getByText("Your recent decisions")).toBeInTheDocument();
    expect(screen.getByText(/ER-0099/)).toBeInTheDocument();
  });

  it("does not show budgets unless the role is configured for them", () => {
    const { container } = renderIt();
    expect(container.querySelector("[data-budgets]")).toBeNull();
  });

  it("admin sees budgets with use and a warning above the threshold", () => {
    state.roles = ["ADMIN"];
    const { container } = renderIt({ showBudgets: true, showBreakdown: true });
    expect(container.querySelector('[data-budget="Sales"]').textContent).toMatch(/90%/);
    expect(container.querySelector('[data-budget="Sales"]').textContent).toMatch(/above warning level/);
    expect(container.querySelector('[data-budget="Ops"]').textContent).not.toMatch(/warning/);
    expect(screen.getByText("Top categories (12 months)")).toBeInTheDocument();
  });

  it("hides the attention list for roles that have none", () => {
    renderIt({ attentionTitle: undefined });
    expect(screen.queryByText("Waiting for your decision")).toBeNull();
    expect(screen.getByText("Your recent decisions")).toBeInTheDocument();
  });

  it("shows the employee who raised each item, not the internal approver fields", () => {
    const { container } = renderIt();
    expect(container.textContent).toMatch(/E9/);
    expect(container.textContent).not.toMatch(/approverId|assignmentId|auditLog/i);
  });
});
