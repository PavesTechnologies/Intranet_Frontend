import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import APDashboardPage from "./APDashboardPage";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { useDashboardViews, useRoleDashboard } from "../hooks/useRoleDashboards";
import { useAuth } from "../../../../contexts/AuthContext";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock("../hooks/useDashboardSummary", () => ({ useDashboardSummary: vi.fn() }));
vi.mock("../hooks/useRoleDashboards", () => ({ useDashboardViews: vi.fn(), useRoleDashboard: vi.fn() }));
vi.mock("../../../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
// Overview + Expense widgets render as light stubs; their own tests cover them.
vi.mock("../components/DashboardWidgets", () => ({
  ChartCard: ({ title, children }) => (<section><h3>{title}</h3>{children}</section>),
  KpiGrid: ({ kpis }) => <div>KPIs: {kpis.length}</div>,
  ActionRequiredList: () => null,
  StatusSummaryChart: () => null,
  FinancialSummaryCards: () => null,
  DashboardTrendChart: () => null,
  RecentActivityCard: () => null,
}));

const INR = (amount, count = 1) => [{ currency_code: "INR", symbol: "₹", amount, count }];
const kpi = (key, label, value, extra = {}) => ({ key, label, value, format: "count", tone: "gray", link: null, ...extra });

const DATA = {
  finance: {
    as_of: "2026-10-09", base_currency: "INR",
    kpis: [kpi("ready_to_pay", "Ready to pay", 129600, { format: "money", currency_code: "INR", subtitle: "2 invoices · 1 overdue", link: "/accounts-payable/payments/ready" })],
    paid_trend: [], action_cards: [{ key: "approved_not_ready", count: 0, amounts: [] }, { key: "term_exceptions", count: 0, amounts: [] }, { key: "msme_due", count: 0, amounts: [] }],
    ageing: { buckets: [] }, upcoming: { buckets: [], note: "Expected payments based on recorded invoices - not a guaranteed cash-flow forecast." },
    recent_payments: [], receipts_missing: { count: 0, days: 90 }, term_exceptions: [], term_exception_count: 0, agreements_expiring: [], tds: null,
  },
  approvals: {
    as_of: "2026-10-09", base_currency: "INR",
    kpis: [kpi("awaiting", "Awaiting my approval", 2, { link: "/accounts-payable/invoices?queue=approval" }), kpi("oldest", "Oldest waiting", 5.2, { format: "days", tone: "rose" })],
    queue: [{ invoice_id: 1, invoice_number: "TST-VIT-2627-0131", vendor_name: "Vertex", department: "IT", level: 1, waiting_days: 5.2,
              amount: 218300, currency_code: "INR", due_date: "2026-11-22", high_value: true }],
    queue_count: 2, waiting_aging: [{ key: "lt1", label: "Under 1 day", count: 0 }], decisions_trend: [], pending_by_department: [],
  },
  my_work: {
    as_of: "2026-10-09",
    kpis: [kpi("to_review", "To review", 4), kpi("returned", "Returned to AP", 1, { tone: "rose" })],
    intake_trend: [], pipeline: [{ key: "review", label: "In OCR review", count: 4 }],
    oldest: [{ invoice_id: 9, invoice_number: "TST-OMS-1611", vendor_name: "Officemart", status_code: "RETURNED_FOR_REVIEW", age_days: 4, mine: true }],
    term_issues: [], term_issue_count: 0,
  },
  management: {
    as_of: "2026-10-09", base_currency: "INR",
    kpis: [kpi("liability", "Total AP liability", 2310865, { format: "money", currency_code: "INR" }), kpi("on_time", "Paid on time", 72.2, { format: "percent" })],
    outflow: [{ key: "d30", label: "Next 30 days", approved: 100, pipeline: 50, count: 2 }], spend_trend: [], by_department: [],
    vendor_exposure: [{ key: "1", label: "Vertex", amount: 1285610, count: 3 }], top5_share: 64.3,
    efficiency: { median_days_to_approve: 3.5, median_days_approval_to_payment: 12, median_days_end_to_end: 18, sample: 9, pending_approvals: 4,
                  bottlenecks: [{ department: "IT", level: 2, count: 3, amount: 900, avg_wait_days: 4, max_wait_days: 7.5 }] },
    compliance: [{ key: "term_exceptions", label: "Payment-term exceptions", count: 4, amount: 221360 }],
    high_value_exceptions: [], high_value_threshold: 100000, note: "Read-only management view.",
  },
};

const renderPage = () => render(<APDashboardPage />, { wrapper: MemoryRouter });

function setViews(keys) {
  const labels = { management: "Management", finance: "Finance", approvals: "Approvals", my_work: "My work" };
  useDashboardViews.mockReturnValue({ data: keys.map((key) => ({ key, label: labels[key] })), isLoading: false, refetch: vi.fn() });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  useAuth.mockReturnValue({ user: { name: "Jagadish Reddy Pannala" } });
  useRoleDashboard.mockImplementation((view) => ({ data: DATA[view], isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }));
  useDashboardSummary.mockReturnValue({ data: { kpis: [{ key: "x" }] }, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() });
});

