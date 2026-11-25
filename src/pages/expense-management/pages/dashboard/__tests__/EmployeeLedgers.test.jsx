import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EmployeeLedgers from "@/pages/expense-management/components/dashboard/EmployeeLedgers";

// The two employee ledgers: every figure, sign and check is the same whatever the layout.
const KPI = {
  caRequested: 12000, caApproved: 11000, caDisbursed: 9000, caSettled: 6000, caOutstanding: 3000,
  erClaimed: 1900, erNotApproved: 0, erApproved: 1900, erAdvanceOffset: 300, erPayable: 1600,
  erToSendAp: 700, erPendingAp: 500, erPaid: 400,
};
const byKey = Object.fromEntries(Object.entries(KPI).map(([key, value]) => [key, { key, value }]));

const ledgers = {
  advance: {
    title: "Cash advance ledger", caption: "c",
    check: { total: "caDisbursed", parts: ["caSettled", "caOutstanding"], label: "Received = Settled + Outstanding" },
  },
  reimbursement: {
    title: "Reimbursement ledger", caption: "c",
    check: { total: "erPayable", parts: ["erToSendAp", "erPendingAp", "erPaid"], label: "Payable = Not yet with AP + Waiting for AP + Paid" },
  },
};

const amount = (container, key) => container.querySelector(`[data-kpi="${key}"] [data-amount]`).textContent;

describe("employee ledgers", () => {
  it("shows each figure with its sign", () => {
    const { container } = render(<EmployeeLedgers ledgers={ledgers} byKey={byKey} currency="INR" />);
    expect(amount(container, "caRequested")).toMatch(/12,000/);
    expect(amount(container, "caSettled")).toMatch(/^−.*6,000/);
    expect(amount(container, "caOutstanding")).toMatch(/3,000/);
    expect(amount(container, "erAdvanceOffset")).toMatch(/^−.*300/);
    expect(amount(container, "erPayable")).toMatch(/1,600/);
    expect(amount(container, "erPaid")).toMatch(/400/);
  });

  it("marks both ledgers balanced when their parts add up", () => {
    const { container } = render(<EmployeeLedgers ledgers={ledgers} byKey={byKey} currency="INR" />);
    expect(container.querySelector('[data-check="Cash advance ledger"]').textContent).toMatch(/Balanced: Received = Settled \+ Outstanding/);
    expect(container.querySelector('[data-check="Reimbursement ledger"]').textContent).toMatch(/Balanced/);
  });

  it("flags a ledger that does not add up instead of hiding it", () => {
    const broken = { ...byKey, erPayable: { key: "erPayable", value: 1700 } };
    const { container } = render(<EmployeeLedgers ledgers={ledgers} byKey={broken} currency="INR" />);
    expect(container.querySelector('[data-check="Reimbursement ledger"]').textContent).toMatch(/Off by/);
  });

  it("counts carried-in money: received + carried in = settled + outstanding (no more 'Off by' the carry-in)", () => {
    // The live case: 44,000 paid out, 1,518 carried in, 16,032 settled, 29,486 outstanding.
    const live = {
      ...byKey,
      caDisbursed: { key: "caDisbursed", value: 44000 },
      caCarriedIn: { key: "caCarriedIn", value: 1518 },
      caSettled: { key: "caSettled", value: 16032 },
      caOutstanding: { key: "caOutstanding", value: 29486 },
    };
    const carry = { ...ledgers, advance: { ...ledgers.advance, check: {
      total: ["caDisbursed", "caCarriedIn"], optional: ["caCarriedIn"], parts: ["caSettled", "caOutstanding"],
      label: "Received + Carried in = Settled + Outstanding" } } };
    const { container } = render(<EmployeeLedgers ledgers={carry} byKey={live} currency="INR" />);
    expect(amount(container, "caCarriedIn")).toMatch(/^\+.*1,518/);
    expect(container.querySelector('[data-check="Cash advance ledger"]').textContent).toMatch(/Balanced/);
    // 16,032 of 45,518: the split adds up to 100%, not 103%.
    expect(container.textContent).toMatch(/Settled\s*35%/);
    expect(container.textContent).toMatch(/Outstanding\s*65%/);
  });

  it("warns when money was carried in without being carried out of another advance", () => {
    const flagged = { ...byKey, caCarryUnmatched: { key: "caCarryUnmatched", value: 968 } };
    const { container } = render(<EmployeeLedgers ledgers={ledgers} byKey={flagged} currency="INR" />);
    expect(container.querySelector("[data-carry-unmatched]").textContent).toMatch(/INR 968.00 was carried into your advances.*Ask Finance/);
  });

  it("shows no carried-in row and no warning when there is no carry-forward", () => {
    const { container } = render(<EmployeeLedgers ledgers={ledgers} byKey={{ ...byKey, caCarryUnmatched: { key: "caCarryUnmatched", value: 0 } }} currency="INR" />);
    expect(container.querySelector('[data-kpi="caCarriedIn"]')).toBeNull();
    expect(container.querySelector("[data-carry-unmatched]")).toBeNull();
  });

  it("shows a dash for a missing figure", () => {
    const { container } = render(<EmployeeLedgers ledgers={ledgers} byKey={{}} currency="INR" />);
    expect(amount(container, "caRequested")).toBe("-");
  });
});
