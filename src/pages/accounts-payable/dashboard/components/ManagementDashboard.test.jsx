import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ManagementDashboard from "./ManagementDashboard";

// Recharts can't measure in jsdom, so the outflow chart is replaced by a probe that records exactly
// what ManagementDashboard hands it. Everything else in ./insights stays real.
const chartProps = [];
vi.mock("./insights", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    StackedMoneyBars: (props) => {
      chartProps.push(props);
      return <div data-testid="outflow-chart" />;
    },
    MoneyAreaChart: () => null,
  };
});

const kpi = (key, label, value, extra = {}) => ({ key, label, value, format: "money", tone: "gray", link: null, ...extra });

const DATA = {
  base_currency: "INR",
  highlights: [],
  kpis: [
    kpi("liability", "Total we owe vendors", 123456789.5, { subtitle: "Approved and still in approval", help: "Everything recorded and not yet paid." }),
    kpi("due_30", "Cash needed next 30 days", 2310865),
    kpi("overdue", "Overdue", 260000, { tone: "rose", subtitle: "1 approved invoice past due · 4% of approved" }),
    kpi("on_time", "Paid on time", 72.2, { format: "percent", tone: "amber" }),
    kpi("dpo", "Days to pay vendors (DPO)", 41.5, {
      format: "days",
      subtitle: "Target 30-45 days · 38 d 90 days ago · avg 36 d per paid invoice — a deliberately long description that has to wrap",
    }),
    kpi("spend_fy", "Spend this financial year", 98765432),
  ],
  outflow: [{ key: "d30", label: "Next 30 days", approved: "100", pipeline: "50", recurring: "25", tds: "10", count: 2 }],
  spend_trend: [],
  by_department: [],
  vendor_exposure: [],
  controls: [],
  accruals: null,
  efficiency: { median_days_to_approve: 3, median_days_approval_to_payment: 12, median_days_end_to_end: 18, sample: 9, pending_approvals: 0, bottlenecks: [] },
  compliance: [],
  high_value_exceptions: [],
  high_value_threshold: 100000,
  note: "Read-only management view.",
};

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <ManagementDashboard data={DATA} />
    </MemoryRouter>,
  );

describe("ManagementDashboard — cash outflow chart", () => {
  it("gives the four categories distinct colours, keeping keys, labels and order", () => {
    chartProps.length = 0;
    renderDashboard();

    const { series, points } = chartProps.at(-1);
    expect(series).toEqual([
      { key: "approved", label: "Approved - to pay", color: "#3478D4" },
      { key: "pipeline", label: "Not yet approved", color: "#E4572E" },
      { key: "recurring", label: "Expected rent & subscriptions (estimate)", color: "#18A879" },
      { key: "tds", label: "TDS to deposit", color: "#8B5CF6" },
    ]);
    expect(new Set(series.map((s) => s.color)).size).toBe(series.length);

    // Values reach the chart exactly as before (strings converted to numbers, nothing else).
    expect(points[0]).toMatchObject({ approved: 100, pipeline: 50, recurring: 25, tds: 10, count: 2 });
  });
});

describe("ManagementDashboard — KPI cards", () => {
  it("renders every KPI as the same three-level card with its live value", () => {
    renderDashboard();

    for (const k of DATA.kpis) {
      const label = screen.getByText(k.label);
      const card = label.closest("div.rounded-xl");
      expect(card).toHaveClass("h-full", "flex", "flex-col", "p-5", "border-slate-200", "bg-white", "shadow-sm");
    }

    // Value and description sit below the header and wrap instead of overflowing.
    const dpoCard = screen.getByText("Days to pay vendors (DPO)").closest("div.rounded-xl");
    const [value, description] = dpoCard.querySelectorAll(":scope > p");
    expect(value).toHaveTextContent("41.5 d");
    expect(value).toHaveClass("break-words", "text-2xl", "font-bold");
    expect(description).toHaveTextContent(/deliberately long description/);
    expect(description).toHaveClass("break-words", "text-slate-500");
  });

  it("keeps the KPI tone colours", () => {
    renderDashboard();
    expect(screen.getByText("72.2%")).toHaveClass("text-amber-700");
    const overdueCard = screen.getByText("Overdue").closest("div.rounded-xl");
    expect(overdueCard.querySelector(":scope > p")).toHaveClass("text-rose-700");
  });

  it("keeps the information tooltip in the header", () => {
    renderDashboard();
    expect(screen.getByRole("button", { name: "What does Total we owe vendors mean?" })).toBeInTheDocument();
  });

  it("runs three cards to a row until there is room for six", () => {
    renderDashboard();
    const grid = screen.getByText("Overdue").closest("div.grid");
    expect(grid).toHaveClass("lg:grid-cols-3", "2xl:grid-cols-6");
    expect(grid).not.toHaveClass("xl:grid-cols-6");
  });
});
