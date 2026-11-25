import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/pages/expense-management/pages/reports/reportsApi", () => ({ employeeMoneyReportApi: { get: vi.fn() } }));
vi.mock("@/pages/expense-management/pages/reports/useExpenseSummaryReport", () => ({
  useDepartmentNames: () => ({ data: { "dept-eng": "Engineering", "dept-fin": "Finance" } }),
}));
// Charts need a measured container; jsdom has none, so render the children in a fixed box.
vi.mock("recharts", async (orig) => {
  const actual = await orig();
  return { ...actual, ResponsiveContainer: ({ children }) => <div style={{ width: 600, height: 260 }}>{children}</div> };
});

import { employeeMoneyReportApi } from "@/pages/expense-management/pages/reports/reportsApi";
import EmployeeMoneyView, { periodRange } from "../EmployeeMoneyView";

// Made-up figures, shaped like GET /xms/reports/employee-money.
const advances = (o = {}) => ({ count: 0, requested: 0, pendingApproval: 0, approved: 0, approvedNotPaid: 0, paidOut: 0, carriedIn: 0, used: 0, salaryDeducted: 0, refunded: 0, carriedOut: 0, outstanding: 0, ...o });
const expenses = (o = {}) => ({ reportCount: 0, claimed: 0, inApproval: 0, sentBack: 0, rejected: 0, approved: 0, coveredByAdvance: 0, noPaymentDue: 0, paid: 0, due: 0, ...o });
const tax = (o = {}) => ({ total: 0, recoverable: 0, nonRecoverable: 0, verifiedRecoverable: 0, ...o });

const ASHA = {
  key: "E1", departmentKey: "dept-eng", name: "Asha Rao", employeeCount: 1,
  advances: advances({ count: 2, requested: 10000, approved: 10000, paidOut: 9000, carriedIn: 1000, used: 6000, salaryDeducted: 1500, carriedOut: 500, outstanding: 2000 }),
  expenses: expenses({ reportCount: 3, claimed: 8000, inApproval: 1000, approved: 7000, coveredByAdvance: 6000, paid: 800, due: 200 }),
  tax: tax({ total: 400, recoverable: 150, nonRecoverable: 250, verifiedRecoverable: 100 }),
};
const RAVI = {
  key: "E2", departmentKey: "dept-fin", name: "Ravi Kumar", employeeCount: 1,
  advances: advances(), expenses: expenses({ reportCount: 1, claimed: 500, approved: 500, paid: 500 }), tax: tax({ total: 25, nonRecoverable: 25 }),
};
const budget = (b, available, reserved) => ({ costCenterCount: 1, budget: b, available, reserved, effectiveAvailable: available - reserved, used: b - (available - reserved) });
const REPORT = {
  baseCurrencyCode: "INR", fiscalYear: "2026-2027", from: null, to: null,
  total: { key: "total", employeeCount: 2, advances: ASHA.advances, expenses: expenses({ reportCount: 4, claimed: 8500, inApproval: 1000, approved: 7500, coveredByAdvance: 6000, paid: 1300, due: 200 }), tax: tax({ total: 425, recoverable: 150, nonRecoverable: 275, verifiedRecoverable: 100 }), budget: budget(300000, 250000, 5000) },
  departments: [
    { key: "dept-eng", employeeCount: 1, advances: ASHA.advances, expenses: ASHA.expenses, tax: ASHA.tax, budget: budget(100000, 60000, 1000) },
    { key: "dept-fin", employeeCount: 1, advances: RAVI.advances, expenses: RAVI.expenses, tax: RAVI.tax, budget: budget(200000, 190000, 4000) },
  ],
  employees: [ASHA, RAVI],
  costCenters: [
    { key: "cc-1", departmentKey: "dept-eng", name: "Platform", employeeCount: 0, advances: ASHA.advances, expenses: ASHA.expenses, tax: ASHA.tax, budget: budget(100000, 60000, 1000) },
    { key: "cc-2", departmentKey: "dept-fin", name: "Audit", employeeCount: 0, advances: RAVI.advances, expenses: RAVI.expenses, tax: RAVI.tax, budget: null },
  ],
  timeline: [
    { period: "2026-11-16", label: "16 Nov", granularity: "WEEK", advancesPaidOut: 9000, expensesClaimed: 3000, tax: 150, recoverableTax: 150 },
    { period: "2026-11-23", label: "23 Nov", granularity: "WEEK", advancesPaidOut: 0, expensesClaimed: 5500, tax: 275, recoverableTax: 0 },
  ],
  taxReview: { linesAwaitingReview: 2, scannedLines: 5, mismatchedLines: 1 },
};

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
}

