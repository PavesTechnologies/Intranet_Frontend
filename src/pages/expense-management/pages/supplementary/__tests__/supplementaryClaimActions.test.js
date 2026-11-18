import { describe, expect, it } from "vitest";
import { claimActions } from "@/pages/expense-management/pages/supplementary/supplementaryClaimActions";

const withItems = (extra) => ({ items: [{ claimItemId: "1", amount: 50, receipts: [{ receiptId: "r1" }] }], ...extra });

describe("claimActions", () => {
  it("does not allow submit while an expense has no receipt", () => {
    const actions = claimActions(
      { status: "DRAFT", createdOnBehalf: false, items: [{ claimItemId: "1", amount: 50, receipts: [] }] },
      "employee",
    );

    expect(actions.canSubmit).toBe(false);
  });

  it("allows submit only when every expense has at least one receipt", () => {
    const actions = claimActions(
      {
        status: "DRAFT",
        createdOnBehalf: false,
        items: [
          { claimItemId: "1", amount: 50, receipts: [{ receiptId: "r1" }] },
          { claimItemId: "2", amount: 20, receipts: [] },
        ],
      },
      "employee",
    );

    expect(actions.canSubmit).toBe(false);
  });

  it("does not let the employee submit a Finance-created claim until they acknowledge it", () => {
    const actions = claimActions(withItems({ status: "DRAFT", createdOnBehalf: true, employeeConfirmedAt: null }), "employee");

    expect(actions.canAcknowledge).toBe(true);
    expect(actions.canSubmit).toBe(false);
  });

  it("allows submit once a Finance-created claim is acknowledged and has at least one expense", () => {
    const actions = claimActions(
      withItems({ status: "DRAFT", createdOnBehalf: true, employeeConfirmedAt: "2026-11-01T10:00:00" }),
      "employee",
    );

    expect(actions.canAcknowledge).toBe(false);
    expect(actions.canSubmit).toBe(true);
  });

  it("does not allow submit of a draft with no expenses", () => {
    const actions = claimActions({ status: "DRAFT", items: [], createdOnBehalf: false }, "employee");

    expect(actions.canSubmit).toBe(false);
    expect(actions.canEditItems).toBe(true);
  });

  it("lets the employee edit and resubmit a claim sent back for clarification", () => {
    const actions = claimActions(withItems({ status: "CLARIFICATION_REQUIRED" }), "employee");

    expect(actions.canEditItems).toBe(true);
    expect(actions.canResubmit).toBe(true);
    expect(actions.canSubmit).toBe(false);
  });

  it("offers manager review only to the manager screen, and only while the claim waits for the manager", () => {
    const claim = withItems({ status: "PENDING_MANAGER" });

    expect(claimActions(claim, "manager").canManagerReview).toBe(true);
    expect(claimActions(claim, "employee").canManagerReview).toBe(false);
    expect(claimActions(claim, "finance").canManagerReview).toBe(false);
  });

  it("offers Finance review only to the Finance screen, and only while the claim waits for Finance", () => {
    const claim = withItems({ status: "PENDING_FINANCE" });

    expect(claimActions(claim, "finance").canFinanceReview).toBe(true);
    expect(claimActions(claim, "manager").canFinanceReview).toBe(false);
    expect(claimActions(claim, "employee").canFinanceReview).toBe(false);
  });

  it("never offers employee actions on a settled or cancelled claim", () => {
    const settled = claimActions(withItems({ status: "SETTLED" }), "employee");
    const cancelled = claimActions(withItems({ status: "CANCELLED" }), "employee");

    for (const actions of [settled, cancelled]) {
      expect(actions.canEditItems).toBe(false);
      expect(actions.canSubmit).toBe(false);
      expect(actions.canResubmit).toBe(false);
      expect(actions.canCancel).toBe(false);
    }
  });

  it("returns no actions for a missing claim", () => {
    const actions = claimActions(null, "employee");

    expect(actions.canSubmit).toBe(false);
    expect(actions.canEditItems).toBe(false);
  });
});
