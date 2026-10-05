import { describe, it, expect } from "vitest";
import {
  normalizeMilestonePaymentEntry,
  normalizeMilestonePlanConfig,
  buildMilestonePlanRequestPayload,
} from "./billingConfigurationService";

describe("Milestone Plan Configuration & Normalization (Service Unit Tests)", () => {
  describe("normalizeMilestonePaymentEntry", () => {
    it("normalizes a full payment entry with explicit amount", () => {
      const input = {
        paymentEntryId: "pe-1",
        sequence: 1,
        percentage: 100,
        amount: 145000,
        billingDate: "2026-10-01",
        remarks: "payment done",
      };
      const result = normalizeMilestonePaymentEntry(input);
      expect(result).toEqual({
        paymentEntryId: "pe-1",
        sequence: 1,
        percentage: 100,
        amount: 145000,
        billingDate: "2026-10-01",
        remarks: "payment done",
      });
    });

    it("normalizes an installment entry without explicit amount and with date array", () => {
      const input = {
        id: "pe-2",
        sequence: 2,
        percentage: 35,
        billingDate: [2026, 11, 1],
        remarks: "second installment",
      };
      const result = normalizeMilestonePaymentEntry(input);
      expect(result.paymentEntryId).toBe("pe-2");
      expect(result.percentage).toBe(35);
      expect(result.amount).toBe("");
      expect(result.billingDate).toBe("2026-11-01");
      expect(result.remarks).toBe("second installment");
    });
  });

  describe("normalizeMilestonePlanConfig", () => {
    it("normalizes a Full Payment record with backend totalContractValue", () => {
      const record = {
        milestonePlanId: "mp-100",
        totalContractValue: 145000,
        paymentStructure: "FULL_PAYMENT",
        entries: [
          {
            paymentEntryId: "pe-1",
            sequence: 1,
            percentage: 100,
            amount: 145000,
            billingDate: "2026-10-01",
            remarks: "payment done",
          },
        ],
        remarks: "full payment contract",
      };

      const normalized = normalizeMilestonePlanConfig(record);
      expect(normalized.milestonePlanId).toBe("mp-100");
      expect(normalized.totalContractValue).toBe(145000);
      expect(normalized.paymentStructure).toBe("FULL_PAYMENT");
      expect(normalized.entries).toHaveLength(1);
      expect(normalized.entries[0].amount).toBe(145000);
      expect(normalized.entries[0].billingDate).toBe("2026-10-01");
    });

    it("normalizes an Installment record and derives paymentStructure if missing", () => {
      const record = {
        id: "mp-200",
        contractValue: "145000",
        paymentEntries: [
          { sequence: 1, percentage: 40, billingDate: "2026-10-01" },
          { sequence: 2, percentage: 35, billingDate: "2026-11-01" },
          { sequence: 3, percentage: 25, billingDate: "2026-12-01" },
        ],
      };

      const normalized = normalizeMilestonePlanConfig(record);
      expect(normalized.milestonePlanId).toBe("mp-200");
      expect(normalized.totalContractValue).toBe("145000");
      expect(normalized.paymentStructure).toBe("INSTALLMENTS");
      expect(normalized.entries).toHaveLength(3);
    });
  });

  describe("buildMilestonePlanRequestPayload", () => {
    it("builds clean request payload stripping commas and dropping entry amount", () => {
      const plan = {
        totalContractValue: "1,45,000",
        paymentStructure: "FULL_PAYMENT",
        entries: [
          {
            percentage: "100",
            amount: "145000",
            billingDate: "2026-10-01",
            remarks: "payment done",
          },
        ],
        remarks: "test remarks",
      };

      const payload = buildMilestonePlanRequestPayload(plan);
      expect(payload).toEqual({
        totalContractValue: 145000,
        paymentStructure: "FULL_PAYMENT",
        entries: [
          {
            sequence: 1,
            percentage: 100,
            billingDate: "2026-10-01",
            remarks: "payment done",
          },
        ],
        remarks: "test remarks",
      });
    });
  });
});
