import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import RecurringSchedulesPage from "./RecurringSchedulesPage";
import { useLinkInvoice, useRecurringOverview, useSkipPeriod } from "../hooks/useRecurring";
import { useApPermissions } from "../../hooks/useApPermissions";
import { validateSchedule } from "../components/ScheduleFormModal";

vi.mock("../hooks/useRecurring", () => ({ useRecurringOverview: vi.fn(), useSkipPeriod: vi.fn(), useLinkInvoice: vi.fn(), useSaveSchedule: vi.fn() }));
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));
vi.mock("../components/ScheduleFormModal", async (orig) => ({ ...(await orig()), default: () => <div>schedule form</div> }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const period = (id, start, state, extra = {}) => ({
  occurrence_id: id, period_start: start, expected_date: start, expected_amount: 318600, state,
  invoice_id: null, invoice_number: null, received_amount: null, variance_pct: null, variance_status: null, skip_reason: null, ...extra,
});

const DATA = {
  as_of: "2026-10-12",
  totals: { MISSING: 1, DUE: 0, VARIANCE: 1, RECEIVED_THIS_PERIOD: 1 },
  upcoming: [{ period: "2026-11-01", label: "Nov 2026", amount: 613600 }],
  schedules: [{
    schedule_id: 1, vendor_id: 17, vendor_name: "WEWORK INDIA MANAGEMENT LIMITED", name: "WeWork desks - Floor 6", frequency: "MONTHLY",
    expected_day: 1, expected_amount: 318600, tolerance_pct: 2, start_date: "2026-04-01", fast_track: true, is_active: true,
    current: period(2, "2026-10-01", "MISSING"),
    occurrences: [
      period(1, "2026-09-01", "RECEIVED", { invoice_id: 40, invoice_number: "WWIM/HYD/26-27/02902", received_amount: 330000, variance_pct: 3.58, variance_status: "OVER" }),
      period(2, "2026-10-01", "MISSING"),
    ],
  }],
};

const skipMutate = vi.fn().mockResolvedValue({});

beforeEach(() => {
  vi.clearAllMocks();
  useRecurringOverview.mockReturnValue({ data: DATA, isLoading: false, isError: false });
  useSkipPeriod.mockReturnValue({ mutateAsync: skipMutate, isPending: false });
  useLinkInvoice.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  useApPermissions.mockReturnValue({ canManageRecurring: true });
});

const renderPage = () => render(<RecurringSchedulesPage />, { wrapper: MemoryRouter });

describe("RecurringSchedulesPage", () => {
  it("summarises missing / different periods and the expected spend", () => {
    renderPage();
    expect(screen.getByText("Not received", { selector: "p" }).nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Different from schedule").nextSibling).toHaveTextContent("1");
    expect(screen.getByText(/Nov 2026/)).toBeInTheDocument();
    expect(screen.getByText("WeWork desks - Floor 6")).toBeInTheDocument();
  });

  it("expands a schedule into its periods with invoice links and variance", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /WeWork desks - Floor 6/ }));
    expect(screen.getByRole("link", { name: /WWIM\/HYD\/26-27\/02902/ })).toHaveAttribute("href", "/accounts-payable/invoices/40");
    expect(screen.getByText(/\+3\.6% · Higher than expected/)).toBeInTheDocument();
  });

  it("skips a missing period with a reason", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /WeWork desks - Floor 6/ }));
    await userEvent.click(screen.getByRole("button", { name: "Skip period" }));
    await userEvent.type(screen.getByLabelText("Reason for skipping"), "Office closed in October");
    await userEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(skipMutate).toHaveBeenCalledWith({ occurrenceId: 2, reason: "Office closed in October" });
  });

  it("hides editing for view-only users", () => {
    useApPermissions.mockReturnValue({ canManageRecurring: false });
    renderPage();
    expect(screen.queryByRole("button", { name: /New schedule/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Edit/ })).toBeNull();
  });

  it("shows an empty state", () => {
    useRecurringOverview.mockReturnValue({ data: { ...DATA, schedules: [], totals: { MISSING: 0, DUE: 0, VARIANCE: 0, RECEIVED_THIS_PERIOD: 0 } }, isLoading: false });
    renderPage();
    expect(screen.getByText("No recurring schedules yet")).toBeInTheDocument();
  });
});

describe("validateSchedule", () => {
  const good = { name: "Rent", expected_day: "1", expected_amount: "1000", tolerance_pct: "5", start_date: "2026-04-01", end_date: "" };
  it("accepts a complete schedule", () => {
    expect(validateSchedule(good, 17)).toEqual({});
  });
  it("flags each problem", () => {
    const errors = validateSchedule({ ...good, name: " ", expected_day: "30", expected_amount: "0", end_date: "2026-01-01" }, null);
    expect(Object.keys(errors).sort()).toEqual(["end_date", "expected_amount", "expected_day", "name", "vendor"]);
  });
});
