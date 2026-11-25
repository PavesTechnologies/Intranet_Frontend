import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EmployeeLedgers from "@/pages/expense-management/components/dashboard/EmployeeLedgers";

// Direct: 1,000 claimed and approved, paid to the bank.
// Advance: 9,000 received = 1,200 used on bills + 4,800 returned + 3,000 still to settle; bills 1,500 approved,
// 1,200 from the advance, 300 extra to the bank. Total = direct + advance.
const KPI = {
  drClaimed: 1000, drNotApproved: 0, drApproved: 1000, drPayable: 1000, drToSendAp: 0, drPendingAp: 0, drPaid: 1000,
  caRequested: 12000, caApproved: 11000, caDisbursed: 9000, caUsedOnBills: 1200, caReturned: 4800, caCarriedForward: 0, caOutstanding: 3000, caRecordGap: 0,
  avClaimed: 1500, avApproved: 1500, avAdvanceOffset: 1200, avPayable: 300, avToSendAp: 0, avPendingAp: 300, avPaid: 0,
  erClaimed: 2500, erApproved: 2500, erAdvanceOffset: 1200, erPayable: 1300, erToSendAp: 0, erPendingAp: 300, erPaid: 1000,
};
const toByKey = (o) => Object.fromEntries(Object.entries(o).map(([key, value]) => [key, { key, value }]));
const byKey = toByKey(KPI);

const ledgers = {
  direct: { title: "Direct expense ledger", caption: "c", checks: [{ label: "To bank", total: "drPayable", parts: ["drToSendAp", "drPendingAp", "drPaid"] }] },
  advance: {
    title: "Cash advance ledger", caption: "c",
    checks: [{ label: "Received", total: "caDisbursed", parts: ["caUsedOnBills", "caReturned", "caCarriedForward", "caOutstanding"] }],
  },
  total: {
    title: "Total", caption: "c",
    checks: [
      { label: "Approved", total: "erApproved", parts: ["drApproved", "avApproved"] },
      { label: "Paid", total: "erPaid", parts: ["drPaid", "avPaid"] },
    ],
  },
};

const ledger = (container, id) => container.querySelector(`[data-ledger="${id}"]`);
const amount = (scope, key) => scope.querySelector(`[data-kpi="${key}"] [data-amount]`).textContent;

describe("employee ledgers", () => {
  it("shows direct expenses, cash advance and total as separate ledgers", () => {
    const { container } = render(<EmployeeLedgers ledgers={ledgers} byKey={byKey} currency="INR" />);
    const direct = ledger(container, "em-direct-ledger");
    const advance = ledger(container, "em-advance-ledger");
    const total = ledger(container, "em-total-ledger");
    expect(amount(direct, "drClaimed")).toMatch(/1,000/);
    expect(amount(direct, "drPayable")).toMatch(/1,000/);
    expect(direct.querySelector('[data-kpi="caDisbursed"]')).toBeNull();
    expect(amount(advance, "caDisbursed")).toMatch(/9,000/);
    expect(amount(advance, "caUsedOnBills")).toMatch(/^−.*1,200/);
    expect(amount(advance, "avAdvanceOffset")).toMatch(/^−.*1,200/);
    expect(amount(advance, "avPayable")).toMatch(/300/);
    expect(advance.querySelector('[data-kpi="drClaimed"]')).toBeNull();
    expect(amount(total, "erApproved")).toMatch(/2,500/);
    expect(amount(total, "erPending")).toMatch(/300/);
  });

  it("marks every ledger balanced when the flows add up", () => {
    const { container } = render(<EmployeeLedgers ledgers={ledgers} byKey={byKey} currency="INR" />);
    const checks = [...container.querySelectorAll("[data-check]")];
    expect(checks).toHaveLength(4);
    checks.forEach((c) => expect(c.textContent).toMatch(/Balanced/));
  });

  it("flags a ledger that does not add up instead of hiding it", () => {
    const broken = { ...byKey, erApproved: { key: "erApproved", value: 2600 } };
    const { container } = render(<EmployeeLedgers ledgers={ledgers} byKey={broken} currency="INR" />);
    expect(container.querySelector('[data-check="Total: Approved"]').textContent).toMatch(/Off by INR 100/);
  });

  it("explains a record mismatch on the advance instead of a bare off-by", () => {
    const gap = { ...byKey, caDisbursed: { key: "caDisbursed", value: 7500 }, caRecordGap: { key: "caRecordGap", value: -1500 } };
    const { container } = render(<EmployeeLedgers ledgers={ledgers} byKey={gap} currency="INR" />);
    expect(container.querySelector("[data-record-gap]").textContent).toMatch(/differ by INR 1,500.*Ask Finance/);
  });

  it("says when advance records and reports disagree on what was paid from the advance", () => {
    const { container, rerender } = render(<EmployeeLedgers ledgers={ledgers} byKey={byKey} currency="INR" />);
    expect(container.querySelector("[data-offset-mismatch]")).toBeNull();
    rerender(<EmployeeLedgers ledgers={ledgers} byKey={{ ...byKey, avAdvanceOffset: { key: "avAdvanceOffset", value: 1394.25 } }} currency="INR" />);
    expect(container.querySelector("[data-offset-mismatch]").textContent).toMatch(/1,200.*used on bills.*1,394\.25 paid from advance/);
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
    expect(amount(container, "drClaimed")).toBe("-");
  });
});
