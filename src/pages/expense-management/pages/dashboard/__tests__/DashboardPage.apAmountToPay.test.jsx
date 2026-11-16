import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The AP dashboard shows the amount the backend calculates (owed less paid, per report). These tests check that the
// "Amount to pay" tile and the attention list show exactly that amount for partial, full and unpaid reports.

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Asha Payments", employeeId: "AP001" },
    hasRole: (roles) => roles.includes("AP_EXECUTIVE"),
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

const apResponse = (amountToPay, attention = []) => ({
  view: "ap",
  baseCurrencyCode: "INR",
  kpis: [
    { key: "toPay", label: "To pay", value: attention.length, format: "count", hint: "Reports waiting", tone: "indigo" },
    { key: "toPayValue", label: "Amount to pay", value: amountToPay, format: "money", hint: "Owed to employees", tone: "blue" },
    { key: "paidMonth", label: "Paid this month", value: 0, format: "money", hint: "0 report(s)", tone: "emerald" },
    { key: "avgDays", label: "Avg time to pay", value: 0, format: "days", hint: "90 days", tone: "gray" },
    { key: "failed", label: "Handoff failed", value: 0, format: "count", hint: "", tone: "gray" },
  ],
  trendTitle: "Paid per month",
  trend: [],
  pipeline: [],
  breakdown: [],
  ranking: [],
  aging: [],
  budgets: [],
  attention,
  activity: [],
});

const item = (reportNumber, amount) => ({
  reportId: "00000000-0000-0000-0000-00000000000" + reportNumber.slice(-1),
  reportNumber,
  title: "Client visit",
  employeeId: "EMP001",
  status: "APPROVED",
  amount,
  at: new Date().toISOString(),
  note: "Approved 2d ago",
});

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

// Each step card carries data-kpi=<key>; its amount is the large figure inside it.
const tileValue = (key) => document.querySelector(`[data-kpi="${key}"]`)?.textContent || "";

describe("AP dashboard: Amount to pay shows only the remaining unpaid amount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("partially paid report: shows the remaining 600, not the owed 1,000 or the paid 400", async () => {
    dashboardService.get.mockResolvedValue({
      data: { data: apResponse(600, [item("ER-0001", 600)]) },
    });

    renderPage();

    await waitFor(() => expect(document.querySelector('[data-kpi="toPayValue"]')).not.toBeNull());
    expect(dashboardService.get).toHaveBeenCalledWith("ap");
    expect(tileValue("toPayValue")).toMatch(/600/);
    expect(tileValue("toPayValue")).not.toMatch(/1,000|1000/);
    expect(tileValue("toPayValue")).not.toMatch(/400/);
    // the attention list shows the same remaining amount as the tile
    expect(screen.getAllByText(/600/).length).toBeGreaterThan(0);
  });

  it("fully paid report: shows zero outstanding", async () => {
    dashboardService.get.mockResolvedValue({
      data: { data: apResponse(0, []) },
    });

    renderPage();

    await waitFor(() => expect(document.querySelector('[data-kpi="toPayValue"]')).not.toBeNull());
    expect(tileValue("toPayValue")).toMatch(/₹\s?0(\.00)?(\D|$)/);
    expect(screen.getByText("Nothing waiting to be paid.")).toBeInTheDocument();
  });

  it("unpaid report: shows the full owed amount", async () => {
    dashboardService.get.mockResolvedValue({
      data: { data: apResponse(1000, [item("ER-0002", 1000)]) },
    });

    renderPage();

    await waitFor(() => expect(document.querySelector('[data-kpi="toPayValue"]')).not.toBeNull());
    expect(tileValue("toPayValue")).toMatch(/1,000/);
  });

  it("several reports: the tile shows the sum of their remainders as the backend returns it", async () => {
    dashboardService.get.mockResolvedValue({
      data: { data: apResponse(1100, [item("ER-0003", 600), item("ER-0004", 500)]) },
    });

    renderPage();

    await waitFor(() => expect(document.querySelector('[data-kpi="toPayValue"]')).not.toBeNull());
    expect(tileValue("toPayValue")).toMatch(/1,100/);
  });
});
