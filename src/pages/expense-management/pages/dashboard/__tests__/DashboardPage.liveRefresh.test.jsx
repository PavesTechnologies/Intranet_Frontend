import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The dashboard reloads its figures when one of the user's reports changes status, instead of waiting for the cache.

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Ravi Menon", employeeId: "E001" }, hasRole: (roles) => roles.includes("GENERAL") }),
}));
vi.mock("react-router-dom", async () => ({ ...(await vi.importActual("react-router-dom")), useNavigate: () => vi.fn() }));
vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({
  dashboardService: { get: vi.fn() },
  expenseReportService: { getAll: vi.fn() },
}));
vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({ cashAdvanceApi: { getMyAdvances: vi.fn() } }));

const listeners = {};
vi.mock("@/pages/expense-management/approval-engine/websocket/ApprovalWebSocketProvider", () => ({
  useApprovalWebSocket: () => ({
    subscribe: (event, cb) => {
      (listeners[event] ||= []).push(cb);
      return () => { listeners[event] = listeners[event].filter((x) => x !== cb); };
    },
  }),
}));

import { dashboardService, expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import DashboardPage from "../DashboardPage";

const payload = { data: { data: { view: "employee", baseCurrencyCode: "INR", kpis: [], breakdown: [], attention: [], activity: [], pipeline: [] } } };

describe("DashboardPage: live refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(listeners).forEach((k) => delete listeners[k]);
    dashboardService.get.mockResolvedValue(payload);
    expenseReportService.getAll.mockResolvedValue({ data: { data: [] } });
    cashAdvanceApi.getMyAdvances.mockResolvedValue({ data: { data: [] } });
  });

  it("reloads the figures when one of the user's reports changes status", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <DashboardPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(dashboardService.get).toHaveBeenCalledTimes(1));
    expect(listeners["report-update"]?.length).toBeGreaterThan(0);

    act(() => listeners["report-update"].forEach((cb) => cb({ reportId: "r-1", status: "APPROVED" })));

    await waitFor(() => expect(dashboardService.get).toHaveBeenCalledTimes(2));
  });
});
