import { describe, expect, it } from "vitest";
import { settlementFiguresFor, settlementTotals, usageShares } from "../settlementFigures";
import { figuresForAdvance } from "../useAdvanceFigures";

describe("settlementFiguresFor", () => {
  it("nothing spent yet: the whole advance remains and is outstanding", () => {
    const f = settlementFiguresFor({ amount: 5000, disbursedAmount: 5000 }, { claimedAmount: 0, totalRepaidAmount: 0 }, 0);
    expect(f).toMatchObject({ disbursed: 5000, consumed: 0, remaining: 5000, salaryDeducted: 0, outstanding: 5000 });
  });

  it("part spent, part deducted from salary: outstanding is what neither covers", () => {
    // 10,000 paid; 6,000 of expenses; 1,500 taken from salary (posted as a repayment too); 500 repaid in cash.
    const f = settlementFiguresFor(
      { amount: 10000, disbursedAmount: 10000 },
      { claimedAmount: 6000, approvedAmount: 4000, totalRepaidAmount: 2000 },
      1500,
    );
    expect(f).toMatchObject({
      consumed: 6000, approvedConsumed: 4000, remaining: 4000, salaryDeducted: 1500, otherRepaid: 500, outstanding: 2000,
    });
  });

  it("expenses above the advance: nothing remains and the company owes the difference", () => {
    const f = settlementFiguresFor({ amount: 3000, disbursedAmount: 3000 }, { claimedAmount: 3800, totalRepaidAmount: 0 }, 0);
    expect(f).toMatchObject({ remaining: 0, owedToEmployee: 800, outstanding: 0 });
  });

  it("uses the stored figures until the server's utilization arrives", () => {
    const f = settlementFiguresFor({ amount: 2000, verifiedExpenseAmount: 500 }, null, 0);
    expect(f).toMatchObject({ disbursed: 2000, consumed: 500, remaining: 1500, outstanding: 1500, loaded: false });
  });

  it("new cash request: owed equals disbursed", () => {
    const f = settlementFiguresFor(
      { requestedAmount: 6000, amount: 5000, approvedAmount: 5000, disbursedAmount: 5000 },
      { claimedAmount: 3000, totalRepaidAmount: 0 },
      0,
    );
    expect(f).toMatchObject({ requested: 6000, approved: 5000, disbursed: 5000, carriedIn: 0, owed: 5000, remaining: 2000, outstanding: 2000 });
  });

  it("request with outstanding brought in: disbursed is the cash, owed is cash + outstanding", () => {
    // 3,000 new cash, 500 outstanding rolled in: the advance amount is 3,500, only 3,000 is paid.
    const f = settlementFiguresFor(
      { requestedAmount: 3000, amount: 3500, approvedAmount: 3500, disbursedAmount: 3000, carriedInAmount: 500 },
      { claimedAmount: 3200, totalRepaidAmount: 0 },
      0,
    );
    expect(f).toMatchObject({ approved: 3500, disbursed: 3000, carriedIn: 500, owed: 3500, consumed: 3200, remaining: 300, outstanding: 300 });
  });

  it("carried forward leaves the advance: held money is outstanding for the employee, not on the advance", () => {
    // 5,000 owed, 4,500 spent, the 500 balance carried forward and not yet taken in by a later advance.
    const f = settlementFiguresFor(
      { amount: 5000, disbursedAmount: 5000, carriedOutAmount: 500, carryForwardReadyAmount: 500 },
      { claimedAmount: 4500, totalRepaidAmount: 0 },
      0,
    );
    expect(f).toMatchObject({ remaining: 500, carriedForward: 500, held: 500, moved: 0, outstanding: 0 });
    expect(settlementTotals([f])).toMatchObject({ outstandingOnAdvances: 0, held: 500, outstanding: 500 });
  });

  it("once a later advance takes the held money in, it is counted there and not twice", () => {
    const source = settlementFiguresFor(
      { amount: 5000, disbursedAmount: 5000, carriedOutAmount: 500 },
      { claimedAmount: 4500, totalRepaidAmount: 0 },
      0,
    );
    const next = settlementFiguresFor(
      { amount: 3500, approvedAmount: 3500, disbursedAmount: 3000, carriedInAmount: 500 },
      { claimedAmount: 0, totalRepaidAmount: 0 },
      0,
    );
    expect(source).toMatchObject({ held: 0, moved: 500, outstanding: 0 });
    expect(settlementTotals([source, next])).toMatchObject({ held: 0, outstanding: 3500 });
  });
});

describe("settlementTotals and usageShares", () => {
  it("adds the rows up", () => {
    const rows = [
      settlementFiguresFor({ amount: 1000 }, { claimedAmount: 0, totalRepaidAmount: 0 }, 0),
      settlementFiguresFor({ amount: 5000 }, { claimedAmount: 2000, totalRepaidAmount: 1000 }, 1000),
    ];
    expect(settlementTotals(rows)).toMatchObject({
      count: 2, disbursed: 6000, consumed: 2000, remaining: 4000, salaryDeducted: 1000, otherRepaid: 0, outstanding: 3000,
    });
  });

  it("splits the bar into spent, recovered and outstanding", () => {
    const f = settlementFiguresFor({ amount: 10000 }, { claimedAmount: 6000, totalRepaidAmount: 2000 }, 1500);
    expect(usageShares(f)).toEqual({ spent: 60, recovered: 20, carried: 0, outstanding: 20 });
  });
});

describe("approval cut and approved-but-unpaid", () => {
  // Shaped like a real advance: asked 5,000, the manager approved 3,500, not paid out yet.
  const cutAdvance = { advanceId: "c1", status: "APPROVED", requestedAmount: 5000, approvedAmount: 3500, amount: 3500 };
  const paid = { advanceId: "p1", status: "IN_PROGRESS", requestedAmount: 2000, approvedAmount: 2000, amount: 2000, disbursedAmount: 2000 };

  it("an approved, unpaid advance shows its cut and the amount still to disburse", () => {
    const f = figuresForAdvance(cutAdvance, null);
    expect(f).toMatchObject({ paidOut: false, requested: 5000, approved: 3500, cut: 1500, awaitingDisbursement: 3500, disbursed: 0 });
  });

  it("totals count the cut and what is approved but not paid", () => {
    const t = settlementTotals([figuresForAdvance(cutAdvance, null), figuresForAdvance(paid, { claimedAmount: 0 })]);
    expect(t).toMatchObject({ requested: 7000, approved: 5500, cut: 1500, cutCount: 1, awaitingDisbursement: 3500, awaitingCount: 1, disbursed: 2000 });
  });
});

