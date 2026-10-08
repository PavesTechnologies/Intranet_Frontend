import { describe, it, expect } from "vitest";
import {
  PIPELINE_STAGES,
  countPipelineStages,
  filterByPipelineStage,
  getTaxPipelineStatus,
  hasGeneratedInvoice,
  toOccurrencePipelineRecord,
  toSnapshotPipelineRecord,
} from "./taxPipeline";
import { normalizeBillingOccurrence } from "../services/billingOccurrenceService";

const { UPCOMING, READY_FOR_TAX, TAX_CALCULATED, INVOICED } = PIPELINE_STAGES;

// Raw BillingOccurrenceController record, run through the same normalizer
// the page uses.
const occurrence = (overrides = {}) =>
  normalizeBillingOccurrence({
    billingScheduleId: "occ-1",
    billingConfigurationId: "cfg-1",
    clientName: "Aditya Teja",
    projectName: "Card Integration",
    billingTypeName: "Milestone Based",
    periodStartDate: "2026-10-07",
    periodEndDate: "2026-10-07",
    billingDate: "2026-10-07",
    billingAmount: 65000,
    currencyCode: "USD",
    periodStatus: "TAX_PENDING",
    taxStatus: "TAX_PENDING",
    isInvoiced: false,
    ...overrides,
  });

describe("getTaxPipelineStatus", () => {
  it("A. TAX_PENDING with no invoice -> READY_FOR_TAX", () => {
    expect(getTaxPipelineStatus(occurrence())).toBe(READY_FOR_TAX);
  });

  it("B. TAX_CALCULATED with no invoice -> TAX_CALCULATED", () => {
    const occ = occurrence({ periodStatus: "TAX_CALCULATED", taxStatus: "TAX_CALCULATED", totalTaxAmount: 11700 });
    expect(getTaxPipelineStatus(occ)).toBe(TAX_CALCULATED);
  });

  it("C. invoice successfully generated -> INVOICED", () => {
    const occ = occurrence({
      periodStatus: "TAX_CALCULATED",
      taxStatus: "TAX_CALCULATED",
      isInvoiced: true,
      invoiceDate: "2026-10-07",
    });
    expect(getTaxPipelineStatus(occ)).toBe(INVOICED);
    expect(getTaxPipelineStatus({ status: "TAX_COMPLETED", invoiceId: "inv-1" })).toBe(INVOICED);
  });

  it("D. SCHEDULED occurrence -> UPCOMING", () => {
    const occ = occurrence({ periodStatus: "SCHEDULED", taxStatus: "" });
    expect(getTaxPipelineStatus(occ)).toBe(UPCOMING);
  });

  it("E. Milestone Plan TAX_PENDING -> READY_FOR_TAX", () => {
    const occ = occurrence({ billingTypeName: "Milestone Based" });
    expect(getTaxPipelineStatus(occ)).toBe(READY_FOR_TAX);
    expect(toOccurrencePipelineRecord(occ).billingType).toBe("Milestone Plan");
  });

  it("F. Recurring TAX_PENDING -> READY_FOR_TAX", () => {
    const occ = occurrence({ billingTypeName: undefined, billingConfigurationId: null, recurringConfigurationId: "rec-1" });
    expect(getTaxPipelineStatus(occ)).toBe(READY_FOR_TAX);
    expect(toOccurrencePipelineRecord(occ).billingType).toBe("Recurring");
  });

  it("G. T&M TAX_PENDING -> READY_FOR_TAX", () => {
    expect(getTaxPipelineStatus(occurrence({ billingTypeName: "Time & Material" }))).toBe(READY_FOR_TAX);
    // T&M billing snapshot acquired and waiting for tax
    const snap = toSnapshotPipelineRecord({ id: "s-1", snapshotId: "s-1", status: "READY_FOR_TAX" });
    expect(snap.stage).toBe(READY_FOR_TAX);
  });

  it("never treats an invoice-like status string as a generated invoice", () => {
    expect(getTaxPipelineStatus({ periodStatus: "TAX_PENDING", taxStatus: "TAX_PENDING", status: "INVOICED" })).toBe(
      READY_FOR_TAX
    );
    expect(getTaxPipelineStatus({ status: "INVOICED" })).toBe(UPCOMING);
    expect(hasGeneratedInvoice({ status: "INVOICED", billingStatus: "INVOICED", invoiceNumber: "" })).toBe(false);
  });

  it("normalizer does not turn a non-true isInvoiced into true", () => {
    expect(occurrence({ isInvoiced: "false" }).isInvoiced).toBe(false);
    expect(occurrence({ isInvoiced: null }).isInvoiced).toBe(false);
    expect(occurrence({ isInvoiced: undefined }).isInvoiced).toBe(false);
    expect(getTaxPipelineStatus(occurrence({ isInvoiced: "false" }))).toBe(READY_FOR_TAX);
  });

  it("a T&M snapshot status of INVOICED without a confirmed invoice is not invoiced", () => {
    expect(toSnapshotPipelineRecord({ id: "s-2", snapshotId: "s-2", status: "TAX_COMPLETED" }).stage).toBe(
      TAX_CALCULATED
    );
    expect(
      toSnapshotPipelineRecord({ id: "s-3", snapshotId: "s-3", status: "TAX_COMPLETED", invoiceId: "inv-3" }).stage
    ).toBe(INVOICED);
    expect(toSnapshotPipelineRecord({ id: "s-4", snapshotId: "s-4", status: "NOT_ACQUIRED" })).toBeNull();
  });
});

