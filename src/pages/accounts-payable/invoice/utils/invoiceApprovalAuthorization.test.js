import { describe, it, expect } from "vitest";
import { isEligibleApproverForStep } from "./invoiceApprovalAuthorization";

// Realistic shapes matter here: user_uuid ("019e68eb-...") and a JWT's numeric employee id
// ("5100009") are different identifier spaces that happen to both be strings — a test using
// look-alike placeholder strings for both sides (e.g. "user-1") can pass even when the
// implementation compares the wrong two fields, which is exactly how the real regression this
// guards shipped undetected: an earlier version compared user.user_id against approver.user_uuid
// directly, hiding Approve/Reject/Send Back from every real approver.
describe("isEligibleApproverForStep", () => {
  const approvers = [
    { user_uuid: "019e68eb-06b3-ae1c-03d8-27e8949646eb" },
    { user_uuid: "0199bd8c-ef11-0ff0-1695-f2d12b5bcea2" },
  ];

  it("is true when the signed-in user's obs_user_uuid matches an approver's user_uuid", () => {
    expect(
      isEligibleApproverForStep(approvers, {
        user_id: 5100009, // present, but must NOT be what's compared
        obs_user_uuid: "019e68eb-06b3-ae1c-03d8-27e8949646eb",
      }),
    ).toBe(true);
  });

  it("is false for a real approver's own numeric user_id, even though it's the same person — user_id is not user_uuid", () => {
    // The exact regression: comparing user_id ("5100009") against user_uuid
    // ("019e68eb-...") must never accidentally match.
    expect(isEligibleApproverForStep(approvers, { user_id: "5100009" })).toBe(false);
  });

  it("falls back to user_uuid when obs_user_uuid is absent", () => {
    expect(isEligibleApproverForStep(approvers, { user_uuid: "0199bd8c-ef11-0ff0-1695-f2d12b5bcea2" })).toBe(true);
  });

  it("is false when the signed-in user's uuid is not among the approvers", () => {
    expect(isEligibleApproverForStep(approvers, { obs_user_uuid: "00000000-0000-0000-0000-000000000000" })).toBe(false);
  });

  it("compares case-insensitively, trimmed", () => {
    expect(
      isEligibleApproverForStep(approvers, { obs_user_uuid: " 019E68EB-06B3-AE1C-03D8-27E8949646EB " }),
    ).toBe(true);
  });

  it("is false with no approvers, no user, or a non-array", () => {
    expect(isEligibleApproverForStep([], { obs_user_uuid: approvers[0].user_uuid })).toBe(false);
    expect(isEligibleApproverForStep(approvers, null)).toBe(false);
    expect(isEligibleApproverForStep(undefined, { obs_user_uuid: approvers[0].user_uuid })).toBe(false);
  });
});
