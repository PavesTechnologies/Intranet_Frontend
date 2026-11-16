import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

import RecentActivity from "@/pages/expense-management/components/dashboard/RecentActivity";

const ADV_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const REP_ID = "bbbbbbbb-0000-0000-0000-000000000002";

// Two advances and two reports, mixed in time so the chronological order is visible.
const advances = [
  { advanceId: ADV_ID, status: "DISBURSED", purpose: "Client visit", baseAmount: 5000, amount: 5000, currencyCode: "INR", updatedAt: "2026-11-09T10:00:00", managerId: "MGR-SECRET-1" },
  { advanceId: "aaaaaaaa-0000-0000-0000-000000000009", status: "SETTLED", purpose: "Old trip", baseAmount: 2000, amount: 2000, updatedAt: "2026-10-01T10:00:00" },
];
const reports = [
  { reportId: REP_ID, reportNumber: "ER-0007", title: "Pune trip", reportStatus: "AWAITING_CORRECTION", totalAmount: 1900, updatedAt: "2026-11-11T09:30:00", approverId: "APR-9" },
  { reportId: "cccccccc-0000-0000-0000-000000000003", reportNumber: "ER-0003", title: "Hotel", reportStatus: "APPROVED", paymentRoutingStatus: "PAYMENT_COMPLETED", totalAmount: 800, updatedAt: "2026-11-05T09:00:00" },
];

const renderIt = (props = {}) =>
  render(
    <MemoryRouter>
      <RecentActivity advances={advances} reports={reports} currency="INR" {...props} />
    </MemoryRouter>,
  );

const rowIds = (container) => [...container.querySelectorAll("[data-activity-row]")].map((el) => el.getAttribute("data-activity-row"));

describe("recent activity", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("shows cash advances and expense reports in one list, newest first", () => {
    const { container } = renderIt();
    expect(rowIds(container)).toEqual([
      "report-bbbbbbbb-0000-0000-0000-000000000002",
      `advance-${ADV_ID}`,
      "report-cccccccc-0000-0000-0000-000000000003",
      "advance-aaaaaaaa-0000-0000-0000-000000000009",
    ]);
  });

  it("shows date, reference, description, amount and status for each row", () => {
    const { container } = renderIt();
    const row = container.querySelector(`[data-activity-row="report-${REP_ID}"]`);
    expect(row.textContent).toMatch(/ER-0007/);
    expect(row.textContent).toMatch(/Pune trip/);
    expect(row.textContent).toMatch(/1,900/);
    expect(row.textContent).toMatch(/Returned/);
    expect(row.textContent).toMatch(/11 Nov 2026/);
  });

  it("filters to cash advances, then to expense reports, then back to all", () => {
    const { container } = renderIt();
    fireEvent.click(screen.getByRole("button", { name: "Cash advance" }));
    expect(rowIds(container).every((id) => id.startsWith("advance-"))).toBe(true);
    expect(rowIds(container)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Cash advance" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Expense reports" }));
    expect(rowIds(container).every((id) => id.startsWith("report-"))).toBe(true);
    expect(rowIds(container)).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(rowIds(container)).toHaveLength(4);
  });

  it("shows an empty state when the cash advance filter has nothing in it", () => {
    renderIt({ advances: [], reports });
    fireEvent.click(screen.getByRole("button", { name: "Cash advance" }));
    expect(screen.getByTestId("activity-empty").textContent).toMatch(/No cash advance activity yet/);
  });

  it("shows an empty state when the expense report filter has nothing in it", () => {
    renderIt({ advances, reports: [] });
    fireEvent.click(screen.getByRole("button", { name: "Expense reports" }));
    expect(screen.getByTestId("activity-empty").textContent).toMatch(/No expense report activity yet/);
  });

  it("shows a friendly empty state when there is no activity at all", () => {
    renderIt({ advances: [], reports: [] });
    expect(screen.getByTestId("activity-empty").textContent).toMatch(/No activity yet/);
  });

  it("View all opens the list for the current filter", () => {
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: "View all reports" }));
    expect(mockNavigate).toHaveBeenLastCalledWith("/expense-management/expenses/my");

    fireEvent.click(screen.getByRole("button", { name: "Cash advance" }));
    fireEvent.click(screen.getByRole("button", { name: "View all advances" }));
    expect(mockNavigate).toHaveBeenLastCalledWith("/expense-management/cash-advance/my");
  });

  it("clicking a row opens its own record", () => {
    const { container } = renderIt();
    fireEvent.click(container.querySelector(`[data-activity-row="advance-${ADV_ID}"]`));
    expect(mockNavigate).toHaveBeenLastCalledWith(`/expense-management/cash-advance/${ADV_ID}`);
  });

  it("does not show approver, manager or other internal fields", () => {
    const { container } = renderIt();
    expect(container.textContent).not.toMatch(/MGR-SECRET-1|APR-9/);
  });

  it("hides the filter and View all for a list the role cannot open", () => {
    renderIt({ canOpenAdvances: false, advances: undefined, advancesError: false });
    expect(screen.queryByRole("button", { name: "Cash advance" })).toBeNull();
    expect(screen.getByRole("button", { name: "View all reports" })).toBeInTheDocument();
  });

  it("says so when one source fails and keeps the other", () => {
    const { container } = renderIt({ advances: undefined, advancesError: true });
    expect(rowIds(container)).toHaveLength(2);
    expect(screen.getByText(/Cash advances couldn't be loaded/)).toBeInTheDocument();
  });

  it("says so when both sources fail", () => {
    renderIt({ advances: undefined, reports: undefined, advancesError: true, reportsError: true });
    expect(screen.getByText("Recent activity couldn't be loaded.")).toBeInTheDocument();
  });

  it("shows a loading placeholder while the first load is in progress", () => {
    renderIt({ advances: undefined, reports: undefined, advancesLoading: true, reportsLoading: true });
    expect(screen.getByLabelText("Loading recent activity")).toBeInTheDocument();
  });

  it("the activity table has a header row and one row per record", () => {
    renderIt();
    const table = screen.getByTestId("activity-list");
    expect(within(table).getAllByRole("row")).toHaveLength(5); // header + 4 records
    expect(within(table).getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
  });
});
