import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InvoiceDocument from "../components/invoice/InvoiceDocument";
import InvoiceDetail from "./InvoiceDetail";
import {
  normalizeInvoice,
  normalizeTaxComponent,
  getInvoice,
  submitInvoiceForApproval,
  approveInvoice,
  sendInvoiceToClient,
} from "../services/invoiceService";
import * as invoiceService from "../services/invoiceService";
import * as companyProfileService from "../services/companyProfileService";
import * as taxCalcService from "../services/taxCalculationService";
import api from "../../../api/axiosInstance";

// Mock axios instance
vi.mock("../../../api/axiosInstance", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

// Mock toast notifications
vi.mock("../../../components/toastfy/toast", () => ({
  showStatusToast: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Invoice Tax Breakdown and Tax Context Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Test 1: Invoice response containing tax components renders the breakdown
  it("Requirement 1: Invoice response containing tax components renders the breakdown", () => {
    const mockInvoiceWithTaxes = {
      invoiceId: "inv-001",
      invoiceNumber: "INV-2026-0001",
      currency: "USD",
      subtotal: 900.0,
      totalTax: 162.0,
      grandTotal: 1062.0,
      taxBreakdown: [
        {
          id: "tc-1",
          taxComponent: "State GST",
          taxTypeCode: "SGST",
          applicability: "SAME_JURISDICTION",
          rate: 9.0,
          taxableAmount: 900.0,
          amount: 81.0,
        },
        {
          id: "tc-2",
          taxComponent: "Central GST",
          taxTypeCode: "CGST",
          applicability: "SAME_JURISDICTION",
          rate: 9.0,
          taxableAmount: 900.0,
          amount: 81.0,
        },
      ],
      items: [
        {
          id: "item-1",
          itemName: "Dev Lead",
          quantity: 9,
          rate: 100,
          amount: 900,
        },
      ],
    };

    render(
      <InvoiceDocument invoice={mockInvoiceWithTaxes} />
    );

    expect(screen.getByText("TAX BREAKDOWN")).toBeInTheDocument();
    expect(screen.queryByText("No tax components available")).not.toBeInTheDocument();
    expect(screen.getByText("SGST")).toBeInTheDocument();
    expect(screen.getByText("CGST")).toBeInTheDocument();
  });

  // Test 2: Tax type, rate, taxable amount, and tax amount map correctly
  it("Requirement 2: Tax type, rate, taxable amount, and tax amount map correctly", () => {
    const rawDto = {
      invoiceId: "inv-dto-01",
      invoiceNumber: "INV-2026-0002",
      currency: "USD",
      subtotal: 900.0,
      totalTaxAmount: 162.0,
      grandTotal: 1062.0,
      taxComponents: [
        {
          invoiceTaxComponentId: "itc-101",
          taxTypeName: "Integrated Goods and Services Tax",
          taxTypeCode: "IGST",
          applicabilityType: "DIFFERENT_JURISDICTION",
          appliedRate: 18.0,
          taxableAmount: 900.0,
          taxAmount: 162.0,
        },
      ],
    };

    const normalized = normalizeInvoice(rawDto);

    expect(normalized.taxBreakdown).toHaveLength(1);
    const comp = normalized.taxBreakdown[0];
    expect(comp.taxComponent).toBe("Integrated Goods and Services Tax");
    expect(comp.taxTypeCode).toBe("IGST");
    expect(comp.rate).toBe(18.0);
    expect(comp.taxableAmount).toBe(900.0);
    expect(comp.amount).toBe(162.0);
    expect(comp.applicability).toBe("DIFFERENT_JURISDICTION");

    // Also check render of mapped fields
    render(<InvoiceDocument invoice={normalized} />);
    expect(screen.getByText("IGST")).toBeInTheDocument();
    expect(screen.getByText("18.00%")).toBeInTheDocument();
    expect(screen.getAllByText("USD 900.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("USD 162.00").length).toBeGreaterThanOrEqual(2);
  });

  // Test 3: Financial Summary displays the returned tax total
  it("Requirement 3: Financial Summary displays the returned tax total consistently", () => {
    const mockInvoice = {
      invoiceId: "inv-fin-01",
      invoiceNumber: "INV-2026-0003",
      currency: "USD",
      subtotal: 900.0,
      totalTax: 162.0,
      grandTotal: 1062.0,
      taxBreakdown: [
        {
          id: "tc-igst",
          taxComponent: "IGST",
          taxTypeCode: "IGST",
          rate: 18.0,
          taxableAmount: 900.0,
          amount: 162.0,
        },
      ],
    };

    render(<InvoiceDocument invoice={mockInvoice} />);

    expect(screen.getByText("FINANCIAL SUMMARY")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getAllByText("Total Tax").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Grand Total")).toBeInTheDocument();
    expect(screen.getByText("USD 1,062.00")).toBeInTheDocument();
  });

  // Test 4: Tax context fields render when provided
  it("Requirement 4: Tax context fields render when provided", () => {
    const mockInvoiceWithContext = {
      invoiceId: "inv-ctx-01",
      invoiceNumber: "INV-2026-0004",
      currency: "USD",
      supplierState: "Karnataka",
      customerState: "California",
      placeOfSupply: "California",
      taxRegion: "USA-CA",
    };

    render(<InvoiceDocument invoice={mockInvoiceWithContext} />);

    expect(screen.getByText("TAX CONTEXT")).toBeInTheDocument();
    expect(screen.getByText("Karnataka")).toBeInTheDocument();
    expect(screen.getAllByText("California")).toHaveLength(2); // Customer State & Place of Supply
    expect(screen.getByText("USA-CA")).toBeInTheDocument();
  });

  // Test 5: Missing tax context displays 'Not provided'
  it("Requirement 5: Missing tax context displays 'Not provided'", () => {
    const mockInvoiceNoContext = {
      invoiceId: "inv-ctx-02",
      invoiceNumber: "INV-2026-0005",
      currency: "USD",
      supplierState: null,
      customerState: null,
      placeOfSupply: null,
      taxRegion: null,
    };

    render(<InvoiceDocument invoice={mockInvoiceNoContext} />);

    const notProvidedElements = screen.getAllByText("Not provided");
    // Should have "Not provided" for Supplier State, Customer State, Place of Supply, Tax Region
    expect(notProvidedElements.length).toBeGreaterThanOrEqual(4);
  });

  // Test 6: Empty tax component arrays display the appropriate empty state
  it("Requirement 6: Empty tax component arrays display 'No tax components available'", () => {
    const mockInvoiceEmptyTaxes = {
      invoiceId: "inv-empty-01",
      invoiceNumber: "INV-2026-0006",
      currency: "USD",
      subtotal: 900.0,
      totalTax: 0.0,
      grandTotal: 900.0,
      taxBreakdown: [],
    };

    render(<InvoiceDocument invoice={mockInvoiceEmptyTaxes} />);

    expect(screen.getByText("No tax components available")).toBeInTheDocument();
  });

  // Test 7: Wrapped and unwrapped API response formats are handled according to existing service conventions
  it("Requirement 7: Wrapped and unwrapped API response formats are handled safely", () => {
    // 7A: Wrapped under { data: { ... } }
    const wrappedUnderData = {
      success: true,
      data: {
        invoiceId: "inv-wrap-01",
        invoiceNumber: "INV-WRAP-01",
        supplierState: "Maharashtra",
        customerState: "Telangana",
        placeOfSupply: "Telangana",
        taxRegion: "India-GST",
        subtotal: 900.0,
        totalTaxAmount: 162.0,
        grandTotal: 1062.0,
        taxComponents: [
          {
            taxTypeCode: "IGST",
            appliedRate: 18.0,
            taxableAmount: 900.0,
            taxAmount: 162.0,
          },
        ],
      },
    };
    const normalizedWrapped = normalizeInvoice(wrappedUnderData);
    expect(normalizedWrapped.invoiceId).toBe("inv-wrap-01");
    expect(normalizedWrapped.supplierState).toBe("Maharashtra");
    expect(normalizedWrapped.taxBreakdown).toHaveLength(1);
    expect(normalizedWrapped.taxBreakdown[0].rate).toBe(18.0);

    // 7B: Wrapped under { invoice: { ... } }
    const wrappedUnderInvoice = {
      invoice: {
        invoiceId: "inv-wrap-02",
        invoiceNumber: "INV-WRAP-02",
        subtotal: 500.0,
        totalTax: 0.0,
        grandTotal: 500.0,
        taxBreakdown: [],
      },
    };
    const normalizedWrappedInv = normalizeInvoice(wrappedUnderInvoice);
    expect(normalizedWrappedInv.invoiceId).toBe("inv-wrap-02");
    expect(normalizedWrappedInv.subtotal).toBe(500.0);
    expect(normalizedWrappedInv.taxBreakdown).toEqual([]);

    // 7C: Direct raw object
    const rawDirect = {
      invoiceId: "inv-raw-01",
      invoiceNumber: "INV-RAW-01",
      subtotal: 100.0,
    };
    const normalizedRaw = normalizeInvoice(rawDirect);
    expect(normalizedRaw.invoiceId).toBe("inv-raw-01");
  });

  // Test 8: Invoice detail reopening retains tax breakdown
  it("Requirement 8: Invoice detail reopening retains tax breakdown and tax context", async () => {
    const mockUUID = "dd593e4c-e4b0-4ea7-b914-2af332f423cf";
    const mockInvoiceDTO = {
      invoiceId: mockUUID,
      invoiceNumber: "INV-2026-REOPEN",
      invoiceStatus: "APPROVED",
      currency: "USD",
      subtotal: 900.0,
      totalTax: 162.0,
      grandTotal: 1062.0,
      supplierState: "Karnataka",
      customerState: "California",
      placeOfSupply: "California",
      taxRegion: "USA-West",
      taxBreakdown: [
        {
          id: "tc-reopen-1",
          taxComponent: "State Tax",
          taxTypeCode: "ST",
          rate: 18.0,
          taxableAmount: 900.0,
          amount: 162.0,
        },
      ],
    };

    api.get.mockImplementation((url) => {
      if (url.includes(`/api/v1/billing-snapshots/${mockUUID}/invoice`)) {
        return Promise.resolve({ data: { success: true, data: mockInvoiceDTO } });
      }
      if (url.includes(`/api/v1/invoices/${mockUUID}`)) {
        return Promise.resolve({ data: { success: true, data: mockInvoiceDTO } });
      }
      if (url.includes("/api/v1/company-profile")) {
        return Promise.resolve({ data: { success: true, data: { state: "Karnataka" } } });
      }
      if (url.includes("/approval-history")) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoices/${mockUUID}`]}>
        <Routes>
          <Route path="/account-receivable/invoices/:snapshotId" element={<InvoiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("INV-2026-REOPEN").length).toBeGreaterThanOrEqual(1);
    });

    // Verify tax breakdown retained
    expect(screen.getByText("TAX BREAKDOWN")).toBeInTheDocument();
    expect(screen.getByText("ST")).toBeInTheDocument();
    expect(screen.getByText("18.00%")).toBeInTheDocument();
    expect(screen.getAllByText("USD 162.00").length).toBeGreaterThanOrEqual(2);

    // Verify tax context retained
    expect(screen.getAllByText("Karnataka").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("USA-West")).toBeInTheDocument();
  });

  // Test 9: Invoice document/preview renders tax details consistently with fallback to taxCalc if empty on invoice
  it("Requirement 9: Invoice document/preview renders tax details consistently with taxCalc fallback", () => {
    const invoiceWithoutInlineTaxes = {
      invoiceId: "inv-preview-01",
      invoiceNumber: "INV-PREVIEW-01",
      currency: "USD",
      subtotal: 900.0,
      totalTax: 0,
      grandTotal: 900.0,
      taxBreakdown: [], // empty on invoice
    };

    const completedTaxCalculation = {
      taxCalculationId: "tc-calc-99",
      billingSnapshotId: "snap-99",
      taxRegionName: "India-Telangana",
      supplierState: "Telangana",
      customerState: "Telangana",
      placeOfSupply: "Telangana",
      totalTaxAmount: 162.0,
      grandTotal: 1062.0,
      components: [
        {
          id: "comp-cgst",
          taxTypeName: "Central GST",
          taxTypeCode: "CGST",
          rate: 9.0,
          taxableAmount: 900.0,
          taxAmount: 81.0,
        },
        {
          id: "comp-sgst",
          taxTypeName: "State GST",
          taxTypeCode: "SGST",
          rate: 9.0,
          taxableAmount: 900.0,
          taxAmount: 81.0,
        },
      ],
    };

    render(
      <InvoiceDocument
        invoice={invoiceWithoutInlineTaxes}
        taxCalc={completedTaxCalculation}
      />
    );

    // Should hydrate tax breakdown from taxCalc rather than showing empty
    expect(screen.getByText("CGST")).toBeInTheDocument();
    expect(screen.getByText("SGST")).toBeInTheDocument();
    expect(screen.getByText("India-Telangana")).toBeInTheDocument();
    expect(screen.getAllByText("Telangana")).toHaveLength(3); // Supplier, customer, place of supply
  });

  // Test 10: Existing invoice approval and delivery workflows remain unaffected
  it("Requirement 10: Existing invoice approval and delivery workflows remain unaffected", async () => {
    const mockApproveUUID = "11111111-2222-3333-4444-555555555555";
    const mockPendingInvoice = {
      invoiceId: mockApproveUUID,
      invoiceNumber: "INV-2026-APP",
      invoiceStatus: "PENDING_APPROVAL",
      currency: "USD",
      subtotal: 900.0,
      totalTax: 0,
      grandTotal: 900.0,
      taxBreakdown: [],
    };

    const mockApprovedInvoice = {
      ...mockPendingInvoice,
      invoiceStatus: "APPROVED",
    };

    api.get.mockImplementation((url) => {
      if (url.includes(`/api/v1/billing-snapshots/${mockApproveUUID}/invoice`)) {
        return Promise.resolve({ data: { success: true, data: mockPendingInvoice } });
      }
      if (url.includes(`/api/v1/invoices/${mockApproveUUID}`)) {
        return Promise.resolve({ data: { success: true, data: mockPendingInvoice } });
      }
      if (url.includes("/api/v1/company-profile")) {
        return Promise.resolve({ data: { success: true, data: null } });
      }
      if (url.includes("/approval-history")) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: [] });
    });

    api.post.mockImplementation((url) => {
      if (url.includes("/approve")) {
        return Promise.resolve({ data: { success: true, data: mockApprovedInvoice } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoices/${mockApproveUUID}`]}>
        <Routes>
          <Route path="/account-receivable/invoices/:snapshotId" element={<InvoiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("INV-2026-APP").length).toBeGreaterThanOrEqual(1);
    });

    // Check Approve button is accessible
    const approveBtn = screen.getByRole("button", { name: /approve/i });
    expect(approveBtn).toBeInTheDocument();

    fireEvent.click(approveBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to approve this invoice?")).toBeInTheDocument();
    });

    const confirmApproveBtn = screen.getByRole("button", { name: /yes, approve invoice/i });
    fireEvent.click(confirmApproveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/invoices/${mockApproveUUID}/approve`)
      );
    });
  });
});