const renderView = (report = REPORT) => {
  employeeMoneyReportApi.get.mockClear();
  employeeMoneyReportApi.get.mockResolvedValue({ data: { data: report } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={["/dash"]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/dash" element={<EmployeeMoneyView />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
};
const kpi = (label) => document.querySelector(`[data-money-kpi="${label}"]`).textContent;

describe("periodRange", () => {
  const today = new Date(2026, 10, 24); // Tue 24 Nov 2026
  it("maps each chip to from/to dates ending today", () => {
    expect(periodRange("WEEK", today)).toEqual({ from: "2026-11-23", to: "2026-11-24" });
    expect(periodRange("MONTH", today)).toEqual({ from: "2026-11-01", to: "2026-11-24" });
    expect(periodRange("30", today)).toEqual({ from: "2026-10-26", to: "2026-11-24" });
    expect(periodRange("90", today)).toEqual({ from: "2026-08-27", to: "2026-11-24" });
    expect(periodRange("ALL", today)).toEqual({ from: "", to: "" });
  });
});

describe("Finance money view", () => {
  it("shows four headline figures, both charts, and the department table by default", async () => {
    renderView();
    await waitFor(() => expect(document.querySelector("[data-money-kpi]")).not.toBeNull());
    expect(document.querySelectorAll("[data-money-kpis] [data-money-kpi]")).toHaveLength(4);
    expect(kpi("Advances paid out")).toMatch(/INR 9,000\.00/);
    expect(kpi("Advances paid out")).toMatch(/2,000 still with employees/);
    expect(kpi("Expenses claimed")).toMatch(/INR 8,500\.00/);
    expect(kpi("Paid to employees")).toMatch(/INR 1,300\.00/);
    expect(kpi("Budget left")).toMatch(/INR 2,45,000\.00/);
    expect(document.querySelector("[data-money-flow-chart]").textContent).toMatch(/per week/);
    expect(document.querySelector("[data-money-cost-center-chart]")).not.toBeNull();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Engineering")).toBeInTheDocument();
  });

  it("a period chip refetches the report for that range", async () => {
    renderView();
    await waitFor(() => expect(employeeMoneyReportApi.get).toHaveBeenCalled());
    expect(employeeMoneyReportApi.get.mock.calls[0][0].from).not.toBe("");
    fireEvent.click(document.querySelector('[data-money-period="ALL"]'));
    await waitFor(() => expect(employeeMoneyReportApi.get).toHaveBeenLastCalledWith({ from: "", to: "" }));
  });

  it("the cost centers tab lists each cost center with its budget", async () => {
    renderView();
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: "Cost centers" }));
    const table = screen.getByRole("table");
    expect(within(table).getByText("Platform")).toBeInTheDocument();
    expect(within(table).getByText("59,000")).toBeInTheDocument();
    expect(within(table).getByText("No budget")).toBeInTheDocument();
  });

  it("clicking a department focuses it: its own figures and budget, and only its employees", async () => {
    renderView();
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    fireEvent.click(within(screen.getByRole("table")).getByText("Finance"));
    await waitFor(() => expect(kpi("Expenses claimed")).toMatch(/INR 500\.00/));
    expect(kpi("Department budget left")).toMatch(/INR 1,86,000\.00/);
    expect(screen.queryByText("Asha Rao")).toBeNull();
    expect(within(screen.getByRole("table")).getByText("Ravi Kumar")).toBeInTheDocument();
  });

  it("tax & ITC: paid, claimable and lost, with the checks Finance must do", async () => {
    renderView();
    await waitFor(() => expect(document.querySelector("[data-money-tax]")).not.toBeNull());
    expect(kpi("Tax paid")).toMatch(/INR 425\.00/);
    expect(kpi("Tax paid")).toMatch(/5% of 8,500 claimed/);
    expect(kpi("ITC you can claim")).toMatch(/INR 150\.00/);
    expect(kpi("ITC you can claim")).toMatch(/100 verified, 50 awaiting Finance/);
    expect(kpi("Tax lost")).toMatch(/INR 275\.00/);
    expect(document.querySelector("[data-tax-scan]").textContent).toMatch(/1 of 5 scanned receipts has a different tax/);
    expect(document.querySelector("[data-tax-chart]").textContent).toMatch(/Tax per week/);
    fireEvent.click(screen.getByRole("button", { name: /Review now/ }));
    expect(await screen.findByTestId("where")).toHaveTextContent("/expense-management/finance?tab=PENDING&tax=review");
  });

  it("hides the tax checks when nothing needs review and no receipt was scanned", async () => {
    renderView({ ...REPORT, taxReview: { linesAwaitingReview: 0, scannedLines: 0, mismatchedLines: 0 } });
    await waitFor(() => expect(document.querySelector("[data-money-tax]")).not.toBeNull());
    expect(document.querySelector("[data-tax-review]")).toBeNull();
    expect(document.querySelector("[data-tax-scan]")).toBeNull();
  });

  it("clicking an employee shows their whole flow, and both flows add up", async () => {
    renderView();
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: "Employees" }));
    fireEvent.click(within(screen.getByRole("table")).getByText("Asha Rao"));
    const detail = await waitFor(() => document.querySelector('[data-employee-detail="E1"]'));
    expect(detail.textContent).toMatch(/Held 10,000 = used 6,000 \+ salary 1,500 \+ refunded 0 \+ carried forward 500 \+ outstanding 2,000/);
    expect(detail.textContent).toMatch(/Approved 7,000 = covered by advance 6,000 \+ no payment due 0 \+ paid 800 \+ due 200/);
    expect(kpi("Department budget left")).toMatch(/INR 59,000\.00/);
  });

  it("several departments: combined figures and budget, and a chip for each that can be removed", async () => {
    renderView();
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Departments: All departments/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Engineering/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Finance/ }));
    expect(screen.getByRole("button", { name: /Departments: 2 departments/ })).toBeInTheDocument();
    expect(kpi("Expenses claimed")).toMatch(/INR 8,500\.00/);
    expect(kpi("Budget left · 2 departments")).toMatch(/INR 2,45,000\.00/);
    const chips = document.querySelector("[data-money-selection]");
    expect(chips.textContent).toMatch(/Showing 2 employees in 2 departments/);
    fireEvent.click(within(chips).getByRole("button", { name: "Remove Engineering" }));
    expect(kpi("Expenses claimed")).toMatch(/INR 500\.00/);
    expect(kpi("Department budget left")).toMatch(/INR 1,86,000\.00/);
  });

  it("several employees: summed figures and a side-by-side table, no single-person flow", async () => {
    renderView();
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Employees: All employees/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Asha Rao/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Ravi Kumar/ }));
    expect(kpi("Expenses claimed")).toMatch(/INR 8,500\.00/);
    expect(kpi("Paid to employees")).toMatch(/INR 1,300\.00/);
    expect(document.querySelector("[data-employee-detail]")).toBeNull();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Asha Rao")).toBeInTheDocument();
    expect(within(table).getByText("Ravi Kumar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(document.querySelector("[data-money-selection]")).toBeNull();
  });
});
