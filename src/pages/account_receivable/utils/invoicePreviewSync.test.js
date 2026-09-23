import { describe, it, expect } from "vitest";
import { normalizeInvoice, normalizeInvoiceItem } from "../services/invoiceService";
import { normalizeCompanyProfile } from "../services/companyProfileService";

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

  describe("Client Billing Fields Normalization (CASE 5)", () => {
    it("CASE 5: maps client billing address, gstinOrTaxId, email, and phone from InvoiceResponseDto", () => {
      const backendInvoiceDto = {
        invoiceId: "inv-5678",
        invoiceNumber: "INV-2026-001",
        status: "GENERATED",
        clientName: "Enterprise Client Corp",
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

      expect(normalized.clientName).toBe("Enterprise Client Corp");
      expect(normalized.billingAddress).toBe("100 Financial Way, New York, NY 10001, USA");
      expect(normalized.gstinOrTaxId).toBe("US-EIN-12-3456789");
      expect(normalized.contact).toBe("John Doe");
      expect(normalized.email).toBe("ap@enterpriseclient.com");
      expect(normalized.phone).toBe("+1 212 555 0199");
    });

    it("leaves missing client fields as null without inventing fallback values", () => {
      const backendInvoiceDto = {
        invoiceId: "inv-9999",
        invoiceNumber: "INV-2026-002",
        status: "GENERATED",
      };

      const normalized = normalizeInvoice(backendInvoiceDto);

      expect(normalized.clientName).toBeNull();
      expect(normalized.billingAddress).toBeNull();
      expect(normalized.gstinOrTaxId).toBeNull();
      expect(normalized.email).toBeNull();
      expect(normalized.phone).toBeNull();
      expect(normalized.contact).toBeNull();
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
});
