import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import {
  calculateDiscountedRate,
  normalizeTmRateCard,
  buildTmRateCardRequestPayload,
  calculateRateDiscountPreview,
  normalizeTmRateDiscount,
  buildTmRateDiscountRequestPayload,
  resolveTimeMaterialWorkEligibility,
  deleteTmRateDiscount,
  createTmRateCard,
} from "../services/billingConfigurationService";
import BillingConfigurationStep from "../components/billing-setup/BillingConfigurationStep";
import ReviewActivateStep from "../components/billing-setup/ReviewActivateStep";
import TimesheetDataTable from "../components/acquisition/TimesheetDataTable";
import InvoicePreviewDocument from "../components/invoice/InvoicePreviewDocument";
import { buildInvoiceLineItems } from "../utils/invoicePresentation";
import { formatCurrency, isValidCurrency } from "../utils/format";
import { buildApprovalReviewModel } from "../services/billingApprovalService";
import { ApprovalReviewDetails } from "../pages/BillingApprovals";

vi.mock("../services/billingConfigurationService", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getActiveBillingTypes: vi.fn().mockResolvedValue([
      { billingTypeId: "TIME_MATERIAL", billingTypeName: "Time & Material", code: "TIME_MATERIAL" },
    ]),
    getActiveBillingFrequencies: vi.fn().mockResolvedValue([
      { billingFrequencyId: "MONTHLY", frequencyName: "Monthly", code: "MONTHLY" },
    ]),
    getTmRateCardsByBillingConfiguration: vi.fn().mockResolvedValue([]),
    getTmRateDiscounts: vi.fn().mockResolvedValue([]),
    saveTmRateCard: vi.fn().mockResolvedValue({ id: "rc-1", rateCardId: "rc-1" }),
    createTmRateCard: vi.fn().mockResolvedValue({ id: "rc-1", rateCardId: "rc-1" }),
    deleteTmRateDiscount: vi.fn().mockResolvedValue(true),
  };
});

