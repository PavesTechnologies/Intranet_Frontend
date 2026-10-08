import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../../../api/axiosInstance";
import {
  getInvoiceGenerationWorkspace,
  normalizeInvoiceGenerationWorkspaceItem,
  previewInvoice,
} from "./invoiceService";

vi.mock("../../../api/axiosInstance", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("invoiceService - Invoice Generation Workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeInvoiceGenerationWorkspaceItem", () => {
    it("correctly normalizes a READY_FOR_INVOICE candidate with array dates and null invoice fields", () => {
      const row = {
        workspaceStatus: "READY_FOR_INVOICE",
        snapshotId: "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5",
        snapshotNumber: "BS-20261007115805-E6CE665A",
        snapshotStatus: "TAX_COMPLETED",
        clientName: "Account Management",
        projectName: "Website Redesign",
        projectCode: "W-342",
        billingType: "Timesheet Based",
        billingPeriodStart: [2026, 8, 5],
        billingPeriodEnd: [2026, 9, 5],
        currencyCode: "USD",
        amount: 26400.0,
        totalTaxAmount: 4752.0,
        grandTotal: 31152.0,
        invoiceId: null,
        invoiceNumber: null,
        invoiceStatus: null,
        invoiceDate: null,
        dueDate: null,
      };

      const normalized = normalizeInvoiceGenerationWorkspaceItem(row);

      expect(normalized.workspaceStatus).toBe("READY_FOR_INVOICE");
      expect(normalized.snapshotId).toBe("f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5");
      expect(normalized.snapshotStatus).toBe("TAX_COMPLETED");
      expect(normalized.billingPeriodStart).toBe("2026-08-05");
      expect(normalized.billingPeriodEnd).toBe("2026-09-05");
      expect(normalized.billingPeriod).toBe("05 Aug 2026 - 05 Sep 2026");
      expect(normalized.amount).toBe(26400);
      expect(normalized.totalTaxAmount).toBe(4752);
      expect(normalized.grandTotal).toBe(31152);
      expect(normalized.invoiceId).toBeNull();
      expect(normalized.invoiceNumber).toBeNull();
    });

    it("correctly normalizes an existing invoice row with GENERATED status", () => {
      const row = {
        workspaceStatus: "GENERATED",
        snapshotId: null,
        snapshotNumber: null,
        clientName: "Aditya Teja",
        projectName: "Card Integration",
        billingPeriodStart: "2026-10-07",
        billingPeriodEnd: "2026-10-07",
        currencyCode: "USD",
        amount: 65000.0,
        totalTaxAmount: 5850.0,
        grandTotal: 70850.0,
        invoiceId: "3973c534-61ac-4fda-bad0-c667c404b181",
        invoiceNumber: "INV-20261007131622",
        invoiceStatus: "GENERATED",
        invoiceDate: [2026, 10, 7],
        dueDate: [2026, 10, 22],
      };

      const normalized = normalizeInvoiceGenerationWorkspaceItem(row);

      expect(normalized.workspaceStatus).toBe("GENERATED");
      expect(normalized.invoiceId).toBe("3973c534-61ac-4fda-bad0-c667c404b181");
      expect(normalized.invoiceNumber).toBe("INV-20261007131622");
      expect(normalized.invoiceDate).toBe("2026-10-07");
      expect(normalized.dueDate).toBe("2026-10-22");
      expect(normalized.grandTotal).toBe(70850);
    });
  });

  describe("getInvoiceGenerationWorkspace", () => {
    it("calls GET /api/v1/invoice-generation/workspace and unwrap payload with summary and rows", async () => {
      const apiResponse = {
        data: {
          success: true,
          data: {
            summary: {
              readyForInvoiceCount: 1,
              readyForInvoiceAmount: 31152.0,
              generatedCount: 1,
              pendingApprovalCount: 0,
              approvedCount: 0,
              rejectedCount: 0,
              invoicedCount: 0,
              totalInvoicedAmount: 70850.0,
            },
            rows: [
              {
                workspaceStatus: "READY_FOR_INVOICE",
                snapshotId: "snap-1",
                snapshotNumber: "BS-001",
                grandTotal: 31152.0,
              },
              {
                workspaceStatus: "GENERATED",
                invoiceId: "inv-1",
                invoiceNumber: "INV-001",
                grandTotal: 70850.0,
              },
            ],
          },
        },
      };

      api.get.mockResolvedValue(apiResponse);

      const result = await getInvoiceGenerationWorkspace();

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/invoice-generation/workspace")
      );
      expect(result.summary.readyForInvoiceCount).toBe(1);
      expect(result.summary.totalInvoicedAmount).toBe(70850);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].workspaceStatus).toBe("READY_FOR_INVOICE");
      expect(result.rows[1].workspaceStatus).toBe("GENERATED");
    });
  });

  describe("previewInvoice", () => {
    it("calls GET /api/v1/billing-snapshots/{snapshotId}/invoice-preview and returns normalized invoice preview", async () => {
      const snapshotId = "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5";
      const apiResponse = {
        data: {
          success: true,
          data: {
            billingSnapshotId: snapshotId,
            snapshotNumber: "BS-2026-0005",
            generated: false,
            invoiceId: null,
            invoiceNumber: null,
            projectName: "Website Redesign",
            projectCode: "PRJ-WR-001",
            clientName: "Account Management",
            paymentTermName: "Net 30",
            sellerLegalName: "Apser Tech Solutions India Pvt Ltd",
            sellerAddressLine1: "Tower A, 5th Floor, Madhapur, Hyderabad",
            sellerGstin: "36AAACA1234A1Z5",
            sellerEmail: "finance@apsertech.com",
            sellerPhone: "+91 40 1234 5678",
            subtotal: 26400.0,
            totalTaxAmount: 4752.0,
            grandTotal: 31152.0,
            taxComponents: [
              { taxTypeCode: "CGST", taxAmount: 2376 },
              { taxTypeCode: "SGST", taxAmount: 2376 },
            ],
            items: [
              {
                invoiceItemId: "item-1",
                resourceName: "Bolli Teja",
                role: "Consultant",
                workDate: "2026-08-05",
                hours: 11,
                rate: 800,
                amount: 8800,
              },
            ],
          },
        },
      };

      api.get.mockResolvedValue(apiResponse);

      const result = await previewInvoice(snapshotId);

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/billing-snapshots/${snapshotId}/invoice-preview`)
      );
      expect(result.billingSnapshotId).toBe(snapshotId);
      expect(result.generated).toBe(false);
      expect(result.invoiceNumber).toBe("Assigned on generation");
      expect(result.sellerName).toBe("Apser Tech Solutions India Pvt Ltd");
      expect(result.sellerGstin).toBe("36AAACA1234A1Z5");
      expect(result.subtotal).toBe(26400);
      expect(result.totalTax).toBe(4752);
      expect(result.grandTotal).toBe(31152);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].resourceName).toBe("Bolli Teja");
      expect(result.items[0].hours).toBe(11);
      expect(result.items[0].rate).toBe(800);
      expect(result.items[0].amount).toBe(8800);
    });
  });
});
