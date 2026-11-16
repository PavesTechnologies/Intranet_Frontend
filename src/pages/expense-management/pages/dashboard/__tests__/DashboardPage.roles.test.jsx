import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Each role opens on its own simple money flow. Roles are switched per test through this variable.
let currentRoles = [];

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Test User", employeeId: "T001" },
    hasRole: (roles) => roles.some((r) => currentRoles.includes(r)),
  }),
}));

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({
  dashboardService: { get: vi.fn() },
}));

import { dashboardService } from "@/pages/expense-management/api/expenseReportsApi";
import DashboardPage from "../DashboardPage";

const payload = (view, kpis) => ({
  data: {
    data: {
      view,
      baseCurrencyCode: "INR",
      kpis: kpis.map(([key, label, value, format]) => ({ key, label, value, format, hint: "", tone: "gray" })),
      attention: [],
      activity: [],
    },
  },
});

const renderAs = (roles) => {
  currentRoles = roles;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

describe("role dashboards: one simple money flow per role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // the page remembers each user's last tab; start every test from a clean browser
    localStorage.clear();
  });

  it("manager sees the approvals flow and opens on it", async () => {
    dashboardService.get.mockResolvedValue(payload("manager", [
      ["pending", "Waiting for you", 4, "count"],
      ["pendingValue", "Value waiting", 18500, "money"],
      ["approved30", "Approved (30 days)", 22, "count"],
      ["sentBack30", "Sent back (30 days)", 2, "count"],
    ]));

    renderAs(["MANAGER"]);

    await waitFor(() => expect(document.querySelector('[data-kpi="pending"]')).not.toBeNull());
    expect(dashboardService.get).toHaveBeenCalledWith("manager");
    expect(document.querySelector('[data-kpi="pending"]').textContent).toMatch(/4/);
    expect(document.querySelector('[data-kpi="pendingValue"]').textContent).toMatch(/18,500/);
  });

  it("finance sees the verification flow", async () => {
    dashboardService.get.mockResolvedValue(payload("finance", [
      ["toVerify", "To verify", 7, "count"],
      ["queueValue", "Value to verify", 64000, "money"],
      ["queries", "Open queries", 1, "count"],
      ["verified", "Verified", 30, "count"],
    ]));

    renderAs(["FINANCE_EXECUTIVE"]);

    await waitFor(() => expect(document.querySelector('[data-kpi="toVerify"]')).not.toBeNull());
    expect(dashboardService.get).toHaveBeenCalledWith("finance");
    expect(screen.getByText(/Verified this month/)).toBeInTheDocument();
  });

  it("AP sees the payments flow and never shows an undefined amount", async () => {
    dashboardService.get.mockResolvedValue(payload("ap", [
      ["toPay", "To pay", 3, "count"],
      ["toPayValue", "Amount to pay", 42000, "money"],
      ["paidMonth", "Paid this month", 15000, "money"],
      ["failed", "Handoff failed", 0, "count"],
    ]));

    renderAs(["AP_EXECUTIVE"]);

    await waitFor(() => expect(document.querySelector('[data-kpi="toPayValue"]')).not.toBeNull());
    expect(dashboardService.get).toHaveBeenCalledWith("ap");
    expect(document.body.textContent).not.toMatch(/undefined|NaN/);
  });
});
