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
  it("headline is what is approved and not paid yet: not yet with AP + waiting for AP", () => {
    const { container } = render(<EmployeeOverview byKey={KPI} currency="INR" />);
    expect(container.querySelector("[data-overview]").textContent).toMatch(/Reimbursement on its way to you\s*INR 1,200/);
  });

  it("shows the money cards: claimed, approved, paid and advance outstanding", () => {
    const { container } = render(<EmployeeOverview byKey={KPI} currency="INR" attentionCount={0} reminders={[]} />);
    const card = (key) => container.querySelector(`[data-money-card="${key}"]`).textContent;
    expect(card("erClaimed")).toMatch(/Expenses claimed.*1,900/);
    expect(card("erApproved")).toMatch(/Expenses approved.*1,900/);
    expect(card("erPaid")).toMatch(/Reimbursed to your bank.*400/);
    expect(card("caOutstanding")).toMatch(/Cash advance to settle.*3,000/);
    // Payable and received stay in the ledgers only.
    expect(container.textContent).not.toMatch(/1,600|9,000/);
  });

  it("shows a dash on a money card whose figure is missing", () => {
    const { container } = render(<EmployeeOverview byKey={{}} currency="INR" />);
    expect(container.querySelector('[data-money-card="erClaimed"]').textContent).toMatch(/Expenses claimed-/);
  });

  it("has no next-step box; a money card scrolls to and focuses its ledger", () => {
    const { container } = render(
      <>
        <EmployeeOverview byKey={KPI} currency="INR" />
        <section id="em-advance-ledger" tabIndex={-1} />
      </>
    );
    expect(container.querySelector("[data-next-step-box]")).toBeNull();
    expect(container.textContent).not.toMatch(/Action needed/);
    const advance = document.getElementById("em-advance-ledger");
    advance.scrollIntoView = vi.fn();
    fireEvent.click(container.querySelector('[data-money-card="caOutstanding"]'));
    expect(advance.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(advance);
  });

  it("with nothing owed, shows no NaN or undefined", () => {
    const { container } = render(<EmployeeOverview byKey={toByKey({ erPaid: 400, erPayable: 400 })} currency="INR" />);
    expect(container.textContent).toMatch(/Everything payable to you has been paid/);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
    expect(container.querySelector("[data-advance-offset-note]")).toBeNull();
  });

  it("says how much of the approved amount was adjusted against the cash advance", () => {
    const byKey = toByKey({ erApproved: 12000, erAdvanceOffset: 9000, erPayable: 3000, erPaid: 3000 });
    const { container } = render(<EmployeeOverview byKey={byKey} currency="INR" />);
    expect(container.querySelector("[data-advance-offset-note]").textContent).toMatch(/INR 9,000.*adjusted against your cash advance/);
    expect(container.querySelector('[data-money-card="erApproved"]').textContent).toMatch(/INR 9,000\.00 adjusted against advance/);
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
