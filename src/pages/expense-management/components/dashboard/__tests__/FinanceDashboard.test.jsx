import React from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ hasRole: () => true }) }));
vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: { getMyApprovals: vi.fn(() => Promise.resolve({ data: { data: { totalElements: 0 } } })) },
}));
vi.mock("@/pages/expense-management/approval-engine/api/approvalWorkflowApi", () => ({
  approvalWorkflowApi: { getMyQueue: vi.fn(() => Promise.resolve({ data: { data: { content: [], totalElements: 0 } } })) },
}));
vi.mock("@/pages/expense-management/approval-engine/pages/ApprovalsPage", () => ({ default: () => null }));
vi.mock("@/pages/expense-management/approval-engine/components/EmployeeLabel", () => ({ default: ({ employeeId }) => <span>{employeeId}</span> }));

import FinanceDashboard from "../FinanceDashboard";

const daysAgo = (d) => new Date(Date.now() - d * 86_400_000).toISOString();

const data = {
  kpis: [
    { key: "toVerify", value: 4, format: "count" },
    { key: "queueValue", value: 40000, format: "money" },
    { key: "queries", value: 2, format: "count" },
    { key: "exceptions", value: 6, format: "count" },
    { key: "verified", value: 12, format: "count" },
  ],
  attention: [
    { reportId: "a", reportNumber: "ER-1", employeeId: "E1", amount: 20000, at: daysAgo(10) },
    { reportId: "b", reportNumber: "ER-2", employeeId: "E2", amount: 10000, at: daysAgo(5) },
    { reportId: "c", reportNumber: "ER-3", employeeId: "E3", amount: 6000, at: daysAgo(2) },
    { reportId: "d", reportNumber: "ER-4", employeeId: "E4", amount: 4000, at: daysAgo(0) },
  ],
  aging: [
    { key: "lt1", label: "Under 1 day", count: 1 },
    { key: "1to3", label: "1–3 days", count: 1 },
    { key: "4to7", label: "4–7 days", count: 1 },
    { key: "gt7", label: "Over 7 days", count: 1 },
  ],
  ranking: [
    { key: "Travel", label: "Travel", count: 5, amount: 30000 },
    { key: "Meals", label: "Meals", count: 3, amount: 10000 },
  ],
  trend: [
    { period: "2026-10", label: "Oct", primary: 50000, count: 20, secondary: 2 },
    { period: "2026-11", label: "Nov", primary: 60000, count: 18, secondary: 6 },
  ],
  pipeline: [
    { key: "toVerify", label: "To verify", count: 4 },
    { key: "queried", label: "Queried", count: 2 },
    { key: "withAp", label: "With AP", count: 3 },
    { key: "paid", label: "Paid", count: 9 },
    { key: "invoice", label: "Invoice pending", count: 0 },
  ],
  activity: [{ reportId: "x", reportNumber: "ER-9", status: "Verified", amount: 5000, at: daysAgo(0) }],
  tax: { taxThisMonth: 9000, recoverableThisMonth: 6000, nonRecoverableThisMonth: 3000, linesAwaitingTaxReview: 3, mismatchRatePercent: 4, taxSharePercent: 12, byMonth: [] },
};

const config = {
  steps: [
    { key: "queries", label: "Open queries", help: "", tone: "rose" },
    { key: "exceptions", label: "Policy exceptions", help: "", tone: "orange" },
    { key: "verified", label: "Verified this month", help: "", tone: "emerald" },
  ],
  quickActions: [],
  activityTitle: "Latest verifications",
};

const renderIt = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <FinanceDashboard data={data} config={config} currency="INR" />
      </QueryClientProvider>
    </MemoryRouter>,
  );

describe("Finance dashboard", () => {
  it("shows desk health against the 3-day target", () => {
    renderIt();
    expect(document.querySelector("[data-desk-health]").textContent).toMatch(/2 of 4 within 3 days/);
    expect(document.querySelector("[data-desk-health]").textContent).toMatch(/50%/);
  });

  it("ranks insights with overdue reports first", () => {
    renderIt();
    const insights = [...document.querySelectorAll("[data-insight]")];
    expect(insights[0].dataset.insight).toBe("critical");
    expect(insights[0].textContent).toMatch(/1 report waiting over 7 days/);
    expect(insights.length).toBeLessThanOrEqual(4);
  });

  it("gives each queue row a priority from its wait", () => {
    renderIt();
    const priorities = [...document.querySelectorAll("[data-finance-queue] tbody tr")].map((r) => r.dataset.priority);
    expect(priorities).toEqual(["overdue", "late", "due", "new"]);
  });

  it("shows tax and never prints NaN or undefined", () => {
    renderIt();
    expect(document.querySelector("[data-finance-tax]").textContent).toMatch(/67%/);
    expect(document.body.textContent).not.toMatch(/undefined|NaN/);
  });
});
