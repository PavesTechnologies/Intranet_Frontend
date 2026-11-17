import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import APReportsPage from "./APReportsPage";
import reportService from "../services/reportService";

vi.mock("../services/reportService", () => ({
  default: { listReports: vi.fn(), getSummary: vi.fn(), runReport: vi.fn(), exportReport: vi.fn() },
}));
vi.mock("../../vendor/services/vendorService", () => ({
  default: { getVendors: vi.fn().mockResolvedValue([{ vendor_id: 1, vendor_name: "Vertex" }]) },
}));

const SUMMARY = {
  currency: "INR",
  period: { from_date: "2026-08-01", to_date: "2026-10-09", as_of: "2026-10-09" },
  kpis: [
    { key: "outstanding", group: "now", label: "Still to pay", format: "money", value: 3064211, subtitle: "11 unpaid invoices · after TDS",
      tone: "amber", help: "Everything received from vendors and not yet paid, as of today." },
    { key: "invoiced", label: "Invoiced", format: "money", value: 180605.75, subtitle: "2 invoices in period", tone: "indigo" },
    { key: "on_time", label: "Paid on time", format: "percent", value: 50, subtitle: "1 of 2 payment allocations", tone: "emerald" },
    { key: "days_to_pay", label: "Avg days to pay", format: "days", value: 71, subtitle: "Invoice date to payment", tone: "gray" },
  ],
  monthly: [{ period: "2026-09", label: "Sep 26", invoiced: 177000, paid: 0, invoices: 1, payments: 0 }],
  by_vendor: [{ key: "15", label: "AMAZON WEB SERVICES INDIA PRIVATE LIMITED", amount: 180605.75, count: 2 }],
  by_department: [],
  by_category: [],
  outstanding_by_stage: [],
  notes: ["Invoiced and TDS by invoice date; paid by payment date."],
};

const PAYMENTS = {
  key: "payments_made",
  title: "Payments made",
  period: { type: "range", from_date: "2026-08-01", to_date: "2026-10-09" },
  columns: [
    { key: "paid_on", label: "Paid on", type: "date" },
    { key: "invoice_number", label: "Invoice", type: "text" },
    { key: "timeliness", label: "On time?", type: "text" },
    { key: "amount", label: "Amount", type: "money" },
  ],
  rows: [{ paid_on: "2026-09-01", invoice_number: "TST-VIT-2627-0072", invoice_id: 33, timeliness: "10 days late",
           amount: 480850, currency_code: "INR" }],
  totals: [{ currency_code: "INR", rows: 1, amount: 480850 }],
  notes: ["0 of 1 payment allocations were made on or before the due date."],
};

function renderPage(url = "/accounts-payable/reports") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <APReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  reportService.listReports.mockResolvedValue([
    { key: "outstanding_payables", title: "AP liabilities - outstanding payables", period: "as_of" },
    { key: "payments_made", title: "Payments made", period: "range" },
  ]);
  reportService.getSummary.mockResolvedValue(SUMMARY);
  reportService.runReport.mockResolvedValue(PAYMENTS);
});

describe("APReportsPage", () => {
  it("separates today's position from the period, and explains each tile", async () => {
    renderPage();
    const now = await screen.findByRole("region", { name: "Right now" });
    expect(within(now).getByText("Still to pay")).toBeInTheDocument();
    const period = screen.getByRole("region", { name: "In the selected period" });
    expect(within(period).getByText("Invoiced")).toBeInTheDocument();
    expect(within(period).queryByText("Still to pay")).toBeNull();
    expect(within(period).getByText(/01 Aug 2026 – 09 Oct 2026/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "What does Still to pay mean?" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("not yet paid, as of today");
  });

  it("shows the period summary: KPI tiles in each format and the vendor breakdown", async () => {
    renderPage();
    expect((await screen.findAllByText("₹1,80,606")).length).toBe(2); // KPI tile + vendor breakdown
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("71 d")).toBeInTheDocument();
    expect(screen.getByText("AMAZON WEB SERVICES INDIA PRIVATE LIMITED")).toBeInTheDocument();
  });

  it("applies a preset to both the summary and the detailed report", async () => {
    const user = userEvent.setup();
    renderPage("/accounts-payable/reports?report=payments_made");
    await screen.findByText("TST-VIT-2627-0072");
    await user.click(screen.getByRole("button", { name: "Last 12 months" }));
    const summaryFilters = reportService.getSummary.mock.calls.at(-1)[0];
    const reportFilters = reportService.runReport.mock.calls.at(-1)[1];
    expect(summaryFilters.fromDate).toBe(reportFilters.fromDate);
    expect(screen.getByRole("button", { name: "Last 12 months" })).toHaveAttribute("aria-pressed", "true");
  });

  it("highlights late payments and exports the same filters", async () => {
    const user = userEvent.setup();
    renderPage("/accounts-payable/reports?report=payments_made");
    expect(await screen.findByText("10 days late")).toHaveClass("text-rose-700");
    await user.click(screen.getByRole("button", { name: /export excel/i }));
    await user.click(screen.getByRole("button", { name: /pdf/i }));
    const runFilters = reportService.runReport.mock.calls.at(-1)[1];
    expect(reportService.exportReport).toHaveBeenCalledWith("payments_made", runFilters, "xlsx");
    expect(reportService.exportReport).toHaveBeenCalledWith("payments_made", runFilters, "pdf");
  });

  it("labels the ageing report's not-due column 'Within Due Date' and keeps the other headers", async () => {
    reportService.listReports.mockResolvedValue([{ key: "ageing", title: "Ageing by vendor", period: "as_of" }]);
    reportService.runReport.mockResolvedValue({
      key: "ageing",
      title: "Ageing by vendor",
      period: { type: "as_of", as_of: "2026-10-09" },
      columns: [
        { key: "vendor_name", label: "Vendor", type: "text" },
        { key: "not_due", label: "Not yet due", type: "money" },
        { key: "b_1-15", label: "1-15 days", type: "money" },
        { key: "total", label: "Total outstanding", type: "money" },
      ],
      rows: [{ vendor_name: "Vertex", not_due: 1000, "b_1-15": 500, total: 1500, currency_code: "INR" }],
      totals: [],
    });
    renderPage("/accounts-payable/reports?report=ageing");
    expect(await screen.findByText("Within Due Date")).toBeInTheDocument();
    expect(screen.queryByText("Not yet due")).toBeNull();
    expect(screen.getByText("1-15 days")).toBeInTheDocument();
    expect(screen.getByText("Total outstanding")).toBeInTheDocument();
  });

  it("explains when no reports are available", async () => {
    reportService.listReports.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("No reports are available for your access.")).toBeInTheDocument();
  });
});