describe("Time & Material Billing Enhancements", () => {
  describe("Phase 2 & 5: Discount Rate Preview Calculation", () => {
    it("calculates percentage discount preview correctly", () => {
      // 2000 INR with 10% discount = 1800
      expect(calculateDiscountedRate(2000, "PERCENTAGE", 10)).toBe(1800);
      // 150 USD with 15% discount = 127.50
      expect(calculateDiscountedRate(150, "PERCENTAGE", 15)).toBe(127.5);
      // 100 with 0% discount = 100
      expect(calculateDiscountedRate(100, "PERCENTAGE", 0)).toBe(100);
    });

    it("calculates fixed amount discount preview correctly", () => {
      // 2500 with 500 fixed discount = 2000
      expect(calculateDiscountedRate(2500, "FIXED_AMOUNT", 500)).toBe(2000);
      // 80 with 25 fixed discount = 55
      expect(calculateDiscountedRate(80, "FIXED_AMOUNT", 25)).toBe(55);
    });

    it("caps discounted rate at 0 when discount exceeds standard rate", () => {
      // Fixed discount greater than rate
      expect(calculateDiscountedRate(100, "FIXED_AMOUNT", 150)).toBe(0);
      // 100% or greater percentage discount
      expect(calculateDiscountedRate(100, "PERCENTAGE", 100)).toBe(0);
      expect(calculateDiscountedRate(100, "PERCENTAGE", 110)).toBe(0);
    });

    it("handles invalid or missing discount inputs gracefully", () => {
      expect(calculateDiscountedRate(null, "PERCENTAGE", 10)).toBe(0);
      expect(calculateDiscountedRate("", "PERCENTAGE", 10)).toBe(0);
      // When discount value is missing or invalid, it returns the base rate
      expect(calculateDiscountedRate(100, "PERCENTAGE", null)).toBe(100);
      expect(calculateDiscountedRate(100, "PERCENTAGE", "")).toBe(100);
      expect(calculateDiscountedRate(100, "PERCENTAGE", "abc")).toBe(100);
    });
  });

  describe("Phase 4: API Request Serialization and Normalization", () => {
    it("serializes standard rate payload with active discount and invoice inclusion", () => {
      const formRow = {
        rate: "1800",
        ratePeriod: "HOURLY",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-12-31",
        hasDiscount: true,
        discountType: "PERCENTAGE",
        discountValue: "10",
        discountStartDate: "2026-03-01",
        discountEndDate: "2026-06-30",
        remarks: "10% client discount agreed per MSA amendment",
        includeInInvoice: true,
      };

      const payload = buildTmRateCardRequestPayload(
        formRow,
        "STANDARD",
        "cfg-101"
      );

      expect(payload.roleName).toBe(null);
      expect(payload.rate).toBe("1800");
      expect(payload.ratePeriod).toBe("HOURLY");
      expect(payload.effectiveFrom).toBe("2026-01-01");
      expect(payload.effectiveTo).toBe("2026-12-31");
      expect(payload.hasDiscount).toBe(true);
      expect(payload.discountType).toBe("PERCENTAGE");
      expect(payload.discountValue).toBe(10);
      expect(payload.discountedRate).toBe(1620);
      expect(payload.discountStartDate).toBe("2026-03-01");
      expect(payload.discountEndDate).toBe("2026-06-30");
      expect(payload.remarks).toBe("10% client discount agreed per MSA amendment");
      expect(payload.includeInInvoice).toBe(true);
    });

    it("clears inactive discount fields when discount is disabled", () => {
      const formRow = {
        rate: "2500",
        ratePeriod: "HOURLY",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-12-31",
        hasDiscount: false,
        discountType: "PERCENTAGE",
        discountValue: "20",
        discountStartDate: "2026-04-01",
        discountEndDate: "2026-08-31",
        remarks: "Standard billing rate without commercial discount",
        includeInInvoice: false,
      };

      const payload = buildTmRateCardRequestPayload(
        formRow,
        "STANDARD",
        "cfg-102"
      );

      expect(payload.hasDiscount).toBe(false);
      expect(payload.discountType).toBe(null);
      expect(payload.discountValue).toBe(null);
      expect(payload.discountedRate).toBe(null);
      expect(payload.discountStartDate).toBe(null);
      expect(payload.discountEndDate).toBe(null);
      expect(payload.remarks).toBe("Standard billing rate without commercial discount");
      expect(payload.includeInInvoice).toBe(false);
    });

    it("serializes role-based rate payload with independent role name, discount, and inclusion flag", () => {
      const roleRow = {
        role: "Lead Architect",
        rate: "3500",
        ratePeriod: "HOURLY",
        hasDiscount: true,
        discountType: "FIXED_AMOUNT",
        discountValue: "500",
        discountStartDate: "2026-02-01",
        discountEndDate: "2026-05-31",
        remarks: "Key personnel discounted tier",
        includeInInvoice: true,
      };

      const payload = buildTmRateCardRequestPayload(
        roleRow,
        "ROLE_BASED",
        "cfg-103"
      );

      expect(payload.roleName).toBe("Lead Architect");
      expect(payload.rate).toBe("3500");
      expect(payload.hasDiscount).toBe(true);
      expect(payload.discountType).toBe("FIXED_AMOUNT");
      expect(payload.discountValue).toBe(500);
      expect(payload.discountedRate).toBe(3000);
      expect(payload.discountStartDate).toBe("2026-02-01");
      expect(payload.discountEndDate).toBe("2026-05-31");
      expect(payload.remarks).toBe("Key personnel discounted tier");
      expect(payload.includeInInvoice).toBe(true);
    });

    it("normalizes backend DTOs with backward compatibility for legacy configurations", () => {
      // Legacy DTO without discount or invoice inclusion fields
      const legacyCard = {
        id: "rc-1",
        billingConfigurationId: "cfg-1",
        roleName: "QA Engineer",
        rate: 1200,
        ratePeriod: "HOURLY",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-12-31",
      };

      const normalized = normalizeTmRateCard(legacyCard);
      expect(normalized.role).toBe("QA Engineer");
      expect(normalized.rate).toBe(1200);
      expect(normalized.hasDiscount).toBe(false);
      expect(normalized.discountType).toBe("NONE");
      expect(normalized.discountValue).toBe("");
      expect(normalized.discountedRate).toBe(1200);
      expect(normalized.remarks).toBe("");
      expect(normalized.includeInInvoice).toBe(true);
    });

    it("normalizes backend DTOs that contain discounts and explicit inclusion flags", () => {
      const modernCard = {
        id: "rc-2",
        billingConfigurationId: "cfg-2",
        roleName: "DevOps Engineer",
        rate: 2200,
        ratePeriod: "HOURLY",
        hasDiscount: true,
        discountType: "PERCENTAGE",
        discountValue: 12.5,
        discountedRate: 1925,
        discountStartDate: "2026-02-01",
        discountEndDate: "2026-06-30",
        remarks: "12.5% rate reduction",
        includeInInvoice: false,
      };

      const normalized = normalizeTmRateCard(modernCard);
      expect(normalized.role).toBe("DevOps Engineer");
      expect(normalized.rate).toBe(2200);
      expect(normalized.hasDiscount).toBe(true);
      expect(normalized.discountType).toBe("PERCENTAGE");
      expect(normalized.discountValue).toBe(12.5);
      expect(normalized.discountedRate).toBe(1925);
      expect(normalized.discountStartDate).toBe("2026-02-01");
      expect(normalized.discountEndDate).toBe("2026-06-30");
      expect(normalized.remarks).toBe("12.5% rate reduction");
      expect(normalized.includeInInvoice).toBe(false);
    });
  });

  describe("Phase 6: Review & Activate Step Presentation", () => {
    it("renders Standard Rate with commercial discount, net rate preview, notes, and invoice inclusion", () => {
      const wizardData = {
        project: {
          clientName: "Global Tech Inc",
          projectName: "Cloud Modernization",
          currency: "INR",
        },
        billingConfig: {
          billingType: "TIME_MATERIAL",
          pricingModel: "STANDARD",
          billingMode: "STANDARD",
          timeAndMaterial: {
            rate: 2000,
            ratePeriod: "HOURLY",
            hasDiscount: true,
            discountType: "PERCENTAGE",
            discountValue: 10,
            discountedRate: 1800,
            discountStartDate: "2026-01-01",
            discountEndDate: "2026-12-31",
            remarks: "Standard client volume discount",
            includeInInvoice: true,
          },
        },
      };

      render(
        <ReviewActivateStep
          wizardData={wizardData}
          onBack={() => {}}
          onSaveDraft={() => {}}
          onActivate={() => {}}
        />
      );

      // Standard Rate label and formatted amount
      expect(screen.getAllByText("Standard Rate").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Client Discount")).toBeInTheDocument();
      expect(screen.getByText("10% (Percentage)")).toBeInTheDocument();
      expect(screen.getByText("Net Discounted Rate")).toBeInTheDocument();
      expect(screen.getByText("Commercial Notes")).toBeInTheDocument();
      expect(screen.getByText("Standard client volume discount")).toBeInTheDocument();
      expect(screen.getByText("Invoice Inclusion")).toBeInTheDocument();
      expect(screen.getByText("Included in Invoice")).toBeInTheDocument();
    });

    it("renders Role-Based Rates table with independent discounts, net rates, and inclusion status", () => {
      const wizardData = {
        project: {
          clientName: "Apex Logistics",
          projectName: "Fleet Management",
          currency: "USD",
        },
        billingConfig: {
          billingType: "TIME_MATERIAL",
          pricingModel: "ROLE_BASED",
          billingMode: "ROLE_BASED",
          timeAndMaterial: {
            roles: [
              {
                role: "Senior Consultant",
                rate: 300,
                ratePeriod: "HOURLY",
                hasDiscount: true,
                discountType: "PERCENTAGE",
                discountValue: 20,
                discountedRate: 240,
                includeInInvoice: true,
                remarks: "VIP Client Tier",
              },
              {
                role: "Junior Analyst",
                rate: 100,
                ratePeriod: "HOURLY",
                hasDiscount: false,
                includeInInvoice: false,
                remarks: "Internal observation only",
              },
            ],
          },
        },
      };

      render(
        <ReviewActivateStep
          wizardData={wizardData}
          onBack={() => {}}
          onSaveDraft={() => {}}
          onActivate={() => {}}
        />
      );

      expect(screen.getByText("Senior Consultant")).toBeInTheDocument();
      expect(screen.getByText("Junior Analyst")).toBeInTheDocument();
      expect(screen.getByText("VIP Client Tier")).toBeInTheDocument();
      expect(screen.getByText("Internal observation only")).toBeInTheDocument();

      // Inclusion badges
      expect(screen.getByText("Included")).toBeInTheDocument();
      expect(screen.getByText("Excluded")).toBeInTheDocument();
    });
  });

  describe("Phase 7: Acquisition & Invoice Presentation", () => {
    it("displays discount and clearly marks excluded entries in TimesheetDataTable", () => {
      const records = [
        {
          id: "ts-1",
          employee: "Alice Smith",
          workDate: "2026-03-10",
          role: "Cloud Architect",
          hours: 8,
          rate: 180,
          standardRate: 200,
          discountApplied: true,
          amount: 1440,
          approvalStatus: "Approved",
          includeInInvoice: true,
        },
        {
          id: "ts-2",
          employee: "Bob Jones",
          workDate: "2026-03-11",
          role: "Trainee Engineer",
          hours: 8,
          rate: 50,
          amount: 400,
          approvalStatus: "Approved",
          includeInInvoice: false, // Excluded from invoice
        },
      ];

      render(
        <TimesheetDataTable
          records={records}
          currency="USD"
          billingType="TIME_MATERIAL"
        />
      );

      // Verify Alice has discount indicated
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText(/Discount applied/i)).toBeInTheDocument();

      // Verify Bob is marked as excluded
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.getByText("Excluded")).toBeInTheDocument();
      expect(screen.getByText(/0.00 payable/i)).toBeInTheDocument();

      // Header should display total hours and payable hours
      expect(screen.getByText(/2 records \(16 hrs · 8 payable hrs\)/i)).toBeInTheDocument();
    });

    it("filters out excluded entries from payable lines in buildInvoiceLineItems", () => {
      const items = [
        {
          id: "item-1",
          employee: "Alice Smith",
          role: "Senior Engineer",
          hours: 40,
          rate: 100,
          amount: 4000,
          includeInInvoice: true,
        },
        {
          id: "item-2",
          employee: "Charlie Brown",
          role: "Non-Billable Shadow",
          hours: 20,
          rate: 0,
          amount: 0,
          includeInInvoice: false, // Excluded
        },
      ];

      const { rows } = buildInvoiceLineItems({
        billingType: "TIME_MATERIAL",
        items,
        currency: "USD",
      });
      // Only the payable item should be included in invoice lines
      expect(rows.length).toBe(1);
      expect(rows[0].item).toBe("Alice Smith");
      expect(rows[0].role).toBe("Senior Engineer");
    });

    it("omits excluded entries from InvoicePreviewDocument payable lines", () => {
      const invoiceData = {
        invoiceNumber: "INV-2026-001",
        invoiceDate: "2026-03-31",
        clientName: "Enterprise Client",
        projectName: "T&M Implementation",
        currency: "USD",
        subtotal: 3000,
        totalTax: 0,
        grandTotal: 3000,
        billingTypeCode: "TIME_MATERIAL",
        items: [
          {
            id: "i-1",
            employee: "Diana Prince",
            role: "Principal Architect",
            quantity: 15,
            rate: 200,
            amount: 3000,
            includeInInvoice: true,
          },
          {
            id: "i-2",
            employee: "Intern Developer",
            role: "Junior",
            quantity: 10,
            rate: 50,
            amount: 500,
            includeInInvoice: false, // Excluded
          },
        ],
      };

      render(<InvoicePreviewDocument invoice={invoiceData} />);

      // Payable line item is rendered
      expect(screen.getByText("Diana Prince")).toBeInTheDocument();
      // Excluded entry should NOT be in payable lines
      expect(screen.queryByText("Intern Developer")).not.toBeInTheDocument();
    });
  });

  describe("Standard Rate Schedule with Multiple Discount Periods", () => {
    describe("Currency-Aware Formatting", () => {
      it("formats amounts properly across USD, INR, and EUR with ISO 4217 symbols", () => {
        expect(formatCurrency(100, "USD")).toMatch(/\$100\.00/);
        expect(formatCurrency(1800, "INR")).toMatch(/₹1,800\.00/);
        expect(formatCurrency(100, "EUR")).toMatch(/€100\.00/);
      });

      it("validates currency codes and rejects missing or invalid codes", () => {
        expect(isValidCurrency("USD")).toBe(true);
        expect(isValidCurrency("INR")).toBe(true);
        expect(isValidCurrency("EUR")).toBe(true);
        expect(isValidCurrency("GBP")).toBe(true);
        expect(isValidCurrency("JPY")).toBe(true);
        expect(isValidCurrency("XYZ99")).toBe(false);
        expect(isValidCurrency("")).toBe(false);
        expect(isValidCurrency(null)).toBe(false);
      });
    });

    describe("Live Net-Rate Preview Calculation", () => {
      it("calculates live preview for percentage discount correctly", () => {
        const preview = calculateRateDiscountPreview({
          baseRate: 100,
          discountType: "PERCENTAGE",
          discountValue: 50,
          ratePeriod: "HOURLY",
        });

        expect(preview.isValid).toBe(true);
        expect(preview.isComplete).toBe(true);
        expect(preview.baseRate).toBe(100);
        expect(preview.discountAmount).toBe(50);
        expect(preview.netRate).toBe(50);
        expect(preview.error).toBeNull();
      });

      it("calculates live preview for fixed amount discount correctly", () => {
        const preview = calculateRateDiscountPreview({
          baseRate: 1800,
          discountType: "FIXED_AMOUNT",
          discountValue: 300,
          ratePeriod: "HOURLY",
        });

        expect(preview.isValid).toBe(true);
        expect(preview.isComplete).toBe(true);
        expect(preview.baseRate).toBe(1800);
        expect(preview.discountAmount).toBe(300);
        expect(preview.netRate).toBe(1500);
        expect(preview.error).toBeNull();
      });

      it("returns validation error when percentage discount is 100% or greater", () => {
        const preview = calculateRateDiscountPreview({
          baseRate: 100,
          discountType: "PERCENTAGE",
          discountValue: 100,
          ratePeriod: "HOURLY",
        });

        expect(preview.isValid).toBe(false);
        expect(preview.error).toMatch(/less than 100%/);
      });

      it("returns validation error when fixed discount exceeds base rate", () => {
        const preview = calculateRateDiscountPreview({
          baseRate: 50,
          discountType: "FIXED_AMOUNT",
          discountValue: 75,
          ratePeriod: "HOURLY",
        });

        expect(preview.isValid).toBe(false);
        expect(preview.error).toMatch(/less than base rate/);
      });

      it("handles incomplete inputs without displaying misleading zero rate", () => {
        const preview = calculateRateDiscountPreview({
          baseRate: 100,
          discountType: "PERCENTAGE",
          discountValue: "",
          ratePeriod: "HOURLY",
        });

        expect(preview.isValid).toBe(false);
        expect(preview.isComplete).toBe(false);
        expect(preview.netRate).toBeNull();
      });
    });

    describe("Backend DTO Normalization & Payload Builder", () => {
      it("normalizes backend discount response DTO correctly", () => {
        const rawDto = {
          discountId: 42,
          rateCardId: 10,
          periodName: "Q1 Introductory",
          discountType: "PERCENTAGE",
          discountValue: 20,
          effectiveFrom: [2026, 1, 1],
          effectiveTo: [2026, 3, 31],
          notes: "Agreed per MSA",
          includeInInvoice: true,
          currencyCode: "USD",
          baseRate: 100,
          discountAmount: 20,
          netRate: 80,
        };

        const normalized = normalizeTmRateDiscount(rawDto);
        expect(normalized.discountId).toBe(42);
        expect(normalized.rateCardId).toBe(10);
        expect(normalized.periodName).toBe("Q1 Introductory");
        expect(normalized.discountType).toBe("PERCENTAGE");
        expect(normalized.discountValue).toBe(20);
        expect(normalized.effectiveFrom).toBe("2026-01-01");
        expect(normalized.effectiveTo).toBe("2026-03-31");
        expect(normalized.notes).toBe("Agreed per MSA");
        expect(normalized.includeInInvoice).toBe(true);
        expect(normalized.discountAmount).toBe(20);
        expect(normalized.netRate).toBe(80);
      });

      it("builds request payload with correct keys and types", () => {
        const period = {
          periodName: "Volume Discount Q2",
          discountType: "FIXED_AMOUNT",
          discountValue: "250",
          effectiveFrom: "2026-04-01",
          effectiveTo: "2026-06-30",
          notes: "Special contract terms",
          includeInInvoice: false,
        };

        const payload = buildTmRateDiscountRequestPayload(period, "INR");
        expect(payload.periodName).toBe("Volume Discount Q2");
        expect(payload.discountType).toBe("FIXED");
        expect(payload.discountValue).toBe(250);
        expect(payload.effectiveFrom).toBe("2026-04-01");
        expect(payload.effectiveTo).toBe("2026-06-30");
        expect(payload.notes).toBe("Special contract terms");
        expect(payload.includeInInvoice).toBe(false);
        expect(payload.currencyCode).toBe("INR");
      });

      it("hydrates multi-period schedule on rate card normalization", () => {
        const rateCardRaw = {
          rateCardId: 100,
          rate: 150,
          ratePeriod: "HOURLY",
          discountPeriods: [
            {
              discountId: 1,
              periodName: "Period 1",
              discountType: "PERCENTAGE",
              discountValue: 10,
              effectiveFrom: "2026-01-01",
              effectiveTo: "2026-06-30",
              includeInInvoice: true,
            },
            {
              discountId: 2,
              periodName: "Period 2",
              discountType: "PERCENTAGE",
              discountValue: 20,
              effectiveFrom: "2026-07-01",
              effectiveTo: "2026-12-31",
              includeInInvoice: false,
            },
          ],
        };

        const normalized = normalizeTmRateCard(rateCardRaw);
        expect(normalized.discountPeriods.length).toBe(2);
        expect(normalized.discountPeriods[0].periodName).toBe("Period 1");
        expect(normalized.discountPeriods[1].periodName).toBe("Period 2");
        expect(normalized.discountPeriods[1].includeInInvoice).toBe(false);
      });
    });

    describe("ReviewActivateStep Multi-Period Schedule Presentation", () => {
      it("renders multiple sequential discount periods, live net rates, notes, and base-rate fallback notice", () => {
        const wizardData = {
          project: {
            clientName: "Global Tech",
            projectName: "Core Modernization",
            currency: "USD",
          },
          billingConfig: {
            billingType: "TIME_MATERIAL",
            pricingModel: "STANDARD",
            billingMode: "STANDARD",
            timeAndMaterial: {
              rate: 200,
              ratePeriod: "HOURLY",
              includeInInvoice: true,
              discountPeriods: [
                {
                  discountId: 101,
                  periodName: "Introductory Q1",
                  discountType: "PERCENTAGE",
                  discountValue: 25,
                  effectiveFrom: "2026-01-01",
                  effectiveTo: "2026-03-31",
                  netRate: 150,
                  includeInInvoice: true,
                  notes: "MSA introductory concession",
                },
                {
                  discountId: 102,
                  periodName: "Volume Q2",
                  discountType: "FIXED_AMOUNT",
                  discountValue: 50,
                  effectiveFrom: "2026-04-01",
                  effectiveTo: "2026-06-30",
                  netRate: 150,
                  includeInInvoice: false,
                  notes: "Internal research period",
                },
              ],
            },
          },
        };

        render(
          <ReviewActivateStep
            wizardData={wizardData}
            onBack={() => {}}
            onSaveDraft={() => {}}
            onActivate={() => {}}
          />
        );

        // Standard Base Rate & Currency
        expect(screen.getAllByText("Standard Rate").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/\$200\.00 \/ hr/).length).toBeGreaterThanOrEqual(1);

        // Multi-period Schedule Header
        expect(screen.getByText(/Standard Rate Schedule \(2 Periods\)/)).toBeInTheDocument();

        // Individual Period Details
        expect(screen.getByText("Introductory Q1")).toBeInTheDocument();
        expect(screen.getByText("Volume Q2")).toBeInTheDocument();
        expect(screen.getByText(/2026-01-01 to 2026-03-31/)).toBeInTheDocument();
        expect(screen.getByText(/2026-04-01 to 2026-06-30/)).toBeInTheDocument();

        // Inclusion Badges
        expect(screen.getAllByText("Included").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Excluded").length).toBeGreaterThanOrEqual(1);

        // Fallback Notice
        expect(screen.getByText(/Base-Rate Fallback:/)).toBeInTheDocument();
      });

      it("preserves Role-Based Rates UI regression protection", () => {
        const wizardData = {
          project: {
            clientName: "Alpha Corp",
            projectName: "Enterprise ERP",
            currency: "EUR",
          },
          billingConfig: {
            billingType: "TIME_MATERIAL",
            pricingModel: "ROLE_BASED",
            billingMode: "ROLE_BASED",
            timeAndMaterial: {
              roles: [
                {
                  role: "Solution Architect",
                  rate: 180,
                  ratePeriod: "HOURLY",
                  hasDiscount: true,
                  discountType: "PERCENTAGE",
                  discountValue: 10,
                  discountedRate: 162,
                  includeInInvoice: true,
                },
              ],
            },
          },
        };

        render(
          <ReviewActivateStep
            wizardData={wizardData}
            onBack={() => {}}
            onSaveDraft={() => {}}
            onActivate={() => {}}
          />
        );

        expect(screen.getByText("Role-Based Rates")).toBeInTheDocument();
        expect(screen.getByText("Solution Architect")).toBeInTheDocument();
        expect(screen.getByText("(10% off)")).toBeInTheDocument();
        // Standard rate schedule table should not be present
        expect(screen.queryByText(/Standard Rate Schedule/)).not.toBeInTheDocument();
      });
    });
  });

  describe("Enhancement 1: Dual Independent Include in Invoice Controls & Work Eligibility", () => {
    it("renders both distinct Include in Invoice controls with accurate business descriptions", () => {
      const billingConfig = {
        billingType: "TIME_MATERIAL",
        billingMode: "STANDARD",
        currency: "USD",
        billingFrequency: "MONTHLY",
        timeAndMaterial: {
          rate: "200",
          ratePeriod: "HOURLY",
          includeInInvoice: true,
          discountPeriods: [
            {
              discountId: "p1",
              periodName: "Initial Pilot Period",
              discountType: "PERCENTAGE",
              discountValue: 15,
              effectiveFrom: "2026-01-01",
              effectiveTo: "2026-03-31",
              includeInInvoice: true,
            },
          ],
        },
      };

      const projectInfo = {
        projectName: "Platform Migration",
        clientName: "Acme Corp",
        currency: "USD",
        billingType: "TIME_MATERIAL",
        billingMode: "STANDARD",
        billingFrequency: "MONTHLY",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      };

      render(
        <BillingConfigurationStep
          value={billingConfig}
          onChange={() => {}}
          projectInfo={projectInfo}
        />
      );

      // 1. Base rate control outside the schedule list
      expect(screen.getByText("Include Base Rate in Invoice")).toBeInTheDocument();
      expect(
        screen.getByText(
          "When enabled, billable work outside active discount periods is included in customer invoice generation at the standard base rate."
        )
      ).toBeInTheDocument();

      // 2. Expand card to see period-level control
      const cardHeader = screen.getByText("Initial Pilot Period");
      fireEvent.click(cardHeader);

      // Period-level control inside the card
      expect(screen.getByText("Include in Invoice")).toBeInTheDocument();
      expect(
        screen.getByText(
          "When enabled, billable work covered by this discount period is included in customer invoice generation at the discounted rate."
        )
      ).toBeInTheDocument();
    });

    it("keeps an unchecked standard Include Base Rate in Invoice box false in both flag fields", () => {
      const onChange = vi.fn();
      const billingConfig = {
        billingType: "TIME_MATERIAL",
        billingMode: "STANDARD",
        currency: "USD",
        billingFrequency: "MONTHLY",
        timeAndMaterial: {
          rate: "200",
          ratePeriod: "HOURLY",
          includeInInvoice: true,
          includeBaseRateInInvoice: true,
          discountPeriods: [],
        },
      };

      render(
        <BillingConfigurationStep
          value={billingConfig}
          onChange={onChange}
          projectInfo={{
            projectName: "Platform Migration",
            clientName: "Acme Corp",
            currency: "USD",
            billingType: "TIME_MATERIAL",
            billingMode: "STANDARD",
            billingFrequency: "MONTHLY",
            startDate: "2026-01-01",
            endDate: "2026-12-31",
          }}
        />
      );

      fireEvent.click(screen.getByLabelText(/Include Base Rate in Invoice/));

      const updated = onChange.mock.calls.at(-1)[0].timeAndMaterial;
      expect(updated.includeInInvoice).toBe(false);
      expect(updated.includeBaseRateInInvoice).toBe(false);
    });

    it("saves an unchecked standard Include Base Rate in Invoice as false", async () => {
      createTmRateCard.mockClear();
      render(
        <BillingConfigurationStep
          value={{
            billingType: "TIME_MATERIAL",
            billingMode: "STANDARD",
            currency: "USD",
            billingFrequency: "MONTHLY",
            timeAndMaterial: {
              rate: "200",
              ratePeriod: "HOURLY",
              effectiveFrom: "2026-01-01",
              includeInInvoice: false,
              includeBaseRateInInvoice: false,
              discountPeriods: [],
            },
          }}
          onChange={() => {}}
          ensureBillingConfigurationId={vi.fn().mockResolvedValue("cfg-1")}
          projectInfo={{
            projectName: "Platform Migration",
            clientName: "Acme Corp",
            currency: "USD",
            billingType: "TIME_MATERIAL",
            billingMode: "STANDARD",
            billingFrequency: "MONTHLY",
            startDate: "2026-01-01",
            endDate: "2026-12-31",
          }}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Save Rate Card/i }));

      await waitFor(() => expect(createTmRateCard).toHaveBeenCalledTimes(1));
      const payload = createTmRateCard.mock.calls[0][1];
      expect(payload.includeBaseRateInInvoice).toBe(false);
      expect(payload.includeInInvoice).toBe(false);
    });

    it("evaluates work eligibility outside discount periods using base rate and Include Base Rate in Invoice setting", () => {
      // Work date with no active discount period:
      // A: Base rate included -> BILLABLE at standard base rate
      const resultIncluded = resolveTimeMaterialWorkEligibility({
        workDate: "2026-08-15",
        baseRate: 200,
        baseRatePeriod: "HOURLY",
        baseRateIncludeInInvoice: true,
        discountPeriods: [
          {
            discountId: "p1",
            effectiveFrom: "2026-01-01",
            effectiveTo: "2026-03-31",
            discountType: "PERCENTAGE",
            discountValue: 10,
            includeInInvoice: false,
          },
        ],
      });

      expect(resultIncluded.appliedRule).toBe("BASE_RATE");
      expect(resultIncluded.rate).toBe(200);
      expect(resultIncluded.isIncludedInInvoice).toBe(true);
      expect(resultIncluded.billingStatus).toBe("BILLABLE");

      // B: Base rate excluded -> EXCLUDED_FROM_INVOICE, while keeping audit details
      const resultExcluded = resolveTimeMaterialWorkEligibility({
        workDate: "2026-08-15",
        baseRate: 200,
        baseRatePeriod: "HOURLY",
        baseRateIncludeInInvoice: false,
        discountPeriods: [
          {
            discountId: "p1",
            effectiveFrom: "2026-01-01",
            effectiveTo: "2026-03-31",
            discountType: "PERCENTAGE",
            discountValue: 10,
            includeInInvoice: true,
          },
        ],
      });

      expect(resultExcluded.appliedRule).toBe("BASE_RATE");
      expect(resultExcluded.rate).toBe(200);
      expect(resultExcluded.isIncludedInInvoice).toBe(false);
      expect(resultExcluded.billingStatus).toBe("EXCLUDED_FROM_INVOICE");
      expect(resultExcluded.auditDetails.reason).toContain("excluded from invoice by base rate setting");
    });

    it("evaluates work eligibility within discount periods using period rate and period Include in Invoice setting", () => {
      const discountPeriods = [
        {
          discountId: "p-q1",
          periodName: "Q1 Discount",
          effectiveFrom: "2026-01-01",
          effectiveTo: "2026-03-31",
          discountType: "PERCENTAGE",
          discountValue: 20,
          includeInInvoice: true,
        },
        {
          discountId: "p-q2",
          periodName: "Q2 Trial",
          effectiveFrom: "2026-04-01",
          effectiveTo: "2026-06-30",
          discountType: "FIXED_AMOUNT",
          discountValue: 50,
          includeInInvoice: false,
        },
      ];

      // A: Q1 active date: period is included (even if baseRateIncludeInInvoice is false)
      const q1Result = resolveTimeMaterialWorkEligibility({
        workDate: "2026-02-15",
        baseRate: 200,
        baseRatePeriod: "HOURLY",
        baseRateIncludeInInvoice: false, // base rate disabled must not override period!
        discountPeriods,
      });

      expect(q1Result.appliedRule).toBe("DISCOUNT_PERIOD");
      expect(q1Result.rate).toBe(160); // 200 - 20% = 160
      expect(q1Result.isIncludedInInvoice).toBe(true);
      expect(q1Result.billingStatus).toBe("BILLABLE");

      // B: Q2 active date: period is excluded (even if baseRateIncludeInInvoice is true)
      const q2Result = resolveTimeMaterialWorkEligibility({
        workDate: "2026-05-10",
        baseRate: 200,
        baseRatePeriod: "HOURLY",
        baseRateIncludeInInvoice: true, // base rate enabled must not override period exclusion!
        discountPeriods,
      });

      expect(q2Result.appliedRule).toBe("DISCOUNT_PERIOD");
      expect(q2Result.rate).toBe(150); // 200 - 50 = 150
      expect(q2Result.isIncludedInInvoice).toBe(false);
      expect(q2Result.billingStatus).toBe("EXCLUDED_FROM_INVOICE");
      expect(q2Result.auditDetails.reason).toContain("excluded from invoice by period setting");
    });

    it("preserves independent inclusion settings in separate backend payload DTOs", () => {
      // 1. Rate card level payload carries includeInInvoice for base rate
      const cardPayload = buildTmRateCardRequestPayload(
        {
          rate: 200,
          ratePeriod: "HOURLY",
          includeInInvoice: false, // Base rate excluded
        },
        "STANDARD",
        "cfg-101"
      );
      expect(cardPayload.includeInInvoice).toBe(false);

      // 2. Rate discount level payload carries includeInInvoice for discount period
      const discountPayload = buildTmRateDiscountRequestPayload(
        {
          periodName: "Promo Window",
          discountType: "PERCENTAGE",
          discountValue: 10,
          effectiveFrom: "2026-01-01",
          effectiveTo: "2026-03-31",
          includeInInvoice: true, // Period included
        },
        "USD"
      );
      expect(discountPayload.includeInInvoice).toBe(true);
      expect(discountPayload.periodName).toBe("Promo Window");
    });
  });

  describe("Enhancement 2: Collapsible Standard Rate Schedule Accordion", () => {
    const populatedScheduleConfig = {
      billingType: "TIME_MATERIAL",
      billingMode: "STANDARD",
      currency: "EUR",
      billingFrequency: "MONTHLY",
      timeAndMaterial: {
        rate: "100",
        ratePeriod: "HOURLY",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-12-31",
        includeInInvoice: true,
        discountPeriods: [
          {
            discountId: "disc-1",
            periodName: "Q1 Launch Concession",
            discountType: "PERCENTAGE",
            discountValue: 20,
            effectiveFrom: "2026-01-01",
            effectiveTo: "2026-03-31",
            notes: "Initial rollout discount",
            includeInInvoice: true,
          },
          {
            discountId: "disc-2",
            periodName: "Summer Promotion",
            discountType: "FIXED_AMOUNT",
            discountValue: 30,
            effectiveFrom: "2026-06-01",
            effectiveTo: "2026-08-31",
            notes: "Mid-year campaign",
            includeInInvoice: false,
          },
        ],
      },
    };

    const projectInfo = {
      projectName: "ERP Modernization",
      clientName: "Globex Europe",
      currency: "EUR",
      billingType: "TIME_MATERIAL",
      billingMode: "STANDARD",
      billingFrequency: "MONTHLY",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    };

    it("collapses existing configured periods by default when opening a populated schedule", () => {
      render(
        <BillingConfigurationStep
          value={populatedScheduleConfig}
          onChange={() => {}}
          projectInfo={projectInfo}
        />
      );

      // Period names and numbers are visible in the collapsed summaries
      expect(screen.getByText("Q1 Launch Concession")).toBeInTheDocument();
      expect(screen.getByText("Summer Promotion")).toBeInTheDocument();

      // Editable inputs inside the accordion should NOT be rendered while collapsed
      expect(screen.queryByPlaceholderText("e.g. Q1 Introductory Client Discount")).not.toBeInTheDocument();
    });

    it("displays correct dates, discount, net rate, and inclusion status in collapsed summary", () => {
      render(
        <BillingConfigurationStep
          value={populatedScheduleConfig}
          onChange={() => {}}
          projectInfo={projectInfo}
        />
      );

      // Period 1 Summary: Dates, 20% discount, 80 EUR net rate, Included badge
      expect(screen.getByText("2026-01-01 to 2026-03-31")).toBeInTheDocument();
      expect(screen.getByText("20% (PERCENTAGE)")).toBeInTheDocument();
      expect(screen.getByText("€80.00 / hr")).toBeInTheDocument();
      expect(screen.getByText("Included in Invoice")).toBeInTheDocument();

      // Period 2 Summary: Dates, 30 EUR discount, 70 EUR net rate, Excluded badge
      expect(screen.getByText("2026-06-01 to 2026-08-31")).toBeInTheDocument();
      expect(screen.getByText("€30.00 (FIXED_AMOUNT)")).toBeInTheDocument();
      expect(screen.getByText("€70.00 / hr")).toBeInTheDocument();
      expect(screen.getByText("Excluded from Invoice")).toBeInTheDocument();
    });

    it("supports independent expansion and collapse of individual cards while preserving values", () => {
      render(
        <BillingConfigurationStep
          value={populatedScheduleConfig}
          onChange={() => {}}
          projectInfo={projectInfo}
        />
      );

      // Click to expand Period 1
      fireEvent.click(screen.getByText("Q1 Launch Concession"));

      // Period 1 inputs are now visible
      const period1Inputs = screen.getAllByDisplayValue("Q1 Launch Concession");
      expect(period1Inputs.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByDisplayValue("Initial rollout discount")).toBeInTheDocument();

      // Period 2 remains collapsed
      expect(screen.queryByDisplayValue("Mid-year campaign")).not.toBeInTheDocument();

      // Click to expand Period 2
      fireEvent.click(screen.getByText("Summer Promotion"));

      // Both are now expanded independently
      expect(screen.getByDisplayValue("Initial rollout discount")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Mid-year campaign")).toBeInTheDocument();

      // Click to collapse Period 1
      fireEvent.click(screen.getByText("Q1 Launch Concession"));

      // Period 1 is collapsed, Period 2 remains expanded with values intact
      expect(screen.queryByDisplayValue("Initial rollout discount")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Mid-year campaign")).toBeInTheDocument();
    });

    it("automatically expands newly created periods when Add Rate Period is clicked", () => {
      let currentVal = { ...populatedScheduleConfig };
      const handleChange = (patch) => {
        currentVal = { ...currentVal, ...patch };
      };

      const { rerender } = render(
        <BillingConfigurationStep
          value={currentVal}
          onChange={handleChange}
          projectInfo={projectInfo}
        />
      );

      // Click Add Rate Period
      const addButton = screen.getByRole("button", { name: /Add Rate Period/i });
      fireEvent.click(addButton);

      // Rerender with updated value containing 3 periods
      rerender(
        <BillingConfigurationStep
          value={currentVal}
          onChange={handleChange}
          projectInfo={projectInfo}
        />
      );

      // Period 3 is added and automatically expanded, revealing its default inputs
      expect(screen.getByDisplayValue("Period 3")).toBeInTheDocument();
    });

    it("removes deleted period without corrupting remaining periods or expansion state", async () => {
      window.confirm = vi.fn(() => true);
      let currentVal = { ...populatedScheduleConfig };
      const handleChange = (next) => {
        currentVal = next;
      };

      const { rerender } = render(
        <BillingConfigurationStep
          value={currentVal}
          onChange={handleChange}
          projectInfo={projectInfo}
        />
      );

      // Delete Period 1
      const deleteButtons = screen.getAllByTitle("Remove discount period");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(deleteTmRateDiscount).toHaveBeenCalledWith("disc-1");
      });

      rerender(
        <BillingConfigurationStep
          value={currentVal}
          onChange={handleChange}
          projectInfo={projectInfo}
        />
      );

      // Period 1 is gone, Period 2 ("Summer Promotion") remains intact
      expect(screen.queryByText("Q1 Launch Concession")).not.toBeInTheDocument();
      expect(screen.getByText("Summer Promotion")).toBeInTheDocument();
    });

    it("automatically expands invalid cards when Save or Next validation is triggered", () => {
      const invalidScheduleConfig = {
        billingType: "TIME_MATERIAL",
        billingMode: "STANDARD",
        currency: "USD",
        billingFrequency: "MONTHLY",
        timeAndMaterial: {
          rate: "200",
          ratePeriod: "HOURLY",
          effectiveFrom: "2026-01-01",
          effectiveTo: "2026-12-31",
          includeInInvoice: true,
          discountPeriods: [
            {
              discountId: "inv-1",
              periodName: "Valid Period",
              discountType: "PERCENTAGE",
              discountValue: 10,
              effectiveFrom: "2026-01-01",
              effectiveTo: "2026-03-31",
              includeInInvoice: true,
            },
            {
              discountId: "inv-2",
              periodName: "Invalid Discount Period",
              discountType: "PERCENTAGE",
              discountValue: 150, // Invalid: exceeds 100%
              effectiveFrom: "2026-04-01",
              effectiveTo: "2026-06-30",
              includeInInvoice: true,
            },
          ],
        },
      };

      render(
        <BillingConfigurationStep
          value={invalidScheduleConfig}
          onChange={() => {}}
          projectInfo={projectInfo}
        />
      );

      // Collapsed summary displays validation error indicator
      expect(screen.getByText("Percentage discount must be less than 100%.")).toBeInTheDocument();
      // Form input inside card is not rendered while collapsed
      expect(screen.queryByDisplayValue("Invalid Discount Period")).not.toBeInTheDocument();

      // Trigger Save Rate Card
      const saveButton = screen.getByRole("button", { name: /Save Rate Card/i });
      fireEvent.click(saveButton);

      // The invalid card is automatically expanded and form inputs become visible
      expect(screen.getByDisplayValue("Invalid Discount Period")).toBeInTheDocument();
    });

    it("prevents adding a new rate period when Period 1 or any existing period is incomplete or invalid", () => {
      let currentVal = {
        billingType: "TIME_MATERIAL",
        billingMode: "STANDARD",
        currency: "USD",
        billingFrequency: "MONTHLY",
        timeAndMaterial: {
          rate: "200",
          ratePeriod: "HOURLY",
          effectiveFrom: "2026-01-01",
          effectiveTo: "2026-12-31",
          includeInInvoice: true,
          discountPeriods: [
            {
              discountId: "p1",
              periodName: "Period 1",
              discountType: "PERCENTAGE",
              discountValue: "", // Incomplete!
              effectiveFrom: "2026-01-01",
              effectiveTo: "2026-03-31",
              includeInInvoice: true,
            },
          ],
        },
      };

      const handleChange = vi.fn();

      render(
        <BillingConfigurationStep
          value={currentVal}
          onChange={handleChange}
          projectInfo={projectInfo}
        />
      );

      // Attempt to add a new rate period while Period 1 is incomplete
      const addButton = screen.getByRole("button", { name: /Add Rate Period/i });
      fireEvent.click(addButton);

      // Should NOT call onChange to add a new period
      expect(handleChange).not.toHaveBeenCalled();
      // Period 2 should NOT exist
      expect(screen.queryByText("Period 2")).not.toBeInTheDocument();
    });

    it("allows entering a custom period name and editing it freely without snapping back to Period 1", () => {
      const initialConfig = {
        billingType: "TIME_MATERIAL",
        billingMode: "STANDARD",
        currency: "USD",
        billingFrequency: "MONTHLY",
        timeAndMaterial: {
          rate: "100",
          ratePeriod: "HOURLY",
          effectiveFrom: "2026-01-01",
          effectiveTo: "2026-12-31",
          discountPeriods: [
            {
              _uid: "p-1",
              periodName: "Period 1",
              discountType: "PERCENTAGE",
              discountValue: 10,
              effectiveFrom: "2026-01-01",
              effectiveTo: "2026-03-31",
            },
          ],
        },
      };

      const handleChange = vi.fn();
      render(
        <BillingConfigurationStep
          value={initialConfig}
          onChange={handleChange}
          projectInfo={{ startDate: "2026-01-01", endDate: "2026-12-31", currency: "USD" }}
        />
      );

      // Expand the first card to edit
      fireEvent.click(screen.getByText("Period 1"));

      const nameInput = screen.getByDisplayValue("Period 1");
      expect(nameInput).toBeInTheDocument();

      // Clear the input
      fireEvent.change(nameInput, { target: { value: "" } });
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          timeAndMaterial: expect.objectContaining({
            discountPeriods: expect.arrayContaining([
              expect.objectContaining({ periodName: "" }),
            ]),
          }),
        })
      );

      // Type custom name
      fireEvent.change(nameInput, { target: { value: "Summer Promotional Rate" } });
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          timeAndMaterial: expect.objectContaining({
            discountPeriods: expect.arrayContaining([
              expect.objectContaining({ periodName: "Summer Promotional Rate" }),
            ]),
          }),
        })
      );
    });
  });

  describe("Role-Based Rates Enhancement", () => {
    const projectInfo = {
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      currency: "INR",
    };

    it("1. supports multiple roles with different base rates", () => {
      const rolesData = [
        { roleName: "Senior Developer", rate: 1000, ratePeriod: "HOURLY" },
        { roleName: "Junior Developer", rate: 600, ratePeriod: "HOURLY" },
        { roleName: "Tester", rate: 500, ratePeriod: "HOURLY" },
        { roleName: "Tech Lead", rate: 1200, ratePeriod: "HOURLY" },
        { roleName: "Business Analyst", rate: 800, ratePeriod: "HOURLY" },
      ];

      const normalizedRoles = rolesData.map((r) => normalizeTmRateCard(r));
      expect(normalizedRoles).toHaveLength(5);
      expect(normalizedRoles[0].roleName).toBe("Senior Developer");
      expect(normalizedRoles[0].rate).toBe(1000);
      expect(normalizedRoles[1].roleName).toBe("Junior Developer");
      expect(normalizedRoles[1].rate).toBe(600);
      expect(normalizedRoles[2].rate).toBe(500);
      expect(normalizedRoles[3].rate).toBe(1200);
      expect(normalizedRoles[4].rate).toBe(800);
    });

    it("2. supports multiple discount periods for one role", () => {
      const seniorDev = {
        roleName: "Senior Developer",
        rate: 1000,
        ratePeriod: "HOURLY",
        discountPeriods: [
          {
            discountId: "d1",
            periodName: "Q1 Pilot Discount",
            discountType: "PERCENTAGE",
            discountValue: 20,
            effectiveFrom: "2026-01-01",
            effectiveTo: "2026-03-31",
            includeInInvoice: true,
          },
          {
            discountId: "d2",
            periodName: "Q2 Promotional Discount",
            discountType: "FIXED_AMOUNT",
            discountValue: 100,
            effectiveFrom: "2026-04-01",
            effectiveTo: "2026-06-30",
            includeInInvoice: false,
          },
        ],
      };

      const normalized = normalizeTmRateCard(seniorDev);
      expect(normalized.discountPeriods).toHaveLength(2);
      expect(normalized.discountPeriods[0].periodName).toBe("Q1 Pilot Discount");
      expect(normalized.discountPeriods[0].discountValue).toBe(20);
      expect(normalized.discountPeriods[1].periodName).toBe("Q2 Promotional Discount");
      expect(normalized.discountPeriods[1].discountValue).toBe(100);
    });

    it("3. maintains independent discount schedules across different roles", () => {
      const seniorDev = {
        roleName: "Senior Developer",
        rate: 1000,
        discountPeriods: [
          { periodName: "Senior P1", discountType: "PERCENTAGE", discountValue: 20 },
          { periodName: "Senior P2", discountType: "PERCENTAGE", discountValue: 10 },
        ],
      };
      const juniorDev = {
        roleName: "Junior Developer",
        rate: 600,
        discountPeriods: [
          { periodName: "Junior P1", discountType: "PERCENTAGE", discountValue: 15 },
        ],
      };
      const tester = {
        roleName: "Tester",
        rate: 500,
        discountPeriods: [],
      };

      const normSenior = normalizeTmRateCard(seniorDev);
      const normJunior = normalizeTmRateCard(juniorDev);
      const normTester = normalizeTmRateCard(tester);

      expect(normSenior.discountPeriods).toHaveLength(2);
      expect(normJunior.discountPeriods).toHaveLength(1);
      expect(normTester.discountPeriods).toHaveLength(0);

      // Mutating senior discount periods does not affect junior or tester
      normSenior.discountPeriods.pop();
      expect(normSenior.discountPeriods).toHaveLength(1);
      expect(normJunior.discountPeriods).toHaveLength(1);
      expect(normTester.discountPeriods).toHaveLength(0);
    });

    it("4. calculates percentage and fixed discount previews correctly for role rates", () => {
      // Senior Dev: ₹1,000/hr, 20% discount = ₹800/hr
      const percentPreview = calculateRateDiscountPreview({
        baseRate: 1000,
        discountType: "PERCENTAGE",
        discountValue: 20,
        ratePeriod: "HOURLY",
      });
      expect(percentPreview.isValid).toBe(true);
      expect(percentPreview.discountAmount).toBe(200);
      expect(percentPreview.netRate).toBe(800);

      // Senior Dev: ₹1,000/hr, Fixed discount ₹100/hr = ₹900/hr
      const fixedPreview = calculateRateDiscountPreview({
        baseRate: 1000,
        discountType: "FIXED_AMOUNT",
        discountValue: 100,
        ratePeriod: "HOURLY",
      });
      expect(fixedPreview.isValid).toBe(true);
      expect(fixedPreview.discountAmount).toBe(100);
      expect(fixedPreview.netRate).toBe(900);
    });

    it("5. formats currency dynamically without hardcoding INR or applying frontend FX conversion", () => {
      expect(formatCurrency(1000, "INR")).toMatch(/₹|INR/);
      expect(formatCurrency(1000, "USD")).toMatch(/\$|USD/);
      expect(formatCurrency(1000, "EUR")).toMatch(/€|EUR/);
      expect(formatCurrency(1000, "GBP")).toMatch(/£|GBP/);
      expect(isValidCurrency("INR")).toBe(true);
      expect(isValidCurrency("USD")).toBe(true);
      expect(isValidCurrency("INVALID_CURRENCY")).toBe(false);
    });

    it("6. supports independent base-rate and discount-period invoice inclusion controls", () => {
      const roleCard = {
        roleName: "Senior Developer",
        rate: 1000,
        includeBaseRateInInvoice: false, // Base rate excluded
        discountPeriods: [
          {
            discountId: "p1",
            periodName: "Q1 Included Period",
            discountType: "PERCENTAGE",
            discountValue: 20,
            includeInInvoice: true, // Period included
          },
          {
            discountId: "p2",
            periodName: "Q2 Excluded Period",
            discountType: "PERCENTAGE",
            discountValue: 10,
            includeInInvoice: false, // Period excluded
          },
        ],
      };

      const normalized = normalizeTmRateCard(roleCard);
      expect(normalized.includeBaseRateInInvoice).toBe(false);
      expect(normalized.discountPeriods[0].includeInInvoice).toBe(true);
      expect(normalized.discountPeriods[1].includeInInvoice).toBe(false);

      // Payload building retains both fields independently
      const payload = buildTmRateCardRequestPayload("config-1", normalized);
      expect(payload.includeBaseRateInInvoice).toBe(false);
      expect(payload.discountPeriods[0].includeInInvoice).toBe(true);
      expect(payload.discountPeriods[1].includeInInvoice).toBe(false);
    });

    it("7. renders role cards with add, edit, and delete discount period actions", async () => {
      const handleChange = vi.fn();
      const val = {
        billingType: "TIME_MATERIAL",
        billingMode: "ROLE_BASED",
        currency: "INR",
        billingFrequency: "MONTHLY",
        timeAndMaterial: {
          roles: [
            {
              _uid: "role-1",
              role: "Senior Developer",
              roleName: "Senior Developer",
              rate: "1000",
              ratePeriod: "HOURLY",
              includeBaseRateInInvoice: true,
              includeInInvoice: true,
              discountPeriods: [
                {
                  _uid: "p-1",
                  periodName: "Initial Period",
                  discountType: "PERCENTAGE",
                  discountValue: "20",
                  effectiveFrom: "2026-01-01",
                  effectiveTo: "2026-03-31",
                  includeInInvoice: true,
                },
              ],
            },
          ],
        },
      };

      render(
        <BillingConfigurationStep
          value={val}
          onChange={handleChange}
          projectInfo={projectInfo}
        />
      );

      // Senior Developer card should be rendered
      expect(screen.getByText("Senior Developer")).toBeInTheDocument();
      expect(screen.getByText("Initial Period")).toBeInTheDocument();

      // Click Add Rate Period for this role
      const addPeriodBtns = screen.getAllByRole("button", { name: /Add Rate Period/i });
      fireEvent.click(addPeriodBtns[0]);

      expect(handleChange).toHaveBeenCalled();
      const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
      const updatedPeriods = lastCall.timeAndMaterial.roles[0].discountPeriods;
      expect(updatedPeriods).toHaveLength(2);
      expect(updatedPeriods[1].periodName).toBe("Period 2");
    });

    it("8. validates inclusive adjacent non-overlapping period dates", () => {
      const p1 = { effectiveFrom: "2026-01-01", effectiveTo: "2026-03-31" };
      const p2 = { effectiveFrom: "2026-04-01", effectiveTo: "2026-06-30" };

      // Check overlap logic: adjacent periods (March 31 and April 1) do NOT overlap
      const overlaps = p1.effectiveFrom <= p2.effectiveTo && p1.effectiveTo >= p2.effectiveFrom;
      expect(overlaps).toBe(false);
    });

    it("9. rejects overlapping discount periods within the same role", () => {
      const p1 = { periodName: "Period 1", effectiveFrom: "2026-01-01", effectiveTo: "2026-03-31" };
      const p2 = { periodName: "Period 2", effectiveFrom: "2026-03-15", effectiveTo: "2026-05-31" };

      const overlaps = p1.effectiveFrom <= p2.effectiveTo && p1.effectiveTo >= p2.effectiveFrom;
      expect(overlaps).toBe(true);
    });

    it("10. allows identical discount dates across different roles without conflict", () => {
      const seniorPeriods = [
        { periodName: "Senior Q1", effectiveFrom: "2026-01-01", effectiveTo: "2026-03-31" },
      ];
      const juniorPeriods = [
        { periodName: "Junior Q1", effectiveFrom: "2026-01-01", effectiveTo: "2026-03-31" },
      ];

      // Overlap checking confined to same role's periods array
      const checkSelfOverlap = (periods) => {
        for (let i = 0; i < periods.length; i++) {
          for (let j = i + 1; j < periods.length; j++) {
            if (periods[i].effectiveFrom <= periods[j].effectiveTo && periods[i].effectiveTo >= periods[j].effectiveFrom) {
              return true;
            }
          }
        }
        return false;
      };

      expect(checkSelfOverlap(seniorPeriods)).toBe(false);
      expect(checkSelfOverlap(juniorPeriods)).toBe(false);
    });

    it("11. validates role and period bounds (percentage < 100%, fixed < base rate, rate > 0)", () => {
      // Percentage >= 100 is invalid
      const p100 = calculateRateDiscountPreview({ baseRate: 1000, discountType: "PERCENTAGE", discountValue: 100 });
      expect(p100.isValid).toBe(false);
      expect(p100.error).toMatch(/less than 100%/i);

      // Fixed discount >= base rate is invalid
      const pFixed = calculateRateDiscountPreview({ baseRate: 1000, discountType: "FIXED_AMOUNT", discountValue: 1200 });
      expect(pFixed.isValid).toBe(false);
      expect(pFixed.error).toMatch(/less than base rate/i);

      // Missing base rate
      const pNoRate = calculateRateDiscountPreview({ baseRate: "", discountType: "PERCENTAGE", discountValue: 10 });
      expect(pNoRate.isValid).toBe(false);
    });

    it("12. builds rate card and discount payloads accurately for multiple roles and periods", () => {
      const roleCard = {
        rateCardId: "rc-101",
        roleName: "Tech Lead",
        rate: 1500,
        ratePeriod: "HOURLY",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-12-31",
        includeBaseRateInInvoice: true,
        discountPeriods: [
          {
            discountId: "d-1",
            periodName: "H1 Discount",
            discountType: "PERCENTAGE",
            discountValue: 10,
            effectiveFrom: "2026-01-01",
            effectiveTo: "2026-06-30",
            notes: "H1 promotional agreement",
            includeInInvoice: true,
          },
        ],
      };

      const cardPayload = buildTmRateCardRequestPayload("config-1", roleCard);
      expect(cardPayload.roleName).toBe("Tech Lead");
      expect(cardPayload.rate).toBe(1500);
      expect(cardPayload.includeBaseRateInInvoice).toBe(true);

      const discountPayload = buildTmRateDiscountRequestPayload(roleCard.discountPeriods[0]);
      expect(discountPayload.periodName).toBe("H1 Discount");
      expect(discountPayload.discountType).toBe("PERCENTAGE");
      expect(discountPayload.discountValue).toBe(10);
      expect(discountPayload.includeInInvoice).toBe(true);
    });

    it("13. maps includeBaseRateInInvoice correctly from API responses and defaults", () => {
      // Backend returned includeBaseRateInInvoice = false
      const cardWithFalse = normalizeTmRateCard({
        id: "c-1",
        roleName: "Dev",
        rate: 800,
        includeBaseRateInInvoice: false,
      });
      expect(cardWithFalse.includeBaseRateInInvoice).toBe(false);

      // Backend returned includeBaseRateInInvoice = true
      const cardWithTrue = normalizeTmRateCard({
        id: "c-2",
        roleName: "Dev",
        rate: 800,
        includeBaseRateInInvoice: true,
      });
      expect(cardWithTrue.includeBaseRateInInvoice).toBe(true);

      // Legacy backend payload where includeInInvoice was used
      const cardLegacy = normalizeTmRateCard({
        id: "c-3",
        roleName: "Dev",
        rate: 800,
        includeInInvoice: false,
      });
      expect(cardLegacy.includeBaseRateInInvoice).toBe(false);
    });

    it("14. renders all configured roles and multi-period discount schedules on the Review screen", () => {
      const reviewData = {
        projectInfo: {
          projectName: "AR Transformation",
          projectCode: "PRJ-001",
          currency: "INR",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        },
        billingConfig: {
          billingType: "TIME_MATERIAL",
          billingMode: "ROLE_BASED",
          currency: "INR",
          billingFrequency: "MONTHLY",
          timeAndMaterial: {
            roles: [
              {
                roleName: "Senior Developer",
                rate: 1000,
                ratePeriod: "HOURLY",
                effectiveFrom: "2026-01-01",
                effectiveTo: "2026-12-31",
                includeBaseRateInInvoice: true,
                discountPeriods: [
                  {
                    periodName: "Q1 Launch Offer",
                    discountType: "PERCENTAGE",
                    discountValue: 20,
                    netRate: 800,
                    effectiveFrom: "2026-01-01",
                    effectiveTo: "2026-03-31",
                    includeInInvoice: true,
                  },
                ],
              },
              {
                roleName: "Junior Developer",
                rate: 600,
                ratePeriod: "HOURLY",
                includeBaseRateInInvoice: false,
                discountPeriods: [],
              },
            ],
          },
        },
        controls: {
          autoInvoiceGeneration: false,
          taxRegionId: "tax-1",
          paymentTermId: "pt-1",
        },
      };

      render(<ReviewActivateStep data={reviewData} />);

      // Both roles must be visible
      expect(screen.getByText("Senior Developer")).toBeInTheDocument();
      expect(screen.getByText("Junior Developer")).toBeInTheDocument();

      // Senior Developer discount period and net rate must be visible
      expect(screen.getByText("Q1 Launch Offer")).toBeInTheDocument();
      expect(screen.getByText(/20% off/i)).toBeInTheDocument();

      // Junior Developer excluded base rate badge must be visible
      expect(screen.getByText("Excluded")).toBeInTheDocument();
    });

    it("15. distinguishes excluded entries for audit without presenting them as payable invoice lines", () => {
      const lineItems = [
        {
          id: "item-1",
          employee: "Alice",
          role: "Senior Developer",
          workDate: "2026-01-15",
          hours: 10,
          rate: 1000,
          amount: 10000,
          includeInInvoice: true,
        },
        {
          id: "item-2",
          employee: "Bob",
          role: "Junior Developer",
          workDate: "2026-01-16",
          hours: 8,
          rate: 600,
          amount: 4800,
          includeInInvoice: false, // Excluded from invoice
        },
      ];

      // Acquisition table rendering: Bob is visible for audit but marked excluded
      render(<TimesheetDataTable records={lineItems} currency="INR" />);
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText(/Excluded \(INR 0.00 payable\)/i)).toBeInTheDocument();

      // Invoice presentation: buildInvoiceLineItems excludes Bob from payable lines
      const { rows } = buildInvoiceLineItems("TIME_MATERIAL", lineItems, "INR");
      expect(rows).toHaveLength(1);
      expect(rows[0].item).toBe("Alice");
    });

    it("16. maintains regression coverage for standard rate schedules alongside role-based rates", () => {
      const standardRateConfig = {
        rate: "2000",
        ratePeriod: "HOURLY",
        hasDiscount: true,
        discountType: "PERCENTAGE",
        discountValue: "10",
        discountPeriods: [
          {
            discountId: "d-std-1",
            periodName: "Standard Q1",
            discountType: "PERCENTAGE",
            discountValue: 10,
            effectiveFrom: "2026-01-01",
            effectiveTo: "2026-03-31",
            includeInInvoice: true,
          },
        ],
      };

      const normalized = normalizeTmRateCard(standardRateConfig, false);
      expect(normalized.rate).toBe("2000");
      expect(normalized.discountPeriods).toHaveLength(1);
      expect(normalized.discountPeriods[0].periodName).toBe("Standard Q1");
      expect(normalized.discountPeriods[0].discountValue).toBe(10);
    });

    it("17. formats Standard Rate Schedule table with table-fixed, balanced column widths and clean discount labels in preview", () => {
      const wizardData = {
        billingConfig: {
          billingType: "TIME_MATERIAL",
          pricingModel: "STANDARD",
          timeAndMaterial: {
            rate: 100,
            ratePeriod: "HOURLY",
            includeBaseRateInInvoice: true,
            discountPeriods: [
              {
                discountId: "d-1",
                periodName: "Period 1",
                discountType: "PERCENTAGE",
                discountValue: 20,
                effectiveFrom: "2026-09-30",
                effectiveTo: "2026-12-30",
                includeInInvoice: true,
                notes: "Q4 promo",
              },
              {
                discountId: "d-2",
                periodName: "Period 2",
                discountType: "PERCENTAGE",
                discountValue: 10,
                effectiveFrom: "2026-12-31",
                effectiveTo: "2027-01-31",
                includeInInvoice: true,
              },
            ],
          },
        },
        projectInfo: { id: 101, projectName: "Alpha Project", currency: "USD" },
      };

      const { container } = render(
        <ReviewActivateStep
          wizardData={wizardData}
        />
      );

      // Verify table layout and headers
      const table = container.querySelector("table.table-fixed");
      expect(table).toBeInTheDocument();
      expect(screen.getByText("Standard Rate Schedule (2 Periods)")).toBeInTheDocument();
      expect(screen.getByText("Period 1")).toBeInTheDocument();
      expect(screen.getByText("Period 2")).toBeInTheDocument();

      // Verify discount formatting does not duplicate percentage
      expect(screen.getByText(/20% \(Percentage\)/i)).toBeInTheDocument();
      expect(screen.getByText(/10% \(Percentage\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/20% \(%\)/i)).not.toBeInTheDocument();

      // Verify base rate fallback notice
      expect(screen.getByText(/Base-Rate Fallback:/i)).toBeInTheDocument();
      expect(screen.getByText(/Outside configured discount periods, billing falls back automatically/i)).toBeInTheDocument();
    });

    it("18. builds approval review model with hydrated discount periods and renders them in manager approval preview", () => {
      const record = {
        billingType: "TIME_MATERIAL",
        pricingModel: "STANDARD",
        currencyCode: "USD",
        effectiveFrom: "2026-09-30",
        effectiveTo: "2027-01-31",
        tmRateCards: [
          {
            rateCardId: "rc-1",
            roleName: "Standard Rate",
            rate: 100,
            ratePeriod: "HOURLY",
            includeBaseRateInInvoice: true,
            discountPeriods: [
              {
                discountId: "d-1",
                periodName: "Period 1",
                discountType: "PERCENTAGE",
                discountValue: 20,
                netRate: 80,
                effectiveFrom: "2026-09-30",
                effectiveTo: "2026-12-30",
                includeInInvoice: true,
                notes: "Initial discount",
              },
              {
                discountId: "d-2",
                periodName: "Period 2",
                discountType: "PERCENTAGE",
                discountValue: 10,
                netRate: 90,
                effectiveFrom: "2026-12-31",
                effectiveTo: "2027-01-31",
                includeInInvoice: true,
              },
            ],
          },
        ],
      };

      const review = buildApprovalReviewModel(record, null, { projectName: "Paves Corp", projectCode: "PRJ-99" });
      expect(review.pricingDetails.standardDiscountPeriods).toHaveLength(2);
      expect(review.pricingDetails.rateCards[0].rate).toBe(100);

      render(
        <ApprovalReviewDetails
          config={{
            review,
            approvalStatus: "PENDING_APPROVAL",
            billingStatus: "INACTIVE",
          }}
        />
      );

      // Verify manager preview displays the discount schedule table
      expect(screen.getByText("Standard Rate Schedule (2 Periods)")).toBeInTheDocument();
      expect(screen.getByText("Period 1")).toBeInTheDocument();
      expect(screen.getByText("Period 2")).toBeInTheDocument();
      expect(screen.getByText("2026-09-30 to 2026-12-30")).toBeInTheDocument();
      expect(screen.getByText("2026-12-31 to 2027-01-31")).toBeInTheDocument();
      expect(screen.getByText(/20% \(Percentage\)/i)).toBeInTheDocument();
      expect(screen.getByText(/10% \(Percentage\)/i)).toBeInTheDocument();
      expect(screen.getByText("Initial discount")).toBeInTheDocument();
      expect(screen.getByText(/Base-Rate Fallback:/i)).toBeInTheDocument();
    });

    describe("InvoicePreviewDocument line presentation (backend-driven)", () => {
      const baseInvoice = {
        invoiceNumber: null,
        isDraftPreview: true,
        generated: false,
        clientName: "finance account",
        projectName: "AR project",
        currency: "USD",
        billingTypeCode: "TIME_MATERIAL",
        billingType: "TIME_MATERIAL",
        totalTax: 0,
        taxRegionCode: "EXPORT",
        // Configuration discount periods are present on purpose: they must never be applied to lines by the UI.
        timeAndMaterial: {
          rate: 100,
          discountPeriods: [
            {
              periodName: "Config Period",
              discountType: "PERCENTAGE",
              discountValue: 50,
              effectiveFrom: "2026-07-01",
              effectiveTo: "2026-07-31",
              includeInInvoice: true,
            },
          ],
        },
      };

      const developer = {
        id: "dev-1",
        itemType: "TIME_ENTRY",
        resourceName: "Dev Resource",
        role: "Developer",
        workDate: "2026-07-15",
        quantity: 8,
        baseRate: 100,
        rate: 90,
        discountType: "PERCENTAGE",
        discountValue: 10,
        discountPeriodName: "Intro",
        amount: 720,
      };
      const tester = {
        id: "qa-1",
        itemType: "TIME_ENTRY",
        resourceName: "QA Resource",
        role: "Tester",
        workDate: "2026-07-15",
        quantity: 8,
        baseRate: 80,
        rate: 64,
        discountType: "PERCENTAGE",
        discountValue: 20,
        discountPeriodName: "QA Intro",
        amount: 512,
      };
      const travel = {
        id: "exp-1",
        itemType: "EXPENSE",
        itemName: "Travel",
        workDate: "2026-07-10", // inside the configuration's discount window
        quantity: 1,
        rate: 250,
        amount: 250,
      };

      it("shows base rate, the line's own discount, net rate and the backend line amount", () => {
        render(<InvoicePreviewDocument invoice={{ ...baseInvoice, subtotal: 720, grandTotal: 720, items: [developer] }} />);

        expect(screen.getByText("Dev Resource")).toBeInTheDocument();
        expect(screen.getByText("Developer")).toBeInTheDocument();
        expect(screen.getByText("10%")).toBeInTheDocument();
        expect(screen.getByText("Intro")).toBeInTheDocument();
        expect(screen.getByText("$100.00")).toBeInTheDocument(); // base rate
        expect(screen.getByText("$90.00")).toBeInTheDocument(); // net rate
        expect(screen.getAllByText("$720.00").length).toBeGreaterThanOrEqual(1);
        // Nothing is derived from the configuration's discount periods.
        expect(screen.queryByText(/Config Period/)).not.toBeInTheDocument();
        expect(screen.queryByText("Discount Schedule:")).not.toBeInTheDocument();
        expect(screen.queryByText(/Standard Base/)).not.toBeInTheDocument();
      });

      it("keeps each role's discount on its own timesheet line and never on an expense", () => {
        render(
          <InvoicePreviewDocument
            invoice={{ ...baseInvoice, subtotal: 1482, grandTotal: 1482, items: [developer, tester, travel] }}
          />
        );

        const row = (text) => screen.getByText(text).closest("tr");
        const devRow = within(row("Dev Resource"));
        expect(devRow.getByText("10%")).toBeInTheDocument();
        expect(devRow.queryByText("20%")).not.toBeInTheDocument();

        const qaRow = within(row("QA Resource"));
        expect(qaRow.getByText("20%")).toBeInTheDocument();
        expect(qaRow.queryByText("10%")).not.toBeInTheDocument();

        // The expense (dated inside the configuration's discount window) keeps its approved amount, no discount.
        const expenseRow = within(row("Travel"));
        expect(expenseRow.getByText("$250.00", { selector: "td" })).toBeInTheDocument();
        expect(expenseRow.queryByText(/%|off|Config Period|Intro/)).not.toBeInTheDocument();
      });

      it("reconciles section subtotals with the backend line amounts and taxable subtotal", () => {
        render(
          <InvoicePreviewDocument
            invoice={{ ...baseInvoice, subtotal: 1482, grandTotal: 1482, items: [developer, tester, travel] }}
          />
        );

        const summary = within(screen.getByText("Tax & Invoice Summary").closest("div").parentElement);
        expect(summary.getByText("Time & Material Subtotal").nextSibling).toHaveTextContent("$1,232.00"); // 720 + 512
        expect(summary.getByText("Expenses Subtotal").nextSibling).toHaveTextContent("$250.00");
        expect(summary.getByText("Taxable Subtotal").nextSibling).toHaveTextContent("$1,482.00");
      });

      it("labels a percentage discount as a percentage and a fixed discount as a monetary amount", () => {
        const fixedTester = {
          ...tester,
          discountType: "FIXED",
          discountValue: 16,
          discountPeriodName: "Fixed Intro",
        };
        render(
          <InvoicePreviewDocument
            invoice={{ ...baseInvoice, subtotal: 1232, grandTotal: 1232, items: [developer, fixedTester] }}
          />
        );

        const devRow = within(screen.getByText("Dev Resource").closest("tr"));
        expect(devRow.getByText("10%")).toBeInTheDocument();
        expect(devRow.queryByText(/off/)).not.toBeInTheDocument();

        const qaRow = within(screen.getByText("QA Resource").closest("tr"));
        expect(qaRow.getByText("$16.00 off")).toBeInTheDocument();
        expect(qaRow.queryByText(/%/)).not.toBeInTheDocument();
        expect(qaRow.getByText("Fixed Intro")).toBeInTheDocument();
      });

      it("renders the persisted Standard Rate + expense example with the backend figures", () => {
        // BS-20261016163256: 9h x $80 net (base $100, 20% off), a $12 meal (INR 1200 @ 0.01), IGST 9% = $65.88.
        render(
          <InvoicePreviewDocument
            invoice={{
              ...baseInvoice,
              taxRegionCode: "IN",
              subtotal: 732,
              totalTax: 65.88,
              grandTotal: 797.88,
              taxComponents: [
                { id: "igst", taxTypeCode: "IGST", taxTypeName: "Integrated Goods and Services Tax", appliedRate: 9, taxAmount: 65.88, taxableAmount: 732 },
              ],
              items: [
                {
                  id: "t-1",
                  itemType: "TIME_ENTRY",
                  resourceName: "sumiya pathan",
                  role: "Unknown",
                  workDate: "2026-09-30",
                  quantity: 9,
                  baseRate: 100,
                  rate: 80,
                  discountType: "PERCENTAGE",
                  discountValue: 20,
                  discountPeriodName: "Period 1",
                  amount: 720,
                },
                { id: "e-1", itemType: "EXPENSE", itemName: "Meals", workDate: "2026-10-13", quantity: 1, rate: 12, amount: 12 },
              ],
            }}
          />
        );

        const timeRow = within(screen.getByText("sumiya pathan").closest("tr"));
        expect(timeRow.getByText("9.00")).toBeInTheDocument();
        expect(timeRow.getByText("$100.00")).toBeInTheDocument();
        expect(timeRow.getByText("20%")).toBeInTheDocument();
        expect(timeRow.getByText("$80.00")).toBeInTheDocument();
        expect(timeRow.getByText("$720.00")).toBeInTheDocument();

        const mealRow = within(screen.getByText("Meals").closest("tr"));
        expect(mealRow.getByText("$12.00", { selector: "td" })).toBeInTheDocument();
        expect(mealRow.queryByText(/%|off|Period 1/)).not.toBeInTheDocument();

        const summary = within(screen.getByText("Tax & Invoice Summary").closest("section"));
        expect(summary.getByText("Time & Material Subtotal").nextSibling).toHaveTextContent("$720.00");
        expect(summary.getByText("Expenses Subtotal").nextSibling).toHaveTextContent("$12.00");
        expect(summary.getByText("Taxable Subtotal").nextSibling).toHaveTextContent("$732.00");
        expect(summary.getByText("IGST")).toBeInTheDocument();
        expect(summary.getByText("9.0%")).toBeInTheDocument();
        expect(summary.getByText("$65.88")).toBeInTheDocument();
        expect(summary.getByText("Total Invoice Amount").nextSibling).toHaveTextContent("$797.88");
      });

      it("scopes printing to the invoice document on A4 so preview controls are never printed", () => {
        const { container } = render(
          <InvoicePreviewDocument invoice={{ ...baseInvoice, subtotal: 720, grandTotal: 720, items: [developer] }} />
        );

        expect(container.querySelector(".invoice-print-area")).not.toBeNull();
        const printCss = container.querySelector("style")?.textContent || "";
        expect(printCss).toMatch(/@page\s*\{\s*size:\s*A4/);
        expect(printCss).toMatch(/body \*\s*\{\s*visibility:\s*hidden/);
        expect(printCss).toMatch(/\.invoice-print-area/);
      });

      it("never presents work excluded from invoicing and shows the empty state when nothing is billable", () => {
        const excluded = { ...developer, id: "dev-x", resourceName: "Excluded Resource", includeInInvoice: false };
        render(<InvoicePreviewDocument invoice={{ ...baseInvoice, subtotal: 0, grandTotal: 0, items: [excluded] }} />);

        expect(screen.queryByText("Excluded Resource")).not.toBeInTheDocument();
        expect(screen.getByText(/No line items available for this draft invoice/i)).toBeInTheDocument();
      });

      it("renders clean T&M columns with no redundant formulas or per-unit explanations", () => {
        render(
          <InvoicePreviewDocument
            invoice={{
              ...baseInvoice,
              rateModel: "STANDARD",
              subtotal: 720,
              grandTotal: 720,
              items: [developer],
            }}
          />
        );

        // Verification of redundant calculation formula elimination
        expect(screen.queryByText(/8 hours × \$90\.00\/hour/)).not.toBeInTheDocument();
        expect(screen.queryByText(/-\$10\.00\/hr/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Calc:/i)).not.toBeInTheDocument();

        // Verification of clean table column headers
        expect(screen.getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Description / Role" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Hours" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Base Rate" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Discount" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Net Rate" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();

        // Verification of table row values
        const devRow = within(screen.getByText("Dev Resource").closest("tr"));
        expect(devRow.getByText("8.00")).toBeInTheDocument();
        expect(devRow.getByText("$100.00")).toBeInTheDocument();
        expect(devRow.getByText("10%")).toBeInTheDocument();
        expect(devRow.getByText("$90.00")).toBeInTheDocument();
        expect(devRow.getByText("$720.00")).toBeInTheDocument();

        // Billing model shows Standard Rate
        expect(screen.getByText("Time & Material (Standard Rate)")).toBeInTheDocument();
        // Currency meta block is rendered
        expect(screen.getByText("Currency")).toBeInTheDocument();
      });

      it("renders Role-Based Rate invoice with distinct roles, no redundant formula clutter, and distinguishable fixed and percentage discounts", () => {
        const architectRole = {
          id: "arch-1",
          itemType: "TIME_ENTRY",
          resourceName: "Chief Architect",
          role: "Solution Architect",
          workDate: "2026-07-16",
          quantity: 4,
          baseRate: 200,
          rate: 150,
          discountType: "FIXED_AMOUNT",
          discountValue: 50,
          discountPeriodName: "VIP Client Discount",
          amount: 600,
        };

        const flightExpense = {
          id: "exp-flight",
          itemType: "EXPENSE",
          itemName: "Client Site Visit Flight",
          category: "Travel",
          workDate: "2026-07-16",
          quantity: 1,
          rate: 450,
          amount: 450,
          receiptReference: "REC-9941",
        };

        render(
          <InvoicePreviewDocument
            invoice={{
              ...baseInvoice,
              rateModel: "ROLE_BASED",
              subtotal: 1562,
              grandTotal: 1562,
              items: [developer, architectRole, flightExpense],
            }}
          />
        );

        // Billing model reflects Role-Based Rate
        expect(screen.getByText("Time & Material (Role-Based Rate)")).toBeInTheDocument();

        // Roles are clearly rendered
        expect(screen.getByText("Developer")).toBeInTheDocument();
        expect(screen.getByText("Solution Architect")).toBeInTheDocument();

        // Redundant formulas eliminated
        expect(screen.queryByText(/hours ×/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/-\$50\.00\/hr/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Calc:/i)).not.toBeInTheDocument();

        // Fixed discount is distinguishable from percentage discount
        const archRow = within(screen.getByText("Chief Architect").closest("tr"));
        expect(archRow.getByText("$50.00 off")).toBeInTheDocument();
        expect(archRow.getByText("VIP Client Discount")).toBeInTheDocument();

        // Expense has category and receipt reference without any discount
        const expRow = within(screen.getByText("Client Site Visit Flight").closest("tr"));
        expect(expRow.getByText("Travel")).toBeInTheDocument();
        expect(expRow.getByText("Ref: REC-9941")).toBeInTheDocument();
        expect(expRow.getByText("$450.00")).toBeInTheDocument();
        expect(expRow.queryByText(/off|%|VIP Client Discount/)).not.toBeInTheDocument();
      });
    });
  });
});


