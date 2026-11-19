import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../../../api/axiosInstance";
import {
  getMilestoneIneligibilityReason,
  getProjectMilestones,
  MILESTONE_ENTRY_STATE,
  getMilestoneEntryFrozenState,
  isMilestoneEntryFrozen,
  isMilestoneEntryLocked,
  mapProjectMilestone,
  toPmsProjectId,
} from "../services/projectMilestoneService";
import {
  buildMilestonePlanRequestPayload,
  normalizeMilestonePaymentEntry,
  normalizeMilestonePlanConfig,
  getApiErrorMessage,
  toProjectInfoFields,
  normalizeProject,
} from "../services/billingConfigurationService";

vi.mock("../../../api/axiosInstance", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// The exact shape of the backend's ProjectMilestoneResponseDto.
const dto = (overrides = {}) => ({
  pmsMilestoneId: 4711,
  pmsProjectId: 9002,
  milestoneCode: "M-01",
  milestoneName: "Design sign-off",
  description: "UX approved",
  pmsEpicId: 7,
  plannedStartDate: "2026-10-01",
  plannedDueDate: "2026-12-15",
  actualCompletionDate: null,
  executionStatus: "IN_PROGRESS",
  billable: true,
  allocationPercentage: 25.5,
  billingReadiness: "NOT_READY",
  sourceVersion: 3,
  createdAt: "2026-10-01T10:00:00",
  changedAt: "2026-10-02T10:00:00",
  lastSyncedAt: "2026-10-02T10:00:05",
  ...overrides,
});

describe("PMS milestone service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GETs /api/projects/{pmsProjectId}/milestones with the numeric PMS project id", async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [dto()] } });

    const result = await getProjectMilestones(9002);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get.mock.calls[0][0]).toMatch(/\/api\/projects\/9002\/milestones$/);
    expect(result).toHaveLength(1);
  });

  it("accepts a numeric string id but never calls the API for a missing or non-PMS id", async () => {
    api.get.mockResolvedValue({ data: { data: [] } });
    await getProjectMilestones("9002");
    expect(api.get.mock.calls[0][0]).toMatch(/\/projects\/9002\/milestones$/);

    api.get.mockClear();
    for (const bad of [null, undefined, "", 0, -3, 1.5, "abc", "3fa85f64-5717-4562-b3fc-2c963f66afa6"]) {
      await expect(getProjectMilestones(bad)).rejects.toThrow(/not linked to a PMS project/);
    }
    expect(api.get).not.toHaveBeenCalled();
    expect(toPmsProjectId("101")).toBe(101);
    expect(toPmsProjectId("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBeNull();
  });

  it("passes an abort signal through to the request", async () => {
    api.get.mockResolvedValueOnce({ data: { data: [] } });
    const controller = new AbortController();
    await getProjectMilestones(9002, { signal: controller.signal });
    expect(api.get.mock.calls[0][1]).toEqual({ signal: controller.signal });
  });

  it("does not hide a failed request (no stored/sample fallback)", async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500, data: { message: "PMS sync unavailable" } } });
    await expect(getProjectMilestones(9002)).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("returns an empty list for a project without milestones", async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    await expect(getProjectMilestones(9002)).resolves.toEqual([]);
  });

  it("maps every backend field explicitly and fabricates none of the mock-only fields", () => {
    const milestone = mapProjectMilestone(dto({ actualCompletionDate: "2026-12-10T08:30:00" }));

    expect(milestone).toEqual({
      id: 4711,
      pmsMilestoneId: 4711,
      pmsProjectId: 9002,
      code: "M-01",
      name: "Design sign-off",
      description: "UX approved",
      plannedStartDate: "2026-10-01",
      plannedCompletionDate: "2026-12-15",
      actualCompletionDate: "2026-12-10",
      executionStatus: "IN_PROGRESS",
      billable: true,
      pmsAllocationPercentage: 25.5,
      billingReadiness: "NOT_READY",
      sourceVersion: 3,
      lastSyncedAt: "2026-10-02T10:00:05",
    });
    for (const invented of ["sequence", "deliverables", "pmsStage", "approvalStatus", "invoiceNumber", "billingPercentage", "epicName"]) {
      expect(milestone).not.toHaveProperty(invented);
    }
  });

  it("maps actual backend contract fields: billingState, billingConfigurationId, eligibleForBilling, and ineligibilityReason", () => {
    const milestone = mapProjectMilestone(
      dto({
        billingState: "AVAILABLE",
        billingConfigurationId: "cfg-123",
        eligibleForBilling: true,
        ineligibilityReason: null,
      }),
    );
    expect(milestone.billingState).toBe("AVAILABLE");
    expect(milestone.billingConfigurationId).toBe("cfg-123");
    expect(milestone.eligibleForBilling).toBe(true);
    expect(milestone.ineligibilityReason).toBeUndefined();

    const ineligible = mapProjectMilestone(
      dto({
        billingState: "RESERVED",
        billingConfigurationId: "cfg-456",
        eligibleForBilling: false,
        ineligibilityReason: "Milestone claimed by active plan cfg-456",
      }),
    );
    expect(ineligible.billingState).toBe("RESERVED");
    expect(ineligible.billingConfigurationId).toBe("cfg-456");
    expect(ineligible.eligibleForBilling).toBe(false);
    expect(ineligible.ineligibilityReason).toBe("Milestone claimed by active plan cfg-456");
  });

  it("evaluates getMilestoneIneligibilityReason using authoritative backend fields and fallbacks", () => {
    // 1. Authoritative eligibleForBilling === true takes absolute precedence
    expect(getMilestoneIneligibilityReason({ eligibleForBilling: true, billingReadiness: "NOT_READY" })).toBeNull();

    // 2. Authoritative backend ineligibilityReason is preferred
    expect(
      getMilestoneIneligibilityReason({
        eligibleForBilling: false,
        ineligibilityReason: "Explicit backend reason",
      }),
    ).toBe("Explicit backend reason");

    // 3. Fallbacks when backend ineligibilityReason is absent
    expect(getMilestoneIneligibilityReason({ billingState: "INVOICED" })).toBe("Milestone has already been invoiced.");
    expect(getMilestoneIneligibilityReason({ billingState: "IN_BILLING" })).toBe("Milestone is currently in billing.");
    expect(getMilestoneIneligibilityReason({ billingState: "RESERVED", billingConfigurationId: "cfg-77" })).toBe(
      "Reserved by billing plan cfg-77",
    );
    expect(getMilestoneIneligibilityReason({ billable: false })).toBe("Not billable in PMS");
    expect(getMilestoneIneligibilityReason({ billingReadiness: "NOT_READY" })).toBe("Not ready for billing in PMS");
  });

  it("frozen state comes from the entry's own backend 'frozen' field only", () => {
    expect(isMilestoneEntryFrozen({ paymentEntryId: "e1", frozen: true })).toBe(true);
    expect(isMilestoneEntryFrozen({ paymentEntryId: "e1", frozen: false })).toBe(false);
    expect(getMilestoneEntryFrozenState({ paymentEntryId: "e1", frozen: true })).toBe(MILESTONE_ENTRY_STATE.FROZEN);
    expect(getMilestoneEntryFrozenState({ paymentEntryId: "e1", frozen: false })).toBe(MILESTONE_ENTRY_STATE.UNFROZEN);
    expect(isMilestoneEntryLocked({ paymentEntryId: "e1", frozen: true })).toBe(true);
    expect(isMilestoneEntryLocked({ paymentEntryId: "e1", frozen: false })).toBe(false);
  });

  it("a missing or null frozen field is never resolved from milestone-level billingState or any entry flag", () => {
    for (const unknown of [{ paymentEntryId: "e1" }, { paymentEntryId: "e1", frozen: null }, { paymentEntryId: "e1", frozen: undefined }]) {
      expect(getMilestoneEntryFrozenState(unknown)).toBe(MILESTONE_ENTRY_STATE.UNKNOWN);
      // not claimed to be frozen by the backend, but kept read-only
      expect(isMilestoneEntryFrozen(unknown)).toBe(false);
      expect(isMilestoneEntryLocked(unknown)).toBe(true);
    }
    // the helper no longer even looks at a milestone: an aggregate cannot change the answer
    expect(isMilestoneEntryFrozen({ paymentEntryId: "e1", billingState: "INVOICED", isFrozen: true })).toBe(false);
    expect(isMilestoneEntryFrozen({ paymentEntryId: "e1", frozen: false, billingState: "IN_BILLING" })).toBe(false);
  });

  it("occurrenceStatus and invoiced never override an explicit frozen value", () => {
    for (const occurrenceStatus of ["TAX_PENDING", "TAX_CALCULATED", "INVOICED"]) {
      const entry = { paymentEntryId: "e1", frozen: false, occurrenceStatus, invoiced: true };
      expect(isMilestoneEntryFrozen(entry)).toBe(false);
      expect(isMilestoneEntryLocked(entry)).toBe(false);
    }
    expect(isMilestoneEntryFrozen({ paymentEntryId: "e1", frozen: true, occurrenceStatus: "SCHEDULED", invoiced: false })).toBe(true);
    // and they do not decide anything when frozen is absent either
    expect(isMilestoneEntryFrozen({ paymentEntryId: "e1", occurrenceStatus: "INVOICED", invoiced: true })).toBe(false);
  });

  it("an entry that was never saved is editable (UNSAVED), and a missing entry is not locked", () => {
    expect(getMilestoneEntryFrozenState({ pmsMilestoneId: 11, percentage: "10" })).toBe(MILESTONE_ENTRY_STATE.UNSAVED);
    expect(isMilestoneEntryLocked({ pmsMilestoneId: 11 })).toBe(false);
    expect(isMilestoneEntryLocked(undefined)).toBe(false);
    expect(isMilestoneEntryLocked(null)).toBe(false);
  });

  it("maps the backend entry fields: real booleans are kept, null/missing stay unknown (never false)", () => {
    const frozen = normalizeMilestonePaymentEntry({ paymentEntryId: "e1", pmsMilestoneId: 11, frozen: true, occurrenceStatus: "INVOICED", invoiced: true });
    expect(frozen).toMatchObject({ frozen: true, occurrenceStatus: "INVOICED", invoiced: true });
    const open = normalizeMilestonePaymentEntry({ paymentEntryId: "e2", pmsMilestoneId: 12, frozen: false, occurrenceStatus: null, invoiced: false });
    expect(open.frozen).toBe(false);
    expect(open.occurrenceStatus).toBeUndefined();
    const legacy = normalizeMilestonePaymentEntry({ paymentEntryId: "e3", pmsMilestoneId: 13, frozen: null, invoiced: null });
    expect(legacy.frozen).toBeUndefined();
    expect(legacy.invoiced).toBeUndefined();
    // the removed legacy fields are not carried over
    expect(normalizeMilestonePaymentEntry({ paymentEntryId: "e4", isFrozen: true, billingState: "INVOICED" })).not.toHaveProperty("isFrozen");
  });

  it("keeps the PMS milestone id numeric and drops rows without a usable id", async () => {
    expect(mapProjectMilestone(dto({ pmsMilestoneId: "4711" })).pmsMilestoneId).toBe(4711);
    api.get.mockResolvedValueOnce({ data: { data: [dto(), dto({ pmsMilestoneId: null })] } });
    const result = await getProjectMilestones(9002);
    expect(result.map((m) => m.pmsMilestoneId)).toEqual([4711]);
  });

  it("keeps PMS allocation separate from any AR billing percentage", () => {
    const milestone = mapProjectMilestone(dto({ allocationPercentage: 40 }));
    expect(milestone.pmsAllocationPercentage).toBe(40);
    expect(milestone).not.toHaveProperty("billingPercentage");
    expect(milestone).not.toHaveProperty("percentage");
  });
});

