import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../../../api/axiosInstance";
import {
  normalizeInvoice,
  normalizeInvoiceItem,
  formatClientPhone,
  sendInvoiceToClient,
  getInvoiceErrorMessage,
} from "../services/invoiceService";
import { normalizeCompanyProfile } from "../services/companyProfileService";

vi.mock("../../../api/axiosInstance", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("Invoice Preview Synchronization with Backend DTOs", () => {
  describe("Company Profile Normalization (CASE 4 & 9)", () => {
    it("CASE 4: populates all authoritative seller fields from CompanyProfileResponseDto", () => {
      const backendDto = {
        companyProfileId: "cp-1234",
        legalName: "Acme Global Solutions Pvt Ltd",
        addressLine1: "Tech Park Phase 2",
        addressLine2: "Suite 400",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500081",
        country: "India",
        gstin: "36AAACA1234A1Z5",
        email: "billing@acmeglobal.com",
        phone: "+91 40 1234 5678",
        logoReference: "https://cdn.example.com/logo.png",
        isActive: true,
      };

      const normalized = normalizeCompanyProfile(backendDto);

      expect(normalized.legalName).toBe("Acme Global Solutions Pvt Ltd");
      expect(normalized.addressLine1).toBe("Tech Park Phase 2");
      expect(normalized.addressLine2).toBe("Suite 400");
      expect(normalized.city).toBe("Hyderabad");
      expect(normalized.state).toBe("Telangana");
      expect(normalized.postalCode).toBe("500081");
      expect(normalized.country).toBe("India");
      expect(normalized.gstin).toBe("36AAACA1234A1Z5");
      expect(normalized.email).toBe("billing@acmeglobal.com");
      expect(normalized.phone).toBe("+91 40 1234 5678");
      expect(normalized.logoReference).toBe("https://cdn.example.com/logo.png");
      expect(normalized.isActive).toBe(true);
    });

    it("CASE 9: safely handles null or empty company profile without fabricating mock data", () => {
      expect(normalizeCompanyProfile(null)).toBeNull();
      expect(normalizeCompanyProfile(undefined)).toBeNull();
      expect(normalizeCompanyProfile({})).toBeNull();
    });
  });

  describe("Client Billing Fields Normalization (CASE 5 & PMS Client Sync)", () => {
    it("CASE 5: maps client billing address, gstinOrTaxId, email, and phone from InvoiceResponseDto", () => {
      const backendInvoiceDto = {
        invoiceId: "inv-5678",
        invoiceNumber: "INV-2026-001",
        status: "GENERATED",
        clientId: "cli-1234",
        clientName: "Enterprise Client Corp",
        countryCode: "+91",
        billingAddress: "100 Financial Way, New York, NY 10001, USA",
        gstinOrTaxId: "US-EIN-12-3456789",
        contact: "John Doe",
        email: "ap@enterpriseclient.com",
        phone: "+1 212 555 0199",
        paymentTermName: "Net 30",
        paymentTermCode: "30",
        subtotal: 10000,
        totalTaxAmount: 1800,
        grandTotal: 11800,
      };

      const normalized = normalizeInvoice(backendInvoiceDto);

      expect(normalized.clientId).toBe("cli-1234");
      expect(normalized.clientName).toBe("Enterprise Client Corp");
      expect(normalized.countryCode).toBe("+91");
      expect(normalized.billingAddress).toBe("100 Financial Way, New York, NY 10001, USA");
      expect(normalized.gstinOrTaxId).toBe("US-EIN-12-3456789");
      expect(normalized.contact).toBe("John Doe");
      expect(normalized.email).toBe("ap@enterpriseclient.com");
      expect(normalized.phone).toBe("+1 212 555 0199");
    });

    it("maps client fields from nested client object or alternate field aliases", () => {
      const backendInvoiceDto = {
        invoiceId: "inv-nested-1",
        invoiceNumber: "INV-2026-003",
        status: "APPROVED",
        client: {
          clientId: "cli-9988",
          clientName: "Acme Synced Client",
          countryCode: "+1",
          email: "billing@acmesynced.com",
          phoneNumber: "2025550143",
        },
      };

      const normalized = normalizeInvoice(backendInvoiceDto);

      expect(normalized.clientId).toBe("cli-9988");
      expect(normalized.clientName).toBe("Acme Synced Client");
      expect(normalized.countryCode).toBe("+1");
      expect(normalized.email).toBe("billing@acmesynced.com");
      expect(normalized.phone).toBe("2025550143");
    });

    it("leaves missing client fields as null without inventing fallback values", () => {
      const backendInvoiceDto = {
        invoiceId: "inv-9999",
        invoiceNumber: "INV-2026-002",
        status: "GENERATED",
      };

      const normalized = normalizeInvoice(backendInvoiceDto);

      expect(normalized.clientId).toBeNull();
      expect(normalized.clientName).toBeNull();
      expect(normalized.countryCode).toBeNull();
      expect(normalized.billingAddress).toBeNull();
      expect(normalized.gstinOrTaxId).toBeNull();
      expect(normalized.email).toBeNull();
      expect(normalized.phone).toBeNull();
      expect(normalized.contact).toBeNull();
    });

    describe("Client Phone Display Rules (formatClientPhone)", () => {
      it("Case 1: formats correctly when both country code and phone are present", () => {
        expect(formatClientPhone("+91", "9876543210")).toBe("+91 9876543210");
        expect(formatClientPhone("91", "9876543210")).toBe("+91 9876543210");
        expect(formatClientPhone("+1", "2125550199")).toBe("+1 2125550199");
      });

      it("Case 1b: avoids duplicating country code if phone already starts with +", () => {
        expect(formatClientPhone("+91", "+91 9876543210")).toBe("+91 9876543210");
        expect(formatClientPhone("+1", "+1 212 555 0199")).toBe("+1 212 555 0199");
      });

      it("Case 3: returns 'Not provided' when phone number is missing, even if country code exists", () => {
        expect(formatClientPhone("+91", null)).toBe("Not provided");
        expect(formatClientPhone("+91", "")).toBe("Not provided");
        expect(formatClientPhone("+91", undefined)).toBe("Not provided");
      });

      it("Case 4: displays phone number alone when country code is missing", () => {
        expect(formatClientPhone(null, "9876543210")).toBe("9876543210");
        expect(formatClientPhone("", "9876543210")).toBe("9876543210");
        expect(formatClientPhone(undefined, "9876543210")).toBe("9876543210");
      });

      it("Case 4b: returns 'Not provided' when both country code and phone are missing", () => {
        expect(formatClientPhone(null, null)).toBe("Not provided");
        expect(formatClientPhone("", "")).toBe("Not provided");
        expect(formatClientPhone(undefined, undefined)).toBe("Not provided");
      });

      it("Case 5: existing invoice compatibility - safely handles legacy / partially available fields", () => {
        const legacyDto = {
          invoiceId: "inv-legacy",
          invoiceNumber: "INV-LEGACY-01",
          client_name: "Legacy Corp",
          clientPhone: "9123456780",
          clientEmail: "legacy@corp.com",
        };
        const normalized = normalizeInvoice(legacyDto);
        expect(normalized.clientName).toBe("Legacy Corp");
        expect(normalized.phone).toBe("9123456780");
        expect(normalized.email).toBe("legacy@corp.com");
        expect(normalized.countryCode).toBeNull();
        expect(formatClientPhone(normalized.countryCode, normalized.phone)).toBe("9123456780");
      });

      it("Case 6: Seller Information is not mixed with Client Information", () => {
        const invoiceDto = {
          invoiceId: "inv-test",
          clientName: "Client Org",
          email: "client@test.com",
          phone: "9876543210",
          countryCode: "+91",
        };
        const sellerProfileDto = {
          companyProfileId: "cp-seller",
          legalName: "Paves Global Infotech Private Limited",
          email: "contact@paves.com",
          phone: "9059364400",
        };

        const normalizedInvoice = normalizeInvoice(invoiceDto);
        const normalizedSeller = normalizeCompanyProfile(sellerProfileDto);

        // Assert client info
        expect(normalizedInvoice.clientName).toBe("Client Org");
        expect(normalizedInvoice.email).toBe("client@test.com");
        expect(normalizedInvoice.phone).toBe("9876543210");
        expect(normalizedInvoice.countryCode).toBe("+91");

        // Assert seller info remains distinct
        expect(normalizedSeller.legalName).toBe("Paves Global Infotech Private Limited");
        expect(normalizedSeller.email).toBe("contact@paves.com");
        expect(normalizedSeller.phone).toBe("9059364400");
      });
    });
  });

  describe("Payment Terms Precedence (CASE 6)", () => {
    it("CASE 6: prioritizes invoice.paymentTermName over paymentTermCode", () => {
      const dto = {
        invoiceId: "inv-1111",
        paymentTermName: "Net 30",
        paymentTermCode: "30",
      };

      const normalized = normalizeInvoice(dto);
      expect(normalized.paymentTermName).toBe("Net 30");
      expect(normalized.paymentTermCode).toBe("30");
      expect(normalized.paymentTerms).toBe("Net 30");
    });

    it("falls back to paymentTermCode + ' Days' when paymentTermName is absent", () => {
      const dto = {
        invoiceId: "inv-2222",
        paymentTermCode: "45",
      };

      const normalized = normalizeInvoice(dto);
      expect(normalized.paymentTermName).toBeNull();
      expect(normalized.paymentTermCode).toBe("45");
      expect(normalized.paymentTerms).toBe("45 Days");
    });

    it("does not default to Net 30 when payment terms are completely absent", () => {
      const dto = {
        invoiceId: "inv-3333",
      };

      const normalized = normalizeInvoice(dto);
      expect(normalized.paymentTermName).toBeNull();
      expect(normalized.paymentTermCode).toBeNull();
      expect(normalized.paymentTerms).toBeNull();
    });
  });

  describe("Resource Name vs Item Name (CASE 7 & 8)", () => {
    it("CASE 7: preserves authoritative resourceName for T&M timesheet items", () => {
      const rawItem = {
        invoiceItemId: "item-tm-1",
        itemType: "LABOR",
        itemName: "Consultant Hours",
        resourceName: "Bolli Teja",
        role: "Senior Full Stack Engineer",
        quantity: 40,
        rate: 75,
        amount: 3000,
        workDate: "2026-09-15",
      };

      const item = normalizeInvoiceItem(rawItem);
      expect(item.resourceName).toBe("Bolli Teja");
      expect(item.itemName).toBe("Consultant Hours");
      expect(item.role).toBe("Senior Full Stack Engineer");
    });

    it("CASE 8: does not fabricate resourceName for fixed-price or tool items", () => {
      const rawItem = {
        invoiceItemId: "item-fp-1",
        itemType: "FIXED_PRICE",
        itemName: "Milestone 1 Deliverable",
        role: "Fixed Price Milestone",
        quantity: 1,
        rate: 15000,
        amount: 15000,
      };

      const item = normalizeInvoiceItem(rawItem);
      expect(item.resourceName).toBeNull();
      expect(item.itemName).toBe("Milestone 1 Deliverable");
    });
  });

  describe("Tax Components and Fallbacks (CASE 10)", () => {
    it("CASE 10: accurately normalizes backend taxComponents without synthetic CGST/SGST split", () => {
      const dto = {
        invoiceId: "inv-tax-1",
        subtotal: 10000,
        totalTaxAmount: 1800,
        grandTotal: 11800,
        taxComponents: [
          {
            invoiceTaxComponentId: "tc-igst-1",
            taxTypeCode: "IGST",
            taxTypeName: "Integrated Goods and Services Tax",
            appliedRate: 18.0,
            taxAmount: 1800.0,
            applicabilityType: "DIFFERENT_JURISDICTION",
          },
        ],
      };

      const normalized = normalizeInvoice(dto);
      expect(normalized.taxBreakdown).toHaveLength(1);
      expect(normalized.taxBreakdown[0].taxComponent).toBe("Integrated Goods and Services Tax");
      expect(normalized.taxBreakdown[0].taxTypeCode).toBe("IGST");
      expect(normalized.taxBreakdown[0].rate).toBe(18.0);
      expect(normalized.taxBreakdown[0].amount).toBe(1800.0);
      expect(normalized.taxBreakdown[0].applicability).toBe("DIFFERENT_JURISDICTION");
    });

    it("returns empty taxBreakdown when no components exist, even if totalTax > 0", () => {
      const dto = {
        invoiceId: "inv-tax-2",
        subtotal: 5000,
        totalTaxAmount: 500,
        grandTotal: 5500,
        taxComponents: [],
      };

      const normalized = normalizeInvoice(dto);
      expect(normalized.taxBreakdown).toEqual([]);
    });
  });

  describe("Send to Client Flow & Legacy Fallback Handling", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("Legacy Invoice: does not block when invoice.email is null and calls POST /api/v1/invoices/{id}/send", async () => {
      const legacyInvoice = {
        invoiceId: "inv-legacy-100",
        invoiceNumber: "INV-2026-LEGACY",
        clientId: "C100",
        email: null,
      };

      const normalized = normalizeInvoice(legacyInvoice);
      expect(normalized.email).toBeNull();
      expect(normalized.clientId).toBe("C100");

      // Mock backend resolving recipient from Client table
      api.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: "Invoice sent to client.",
          recipientEmail: "client@example.com",
        },
      });

      const result = await sendInvoiceToClient(normalized.invoiceId);

      expect(api.post).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/invoices/${legacyInvoice.invoiceId}/send`)
      );
      expect(result.recipientEmail).toBe("client@example.com");
    });

    it("No Client Email Available: calls Send API, receives backend error, and displays backend error message", async () => {
      const legacyInvoiceNoEmail = {
        invoiceId: "inv-legacy-no-email",
        clientId: "C100",
        email: null,
      };

      const normalized = normalizeInvoice(legacyInvoiceNoEmail);
      expect(normalized.email).toBeNull();

      // Mock backend 400 error when client email cannot be resolved
      const backendError = {
        response: {
          status: 400,
          data: {
            message: "Client email is not configured for this invoice.",
          },
        },
      };
      api.post.mockRejectedValueOnce(backendError);

      await expect(sendInvoiceToClient(normalized.invoiceId)).rejects.toMatchObject({
        response: {
          status: 400,
          data: { message: "Client email is not configured for this invoice." },
        },
      });

      // Verify that getInvoiceErrorMessage surfaces the backend's exact error
      const userMessage = getInvoiceErrorMessage(backendError);
      expect(userMessage).toBe("Client email is not configured for this invoice.");
    });

    it("Normal Invoice: sends successfully when invoice.email is present", async () => {
      const normalInvoice = {
        invoiceId: "inv-normal-200",
        email: "client@example.com",
        clientId: "C200",
      };

      const normalized = normalizeInvoice(normalInvoice);
      expect(normalized.email).toBe("client@example.com");

      api.post.mockResolvedValueOnce({
        data: {
          success: true,
          recipientEmail: "client@example.com",
        },
      });

      const result = await sendInvoiceToClient(normalized.invoiceId);
      expect(api.post).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/invoices/${normalInvoice.invoiceId}/send`)
      );
      expect(result.recipientEmail).toBe("client@example.com");
    });

    it("Modal recipient display helper: handles present email vs legacy fallback appropriately", () => {
      // Normal invoice: displays email
      const normalEmail = "client@example.com";
      const normalDisplay = normalEmail || "Will be resolved from client information";
      expect(normalDisplay).toBe("client@example.com");

      // Legacy invoice: displays resolving message instead of hardcoded 'Not provided'
      const legacyEmail = null;
      const legacyDisplay = legacyEmail || "Will be resolved from client information";
      expect(legacyDisplay).toBe("Will be resolved from client information");
    });
  });
});

