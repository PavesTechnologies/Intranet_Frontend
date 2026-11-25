import { describe, expect, it, vi } from "vitest";

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({ cashAdvanceApi: {} }));
vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({ expenseReportService: {} }));
vi.mock("@/pages/expense-management/api/recoveryApi", () => ({ recoveryApi: {} }));

import { advanceFilters, advanceKpiCards, advanceMoney, advanceMovementLines } from "../MyAdvancesPage";
import { applyTableFilters, emptyFilterValues } from "@/pages/expense-management/components/common/TableFilterBar";

// Sindhu's 8 advances, as the my-advances API returns them (amounts, carry-forward and balances are real).
const ADVANCES = [
  { advanceId: "36b2d34e", title: "[SEED] Mumbai audit trip", status: "CLOSED", currencyCode: "INR", costCenterName: "Engineering", requestedAmount: 8000, approvedAmount: 8000, amount: 8000, disbursedAmount: 8000, carriedInAmount: 0, carriedOutAmount: 0, outstandingBalance: 0, settlementDueDate: "2026-12-20" },
  { advanceId: "3a8da915", title: "Pune client onboarding visit", status: "CLOSED", currencyCode: "INR", costCenterName: "Engineering", requestedAmount: 4000, approvedAmount: 4000, amount: 4000, disbursedAmount: 4000, carriedOutAmount: 550, outstandingBalance: 0, settlementDueDate: "2026-11-30" },
  { advanceId: "8f91c4ff", title: "visit visit", status: "IN_PROGRESS", currencyCode: "INR", costCenterName: "Engineering", requestedAmount: 2000, approvedAmount: 3518, amount: 3518, disbursedAmount: 2000, carriedInAmount: 1518, outstandingBalance: 3518, settlementDueDate: "2026-12-12" },
  { advanceId: "99377217", title: "client laptop", status: "PENDING_FINANCE_APPROVAL", currencyCode: "INR", costCenterName: "Engineering", requestedAmount: 2000, amount: 2000, disbursedAmount: null, outstandingBalance: 0 },
  { advanceId: "a6b24849", title: "[SEED] Delhi tech conference", status: "IN_PROGRESS", currencyCode: "INR", costCenterName: "Engineering", requestedAmount: 12000, approvedAmount: 12000, amount: 12000, disbursedAmount: 12000, outstandingBalance: 12000, settlementDueDate: "2026-12-25" },
  { advanceId: "af37e9a9", title: "[SEED] Chennai training workshop", status: "IN_PROGRESS", currencyCode: "INR", costCenterName: "Engineering", requestedAmount: 10000, approvedAmount: 10000, amount: 10000, disbursedAmount: 10000, outstandingBalance: 10000, settlementDueDate: "2026-12-15" },
  { advanceId: "dc635366", title: "[SEED] Pune site visit", status: "IN_PROGRESS", currencyCode: "INR", costCenterName: "Engineering", requestedAmount: 3000, approvedAmount: 3000, amount: 3000, disbursedAmount: 3000, outstandingBalance: 3000, settlementDueDate: "2026-12-31" },
  { advanceId: "fcc23f1b", title: "[SEED] Bengaluru client visit", status: "SETTLEMENT_PENDING", currencyCode: "INR", costCenterName: "Engineering", requestedAmount: 5000, approvedAmount: 5000, amount: 5000, disbursedAmount: 5000, outstandingBalance: 968, settlementDueDate: "2026-12-10" },
];

describe("My Advances: KPI cards match the dashboard", () => {
  it("received 44,000 (+1,518 carried in), settled 16,032, outstanding 29,486, 2,000 awaiting approval", () => {
    const c = Object.fromEntries(advanceKpiCards(ADVANCES).map((x) => [x.key, x]));
    expect(c.pending.value).toBe("INR 2,000.00");
    expect(c.received.value).toBe("INR 44,000.00");
    expect(c.received.hint).toBe("+ INR 1,518.00 carried in");
    expect(c.settled.value).toBe("INR 16,032.00");
    expect(c.outstanding.value).toBe("INR 29,486.00");
  });

  it("an advance not paid out yet has no money figures", () => {
    expect(advanceMoney(ADVANCES[3])).toBeNull();
  });
});

describe("My Advances: where each advance's money went", () => {
  const base = { paidOut: true, carriedIn: 0, consumed: 0, approvedConsumed: 0, salaryDeducted: 0, otherRepaid: 0, carriedForward: 0, held: 0, outstanding: 0, owedToEmployee: 0 };
  const labels = (lines) => lines.map((l) => `${l.label} ${l.value}`);

  it("salary deduction: paid out 8,000, used 5,474, salary deduction 2,526, nothing left", () => {
    expect(labels(advanceMovementLines({ ...base, disbursed: 8000, consumed: 5474, approvedConsumed: 5474, salaryDeducted: 2526 }, 0)))
      .toEqual(["Paid out 8000", "Used on reports 5474", "Salary deduction 2526", "Remaining 0"]);
  });

  it("carry forward: paid out 4,000, used 3,450, 550 carried forward", () => {
    expect(labels(advanceMovementLines({ ...base, disbursed: 4000, consumed: 3450, approvedConsumed: 3450, carriedForward: 550 }, 0)))
      .toEqual(["Paid out 4000", "Used on reports 3450", "Carried forward 550", "Remaining 0"]);
  });

  it("expenses on a draft report are shown apart and do not reduce the balance", () => {
    expect(labels(advanceMovementLines({ ...base, disbursed: 10000, consumed: 370, approvedConsumed: 0 }, 10000)))
      .toEqual(["Paid out 10000", "Used on reports 0", "In reports not approved yet 370", "Remaining 10000"]);
  });

  it("carried-in money is shown with the cash paid out", () => {
    expect(labels(advanceMovementLines({ ...base, disbursed: 2000, carriedIn: 1518 }, 3518)))
      .toEqual(["Paid out 2000", "+ Carried in 1518", "Used on reports 0", "Remaining 3518"]);
  });
});

describe("My Advances: column filters", () => {
  const filters = advanceFilters(ADVANCES);
  const run = (over) => applyTableFilters(ADVANCES, filters, { ...emptyFilterValues(filters), status: "__OPEN__", ...over }).map((a) => a.advanceId);

  it("starts on open advances: closed ones appear when asked for", () => {
    expect(run({})).toHaveLength(6);
    expect(run({ status: "" })).toHaveLength(8);
  });

  it("balance: outstanding, fully settled, not paid out", () => {
    expect(run({ status: "", money: "SETTLED" })).toEqual(["36b2d34e", "3a8da915"]);
    expect(run({ money: "NOT_PAID" })).toEqual(["99377217"]);
    expect(run({ money: "OUTSTANDING" })).toHaveLength(5);
  });

  it("amount and settle-by ranges", () => {
    expect(run({ amount: { min: "10000", max: "" } })).toEqual(["a6b24849", "af37e9a9"]);
    expect(run({ settleBy: { from: "2026-12-10", to: "2026-12-12" } })).toEqual(["8f91c4ff", "fcc23f1b"]);
  });
});
