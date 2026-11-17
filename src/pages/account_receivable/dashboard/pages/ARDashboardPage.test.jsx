import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";

import ARDashboardPage from "./ARDashboardPage";
import { getDashboardInvoices, getDashboardSummary } from "../services/arDashboardService";

vi.mock("../services/arDashboardService", () => ({
  getDashboardSummary: vi.fn(),
  getDashboardInvoices: vi.fn(),
  getDashboardErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));
vi.mock("../../../../components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));
// Recharts needs real layout; the chart panels are covered by their own rendering, not by jsdom.
vi.mock("../components/InvoicingTrendChart", () => ({ default: () => <section aria-label="invoicing trend" /> }));
vi.mock("../components/BillingModelChart", () => ({ default: () => <section aria-label="billing model mix" /> }));

const usd = (amount) => ({ currencyCode: "USD", amount });
const metric = (count, amounts = []) => ({ count, amounts });

// Shape mirrors GET /api/v1/dashboard/summary (LocalDate fields arrive as [y, m, d] arrays).
const SUMMARY = {
  asOf: [2026, 10, 27],
  period: "MTD",
  periodStart: [2026, 10, 1],
  periodEnd: [2026, 10, 27],
  kpis: {
    outstanding: metric(2, [usd(2308.5), { currencyCode: "INR", amount: 1000 }]),
    overdue: metric(1, [usd(2308.5)]),
    criticalOverdue: metric(1, [usd(2308.5)]),
    criticalOverdueDays: 60,
    unbilledWip: metric(2, [usd(3480)]),
    unbilledProjectCount: 1,
    pendingApproval: metric(1, [usd(1449.9)]),
    invoicedInPeriod: metric(2, [usd(3758.4)]),
    invoicedPriorPeriod: metric(1, [usd(1879.2)]),
    collections: { tracked: false, reason: "No payment or receipt data is recorded in AR yet." },
  },
  pipeline: [
    { id: "setup", count: 2, amounts: [], oldestWaitingDays: null, breakdown: { active: 2, draft: 0 } },
    { id: "setupApproval", count: 0, amounts: [], oldestWaitingDays: null, breakdown: {} },
    { id: "acquisition", count: 0, amounts: [], oldestWaitingDays: null, breakdown: {} },
    { id: "tax", count: 2, amounts: [usd(3480)], oldestWaitingDays: 26, breakdown: { snapshotsReadyForTax: 2 } },
    {
      id: "generation",
      count: 0,
      amounts: [],
      oldestWaitingDays: null,
      breakdown: { snapshotsReadyForInvoice: 0, schedulesReadyForInvoice: 0, generatedInvoices: 0 },
    },
    { id: "invoiceApproval", count: 1, amounts: [usd(1449.9)], oldestWaitingDays: 2, breakdown: {} },
  ],
  trend: [{ month: "2026-10", invoiceCount: 2, invoiced: [usd(3758.4)], collected: null }],
  aging: [
    { key: "current", label: "0–30 days", minDays: 0, maxDays: 30, count: 0, amounts: [] },
    { key: "d60", label: "31–60 days", minDays: 31, maxDays: 60, count: 0, amounts: [] },
    { key: "d90", label: "61–90 days", minDays: 61, maxDays: 90, count: 0, amounts: [] },
    { key: "d120", label: "91–120 days", minDays: 91, maxDays: 120, count: 1, amounts: [usd(2308.5)] },
    { key: "d120plus", label: "Over 120 days", minDays: 121, maxDays: null, count: 0, amounts: [] },
  ],
  agingUnknownDateCount: 0,
  billingModelMix: [{ billingType: "Timesheet Based", count: 2, amounts: [usd(3758.4)] }],
  worklist: [
    { id: "overdue-critical", count: 1, amounts: [usd(2308.5)], clientNames: ["Demo Client Alpha"], oldestDays: 65 },
    { id: "setup-approvals", count: 0, amounts: [], clientNames: [], oldestDays: null },
    { id: "tax-ready", count: 2, amounts: [usd(3480)], clientNames: [], oldestDays: 26 },
    { id: "draft-queue", count: 0, amounts: [], clientNames: [], oldestDays: null },
    { id: "awaiting-send", count: 0, amounts: [], clientNames: [], oldestDays: null },
    { id: "delivery-failed", count: 0, amounts: [], clientNames: [], oldestDays: null },
  ],
  recentActivity: [
    { type: "INVOICE_APPROVAL", title: "Invoice approved", reference: "INV-20261027153547", actor: "SYSTEM", occurredAt: [2026, 10, 27, 15, 36] },
  ],
  notes: [],
};

const ROWS = [
  {
    invoiceId: "a91f28c9",
    invoiceNumber: "INV-20261027153547",
    clientName: "Demo Client Alpha",
    projectName: "Alpha Portal Rebuild",
    billingType: "Timesheet Based",
    invoiceDate: [2026, 10, 27],
    dueDate: [2026, 11, 26],
    currencyCode: "USD",
    grandTotal: 2308.5,
    sent: true,
    outstandingBalance: 2308.5,
    daysOutstanding: 95,
    daysOverdue: 65,
    displayStatus: "OVERDUE",
  },
  {
    invoiceId: "6fe78158",
    invoiceNumber: "INV-20261027153548",
    clientName: "Demo Client Beta",
    projectName: "Beta ERP Migration",
    billingType: "Timesheet Based",
    invoiceDate: [2026, 10, 27],
    dueDate: [2026, 11, 20],
    currencyCode: "USD",
    grandTotal: 1449.9,
    sent: false,
    outstandingBalance: null,
    daysOutstanding: null,
    daysOverdue: null,
    displayStatus: "PENDING_APPROVAL",
  },
];

let location;
function LocationProbe() {
  location = useLocation();
  return null;
}

const renderPage = async (url = "/account-receivable/dashboard", { settle = true } = {}) => {
  render(
    <MemoryRouter initialEntries={[url]}>
      <ARDashboardPage />
      <LocationProbe />
    </MemoryRouter>
  );
  // Let both requests (summary + ledger) settle so state updates land inside act().
  if (settle) {
    await screen.findByLabelText("Key receivable metrics");
    await waitFor(() => expect(screen.queryByText(/loading invoices/i)).not.toBeInTheDocument());
  }
};

const kpis = () => screen.getByLabelText("Key receivable metrics");
const ledgerTable = () => screen.getByRole("table", { name: /invoices sorted by/i });
const waitForLedger = () => waitFor(() => expect(within(ledgerTable()).getByText("INV-20261027153547")).toBeInTheDocument());
const ledgerRows = () => within(screen.getByRole("table", { name: /invoices sorted by/i })).getAllByRole("row").slice(1);

describe("ARDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDashboardSummary.mockResolvedValue(SUMMARY);
    getDashboardInvoices.mockResolvedValue(ROWS);
  });

  it("shows API KPIs per currency and explains that collections are not tracked", async () => {
    await renderPage();
    const grid = await screen.findByLabelText("Key receivable metrics");

    // Largest currency is the headline value; others are listed under it.
    expect(within(grid).getAllByText("$2,308.50").length).toBeGreaterThan(0);
    expect(within(grid).getByText("+ ₹1,000.00")).toBeInTheDocument();
    expect(within(grid).getByText("$3,758.40")).toBeInTheDocument();
    expect(within(grid).getByText("+100% vs prior month")).toBeInTheDocument();
    expect(within(grid).getByText("$1,449.90")).toBeInTheDocument();
    expect(
      screen.getAllByRole("note").some((n) => /collected cash, dso and collection rate/i.test(n.textContent))
    ).toBe(true);
    expect(screen.queryByText(/sample data/i)).not.toBeInTheDocument();
    expect(getDashboardSummary).toHaveBeenCalledWith(expect.objectContaining({ period: "MTD" }));
  });

  it("maps pipeline stages to their workspaces with breakdowns and wait times", async () => {
    await renderPage();
    const setup = await screen.findByRole("link", { name: /stage 1: billing setups/i });
    expect(setup).toHaveAttribute("href", "/account-receivable/project-billing-setup/overview");
    expect(within(setup).getByText("2 active · 0 draft")).toBeInTheDocument();

    const tax = screen.getByRole("link", { name: /stage 4: tax calculation/i });
    expect(within(tax).getByText("Oldest 26 days")).toBeInTheDocument();
    expect(within(tax).getByText("$3.5K")).toBeInTheDocument();
  });

  it("lists only queues with work, linking overdue items to the overdue ledger view", async () => {
    await renderPage();
    const overdue = await screen.findByRole("link", { name: /1 invoice over 60 days past due/i });
    expect(overdue).toHaveAttribute("href", "/account-receivable/dashboard?view=OVERDUE");
    expect(within(overdue).getByText("Demo Client Alpha")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /2 items ready for tax calculation/i })).toHaveAttribute(
      "href",
      "/account-receivable/tax-calculation"
    );
    expect(screen.queryByRole("link", { name: /billing setups? awaiting checker approval/i })).not.toBeInTheDocument();
  });

  it("shows an all-clear worklist when no queue needs action", async () => {
    getDashboardSummary.mockResolvedValue({
      ...SUMMARY,
      worklist: SUMMARY.worklist.map((w) => ({ ...w, count: 0 })),
    });
    await renderPage();
    expect(await screen.findByText("All clear")).toBeInTheDocument();
  });

  it("reloads the summary when the period changes and keeps it in the URL", async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findByLabelText("Key receivable metrics");

    await user.click(screen.getByRole("button", { name: "QTD" }));
    await waitFor(() =>
      expect(getDashboardSummary).toHaveBeenLastCalledWith(expect.objectContaining({ period: "QTD" }))
    );
    expect(location.search).toContain("period=QTD");
    expect(within(kpis()).getByText("Invoiced (QTD)")).toBeInTheDocument();
  });

  it("renders ledger rows from the API with their display status", async () => {
    await renderPage();
    await waitForLedger();
    const rows = ledgerRows();
    expect(rows).toHaveLength(2);
    // Default sort is due date ascending: the 20 Nov invoice comes before the 26 Nov one.
    const [pending, overdue] = rows;
    expect(within(pending).getByText("INV-20261027153548")).toBeInTheDocument();
    expect(within(pending).getByText("Pending Approval")).toBeInTheDocument();
    expect(within(pending).getByText("Not sent")).toBeInTheDocument();
    expect(within(overdue).getByText("Overdue")).toBeInTheDocument();
    expect(within(overdue).getByText("65 days overdue")).toBeInTheDocument();
  });

  it("asks the API for the chosen view and search term", async () => {
    const user = userEvent.setup();
    await renderPage();
    await waitForLedger();

    await user.click(screen.getByRole("button", { name: "Overdue" }));
    await waitFor(() =>
      expect(getDashboardInvoices).toHaveBeenLastCalledWith(expect.objectContaining({ view: "OVERDUE" }))
    );
    expect(location.search).toContain("view=OVERDUE");

    await user.type(screen.getByRole("searchbox", { name: /search invoices/i }), "alpha");
    await waitFor(() =>
      expect(getDashboardInvoices).toHaveBeenLastCalledWith(expect.objectContaining({ view: "OVERDUE", q: "alpha" }))
    );
  });

  it("sorts ledger rows and reports the sort state", async () => {
    const user = userEvent.setup();
    await renderPage();
    await waitForLedger();

    const totalHeader = screen.getByRole("columnheader", { name: /gross total/i });
    await user.click(within(totalHeader).getByRole("button"));
    expect(totalHeader).toHaveAttribute("aria-sort", "ascending");
    expect(within(ledgerRows()[0]).getByText("INV-20261027153548")).toBeInTheDocument();
  });

  it("shows an error with retry when the summary fails to load", async () => {
    const user = userEvent.setup();
    getDashboardSummary.mockRejectedValueOnce({ response: { data: { message: "AR service unavailable" } } });
    await renderPage(undefined, { settle: false });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("AR service unavailable");
    await waitFor(() => expect(screen.queryByText(/loading invoices/i)).not.toBeInTheDocument());
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByLabelText("Key receivable metrics")).toBeInTheDocument();
    await waitForLedger();
  });

  it("shows a ledger error with its own retry", async () => {
    const user = userEvent.setup();
    getDashboardInvoices.mockRejectedValueOnce(new Error("down"));
    await renderPage(undefined, { settle: false });

    await screen.findByLabelText("Key receivable metrics");
    const alert = await screen.findByText("Couldn’t load invoices.");
    await user.click(within(alert.closest("[role=alert]")).getByRole("button", { name: "Retry" }));
    await waitForLedger();
    await waitFor(() => expect(screen.queryByText(/loading invoices/i)).not.toBeInTheDocument());
  });

  it("shows recent activity from the API", async () => {
    await renderPage();
    const activity = await screen.findByRole("region", { name: "Recent Activity" });
    expect(within(activity).getByText("Invoice approved")).toBeInTheDocument();
    expect(within(activity).getByText("INV-20261027153547")).toBeInTheDocument();
  });
});
