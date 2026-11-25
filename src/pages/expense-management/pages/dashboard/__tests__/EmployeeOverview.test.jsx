import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmployeeOverview from "@/pages/expense-management/components/dashboard/EmployeeOverview";
import ReportJourney from "@/pages/expense-management/components/dashboard/ReportJourney";

const toByKey = (o) => Object.fromEntries(Object.entries(o).map(([key, value]) => [key, { key, value }]));
const KPI = toByKey({
  erClaimed: 1900, erApproved: 1900, erPayable: 1600, erToSendAp: 700, erPendingAp: 500, erPaid: 400,
  caDisbursed: 9000, caOutstanding: 3000, draft: 0, approvals: 250, finance: 0, payment: 500, paid: 400, action: 500,
});

describe("employee summary banner", () => {
  const byKey = toByKey({
    drApproved: 1000, drToSendAp: 0, drPendingAp: 200, drPaid: 800,
    caDisbursed: 9000, caUsedOnBills: 1200, caReturned: 1000, caCarriedForward: 500, caOutstanding: 6300,
    erApproved: 2500, erAdvanceOffset: 1200, erPayable: 1300,
  });
  const col = (container, k) => container.querySelector(`[data-money-col="${k}"]`);
  const main = (container, k) => col(container, k).querySelector("[data-money-main]").textContent;
  const line = (container, k) => container.querySelector(`[data-money-line="${k}"]`).textContent;

  it("shows three columns: direct, cash advance, total", () => {
    const { container } = render(<EmployeeOverview byKey={byKey} currency="INR" />);
    const cols = [...container.querySelectorAll("[data-money-col]")].map((c) => c.getAttribute("data-money-col"));
    expect(cols).toEqual(["direct", "advance", "total"]);
    expect(container.querySelectorAll("[data-money-line]")).toHaveLength(6);
  });

  it("each column leads with one figure and two lines behind it", () => {
    const { container } = render(<EmployeeOverview byKey={byKey} currency="INR" />);
    expect(main(container, "direct")).toMatch(/INR 800/);
    expect(line(container, "drApproved")).toMatch(/Approved.*1,000/);
    expect(line(container, "drPending")).toMatch(/On its way.*200/);
    expect(main(container, "advance")).toMatch(/INR 6,300/);
    expect(line(container, "caDisbursed")).toMatch(/Received.*9,000/);
    expect(line(container, "caAccounted")).toMatch(/Used on bills \+ returned.*2,700/);
    expect(main(container, "total")).toMatch(/INR 2,500/);
    expect(line(container, "erAdvanceOffset")).toMatch(/From advance.*1,200/);
    expect(line(container, "erPayable")).toMatch(/To your bank.*1,300/);
  });

  it("shows a dash for a figure that has not loaded, never NaN", () => {
    const { container } = render(<EmployeeOverview byKey={{}} currency="INR" />);
    expect(main(container, "direct")).toBe("-");
    expect(line(container, "drPending")).toMatch(/On its way-/);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it("a column scrolls to and focuses its ledger", () => {
    const { container } = render(
      <>
        <EmployeeOverview byKey={byKey} currency="INR" />
        <section id="em-advance-ledger" tabIndex={-1} />
      </>
    );
    const advance = document.getElementById("em-advance-ledger");
    advance.scrollIntoView = vi.fn();
    fireEvent.click(col(container, "advance"));
    expect(advance.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(advance);
  });
});

describe("report journey", () => {
  const pipeline = [
    { key: "draft", label: "Draft", count: 0 },
    { key: "approval", label: "Manager approval", count: 1 },
    { key: "finance", label: "Finance check", count: 0 },
    { key: "ap", label: "With AP", count: 2 },
    { key: "paid", label: "Paid", count: 1 },
  ];

  it("shows each stage with its count (amounts are left to the ledgers), and the reports in flight", () => {
    const { container } = render(<ReportJourney pipeline={pipeline} byKey={KPI} currency="INR" />);
    expect(container.querySelector('[data-stage="ap"]').textContent).toMatch(/2 reports/);
    expect(container.querySelector('[data-stage="ap"]').textContent).not.toMatch(/INR/);
    expect(container.querySelector('[data-stage="draft"]').textContent).toMatch(/0 reports/);
    expect(screen.getByText(/moving through approval/).textContent).toMatch(/3 reports/);
    expect(screen.getByText(/Sent back to you/).textContent).toMatch(/500/);
  });

  it("ends approved reports in Paid or Settled, and counts the reports sent back", () => {
    const full = [
      { key: "draft", label: "Draft", count: 4 },
      { key: "approval", label: "Manager approval", count: 0 },
      { key: "finance", label: "Finance check", count: 0 },
      { key: "ap", label: "With AP", count: 0 },
      { key: "paid", label: "Paid", count: 5 },
      { key: "settled", label: "Settled", count: 4 },
      { key: "action", label: "Sent back to you", count: 1 },
    ];
    const { container } = render(<ReportJourney pipeline={full} byKey={{}} currency="INR" />);

    const settled = container.querySelector('[data-stage="settled"]');
    expect(settled.textContent).toMatch(/Settled/);
    expect(settled.textContent).toMatch(/Covered by your advance/);
    expect(settled.textContent).toMatch(/4 reports/);
    // "action" is a callout, not a step on the line.
    expect(container.querySelector('[data-stage="action"]')).toBeNull();
    expect(screen.getByTestId("journey-sent-back").textContent).toMatch(/1 report\b/);
    // Every report is in exactly one place: 4 + 5 + 4 on the line, 1 sent back.
    const onLine = [...container.querySelectorAll("[data-stage]")]
      .map((li) => Number((li.textContent.match(/(\d+) reports?$/) || [])[1] || 0))
      .reduce((a, b) => a + b, 0);
    expect(onLine).toBe(13);
  });

  it("renders nothing without a pipeline", () => {
    const { container } = render(<ReportJourney pipeline={[]} byKey={KPI} currency="INR" />);
    expect(container.firstChild).toBeNull();
  });
});
