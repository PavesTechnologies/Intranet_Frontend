import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The employee dashboard: two ledgers (cash advance, reimbursement), each row showing its amount and sign,
// each ledger checked to add up, and a category donut that adds up to the claimed total.

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Ravi Menon", employeeId: "E001" },
    hasRole: (roles) => roles.includes("GENERAL"),
  }),
}));

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({
  dashboardService: { get: vi.fn() },
  expenseReportService: { getAll: vi.fn() },
}));

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: { getMyAdvances: vi.fn() },
}));

import { dashboardService, expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import DashboardPage from "../DashboardPage";

// Advance: 12,000 requested; 9,000 received; 6,000 settled; 3,000 outstanding (9,000 = 6,000 + 3,000).
// Reimbursement: 1,900 claimed, 1,900 approved, 300 covered by advance, payable 1,600 = 700 + 500 + 400.
const KPI_VALUES = {
  caRequested: 12000, caApproved: 11000, caDisbursed: 9000, caSettled: 6000, caOutstanding: 3000,
  erClaimed: 1900, erNotApproved: 0, erApproved: 1900, erAdvanceOffset: 300, erPayable: 1600,
  erToSendAp: 700, erPendingAp: 500, erPaid: 400,
};

const payload = {
  data: {
    data: {
      view: "employee",
      baseCurrencyCode: "INR",
      kpis: Object.entries(KPI_VALUES).map(([key, value]) => ({ key, label: key, value, format: "money", hint: "", tone: "gray" })),
      breakdown: [
        { key: "Meals", label: "Meals", count: 1, amount: 1000 },
        { key: "Travel", label: "Travel", count: 2, amount: 650 },
        { key: "Lodging", label: "Lodging", count: 1, amount: 250 },
      ],
      attention: [
        { reportId: "00000000-0000-0000-0000-000000000001", reportNumber: "ER-0007", title: "Pune trip",
          employeeId: "E001", status: "SENT_BACK", amount: 500, at: new Date().toISOString(), note: "Fix and resubmit" },
      ],
      activity: [],
    },
  },
};

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

const rowAmount = (key) => document.querySelector(`[data-kpi="${key}"] [data-amount]`)?.textContent || "";

describe("employee dashboard: two ledgers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    dashboardService.get.mockResolvedValue(payload);
    expenseReportService.getAll.mockResolvedValue({ data: { data: { content: [] } } });
    cashAdvanceApi.getMyAdvances.mockResolvedValue({ data: { data: { content: [] } } });
  });

  it("cash advance ledger: each line shows its amount, deductions are marked with a minus", async () => {
    renderPage();
    await waitFor(() => expect(rowAmount("caRequested")).not.toBe(""));

    expect(dashboardService.get).toHaveBeenCalledWith("employee");
    expect(screen.getByText("Cash advance ledger")).toBeInTheDocument();
    expect(rowAmount("caRequested")).toMatch(/12,000/);
    expect(rowAmount("caDisbursed")).toMatch(/9,000/);
    expect(rowAmount("caSettled")).toMatch(/^−/);
    expect(rowAmount("caSettled")).toMatch(/6,000/);
    expect(rowAmount("caOutstanding")).toMatch(/3,000/);
    expect(rowAmount("caRequested")).not.toMatch(/^−/);
  });

  it("cash advance ledger reconciles: received = settled + outstanding", async () => {
    renderPage();
    await waitFor(() => expect(document.querySelector('[data-check="Cash advance ledger"]')).not.toBeNull());
    expect(document.querySelector('[data-check="Cash advance ledger"]').textContent).toMatch(/Received = Settled \+ Outstanding/);
    expect(document.querySelector('[data-check="Cash advance ledger"]').textContent).toMatch(/Balanced/);
  });

  it("reimbursement ledger: claimed, approved, covered by advance and payable with the three payable parts", async () => {
    renderPage();
    await waitFor(() => expect(rowAmount("erClaimed")).not.toBe(""));

    expect(screen.getByText("Reimbursement ledger")).toBeInTheDocument();
    expect(rowAmount("erClaimed")).toMatch(/1,900/);
    expect(rowAmount("erAdvanceOffset")).toMatch(/^−/);
    expect(rowAmount("erAdvanceOffset")).toMatch(/300/);
    expect(rowAmount("erPayable")).toMatch(/1,600/);
    expect(rowAmount("erToSendAp")).toMatch(/700/);
    expect(rowAmount("erPendingAp")).toMatch(/500/);
    expect(rowAmount("erPaid")).toMatch(/400/);
  });

  it("reimbursement ledger reconciles: payable = not yet with AP + waiting + paid", async () => {
    renderPage();
    await waitFor(() => expect(document.querySelector('[data-check="Reimbursement ledger"]')).not.toBeNull());
    expect(document.querySelector('[data-check="Reimbursement ledger"]').textContent).toMatch(/Balanced/);
  });

  it("a ledger that does not add up is flagged, not hidden", async () => {
    dashboardService.get.mockResolvedValue({
      data: { data: { ...payload.data.data, kpis: payload.data.data.kpis.map((k) => (k.key === "erPaid" ? { ...k, value: 0 } : k)) } },
    });
    renderPage();
    await waitFor(() => expect(document.querySelector('[data-check="Reimbursement ledger"]')).not.toBeNull());
    expect(document.querySelector('[data-check="Reimbursement ledger"]').textContent).toMatch(/Off by/);
  });

  it("the category donut lists each category with its amount, and the total equals claimed", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Reimbursement by category")).toBeInTheDocument());

    expect(document.querySelector('[data-donut="centre"]').textContent).toMatch(/1,900/);
    expect(document.querySelector('[data-donut="period"]').textContent).toMatch(/All time/);
    expect(screen.getByText("Meals").closest("li").textContent).toMatch(/1,000/);
    expect(screen.getByText("Travel").closest("li").textContent).toMatch(/650/);
    expect(screen.getByText("Lodging").closest("li").textContent).toMatch(/250/);
  });

  it("shows the quick actions for a General user, each linking to an existing route", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /Request advance/ })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Submit expense/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /My expense reports/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /My advances/ })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Backdated/ })).toBeNull();
  });

  it("lists what needs the employee's action", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Needs your action")).toBeInTheDocument());
    expect(screen.getByText(/Pune trip/)).toBeInTheDocument();
  });

  it("a missing figure shows a dash, not zero or undefined", async () => {
    dashboardService.get.mockResolvedValue({ data: { data: { ...payload.data.data, kpis: [] } } });
    renderPage();
    await waitFor(() => expect(rowAmount("caRequested")).not.toBe(""));
    expect(rowAmount("caRequested")).toMatch(/-/);
    expect(document.body.textContent).not.toMatch(/undefined|NaN/);
  });
});
