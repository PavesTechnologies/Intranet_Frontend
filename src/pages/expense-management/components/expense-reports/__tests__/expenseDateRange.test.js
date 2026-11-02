import { describe, expect, it } from "vitest";
import {
  advanceExpenseDeadline,
  expenseDateError,
  expenseDateHint,
  fallbackRange,
} from "@/pages/expense-management/components/expense-reports/expenseDateRange";
import { toIsoDate } from "@/pages/expense-management/pages/reports/reportUtils";

// The cases below mirror ExpenseDatePolicyTest on the server, with today fixed at 2026-10-28.
const TODAY = "2026-10-28";

const range = (overrides) => ({
  minDate: null,
  maxDate: TODAY,
  today: TODAY,
  basis: "the report's trip dates",
  blockedReason: null,
  ...overrides,
});

describe("local calendar date", () => {
  it("uses the employee's calendar day, not the UTC day", () => {
    // 00:30 on 28 Oct local time. In India this is 27 Oct in UTC, which toISOString() would report.
    expect(toIsoDate(new Date(2026, 9, 28, 0, 30))).toBe("2026-10-28");
  });

  it("fallback permits today and refuses tomorrow", () => {
    const fallback = fallbackRange(new Date(2026, 9, 28, 0, 30));

    expect(fallback.today).toBe(TODAY);
    expect(expenseDateError(TODAY, fallback)).toBeNull();
    expect(expenseDateError("2026-10-29", fallback)).toBe("Expense date 2026-10-29 cannot be in the future.");
  });
});

describe("standalone report, trip dates", () => {
  const trip = range({ minDate: "2026-10-20", maxDate: "2026-10-25" });

  it("accepts the first and last trip day", () => {
    expect(expenseDateError("2026-10-20", trip)).toBeNull();
    expect(expenseDateError("2026-10-25", trip)).toBeNull();
  });

  it("refuses the days either side of the trip", () => {
    expect(expenseDateError("2026-10-19", trip)).toBe(
      "Expense date 2026-10-19 must fall within the report's trip dates (2026-10-20 to 2026-10-25).",
    );
    expect(expenseDateError("2026-10-26", trip)).toContain("must fall within the report's trip dates");
  });

  it("permits no date while the trip has not started", () => {
    const notStarted = range({
      minDate: null,
      maxDate: TODAY,
      blockedReason: "The trip starts on 2026-10-31, so no expense can be dated yet.",
    });

    expect(expenseDateError("2026-10-27", notStarted)).toBe("The trip starts on 2026-10-31, so no expense can be dated yet.");
    expect(expenseDateHint(notStarted)).toBe("The trip starts on 2026-10-31, so no expense can be dated yet.");
  });
});

describe("cash-advance-linked report, trip dates and 30-day deadline", () => {
  it("refuses a date before the trip start and accepts a date inside the trip", () => {
    const linked = range({ minDate: "2026-10-20", maxDate: "2026-10-27", basis: "the report's trip dates and the cash advance expense deadline" });

    expect(expenseDateError("2026-10-18", linked)).toContain("must fall within");
    expect(expenseDateError("2026-10-25", linked)).toBeNull();
  });

  it("gives the whole trip when cash arrived after it ended", () => {
    const late = range({ minDate: "2026-10-02", maxDate: "2026-10-28", today: "2026-11-02", basis: "the report's trip dates and the cash advance expense deadline" });

    expect(expenseDateError("2026-10-02", late)).toBeNull();
    expect(expenseDateError("2026-10-28", late)).toBeNull();
    expect(expenseDateError("2026-10-29", late)).toContain("must fall within");
  });

  it("refuses a future date even inside the trip", () => {
    const linked = range({ minDate: "2026-10-28", maxDate: "2026-11-03", today: "2026-11-03", basis: "the report's trip dates and the cash advance expense deadline" });

    expect(expenseDateError("2026-11-02", linked)).toBeNull();
    expect(expenseDateError("2026-11-04", linked)).toBe("Expense date 2026-11-04 cannot be in the future.");
  });

  it("shows the server's blocked reason when no date is permitted", () => {
    const blocked = range({ minDate: null, maxDate: null, blockedReason: "The trip starts on 2026-11-05, so no expense can be dated yet." });

    expect(expenseDateError(TODAY, blocked)).toBe("The trip starts on 2026-11-05, so no expense can be dated yet.");
  });
});

describe("all reports", () => {
  it("refuses a future date even inside the range", () => {
    const trip = range({ minDate: "2026-10-20", maxDate: "2026-10-28" });

    expect(expenseDateError("2026-10-29", trip)).toBe("Expense date 2026-10-29 cannot be in the future.");
  });

  it("asks for a date when none is entered", () => {
    expect(expenseDateError("", range())).toBe("Expense date is required.");
  });

  it("describes the permitted window as a hint", () => {
    expect(expenseDateHint(range({ minDate: "2026-10-20", maxDate: "2026-10-25" }))).toBe(
      "Permitted dates: 2026-10-20 to 2026-10-25 (the report's trip dates).",
    );
  });
});

describe("expense deadline on a cash-advance-linked report", () => {
  it("is 30 days after the trip end date", () => {
    expect(advanceExpenseDeadline("2026-10-28")).toBe("2026-11-27");
  });

  it("crosses a year end", () => {
    expect(advanceExpenseDeadline("2026-12-15")).toBe("2027-01-14");
  });

  it("is absent when the trip end is not set", () => {
    expect(advanceExpenseDeadline(null)).toBeNull();
    expect(advanceExpenseDeadline("")).toBeNull();
  });
});
