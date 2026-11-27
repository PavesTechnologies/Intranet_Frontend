import { describe, expect, it } from "vitest";
import {
  employeeActionStates,
  listRowActionStates,
  claimRowActions,
  filterAndSortClaims,
  paymentInfo,
  statusTone,
  summarizeClaims,
} from "@/pages/expense-management/pages/supplementary/supplementaryClaimList";

const claim = (id, status, extra = {}) => ({
  claimId: id,
  claimNumber: `SUP-${id}`,
  reportNumber: `EXP-${id}`,
  status,
  totalAmount: 100,
  currencyCode: "INR",
  createdAt: "2026-11-10T10:00:00",
  items: [{ claimItemId: `${id}-1` }],
  paymentStatus: "NONE",
  ...extra,
});

describe("summarizeClaims", () => {
  it("counts each summary card from the claims returned, and pending approval covers manager and Finance", () => {
    const claims = [
      claim("1", "DRAFT"),
      claim("2", "DRAFT"),
      claim("3", "PENDING_MANAGER"),
      claim("4", "PENDING_FINANCE"),
      claim("5", "CLARIFICATION_REQUIRED"),
      claim("6", "SETTLED"),
      claim("7", "CANCELLED"),
    ];

    expect(summarizeClaims(claims)).toEqual({
      total: 7,
      draft: 2,
      pendingApproval: 2,
      clarification: 1,
      settled: 1,
    });
  });

  it("returns zeros for an empty list", () => {
    expect(summarizeClaims([])).toEqual({ total: 0, draft: 0, pendingApproval: 0, clarification: 0, settled: 0 });
  });
});

describe("statusTone", () => {
  it.each([
    ["DRAFT", "neutral"],
    ["PENDING_MANAGER", "info"],
    ["PENDING_FINANCE", "info"],
    ["CLARIFICATION_REQUIRED", "warning"],
    ["APPROVED", "success"],
    ["SETTLED", "success"],
    ["MANAGER_REJECTED", "danger"],
    ["FINANCE_REJECTED", "danger"],
    ["CANCELLED", "muted"],
  ])("gives %s the %s badge colour", (status, tone) => {
    expect(statusTone(status)).toBe(tone);
  });
});

describe("paymentInfo", () => {
  it("shows the payment reference only once the claim is paid", () => {
    expect(paymentInfo({ paymentStatus: "PAID", paymentReference: "UTR-1" })).toEqual({ label: "Paid", tone: "success", reference: "UTR-1" });
    expect(paymentInfo({ paymentStatus: "REQUESTED", paymentReference: null }).label).toBe("Awaiting payment");
  });

  it("reports no payment details yet as not started", () => {
    expect(paymentInfo({ paymentStatus: "NONE" }).label).toBe("Not started");
    expect(paymentInfo({}).label).toBe("Not started");
  });
});

describe("filterAndSortClaims", () => {
  const claims = [
    claim("A", "DRAFT", { totalAmount: 50, createdAt: "2026-11-01T09:00:00", reportNumber: "EXP-2026-OLD" }),
    claim("B", "SETTLED", { totalAmount: 300, createdAt: "2026-11-05T09:00:00" }),
    claim("C", "DRAFT", { totalAmount: 120, createdAt: "2026-11-03T09:00:00", items: [] }),
  ];

  it("searches the claim reference and the original report reference", () => {
    expect(filterAndSortClaims(claims, { search: "sup-b" }).map((c) => c.claimId)).toEqual(["B"]);
    expect(filterAndSortClaims(claims, { search: "2026-old" }).map((c) => c.claimId)).toEqual(["A"]);
    expect(filterAndSortClaims(claims, { search: "nothing" })).toEqual([]);
  });

  it("filters by one status", () => {
    expect(filterAndSortClaims(claims, { status: "DRAFT" }).map((c) => c.claimId).sort()).toEqual(["A", "C"]);
  });

  it("sorts by creation date, newest first by default", () => {
    expect(filterAndSortClaims(claims).map((c) => c.claimId)).toEqual(["B", "C", "A"]);
    expect(filterAndSortClaims(claims, { sort: "created-asc" }).map((c) => c.claimId)).toEqual(["A", "C", "B"]);
  });

  it("sorts by claim amount", () => {
    expect(filterAndSortClaims(claims, { sort: "amount-desc" }).map((c) => c.claimId)).toEqual(["B", "C", "A"]);
    expect(filterAndSortClaims(claims, { sort: "amount-asc" }).map((c) => c.claimId)).toEqual(["A", "C", "B"]);
  });

  it("keeps a Draft with zero expense items in the list", () => {
    expect(filterAndSortClaims(claims).map((c) => c.claimId)).toContain("C");
  });
});

describe("claimRowActions", () => {
  it("always offers View", () => {
    expect(claimRowActions(claim("1", "SETTLED")).canView).toBe(true);
  });

  it("offers Edit only for Draft and Clarification Required", () => {
    const editable = ["DRAFT", "CLARIFICATION_REQUIRED"];
    for (const status of ["DRAFT", "PENDING_MANAGER", "PENDING_FINANCE", "CLARIFICATION_REQUIRED", "APPROVED", "PAYMENT_PENDING", "SETTLED", "MANAGER_REJECTED", "FINANCE_REJECTED", "CANCELLED"]) {
      expect(claimRowActions(claim("1", status)).canEdit).toBe(editable.includes(status));
    }
  });

  it("offers Cancel only where the backend allows it", () => {
    const cancellable = ["DRAFT", "PENDING_MANAGER", "CLARIFICATION_REQUIRED"];
    for (const status of ["DRAFT", "PENDING_MANAGER", "PENDING_FINANCE", "CLARIFICATION_REQUIRED", "APPROVED", "SETTLED", "CANCELLED"]) {
      expect(claimRowActions(claim("1", status)).canCancel).toBe(cancellable.includes(status));
    }
  });
});

describe("row and workflow action states", () => {
  it("keeps View allowed and gives Edit and Cancel a reason when they do not apply", () => {
    const settled = listRowActionStates(claim("1", "SETTLED"));
    expect(settled.view.allowed).toBe(true);
    expect(settled.edit.allowed).toBe(false);
    expect(settled.edit.reason).toMatch(/Draft or a claim that needs clarification/);
    expect(settled.cancel.allowed).toBe(false);
    expect(settled.cancel.reason).toMatch(/Cancel is available only/);
  });

  it("allows Edit and Cancel on a Draft", () => {
    const draft = listRowActionStates(claim("1", "DRAFT"));
    expect(draft.edit.allowed).toBe(true);
    expect(draft.cancel.allowed).toBe(true);
  });

  it("explains why submit is blocked when an expense has no receipt", () => {
    const draft = { ...claim("1", "DRAFT"), items: [{ claimItemId: "a", receipts: [] }] };
    expect(employeeActionStates(draft).submit).toEqual({
      allowed: false,
      reason: "Every expense needs a receipt before you submit.",
    });
  });

  it("explains that a submitted claim cannot be submitted again", () => {
    expect(employeeActionStates(claim("1", "PENDING_MANAGER")).submit.reason).toBe("Only a Draft can be submitted.");
  });
});
