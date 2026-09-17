import { describe, it, expect } from "vitest";
import { isEligibleApproverForStep } from "./invoiceApprovalAuthorization";

describe("isEligibleApproverForStep", () => {
  const approvers = [{ user_uuid: "user-1" }, { user_uuid: "user-2" }];

  it("is true when the signed-in user's user_id matches an approver", () => {
    expect(isEligibleApproverForStep(approvers, { user_id: "user-2" })).toBe(true);
  });

  it("falls back to the sub claim when user_id is absent, same as the backend's own precedence", () => {
    expect(isEligibleApproverForStep(approvers, { sub: "user-1" })).toBe(true);
  });

  it("is false when the signed-in user is not among the approvers", () => {
    expect(isEligibleApproverForStep(approvers, { user_id: "someone-else" })).toBe(false);
  });

  it("compares as trimmed strings, tolerating a numeric JWT claim", () => {
    expect(isEligibleApproverForStep([{ user_uuid: "42" }], { user_id: 42 })).toBe(true);
  });

  it("is false with no approvers, no user, or a non-array", () => {
    expect(isEligibleApproverForStep([], { user_id: "user-1" })).toBe(false);
    expect(isEligibleApproverForStep(approvers, null)).toBe(false);
    expect(isEligibleApproverForStep(undefined, { user_id: "user-1" })).toBe(false);
  });
});
