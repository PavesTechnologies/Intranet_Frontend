import { describe, expect, it, vi } from "vitest";

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({ cashAdvanceApi: {} }));
vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({ expenseReportService: {} }));
vi.mock("@/pages/expense-management/api/recoveryApi", () => ({ recoveryApi: {} }));

import { moneyStateMatches, sortAdvances } from "../SettlementPage";

// Made-up figures in the shape figuresOf() returns.
const fig = (o) => ({ paidOut: true, owed: 0, approved: 0, requested: 0, remaining: 0, owedToEmployee: 0, cut: 0, ...o });
const FIGS = {
  unpaid: fig({ paidOut: false, approved: 3500, requested: 5000, cut: 1500 }),
  balance: fig({ owed: 10000, remaining: 4000 }),
  used: fig({ owed: 2000 }),
  overspent: fig({ owed: 1000, owedToEmployee: 300 }),
};
const figuresOf = (adv) => FIGS[adv.id];
const ADVANCES = [
  { id: "unpaid", createdAt: "2026-11-20T10:00:00", expectedTripStartDate: "2026-11-04" },
  { id: "balance", createdAt: "2026-11-01T10:00:00", expectedTripStartDate: "2026-11-16" },
  { id: "used", createdAt: "2026-10-01T10:00:00" },
  { id: "overspent", createdAt: "2026-11-10T10:00:00", expectedTripStartDate: "2026-10-27" },
];

describe("Settlement filters and sort", () => {
  it("the Money filter follows the Owed / Consumed / Balance columns", () => {
    const pick = (v) => ADVANCES.filter((a) => moneyStateMatches(figuresOf(a), v)).map((a) => a.id);
    expect(pick("NOT_PAID")).toEqual(["unpaid"]);
    expect(pick("BALANCE")).toEqual(["balance"]);
    expect(pick("USED")).toEqual(["used"]);
    expect(pick("OWED_TO_EMPLOYEE")).toEqual(["overspent"]);
    expect(pick("CUT")).toEqual(["unpaid"]);
    expect(pick("")).toHaveLength(4);
  });

  it("sorts by request date, trip date, balance and amount", () => {
    const ids = (sort) => sortAdvances(ADVANCES, sort, figuresOf).map((a) => a.id);
    expect(ids("")).toEqual(["unpaid", "overspent", "balance", "used"]);
    expect(ids("OLDEST")).toEqual(["used", "balance", "overspent", "unpaid"]);
    expect(ids("TRIP_LATEST")).toEqual(["balance", "unpaid", "overspent", "used"]);
    expect(ids("TRIP_EARLIEST")).toEqual(["overspent", "unpaid", "balance", "used"]);
    expect(ids("BALANCE_DESC")[0]).toBe("balance");
    expect(ids("AMOUNT_DESC")).toEqual(["balance", "unpaid", "used", "overspent"]);
  });
});
