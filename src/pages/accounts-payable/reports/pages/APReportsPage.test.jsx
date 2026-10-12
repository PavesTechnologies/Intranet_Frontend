import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
  period: { from_date: "2026-08-01", to_date: "2026-10-09" },
  kpis: [
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

  it("explains when no reports are available", async () => {
    reportService.listReports.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("No reports are available for your access.")).toBeInTheDocument();
  });
});
