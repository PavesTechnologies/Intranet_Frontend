import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const { mockNavigate, state } = vi.hoisted(() => ({ mockNavigate: vi.fn(), state: { roles: [] } }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Ravi Menon", employeeId: "E001" },
    hasRole: (roles) => roles.some((r) => state.roles.includes(r)),
  }),
}));

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

import { QuickActions } from "@/pages/expense-management/components/dashboard/EmployeeMoneyFlow";

// The four quick actions as the dashboard config defines them (roles mirror the App.jsx route guards).
const ACTIONS = [
  { key: "submit", label: "Submit expense", hint: "Create an expense report", icon: "ReceiptText", to: "/expense-management/expenses/create", roles: ["GENERAL", "MANAGER"] },
  { key: "advance", label: "Request advance", hint: "Request travel or business funds", icon: "Banknote", to: "/expense-management/cash-advance/request", roles: ["GENERAL"] },
  { key: "reports", label: "My expense reports", hint: "Track submitted reports", icon: "FileText", to: "/expense-management/expenses/my", roles: ["GENERAL", "MANAGER"] },
  { key: "advances", label: "My advances", hint: "Balances and settlements", icon: "Wallet", to: "/expense-management/cash-advance/my", roles: ["GENERAL"] },
];

const renderIt = () =>
  render(
    <MemoryRouter>
      <QuickActions actions={ACTIONS} />
    </MemoryRouter>,
  );

describe("employee quick actions", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("a general employee sees all four actions", () => {
    state.roles = ["GENERAL"];
    renderIt();
    ["Submit expense", "Request advance", "My expense reports", "My advances"].forEach((label) => {
      expect(screen.getByRole("button", { name: new RegExp(label) })).toBeEnabled();
    });
  });

  it("each action opens its existing route", () => {
    state.roles = ["GENERAL"];
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: /Submit expense/ }));
    expect(mockNavigate).toHaveBeenLastCalledWith("/expense-management/expenses/create");
    fireEvent.click(screen.getByRole("button", { name: /Request advance/ }));
    expect(mockNavigate).toHaveBeenLastCalledWith("/expense-management/cash-advance/request");
    fireEvent.click(screen.getByRole("button", { name: /My expense reports/ }));
    expect(mockNavigate).toHaveBeenLastCalledWith("/expense-management/expenses/my");
    fireEvent.click(screen.getByRole("button", { name: /My advances/ }));
    expect(mockNavigate).toHaveBeenLastCalledWith("/expense-management/cash-advance/my");
  });

  it("a manager without the employee role sees only the expense actions, not the advance ones", () => {
    state.roles = ["MANAGER"];
    renderIt();
    expect(screen.getByRole("button", { name: /Submit expense/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /My expense reports/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Request advance/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /My advances/ })).toBeNull();
  });

  it("a role with no employee actions sees no quick actions section", () => {
    state.roles = ["AP_EXECUTIVE"];
    const { container } = renderIt();
    expect(container.querySelector('[data-quick-action]')).toBeNull();
    expect(screen.queryByText("Quick actions")).toBeNull();
  });
});
