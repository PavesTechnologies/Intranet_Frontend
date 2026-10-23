import { describe, it, expect } from "vitest";
import { getStageIndex } from "../cashAdvanceStages";

describe("getStageIndex", () => {
  it("treats an approved-but-not-disbursed advance as stage 3, not as settled", () => {
    // Regression: APPROVED used to map to stage 6, which marked Disbursement as completed
    expect(getStageIndex("APPROVED")).toBe(3);
  });

  it("keeps disbursed and in-progress advances at stage 3", () => {
    expect(getStageIndex("DISBURSED")).toBe(3);
    expect(getStageIndex("IN_PROGRESS")).toBe(3);
  });

  it("moves to stage 6 once expenses are being settled", () => {
    expect(getStageIndex("SETTLEMENT_PENDING")).toBe(6);
    expect(getStageIndex("EXPENSE_VERIFIED")).toBe(6);
    expect(getStageIndex("PARTIALLY_ADJUSTED")).toBe(6);
  });

  it("marks closed advances as stage 7", () => {
    expect(getStageIndex("CLOSED")).toBe(7);
    expect(getStageIndex("SETTLED")).toBe(7);
  });

  it("keeps pending approval at stage 1 and the approval-in-progress state at stage 2", () => {
    expect(getStageIndex("SUBMITTED")).toBe(1);
    expect(getStageIndex("PENDING_FINANCE_APPROVAL")).toBe(1);
    expect(getStageIndex("APPROVED_REQUEST")).toBe(2);
  });

  it("returns -1 for rejected and cancelled advances", () => {
    expect(getStageIndex("REJECTED")).toBe(-1);
    expect(getStageIndex("CANCELLED")).toBe(-1);
  });
});
