import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  expenseReportService: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: {
    getMyAdvances: vi.fn(() => Promise.resolve({ data: [] })),
    getMyApprovals: vi.fn(() => Promise.resolve({ data: { data: { content: [], totalElements: 2 } } })),
  },
}));

vi.mock("@/pages/expense-management/approval-engine/api/approvalWorkflowApi", () => ({
  approvalWorkflowApi: {
    getMyQueue: vi.fn(() => Promise.resolve({ data: { data: { content: [], totalElements: 1 } } })),
    getMyHistory: vi.fn(() => Promise.resolve({ data: { data: { content: [], totalElements: 0 } } })),
  },
}));

// The embedded Approvals list is covered by its own tests; here only its presence matters.
vi.mock("@/pages/expense-management/approval-engine/pages/ApprovalsPage", () => ({
  default: ({ embedded }) => <div data-testid="approvals-page" data-embedded={String(embedded)} />,
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

  it("manager opens on My money, with approvals as a collapsible panel", async () => {
    const manager = payload("manager", [
      ["pending", "Waiting for you", 4, "count"],
      ["pendingValue", "Value waiting", 18500, "money"],
      ["approved30", "Approved (30 days)", 22, "count"],
      ["sentBack30", "Sent back (30 days)", 2, "count"],
    ]);
    dashboardService.get.mockImplementation((view) => Promise.resolve(view === "manager" ? manager : payload("employee", [])));

    renderAs(["MANAGER"]);

    // closed, the header already says what is waiting
    await waitFor(() => expect(document.querySelector("[data-approvals-summary]").textContent).toMatch(/4 items worth .*18,500/));
    expect(dashboardService.get).toHaveBeenCalledWith("employee");
    expect(dashboardService.get).toHaveBeenCalledWith("manager");
    expect(screen.queryByRole("tab", { name: "Approvals" })).toBeNull();
    expect(document.querySelector('[data-kpi="pending"]')).toBeNull();

    // the header shows pending next to approved and sent back
    expect(document.querySelector("[data-approvals-toggle]").textContent).toMatch(/Pending\s*4/);

    // opened, it adds the lists without repeating the header's figures
    fireEvent.click(document.querySelector("[data-approvals-toggle]"));
    expect(document.querySelector("[data-decision-mix]")).toBeNull();
    expect(document.querySelector("[data-approvals-panel]").querySelectorAll("[data-kpi]")).toHaveLength(0);
    expect(document.querySelector("[data-approvals-panel]").textContent.match(/18,500/g)).toHaveLength(1);
  });

  it("finance sees the verification flow", async () => {
    dashboardService.get.mockResolvedValue(payload("finance", [
      ["toVerify", "To verify", 7, "count"],
      ["queueValue", "Value to verify", 64000, "money"],
      ["queries", "Open queries", 1, "count"],
      ["verified", "Verified", 30, "count"],
    ]));

    renderAs(["FINANCE_EXECUTIVE"]);

    await waitFor(() => expect(document.querySelector("[data-finance-headline]")).not.toBeNull());
    expect(dashboardService.get).toHaveBeenCalledWith("finance");
    expect(screen.getByText(/Verified this month/)).toBeInTheDocument();
    expect(document.querySelector("[data-finance-headline]").textContent).toMatch(/7 reports worth .*64,000 waiting/);
    // the headline's figures are not repeated as cards
    expect(document.querySelector('[data-kpi="toVerify"]')).toBeNull();
    expect(document.querySelector('[data-kpi="queueValue"]')).toBeNull();
    expect(document.body.textContent.match(/64,000/g)).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/undefined|NaN/);
  });

  it("finance works its approvals from the same dashboard", async () => {
    dashboardService.get.mockResolvedValue(payload("finance", [["toVerify", "To verify", 0, "count"]]));

    renderAs(["FINANCE_EXECUTIVE"]);

    // expense-report queue (1) + cash advances (2) routed to this user
    await waitFor(() => expect(document.querySelector('[data-kpi="approvals"]').textContent).toMatch(/3/));
    expect(screen.queryByTestId("approvals-page")).toBeNull();

    fireEvent.click(document.querySelector('[data-finance-tab="approvals"]'));
    expect(screen.getByTestId("approvals-page").dataset.embedded).toBe("true");
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
