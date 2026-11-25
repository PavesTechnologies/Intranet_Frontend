import React from "react";
import { render, waitFor } from "@testing-library/react";
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
vi.mock("@/pages/expense-management/api/supplementaryClaimApi", async (orig) => ({
  ...(await orig()),
  financeClaimService: { queue: vi.fn(() => Promise.resolve({ data: { data: [
    { status: "PENDING_FINANCE", currencyCode: "INR", totalAmount: 1200 },
    { status: "APPROVED", currencyCode: "INR", totalAmount: 999 },
  ] } })) },
}));
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
  it("the banner says what is waiting in one line, with no side panel of figures", () => {
    renderIt();
    expect(document.querySelector("[data-finance-headline]").textContent).toMatch(/4 reports worth ₹40,000 waiting for verification/);
    expect(document.querySelector("[data-desk-health]")).toBeNull();
    expect(document.querySelector("[data-desk-results]")).toBeNull();
  });

  it("supplementary claims waiting for Finance show as an insight, not a separate card", async () => {
    renderIt();
    await waitFor(() => expect(document.body.textContent).toMatch(/1 supplementary claim waiting for Finance/));
  });

  it("ranks insights with overdue reports first", () => {
    renderIt();
    const insights = [...document.querySelectorAll("[data-insight]")];
    expect(insights[0].dataset.insight).toBe("critical");
    expect(insights[0].textContent).toMatch(/1 report waiting over 7 days/);
    expect(insights.length).toBeLessThanOrEqual(4);
  });

  it("has no KPI card row or work area: those live on the Finance and Approvals pages", () => {
    renderIt();
    expect(document.querySelector("[data-kpi]")).toBeNull();
    expect(document.querySelector("[data-finance-queue]")).toBeNull();
    expect(document.querySelector("[role=tablist]")).toBeNull();
  });

  it("with nothing to verify, the banner says the queue is clear", () => {
    const empty = { ...data, kpis: data.kpis.map((k) => (["toVerify", "queueValue"].includes(k.key) ? { ...k, value: 0 } : k)), attention: [], aging: [] };
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <FinanceDashboard data={empty} config={config} currency="INR" />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(document.querySelector("[data-finance-headline]").textContent).toMatch(/The verification queue is clear/);
  });

  it("never prints NaN or undefined", () => {
    renderIt();
    expect(document.body.textContent).not.toMatch(/undefined|NaN/);
  });

  it("flags a month with GST but no recoverable ITC as tax lost", () => {
    const noItc = { ...data, tax: { ...data.tax, taxThisMonth: 871, recoverableThisMonth: 0, nonRecoverableThisMonth: 871 } };
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <FinanceDashboard data={noItc} config={config} currency="INR" />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(document.body.textContent).toMatch(/No GST recoverable this month: ₹871 lost/);
  });
});
