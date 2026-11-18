import { describe, expect, it } from "vitest";
import { claimActions } from "@/pages/expense-management/pages/supplementary/supplementaryClaimActions";

const ALL_STATUSES = [
  "DRAFT",
  "PENDING_MANAGER",
  "MANAGER_REJECTED",
  "PENDING_FINANCE",
  "FINANCE_REJECTED",
  "CLARIFICATION_REQUIRED",
  "APPROVED",
  "PAYMENT_PENDING",
  "SETTLED",
  "CANCELLED",
];

const claimWithStatus = (status) => ({
  status,
  createdOnBehalf: false,
  items: [{ claimItemId: "1", amount: 50, receipts: [{ receiptId: "r1" }] }],
});

// Edit and Delete on an expense are both gated by canEditItems, the same flag that shows the row actions.
describe("edit and delete visibility", () => {
  it("offers Edit and Delete to the employee only while the claim is Draft or needs clarification", () => {
    const editable = ALL_STATUSES.filter((s) => claimActions(claimWithStatus(s), "employee").canEditItems);

    expect(editable.sort()).toEqual(["CLARIFICATION_REQUIRED", "DRAFT"]);
  });

  it.each(ALL_STATUSES)("never offers Edit or Delete on a %s claim to the manager or Finance screens", (status) => {
    expect(claimActions(claimWithStatus(status), "manager").canEditItems).toBe(false);
    expect(claimActions(claimWithStatus(status), "finance").canEditItems).toBe(false);
  });

  it.each(["PENDING_MANAGER", "PENDING_FINANCE", "APPROVED", "PAYMENT_PENDING", "SETTLED", "MANAGER_REJECTED", "FINANCE_REJECTED", "CANCELLED"])(
    "does not offer Edit or Delete to the employee on a %s claim",
    (status) => {
      expect(claimActions(claimWithStatus(status), "employee").canEditItems).toBe(false);
    },
  );
});
