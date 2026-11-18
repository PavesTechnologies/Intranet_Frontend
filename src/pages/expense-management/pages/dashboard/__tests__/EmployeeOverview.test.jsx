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
const nextStep = (container) => container.querySelector("[data-next-step]").textContent;

describe("employee summary banner", () => {
  it("headline is what is approved and not paid yet: not yet with AP + waiting for AP", () => {
    const { container } = render(<EmployeeOverview byKey={KPI} currency="INR" />);
    expect(container.querySelector("[data-overview]").textContent).toMatch(/On its way to you\s*INR 1,200/);
    expect(screen.getByText(/25% of INR 1,600/)).toBeInTheDocument();
  });

  it("an overdue settlement is the first next step", () => {
    const reminders = [{ overdue: true }];
    const { container } = render(<EmployeeOverview byKey={KPI} currency="INR" attentionCount={3} reminders={reminders} />);
    expect(nextStep(container)).toMatch(/1 cash advance settlement is overdue/);
  });

  it("items waiting on the employee come next, not counting settlement reminders twice", () => {
    const { container } = render(<EmployeeOverview byKey={KPI} currency="INR" attentionCount={2} reminders={[]} />);
    expect(nextStep(container)).toMatch(/2 items waiting on you/);
  });

  it("clicking a tile or the next-step button scrolls to and focuses the matching section", () => {
    const { container } = render(
      <>
        <EmployeeOverview byKey={KPI} currency="INR" attentionCount={2} reminders={[]} />
        <section id="em-advance-ledger" tabIndex={-1} />
        <section id="em-needs-you" tabIndex={-1} />
      </>
    );
    const advance = document.getElementById("em-advance-ledger");
    const needsYou = document.getElementById("em-needs-you");
    advance.scrollIntoView = vi.fn();
    needsYou.scrollIntoView = vi.fn();

    fireEvent.click(screen.getByText("View cash advance"));
    expect(advance.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(advance);

    fireEvent.click(container.querySelector('[data-next-step-go="em-needs-you"]'));
    expect(needsYou.scrollIntoView).toHaveBeenCalled();
  });

  it("with nothing pending and nothing owed, says the employee is caught up", () => {
    const { container } = render(<EmployeeOverview byKey={toByKey({ erPaid: 400, erPayable: 400 })} currency="INR" />);
    expect(nextStep(container)).toMatch(/all caught up/);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
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

  it("shows each stage with its count and amount, and the reports in flight", () => {
    const { container } = render(<ReportJourney pipeline={pipeline} byKey={KPI} currency="INR" />);
    expect(container.querySelector('[data-stage="ap"]').textContent).toMatch(/2 reports.*INR 500/);
    expect(container.querySelector('[data-stage="draft"]').textContent).toMatch(/0 reports/);
    expect(screen.getByText(/moving through approval/).textContent).toMatch(/3 reports/);
    expect(screen.getByText(/Sent back to you/).textContent).toMatch(/500/);
  });

  it("renders nothing without a pipeline", () => {
    const { container } = render(<ReportJourney pipeline={[]} byKey={KPI} currency="INR" />);
    expect(container.firstChild).toBeNull();
  });
});