describe("Milestone plan request/response mapping", () => {
  const entry = (overrides = {}) => ({
    percentage: 50,
    billingDate: "2026-12-15",
    remarks: "ignored for non milestone",
    pmsMilestoneId: 11,
    ...overrides,
  });

  it("MILESTONES sends the numeric pmsMilestoneId, sequence, percentage and billing date for every entry", () => {
    const payload = buildMilestonePlanRequestPayload({
      totalContractValue: 100000,
      paymentStructure: "MILESTONES",
      remarks: "plan",
      entries: [entry({ pmsMilestoneId: "11", remarks: "Design" }), entry({ pmsMilestoneId: 12, percentage: "50.00", remarks: "Build" })],
    });

    expect(payload).toEqual({
      totalContractValue: 100000,
      paymentStructure: "MILESTONES",
      entries: [
        { sequence: 1, percentage: 50, billingDate: "2026-12-15", remarks: "Design", pmsMilestoneId: 11 },
        { sequence: 2, percentage: 50, billingDate: "2026-12-15", remarks: "Build", pmsMilestoneId: 12 },
      ],
      remarks: "plan",
    });
  });

  it("a MILESTONES entry without a usable id is sent as null so the backend names the problem", () => {
    const payload = buildMilestonePlanRequestPayload({
      totalContractValue: 1,
      paymentStructure: "MILESTONES",
      entries: [entry({ pmsMilestoneId: "ms-101" }), entry({ pmsMilestoneId: undefined })],
    });
    expect(payload.entries.map((e) => e.pmsMilestoneId)).toEqual([null, null]);
  });

  it("FULL_PAYMENT and INSTALLMENTS keep their exact old request shape (no pmsMilestoneId key at all)", () => {
    const full = buildMilestonePlanRequestPayload({
      totalContractValue: 1000,
      paymentStructure: "FULL_PAYMENT",
      entries: [{ percentage: 100, billingDate: "2026-12-15", remarks: "", pmsMilestoneId: 99 }],
    });
    expect(full).toEqual({
      totalContractValue: 1000,
      paymentStructure: "FULL_PAYMENT",
      entries: [{ sequence: 1, percentage: 100, billingDate: "2026-12-15", remarks: "" }],
      remarks: "",
    });

    const installments = buildMilestonePlanRequestPayload({
      totalContractValue: 1000,
      paymentStructure: "INSTALLMENTS",
      entries: [
        { percentage: "40", billingDate: "2026-11-01", remarks: "" },
        { percentage: "60", billingDate: "2026-12-01", remarks: "" },
      ],
    });
    expect(installments.entries).toEqual([
      { sequence: 1, percentage: 40, billingDate: "2026-11-01", remarks: "" },
      { sequence: 2, percentage: 60, billingDate: "2026-12-01", remarks: "" },
    ]);
    installments.entries.forEach((e) => expect(e).not.toHaveProperty("pmsMilestoneId"));
  });

  it("hydrates a saved MILESTONES plan keeping each pmsMilestoneId a number", () => {
    const config = normalizeMilestonePlanConfig({
      milestonePlanId: "plan-1",
      paymentStructure: "MILESTONES",
      totalContractValue: 100000,
      entries: [
        { paymentEntryId: "e1", sequence: 1, percentage: 60, amount: 60000, billingDate: "2026-12-15", pmsMilestoneId: 11 },
        { paymentEntryId: "e2", sequence: 2, percentage: 40, amount: 40000, billingDate: "2027-01-15", pmsMilestoneId: 12 },
      ],
    });
    expect(config.paymentStructure).toBe("MILESTONES");
    expect(config.entries.map((e) => e.pmsMilestoneId)).toEqual([11, 12]);
    expect(normalizeMilestonePaymentEntry({ pmsMilestoneId: "ms-101" }).pmsMilestoneId).toBeNull();
    expect(normalizeMilestonePaymentEntry({ percentage: 100 }).pmsMilestoneId).toBeNull();
  });

  it("surfaces the backend's validation and conflict messages unchanged", () => {
    const conflict = "PMS milestone 11 (M-01) is already part of another active billing plan (billing configuration abc).";
    expect(getApiErrorMessage({ response: { status: 400, data: { message: conflict } } }, "fallback")).toBe(conflict);
    const restoreConflict =
      "PMS milestone 3 from the previously approved plan is now part of another billing plan, so this edit cannot be rejected without restoring a conflicting claim. Nothing was changed; release the milestone from the other plan first.";
    expect(getApiErrorMessage({ response: { status: 400, data: { message: restoreConflict } } })).toBe(restoreConflict);
  });
});

describe("PMS project id flows from the selected project", () => {
  it("carries pmsProjectId (numeric) separately from the AR project id", () => {
    const project = normalizeProject({ projectId: "3fa85f64-5717-4562-b3fc-2c963f66afa6", pmsProjectId: "9002", projectName: "P" });
    const fields = toProjectInfoFields(project);
    expect(fields.projectId).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
    expect(fields.pmsProjectId).toBe(9002);
  });

  it("is blank (not guessed from the AR id) when the project has no PMS id", () => {
    const fields = toProjectInfoFields(normalizeProject({ projectId: "3fa85f64-5717-4562-b3fc-2c963f66afa6", projectName: "P" }));
    expect(fields.pmsProjectId).toBe("");
  });
});
