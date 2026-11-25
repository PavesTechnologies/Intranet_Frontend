import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Managers switch "My money" between their own figures and the whole team's.
let currentRoles = [];
const navigate = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Test Manager", employeeId: "M001" },
    hasRole: (roles) => roles.some((r) => currentRoles.includes(r)),
  }),
}));

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => navigate,
}));

vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({
  dashboardService: { get: vi.fn() },
  expenseReportService: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));

vi.mock("@/pages/expense-management/api/teamExpensesApi", () => ({
  teamExpensesApi: { getSummary: vi.fn() },
}));

vi.mock("@/pages/expense-management/pages/reports/reportsApi", () => ({
  expenseSummaryReportApi: { get: vi.fn() },
}));

vi.mock("@/pages/expense-management/components/dashboard/ApprovalsPanel", () => ({
  default: () => <div data-testid="approvals-panel" />,
}));

import { dashboardService } from "@/pages/expense-management/api/expenseReportsApi";
import { teamExpensesApi } from "@/pages/expense-management/api/teamExpensesApi";
import { expenseSummaryReportApi } from "@/pages/expense-management/pages/reports/reportsApi";
import DashboardPage from "../DashboardPage";

const member = (employeeId, name, claimed, extra = {}) => ({
  employeeId, name, email: `${employeeId}@x.com`, employmentStatus: "ACTIVE",
  reportCount: 2, inProgressCount: 0, rejectedCount: 0,
  claimedAmount: claimed, inProgressAmount: 0, approvedAmount: 0, reimbursedAmount: claimed,
  lastSubmittedAt: null, ...extra,
});

const teamSummary = {
  baseCurrencyCode: "INR", memberCount: 2, reportCount: 4,
  claimedAmount: 30000, inProgressAmount: 5000, approvedAmount: 0, reimbursedAmount: 25000,
  members: [member("E1", "Asha Rao", 20000, { inProgressCount: 1, inProgressAmount: 5000 }), member("E2", "Ben Paul", 10000)],
};

const teamReport = (scope = "TEAM") => ({
  scope, baseCurrencyCode: "INR", from: "2025-12-01", to: "2026-11-23",
  totals: { spend: 30000, lineItemCount: 5, reportCount: 4, employeeCount: 2, averagePerReport: 7500 },
  byMonth: [{ key: "2026-10", label: "Oct 2026", count: 2, amount: 12000 }, { key: "2026-11", label: "Nov 2026", count: 3, amount: 18000 }],
  byCategory: [{ key: "Travel", label: "Travel", count: 3, amount: 22000 }],
  byStatus: [{ key: "APPROVED", label: "APPROVED", count: 3, amount: 25000 }],
  cashAdvances: { count: 1, requestedAmount: 8000, outstandingAmount: 2000, byStatus: [{ key: "DISBURSED", label: "DISBURSED", count: 1, amount: 8000 }] },
  reimbursements: { paidCount: 2, paidAmount: 25000, awaitingPaymentCount: 0, awaitingPaymentAmount: 0 },
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

describe("manager dashboard: My dashboard / My team toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    dashboardService.get.mockResolvedValue({ data: { data: { view: "employee", baseCurrencyCode: "INR", kpis: [], attention: [], activity: [] } } });
    teamExpensesApi.getSummary.mockResolvedValue({ data: { data: teamSummary } });
    expenseSummaryReportApi.get.mockResolvedValue({ data: { data: teamReport() } });
  });

  it("is not shown to an employee who is not a manager", async () => {
    renderAs(["GENERAL"]);
    await waitFor(() => expect(dashboardService.get).toHaveBeenCalledWith("employee"));
    expect(screen.queryByRole("button", { name: "My team" })).toBeNull();
  });

  it("a manager opens on their own dashboard, then switches to the team", async () => {
    renderAs(["MANAGER"]);
    expect(await screen.findByRole("button", { name: "My dashboard" })).toHaveAttribute("aria-pressed", "true");
    expect(teamExpensesApi.getSummary).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "My team" }));

    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Asha Rao");
    expect(rows[0]).toHaveTextContent("67%");
    expect(rows[0]).toHaveTextContent("1 open");
    expect(await screen.findByText("Spend by category")).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
    expect(screen.queryByTestId("approvals-panel")).toBeNull();

    fireEvent.click(rows[1]);
    expect(navigate).toHaveBeenCalledWith("/expense-management/expenses/all?employeeId=E2");
  });

  it("shows five members a page, with paging and search", async () => {
    const many = Array.from({ length: 7 }, (_, i) => member(`E${i + 1}`, `Member ${i + 1}`, (7 - i) * 1000));
    teamExpensesApi.getSummary.mockResolvedValue({ data: { data: { ...teamSummary, memberCount: 7, claimedAmount: 28000, members: many } } });
    renderAs(["MANAGER"]);
    fireEvent.click(await screen.findByRole("button", { name: "My team" }));

    const bodyRows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);
    await screen.findByRole("table");
    expect(bodyRows()).toHaveLength(5);
    expect(screen.getByText("1–5 of 7")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(bodyRows()).toHaveLength(2);
    expect(bodyRows()[0]).toHaveTextContent("Member 6");
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Search team members"), { target: { value: "member 3" } });
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Member 3");
    expect(screen.getByText("1–1 of 1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search team members"), { target: { value: "nobody" } });
    expect(screen.getByText(/No team member matches/)).toBeInTheDocument();
  });

  it("remembers the team choice for the next visit", async () => {
    localStorage.setItem("xms.dashboard.scope.M001", "team");
    renderAs(["REPORTING_MANAGER"]);
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My team" })).toHaveAttribute("aria-pressed", "true");
  });

  it("changing the period reloads the team's spend for that range", async () => {
    renderAs(["MANAGER"]);
    fireEvent.click(await screen.findByRole("button", { name: "My team" }));
    await screen.findByText("Spend by category");
    fireEvent.click(screen.getByRole("button", { name: "This month" }));
    await waitFor(() => expect(expenseSummaryReportApi.get).toHaveBeenCalledTimes(2));
    const { from } = expenseSummaryReportApi.get.mock.calls[1][0];
    expect(from.endsWith("-01")).toBe(true);
  });

  it("hides the charts when the summary is organization-wide, keeping the team table", async () => {
    expenseSummaryReportApi.get.mockResolvedValue({ data: { data: teamReport("ORGANIZATION") } });
    renderAs(["MANAGER"]);
    fireEvent.click(await screen.findByRole("button", { name: "My team" }));
    expect(await screen.findByText(/team-only charts are not available/)).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByText("Spend by category")).toBeNull();
  });
});
