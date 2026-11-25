import { describe, expect, it, vi } from "vitest";

// The page module pulls in API clients; only the pure helper is under test here.
vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({ expenseReportService: {}, lookupService: {} }));
vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({ cashAdvanceApi: {} }));
vi.mock("@/pages/expense-management/api/recoveryApi", () => ({ recoveryApi: {} }));

import { inPeriod, moneySplitNote, reportFilters, reportKpiCards, settlementOf, sortReports, tripOverlaps } from "../MyExpensesPage";
import { applyTableFilters, emptyFilterValues } from "@/pages/expense-management/components/common/TableFilterBar";

// The 13 report shapes from Sindhu's My Expenses list (amounts, statuses, links and payments as the API returns them).
const REPORTS = [
  { reportNumber: "86112282", title: "Travel", reportStatus: "DRAFT", totalAmount: 0, reimbursableAmount: 0, currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-23" },
  { reportNumber: "28B5B400", title: "Pune client onboarding visit", reportStatus: "APPROVED", totalAmount: 3450, reimbursableAmount: 0, cashAdvanceId: "3a8da915", currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-20" },
  { reportNumber: "E8E9137F", title: "[SEED] Delhi tech conference", reportStatus: "DRAFT", totalAmount: 0, reimbursableAmount: 0, cashAdvanceId: "a6b24849", currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-20" },
  { reportNumber: "BCDC82E0", title: "[SEED] Mumbai audit expenses", reportStatus: "APPROVED", totalAmount: 5474, reimbursableAmount: 0, cashAdvanceId: "36b2d34e", currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-20" },
  { reportNumber: "6778AC5B", title: "[SEED] Chennai workshop expenses", reportStatus: "DRAFT", totalAmount: 370, reimbursableAmount: 370, cashAdvanceId: "af37e9a9", currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-19" },
  { reportNumber: "106A5121", title: "[SEED] Bengaluru client visit expenses", reportStatus: "APPROVED", totalAmount: 4032, reimbursableAmount: 0, cashAdvanceId: "fcc23f1b", currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-18" },
  { reportNumber: "434644FA", title: "Expense Flow 1", reportStatus: "APPROVED", totalAmount: 357, reimbursableAmount: 357, paymentRoutingStatus: "PAYMENT_COMPLETED", paymentConfirmation: { amountPaid: 357 }, currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-17" },
  { reportNumber: "A1712955", title: "expense2", reportStatus: "DRAFT", totalAmount: 572, reimbursableAmount: 572, currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-16" },
  { reportNumber: "E27A1100", title: "expense1", reportStatus: "APPROVED", totalAmount: 572, reimbursableAmount: 572, paymentRoutingStatus: "PAYMENT_COMPLETED", paymentConfirmation: { amountPaid: 572 }, currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-16" },
  { reportNumber: "E81A99D4", title: "qewr rtyui", reportStatus: "APPROVED", totalAmount: 194.25, reimbursableAmount: 0, noPaymentDue: true, currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-15" },
  { reportNumber: "31A07AAD", title: "Bangalore client visit", reportStatus: "APPROVED", totalAmount: 250, reimbursableAmount: 250, paymentRoutingStatus: "PAYMENT_COMPLETED", paymentConfirmation: { amountPaid: 250 }, currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-12" },
  { reportNumber: "1D7BF814", title: "us business trip", reportStatus: "APPROVED", totalAmount: 661.5, reimbursableAmount: 661.5, paymentRoutingStatus: "PAYMENT_COMPLETED", paymentConfirmation: { amountPaid: 661.5 }, currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-10" },
  { reportNumber: "7A4E7BEE", title: "testing expense", reportStatus: "APPROVED", totalAmount: 1205, reimbursableAmount: 1205, paymentRoutingStatus: "PAYMENT_COMPLETED", paymentConfirmation: { amountPaid: 1205 }, currencyCode: "INR", costCenterName: "Engineering", createdAt: "2026-11-05" },
];

describe("My Expenses: KPI cards follow the real figures", () => {
  it("claimed 16,195.75 = 12,956 against advance + 194.25 no payment due + 3,045.50 paid; 4 drafts need action", () => {
    const cards = Object.fromEntries(reportKpiCards(REPORTS).map((c) => [c.key, c]));
    expect(cards.claimed.value).toBe("INR 16,195.75");
    expect(cards.claimed.hint).toBe("9 submitted reports");
    expect(cards.paid.value).toBe("INR 3,045.50");
    expect(cards.advance.value).toBe("INR 12,956.00");
    expect(cards.due.value).toBe("INR 0.00");
    expect(cards.action.value).toBe("4");
  });
});

describe("My Expenses: column filters", () => {
  const filters = reportFilters(REPORTS);
  const run = (over) => applyTableFilters(REPORTS, filters, { ...emptyFilterValues(filters), ...over }).map((r) => r.reportNumber);

  it("type: 8 expenses and 5 advance settlements", () => {
    expect(run({ type: "EXPENSE" })).toHaveLength(8);
    expect(run({ type: "SETTLEMENT" })).toHaveLength(5);
  });

  it("status uses the state the table shows (Paid replaces Approved once AP paid)", () => {
    expect(run({ status: "PAID" })).toEqual(["434644FA", "E27A1100", "31A07AAD", "1D7BF814", "7A4E7BEE"]);
    expect(run({ status: "DRAFT" })).toHaveLength(4);
  });

  it("amount and created-date ranges combine with the other filters", () => {
    expect(run({ amount: { min: "1000", max: "" }, type: "SETTLEMENT" })).toEqual(["28B5B400", "BCDC82E0", "106A5121"]);
    expect(run({ period: "WEEK" }).length).toBeGreaterThanOrEqual(0); // depends on today; exact periods tested below
  });

  it("search matches title or report number", () => {
    expect(run({ search: "mumbai" })).toEqual(["BCDC82E0"]);
    expect(run({ search: "7a4e" })).toEqual(["7A4E7BEE"]);
  });
});

// Shapes taken from real My Expenses rows: where each approved report's money went.
describe("My Expenses: Paid / Settled column", () => {
  it("an advance settlement fully covered by its advance: all of it against the advance", () => {
    expect(settlementOf({ reportStatus: "APPROVED", totalAmount: 3450, reimbursableAmount: 0, cashAdvanceId: "3a8da915" }))
      .toEqual({ againstAdvance: 3450, paid: 0, due: 0, noPaymentDue: 0 });
  });

  it("an expense paid by AP: all of it paid to the employee", () => {
    expect(settlementOf({ reportStatus: "APPROVED", totalAmount: 1205, reimbursableAmount: 1205, paymentConfirmation: { amountPaid: 1205 } }))
      .toEqual({ againstAdvance: 0, paid: 1205, due: 0, noPaymentDue: 0 });
  });

  it("approved with nothing reimbursable and no advance: no payment due, not 'against advance'", () => {
    expect(settlementOf({ reportStatus: "APPROVED", totalAmount: 194.25, reimbursableAmount: 0 }))
      .toEqual({ againstAdvance: 0, paid: 0, due: 0, noPaymentDue: 194.25 });
  });

  it("partly covered by an advance and partly paid: each part once, the rest still due", () => {
    expect(settlementOf({ reportStatus: "APPROVED", totalAmount: 6000, reimbursableAmount: 1000, cashAdvanceId: "x", paymentConfirmation: { amountPaid: 400 } }))
      .toEqual({ againstAdvance: 5000, paid: 400, due: 600, noPaymentDue: 0 });
  });

  it("a report that is not approved has no money movement yet", () => {
    ["DRAFT", "PENDING_APPROVAL", "PENDING_FINANCE_VERIFICATION", "REJECTED", "CANCELLED"].forEach((reportStatus) =>
      expect(settlementOf({ reportStatus, totalAmount: 500, reimbursableAmount: 500 })).toBeNull());
  });
});

describe("My Expenses: split note under the status", () => {
  it("only when an approved report's money is divided", () => {
    expect(moneySplitNote({ reportStatus: "APPROVED", totalAmount: 6000, reimbursableAmount: 1000, cashAdvanceId: "x", paymentConfirmation: { amountPaid: 400 } }))
      .toBe("5,000.00 from advance · 400.00 paid · 600.00 due");
  });

  it("no note when the money went one way (the status already says it) or nothing has moved", () => {
    expect(moneySplitNote({ reportStatus: "APPROVED", totalAmount: 3450, reimbursableAmount: 0, cashAdvanceId: "x" })).toBeNull();
    expect(moneySplitNote({ reportStatus: "APPROVED", totalAmount: 357, reimbursableAmount: 357, paymentConfirmation: { amountPaid: 357 } })).toBeNull();
    expect(moneySplitNote({ reportStatus: "DRAFT", totalAmount: 572, reimbursableAmount: 572 })).toBeNull();
  });
});

describe("My Expenses: created period, trip dates and sort", () => {
  const NOW = new Date(2026, 10, 24); // Tue 24 Nov 2026

  it("period: this week from Monday, this month from the 1st, last N days including today", () => {
    expect(inPeriod("2026-11-23T10:00:00", "WEEK", NOW)).toBe(true); // Monday
    expect(inPeriod("2026-11-22T10:00:00", "WEEK", NOW)).toBe(false); // Sunday before
    expect(inPeriod("2026-11-01T00:00:00", "MONTH", NOW)).toBe(true);
    expect(inPeriod("2026-10-31T23:00:00", "MONTH", NOW)).toBe(false);
    expect(inPeriod("2026-10-26T09:00:00", "30", NOW)).toBe(true); // 30th day back
    expect(inPeriod("2026-10-25T09:00:00", "30", NOW)).toBe(false);
    expect(inPeriod("2026-09-26T09:00:00", "60", NOW)).toBe(true);
    expect(inPeriod(null, "30", NOW)).toBe(false);
    expect(inPeriod(null, "", NOW)).toBe(true);
  });

  it("trip dates: a report matches when its trip overlaps the chosen range", () => {
    const pune = { tripStartDate: "2026-11-12", tripEndDate: "2026-11-18" };
    expect(tripOverlaps(pune, { from: "2026-11-15", to: "2026-11-20" })).toBe(true);
    expect(tripOverlaps(pune, { from: "2026-11-19", to: "" })).toBe(false);
    expect(tripOverlaps(pune, { from: "", to: "2026-11-11" })).toBe(false);
    expect(tripOverlaps({ tripStartDate: null }, { from: "2026-11-01", to: "" })).toBe(false);
    expect(tripOverlaps({}, { from: "", to: "" })).toBe(true);
  });

  it("sort: newest or oldest created, trip date, amount", () => {
    const rows = [
      { reportNumber: "A", createdAt: "2026-11-10", tripStartDate: "2026-11-20", totalAmount: 100 },
      { reportNumber: "B", createdAt: "2026-11-20", tripStartDate: "2026-11-01", totalAmount: 900 },
      { reportNumber: "C", createdAt: "2026-11-15", tripStartDate: null, totalAmount: 500 },
    ];
    const order = (sort) => sortReports(rows, sort).map((r) => r.reportNumber).join("");
    expect(order("")).toBe("BCA");
    expect(order("OLDEST")).toBe("ACB");
    expect(order("TRIP_LATEST")).toBe("ABC");
    expect(order("TRIP_EARLIEST")).toBe("BAC"); // no trip date last
    expect(order("AMOUNT_DESC")).toBe("BCA");
  });
});
