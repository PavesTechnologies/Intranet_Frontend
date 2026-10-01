import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import ReviewActivateStep from "../components/billing-setup/ReviewActivateStep";
import {
  normalizeMilestonePaymentEntry,
  normalizeMilestonePlanConfig,
  buildMilestonePlanRequestPayload,
} from "./billingConfigurationService";

describe("Milestone Plan Configuration & Normalization", () => {
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

describe("ReviewActivateStep — Milestone Plan Presentation", () => {
  it("renders Full Payment with Total Contract Value, 100%, and Payment Amount correctly", () => {
    const wizardData = {
      projectInfo: {
        clientName: "Acme Corp",
        projectName: "Alpha Milestone Project",
        projectCode: "PRJ-ALPHA",
        projectBudget: 145000,
        projectBudgetCurrency: "INR",
      },
      billingConfig: {
        billingType: "MILESTONE_PLAN",
        billingTypeName: "Milestone Plan",
        milestonePlan: {
          milestonePlanId: "mp-1",
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
        },
      },
      controls: {
        autoInvoiceGeneration: false,
      },
    };

    render(<ReviewActivateStep wizardData={wizardData} />);

    // Top summary
    expect(screen.getByText("Milestone Plan")).toBeInTheDocument();
    expect(screen.getByText("One-Time")).toBeInTheDocument();
    expect(screen.getByText("INR")).toBeInTheDocument();
    expect(screen.getAllByText("₹1,45,000.00").length).toBeGreaterThanOrEqual(2);

    // Billing & Pricing + Payment Schedule both show Full Payment
    expect(screen.getAllByText("Full Payment").length).toBeGreaterThanOrEqual(2);

    // Payment Schedule
    expect(screen.getByText("One-Time Payment")).toBeInTheDocument();
    expect(screen.getAllByText("01 Oct 2026").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("payment done")).toBeInTheDocument();
  });

  it("renders Installments with correct percentage, calculated amount, and billing dates", () => {
    const wizardData = {
      projectInfo: {
        clientName: "Beta Corp",
        projectName: "Installment Project",
        projectBudget: 145000,
        projectBudgetCurrency: "INR",
      },
      billingConfig: {
        billingType: "MILESTONE_PLAN",
        billingTypeName: "Milestone Plan",
        milestonePlan: {
          milestonePlanId: "mp-2",
          totalContractValue: 145000,
          paymentStructure: "INSTALLMENTS",
          entries: [
            { sequence: 1, percentage: 40, billingDate: "2026-10-01", remarks: "advance" },
            { sequence: 2, percentage: 35, billingDate: "2026-11-01", remarks: "midway" },
            { sequence: 3, percentage: 25, billingDate: "2026-12-01", remarks: "completion" },
          ],
        },
      },
      controls: {
        autoInvoiceGeneration: false,
      },
    };

    render(<ReviewActivateStep wizardData={wizardData} />);

    expect(screen.getAllByText("Installments").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Custom Payment Dates")).toBeInTheDocument();

    // 40% of 145,000 = 58,000
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("₹58,000.00")).toBeInTheDocument();
    expect(screen.getAllByText("01 Oct 2026").length).toBeGreaterThanOrEqual(1);

    // 35% of 145,000 = 50,750
    expect(screen.getByText("35%")).toBeInTheDocument();
    expect(screen.getByText("₹50,750.00")).toBeInTheDocument();
    expect(screen.getByText("01 Nov 2026")).toBeInTheDocument();

    // 25% of 145,000 = 36,250
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("₹36,250.00")).toBeInTheDocument();
    expect(screen.getAllByText("01 Dec 2026").length).toBeGreaterThanOrEqual(1);

    // Total Contract Value & Allocated Amount
    expect(screen.getAllByText("₹1,45,000.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Remaining Amount")).toBeInTheDocument();
  });

  it("handles reopened draft where contract value is in projectInfo or milestonePlanDetails", () => {
    const wizardData = {
      projectInfo: {
        clientName: "Gamma Corp",
        projectName: "Reopened Draft",
        projectBudget: "1,45,000.00",
        currency: "INR",
      },
      billingConfig: {
        billingType: "MILESTONE_BASED",
        billingTypeName: "Milestone Based",
        milestonePlanDetails: {
          totalContractValue: 145000,
          paymentStructure: "FULL_PAYMENT",
          entries: [
            { sequence: 1, percentage: 100, billingDate: "2026-10-01", remarks: "payment done" },
          ],
        },
      },
      controls: {},
    };

    render(<ReviewActivateStep wizardData={wizardData} />);

    expect(screen.getByText("Milestone Plan")).toBeInTheDocument();
    expect(screen.getByText("One-Time")).toBeInTheDocument();
    expect(screen.getAllByText("Full Payment").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("One-Time Payment")).toBeInTheDocument();
    expect(screen.getAllByText("01 Oct 2026").length).toBeGreaterThanOrEqual(1);
  });
});
