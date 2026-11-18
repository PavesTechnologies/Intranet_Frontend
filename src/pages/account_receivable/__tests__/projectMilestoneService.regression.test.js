import { describe, expect, it, vi, beforeEach } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.hoisted(() => {
  window.__APP_CONFIG__ = { ...(window.__APP_CONFIG__ || {}), AR_BASE_URL: "http://ar.test" };
});
vi.mock("../../../api/axiosInstance", () => ({ default: api }));

import {
  MILESTONE_ENTRY_STATE,
  getMilestoneEntryFrozenState,
  getMilestoneIneligibilityReason,
  getProjectMilestones,
  isMilestoneEntryFrozen,
  isMilestoneEntryLocked,
  mapProjectMilestone,
  toPmsProjectId,
} from "../services/projectMilestoneService";

beforeEach(() => {
  api.get.mockReset();
});

// These tests rebuild coverage for the AR milestone service from the current source (the original __tests__ folder is
// missing). The transport is mocked, so they do not exercise the real AR backend.
describe("toPmsProjectId", () => {
  it.each([[9002, 9002], ["9002", 9002], [" 12 ", 12]])("accepts %p", (input, expected) => expect(toPmsProjectId(input)).toBe(expected));
  it.each([[null], [undefined], [""], [0], [-3], [1.5], ["abc"], ["6f1c2a0e-1111-2222-3333-444455556666"]])("rejects %p", (input) =>
    expect(toPmsProjectId(input)).toBeNull(),
  );
});

describe("mapProjectMilestone", () => {
  it("maps backend fields to the wizard view model without inventing values", () => {
    const m = mapProjectMilestone({
      pmsMilestoneId: "11", pmsProjectId: 9002, milestoneCode: "M-1", milestoneName: "Kickoff",
      plannedDueDate: "2026-12-15T10:00:00", executionStatus: "IN_PROGRESS", billable: true,
      allocationPercentage: "25.5", billingReadiness: "READY_FOR_BILLING", sourceVersion: 3,
      billingState: "reserved", billingConfigurationId: "cfg-1", eligibleForBilling: false, ineligibilityReason: "Reserved",
    });
    expect(m).toMatchObject({
      id: 11, pmsMilestoneId: 11, pmsProjectId: 9002, code: "M-1", name: "Kickoff",
      plannedCompletionDate: "2026-12-15", executionStatus: "IN_PROGRESS", billable: true,
      pmsAllocationPercentage: 25.5, billingReadiness: "READY_FOR_BILLING", sourceVersion: 3,
      billingState: "RESERVED", billingConfigurationId: "cfg-1", eligibleForBilling: false, ineligibilityReason: "Reserved",
    });
  });

  it("leaves billingState and eligibility unset when the backend does not send them (never defaults to AVAILABLE)", () => {
    const m = mapProjectMilestone({ pmsMilestoneId: 5 });
    expect(m).not.toHaveProperty("billingState");
    expect(m).not.toHaveProperty("eligibleForBilling");
    expect(m).not.toHaveProperty("ineligibilityReason");
    expect(m.billable).toBeNull();
    expect(m.pmsAllocationPercentage).toBeNull();
  });
});

describe("getMilestoneIneligibilityReason", () => {
  it("trusts the backend's eligibleForBilling=true over any other field", () => {
    expect(getMilestoneIneligibilityReason({ eligibleForBilling: true, billingState: "INVOICED", billable: false })).toBeNull();
  });
  it("prefers the backend reason", () => {
    expect(getMilestoneIneligibilityReason({ eligibleForBilling: false, ineligibilityReason: "Held by plan X", billingState: "RESERVED" })).toBe("Held by plan X");
  });
  it.each([
    [{ billingState: "INVOICED" }, "Milestone has already been invoiced."],
    [{ billingState: "IN_BILLING" }, "Milestone is currently in billing."],
    [{ billingState: "RESERVED", billingConfigurationId: "cfg-9" }, "Reserved by billing plan cfg-9"],
    [{ billable: false }, "Not billable in PMS"],
    [{ billingReadiness: "NOT_READY" }, "Not ready for billing in PMS"],
    [{ eligibleForBilling: false }, "Not eligible for billing."],
  ])("falls back for %j", (milestone, expected) => expect(getMilestoneIneligibilityReason(milestone)).toBe(expected));
  it("returns null for an unknown, ready milestone", () => {
    expect(getMilestoneIneligibilityReason({ billable: true, billingReadiness: "READY_FOR_BILLING" })).toBeNull();
  });
});

describe("saved entry frozen state", () => {
  it("is decided only by the entry's own frozen flag", () => {
    expect(getMilestoneEntryFrozenState({ paymentEntryId: "e", frozen: true })).toBe(MILESTONE_ENTRY_STATE.FROZEN);
    expect(getMilestoneEntryFrozenState({ paymentEntryId: "e", frozen: false })).toBe(MILESTONE_ENTRY_STATE.UNFROZEN);
    expect(getMilestoneEntryFrozenState({ paymentEntryId: "e" })).toBe(MILESTONE_ENTRY_STATE.UNKNOWN);
    expect(getMilestoneEntryFrozenState({ clientKey: "new" })).toBe(MILESTONE_ENTRY_STATE.UNSAVED);
    expect(getMilestoneEntryFrozenState(undefined)).toBe(MILESTONE_ENTRY_STATE.UNSAVED);
  });
  it("never infers frozen from billingState or isFrozen", () => {
    expect(isMilestoneEntryFrozen({ paymentEntryId: "e", billingState: "INVOICED", isFrozen: true })).toBe(false);
  });
  it("locks frozen and unknown saved entries, but not unfrozen or unsaved ones", () => {
    expect(isMilestoneEntryLocked({ paymentEntryId: "e", frozen: true })).toBe(true);
    expect(isMilestoneEntryLocked({ paymentEntryId: "e" })).toBe(true);
    expect(isMilestoneEntryLocked({ paymentEntryId: "e", frozen: false })).toBe(false);
    expect(isMilestoneEntryLocked({ clientKey: "new" })).toBe(false);
  });
});

describe("getProjectMilestones", () => {
  it("calls the AR backend milestones endpoint for the PMS project id and maps the list", async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [{ pmsMilestoneId: 11, billingState: "AVAILABLE" }, { pmsMilestoneId: null }] } });
    const list = await getProjectMilestones("9002");
    expect(api.get).toHaveBeenCalledWith("http://ar.test/api/projects/9002/milestones", undefined);
    expect(list).toHaveLength(1); // rows without a PMS id are dropped
    expect(list[0]).toMatchObject({ pmsMilestoneId: 11, billingState: "AVAILABLE" });
  });

  it("forwards an abort signal", async () => {
    api.get.mockResolvedValue({ data: [] });
    const signal = new AbortController().signal;
    await getProjectMilestones(9002, { signal });
    expect(api.get.mock.calls[0][1]).toEqual({ signal });
  });

  it("rejects an invalid id without calling the API", async () => {
    await expect(getProjectMilestones("not-a-pms-id")).rejects.toThrow(/not linked to a PMS project/i);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("propagates API failures instead of falling back to stored data", async () => {
    const failure = Object.assign(new Error("PMS sync unavailable"), { response: { status: 503 } });
    api.get.mockImplementation(async () => {
      throw failure;
    });
    let caught;
    try {
      await getProjectMilestones(9002);
    } catch (error) {
      caught = error;
    }
    expect(caught?.message).toBe("PMS sync unavailable");
    expect(caught?.response?.status).toBe(503);
  });
});
