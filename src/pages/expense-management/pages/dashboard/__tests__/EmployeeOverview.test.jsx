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
    expect(container.querySelector("[data-overview]").textContent).toMatch(/On its way to you\s*INR 1,200/);
  });

  it("shows the money cards: claimed, approved, paid and advance outstanding", () => {
    const { container } = render(<EmployeeOverview byKey={KPI} currency="INR" attentionCount={0} reminders={[]} />);
    const card = (key) => container.querySelector(`[data-money-card="${key}"]`).textContent;
    expect(card("erClaimed")).toMatch(/Total claimed.*1,900/);
    expect(card("erApproved")).toMatch(/Approved.*1,900/);
    expect(card("erPaid")).toMatch(/Paid to you.*400/);
    expect(card("caOutstanding")).toMatch(/Advance outstanding.*3,000/);
    // Payable and received stay in the ledgers only.
    expect(container.textContent).not.toMatch(/1,600|9,000/);
  });

  it("shows a dash on a money card whose figure is missing", () => {
    const { container } = render(<EmployeeOverview byKey={{}} currency="INR" />);
    expect(container.querySelector('[data-money-card="erClaimed"]').textContent).toMatch(/Total claimed-/);
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
    expect(container.textContent).toMatch(/Everything approved has been paid/);
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

  it("shows each stage with its count (amounts are left to the ledgers), and the reports in flight", () => {
    const { container } = render(<ReportJourney pipeline={pipeline} byKey={KPI} currency="INR" />);
    expect(container.querySelector('[data-stage="ap"]').textContent).toMatch(/2 reports/);
    expect(container.querySelector('[data-stage="ap"]').textContent).not.toMatch(/INR/);
    expect(container.querySelector('[data-stage="draft"]').textContent).toMatch(/0 reports/);
    expect(screen.getByText(/moving through approval/).textContent).toMatch(/3 reports/);
    expect(screen.getByText(/Sent back to you/).textContent).toMatch(/500/);
  });

  it("renders nothing without a pipeline", () => {
    const { container } = render(<ReportJourney pipeline={[]} byKey={KPI} currency="INR" />);
    expect(container.firstChild).toBeNull();
  });
});