describe("APDashboardPage — one view per role", () => {
  it("shows only the views the backend grants, first one open", () => {
    setViews(["finance", "approvals"]);
    renderPage();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Finance", "Approvals"]);
    expect(screen.getByText("Hi Jagadish, here's your payables overview")).toBeInTheDocument();
    expect(useRoleDashboard).toHaveBeenCalledWith("finance");
    expect(useRoleDashboard).not.toHaveBeenCalledWith("approvals");
  });

  it("a single view needs no switcher", () => {
    setViews(["my_work"]);
    renderPage();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("Hi Jagadish, here's your invoice work")).toBeInTheDocument();
  });

  it("falls back to the generic overview for users with no role view", () => {
    setViews([]);
    renderPage();
    expect(screen.getByText("AP Overview")).toBeInTheDocument();
    expect(useRoleDashboard).not.toHaveBeenCalled();
  });

  it("skips a view the backend refuses (403) and opens the next allowed one", async () => {
    // e.g. a stale remembered/cached "finance" for a user who is an AP Executive
    window.localStorage.setItem("ap.dashboard.view", "finance");
    useDashboardViews.mockReturnValue({
      data: [{ key: "finance", label: "Finance" }, { key: "my_work", label: "My work" }],
      isLoading: false,
      refetch: vi.fn(),
    });
    useRoleDashboard.mockImplementation((view) =>
      view === "finance"
        ? { data: undefined, isLoading: false, isFetching: false, isError: true, error: { status: 403 }, refetch: vi.fn() }
        : { data: DATA[view], isLoading: false, isFetching: false, isError: false, refetch: vi.fn() },
    );
    renderPage();
    expect(await screen.findByText("Hi Jagadish, here's your invoice work")).toBeInTheDocument();
    expect(screen.queryByText("Unable to load this dashboard.")).not.toBeInTheDocument();
  });

  it("remembers the chosen view", async () => {
    const user = userEvent.setup();
    setViews(["finance", "approvals"]);
    renderPage();
    await user.click(screen.getByRole("tab", { name: "Approvals" }));
    expect(window.localStorage.getItem("ap.dashboard.view")).toBe("approvals");
    expect(screen.getByText("Hi Jagadish, here's your approval queue")).toBeInTheDocument();
  });
});

describe("role view content", () => {
  it("Approvals: my queue with wait time, high-value flag and a review action", () => {
    setViews(["approvals"]);
    renderPage();
    const queue = screen.getByText("My approval queue").closest("section");
    expect(within(queue).getByText("TST-VIT-2627-0131")).toBeInTheDocument();
    expect(within(queue).getByText("High value")).toBeInTheDocument();
    expect(within(queue).getByText("5 d")).toBeInTheDocument();
    expect(within(queue).getByRole("link", { name: "Review" })).toBeInTheDocument();
    expect(screen.getByText("5.2 d")).toBeInTheDocument(); // oldest waiting tile
  });

  it("My work: next step per invoice and no finance figures", () => {
    setViews(["my_work"]);
    renderPage();
    expect(screen.getByText("Correct & resubmit")).toBeInTheDocument();
    expect(screen.getByText("uploaded by me")).toBeInTheDocument();
    expect(screen.queryByText(/Ready to pay/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Upload invoice/ })).toBeInTheDocument();
  });

  it("Management: read-only position, concentration, efficiency and compliance", () => {
    setViews(["management"]);
    renderPage();
    expect(screen.getByText("Hi Jagadish, here's where AP stands")).toBeInTheDocument();
    expect(screen.getByText("₹23,10,865")).toBeInTheDocument();
    expect(screen.getByText("72.2%")).toBeInTheDocument();
    expect(screen.getByText("Top 5 vendors hold 64.3% of what we owe")).toBeInTheDocument();
    expect(screen.getByText("18 d")).toBeInTheDocument();
    expect(screen.getByText("oldest 7.5 d")).toBeInTheDocument();
    const compliance = screen.getByText("Compliance exceptions").closest("section");
    expect(within(compliance).getByText("Payment-term exceptions")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Record payment|Approve/i })).not.toBeInTheDocument();
  });

  it("shows an error state with retry", () => {
    setViews(["finance"]);
    useRoleDashboard.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { status: 500 }, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText("Unable to load this dashboard.")).toBeInTheDocument();
  });
});