describe("H. summary counts, tabs and filters share the normalized status", () => {
  it("screenshot scenario: one TAX_PENDING Milestone Plan occurrence, no invoice", () => {
    const record = toOccurrencePipelineRecord(occurrence());
    const records = [record];

    expect(record.stage).toBe(READY_FOR_TAX);
    expect(record.statusLabel).toBe("Ready for Tax");
    expect(record.billingPeriod).toBe("07 Oct – 07 Oct");
    expect(record.amount).toBe(65000);

    expect(countPipelineStages(records)).toEqual({
      ALL: 1,
      [UPCOMING]: 0,
      [READY_FOR_TAX]: 1,
      [TAX_CALCULATED]: 0,
      [INVOICED]: 0,
    });
    expect(filterByPipelineStage(records, "ALL")).toEqual(records);
    expect(filterByPipelineStage(records, READY_FOR_TAX)).toEqual(records);
    expect(filterByPipelineStage(records, INVOICED)).toEqual([]);
  });

  it("every filter's size equals its count", () => {
    const records = [
      occurrence({ billingScheduleId: "a", periodStatus: "SCHEDULED", taxStatus: "" }),
      occurrence({ billingScheduleId: "b" }),
      occurrence({ billingScheduleId: "c", billingTypeName: "Time & Material" }),
      occurrence({ billingScheduleId: "d", periodStatus: "TAX_CALCULATED", taxStatus: "TAX_CALCULATED" }),
      occurrence({ billingScheduleId: "e", periodStatus: "TAX_CALCULATED", taxStatus: "TAX_CALCULATED", isInvoiced: true }),
    ].map(toOccurrencePipelineRecord);

    const counts = countPipelineStages(records);
    expect(counts).toEqual({ ALL: 5, [UPCOMING]: 1, [READY_FOR_TAX]: 2, [TAX_CALCULATED]: 1, [INVOICED]: 1 });
    [UPCOMING, READY_FOR_TAX, TAX_CALCULATED, INVOICED].forEach((s) => {
      const filtered = filterByPipelineStage(records, s);
      expect(filtered).toHaveLength(counts[s]);
      filtered.forEach((r) => expect(r.stage).toBe(getTaxPipelineStatus(r.original)));
    });
  });
});
