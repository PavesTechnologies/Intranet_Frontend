import { describe, expect, it } from "vitest";
import {
  buildActivityRows,
  filterActivityRows,
  reportStatusInfo,
  reminderItems,
  settlementReminders,
  shortRef,
} from "@/pages/expense-management/components/dashboard/employeeActivity";

// "Today" is fixed so the due-date windows are predictable: 12 Nov 2026, afternoon.
const NOW = new Date(2026, 10, 12, 15, 0);

const advance = (over = {}) => ({
  advanceId: "a1b2c3d4-0000-0000-0000-000000000001",
  status: "DISBURSED",
  amount: 5000,
  baseAmount: 5000,
  currencyCode: "INR",
  purpose: "Client visit, Pune",
  outstandingBalance: 0,
  settlementDueDate: null,
  updatedAt: "2026-11-10T10:00:00",
  managerId: "MGR-SECRET-1",
  ...over,
});

const report = (over = {}) => ({
  reportId: "00000000-0000-0000-0000-0000000000f1",
  reportNumber: "ER-0007",
  title: "Pune trip",
  reportStatus: "PENDING_APPROVAL",
  paymentRoutingStatus: null,
  totalAmount: 1900,
  updatedAt: "2026-11-11T09:30:00",
  ...over,
});

describe("activity rows", () => {
  it("puts cash advances and expense reports in one list, newest first", () => {
    const rows = buildActivityRows(
      [advance({ updatedAt: "2026-11-01T10:00:00" }), advance({ advanceId: "b2", updatedAt: "2026-11-09T10:00:00" })],
      [report({ updatedAt: "2026-11-05T09:00:00" }), report({ reportId: "r2", reportNumber: "ER-0008", updatedAt: "2026-11-11T09:00:00" })],
    );
    expect(rows.map((r) => r.reference)).toEqual(["ER-0008", "#B2", "ER-0007", "#A1B2C3D4"]);
    expect(rows.map((r) => r.kind)).toEqual(["report", "advance", "report", "advance"]);
  });

  it("uses the real report number and the advance short reference, with the record's own amount", () => {
    const [row] = buildActivityRows([], [report()]);
    expect(row).toMatchObject({ kind: "report", reference: "ER-0007", description: "Pune trip", amount: 1900 });
    expect(row.to).toBe("/expense-management/expenses/reports/00000000-0000-0000-0000-0000000000f1");

    const [adv] = buildActivityRows([advance()], []);
    expect(adv).toMatchObject({ kind: "advance", reference: "#A1B2C3D4", description: "Client visit, Pune", amount: 5000 });
    expect(adv.to).toBe("/expense-management/cash-advance/a1b2c3d4-0000-0000-0000-000000000001");
  });

  it("never carries approver or manager fields into a row", () => {
    const rows = buildActivityRows([advance()], [report({ approverId: "APR-9" })]);
    const text = JSON.stringify(rows);
    expect(text).not.toContain("MGR-SECRET-1");
    expect(text).not.toContain("APR-9");
  });

  it("reads a report that AP has routed or paid as such, not just approved", () => {
    expect(reportStatusInfo("APPROVED", "PAYMENT_COMPLETED").label).toBe("Paid");
    expect(reportStatusInfo("APPROVED", "APPROVED_FOR_PAYMENT").label).toBe("Awaiting payment");
    expect(reportStatusInfo("APPROVED", null).label).toBe("Approved");
    expect(reportStatusInfo("AWAITING_CORRECTION", null)).toMatchObject({ label: "Returned", tone: "rose" });
    expect(reportStatusInfo("PENDING_FINANCE_VERIFICATION", null).label).toBe("Pending finance verification");
  });

  it("falls back to a short id when a report has no number", () => {
    expect(shortRef("abcdef1234567890")).toBe("#ABCDEF12");
    const [row] = buildActivityRows([], [report({ reportNumber: null })]);
    expect(row.reference).toBe("#00000000");
  });

  it("filters to one kind, or keeps everything for All", () => {
    const rows = buildActivityRows([advance()], [report()]);
    expect(filterActivityRows(rows, "all")).toHaveLength(2);
    expect(filterActivityRows(rows, "advance").every((r) => r.kind === "advance")).toBe(true);
    expect(filterActivityRows(rows, "report").every((r) => r.kind === "report")).toBe(true);
    expect(filterActivityRows([], "all")).toEqual([]);
  });
});

describe("settlement reminders", () => {
  it("lists advances that are overdue or due within a week, overdue first", () => {
    const reminders = settlementReminders(
      [
        advance({ advanceId: "due-in-3", outstandingBalance: 800, settlementDueDate: "2026-11-15" }),
        advance({ advanceId: "overdue-2", outstandingBalance: 500, settlementDueDate: "2026-11-10" }),
        advance({ advanceId: "due-in-10", outstandingBalance: 900, settlementDueDate: "2026-11-22" }),
        advance({ advanceId: "nothing-owed", outstandingBalance: 0, settlementDueDate: "2026-11-10" }),
        advance({ advanceId: "no-date", outstandingBalance: 400, settlementDueDate: null }),
      ],
      NOW,
    );
    expect(reminders.map((r) => r.advanceId)).toEqual(["overdue-2", "due-in-3"]);
    expect(reminders[0]).toMatchObject({ overdue: true, daysOverdue: 2, outstanding: 500 });
    expect(reminders[1]).toMatchObject({ overdue: false, daysUntilDue: 3, outstanding: 800 });
  });

  it("does not remind for advances that are closed, cancelled, rejected or still drafts", () => {
    const base = { outstandingBalance: 300, settlementDueDate: "2026-11-10" };
    const reminders = settlementReminders(
      ["DRAFT", "SETTLED", "CLOSED", "CANCELLED", "REJECTED"].map((status, i) => advance({ ...base, advanceId: `s${i}`, status })),
      NOW,
    );
    expect(reminders).toEqual([]);
  });
});

describe("settlement reminders as attention rows", () => {
  it("are shaped like the attention list rows and link to the advance", () => {
    const [row] = reminderItems(
      [advance({ advanceId: "due-soon-1", outstandingBalance: 800, settlementDueDate: "2026-11-15" })],
      NOW,
    );
    expect(row).toMatchObject({
      reportId: "due-soon-1",
      reportNumber: "#DUE-SOON",
      status: "Due soon",
      amount: 800,
      note: "Due in 3 days",
      to: "/expense-management/cash-advance/due-soon-1",
    });
  });

  it("marks an overdue advance as overdue", () => {
    const [row] = reminderItems([advance({ outstandingBalance: 500, settlementDueDate: "2026-11-10" })], NOW);
    expect(row).toMatchObject({ status: "Overdue", note: "Overdue by 2 days" });
  });
});
