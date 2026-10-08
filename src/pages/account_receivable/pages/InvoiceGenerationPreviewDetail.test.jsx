import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import InvoiceGenerationDetail from "./InvoiceGenerationDetail";
import * as invoiceService from "../services/invoiceService";
import * as billingDataAcquisitionService from "../services/billingDataAcquisitionService";
import * as companyProfileService from "../services/companyProfileService";

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

describe("InvoiceGenerationDetail - Authoritative Invoice Preview API", () => {
  const snapshotUUID = "f4cf25a8-e5c5-4600-ad67-0a4af6c5c7e5";

  // Authoritative pre-generation preview response from GET /api/v1/billing-snapshots/{snapshotId}/invoice-preview
  const mockPreviewResponse = {
    billingSnapshotId: snapshotUUID,
    snapshotNumber: "BS-2026-0005",
    generated: false,
    invoiceId: null,
    invoiceNumber: null,
    invoiceDate: null,
    dueDate: null,
    status: "TAX_COMPLETED",
    projectId: 23,
    projectCode: "PRJ-WR-001",
    projectName: "Website Redesign",
    billingPeriod: "05 Aug 2026 - 05 Sep 2026",
    billingPeriodStart: "2026-08-05",
    billingPeriodEnd: "2026-09-05",
    billingType: "TIME_AND_MATERIAL",
    billingFrequency: "MONTHLY",
    paymentTermName: "Net 30",
    paymentTerms: "Net 30",
    currency: "USD",
    taxRegion: "INDIA",
    clientId: 14,
    clientName: "Account Management",
    countryCode: "IN",
    email: "billing@accountmanagement.com",
    phone: "+91 98765 43210",
    billingAddress: "123 Business Park, Tech Zone, Hyderabad, Telangana, India - 500081",
    gstin: "36AABCA1234A1Z5",
    sellerLegalName: "Apser Tech Solutions India Pvt Ltd",
    sellerAddressLine1: "Tower A, 5th Floor, Cyber City, Madhapur, Hyderabad, Telangana - 500081",
    sellerGstin: "36AAACA1234A1Z5",
    sellerEmail: "finance@apsertech.com",
    sellerPhone: "+91 40 1234 5678",
    sellerLogoReference: "logo.png",
    subtotal: 26400.0,
    totalTaxAmount: 4752.0,
    grandTotal: 31152.0,
    taxComponents: [
      {
        id: "comp-1",
        taxTypeName: "CGST",
        taxTypeCode: "CGST",
        appliedRate: 9,
        taxableAmount: 26400,
        taxAmount: 2376,
        applicabilityType: "SAME_JURISDICTION",
      },
      {
        id: "comp-2",
        taxTypeName: "SGST",
        taxTypeCode: "SGST",
        appliedRate: 9,
        taxableAmount: 26400,
        taxAmount: 2376,
        applicabilityType: "SAME_JURISDICTION",
      },
    ],
    items: [
      {
        invoiceItemId: "item-1",
        resourceName: "Bolli Teja",
        role: "Senior Consultant",
        workDate: "2026-08-05",
        hours: 11,
        rate: 800,
        amount: 8800,
        sourceReference: "TS-1001",
      },
      {
        invoiceItemId: "item-2",
        resourceName: "Bolli Teja",
        role: "Senior Consultant",
        workDate: "2026-08-06",
        hours: 11,
        rate: 800,
        amount: 8800,
        sourceReference: "TS-1002",
      },
      {
        invoiceItemId: "item-3",
        resourceName: "Bolli Teja",
        role: "Senior Consultant",
        workDate: "2026-08-07",
        hours: 11,
        rate: 800,
        amount: 8800,
        sourceReference: "TS-1003",
      },
    ],
  };

  const mockGeneratedInvoice = {
    invoiceId: "inv-uuid-8888",
    invoiceNumber: "INV-2026-0088",
    billingSnapshotId: snapshotUUID,
    invoiceStatus: "GENERATED",
    invoiceDate: "2026-10-07",
    dueDate: "2026-11-06",
    subtotal: 26400,
    totalTax: 4752,
    grandTotal: 31152,
    currency: "USD",
    clientName: "Account Management",
    projectName: "Website Redesign",
    projectCode: "PRJ-WR-001",
    paymentTermName: "Net 30",
    items: mockPreviewResponse.items,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(invoiceService, "previewInvoice").mockResolvedValue(mockPreviewResponse);
    vi.spyOn(invoiceService, "getInvoice").mockRejectedValue({ response: { status: 404 } });
    vi.spyOn(invoiceService, "generateInvoice").mockResolvedValue(mockGeneratedInvoice);

    // Spy on old workaround endpoints to ensure they are NOT called
    vi.spyOn(billingDataAcquisitionService, "getBillingSnapshotByPeriod").mockResolvedValue(null);
    vi.spyOn(billingDataAcquisitionService, "fetchActiveBillingConfigurations").mockResolvedValue([]);
    vi.spyOn(companyProfileService, "getActiveCompanyProfile").mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1 - 5. renders 3 actual timesheet line items with hours=11, rate=800, amount=8,800 and NO synthetic row", async () => {
    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${snapshotUUID}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={50} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("3 Items")).toBeInTheDocument();
    });

    // 1. All 3 Bolli Teja timesheet items are rendered as separate rows
    const resourceCells = screen.getAllByText("Bolli Teja");
    expect(resourceCells).toHaveLength(3);

    // 2. NO synthetic "Website Redesign Billable Services" row exists
    expect(screen.queryByText(/Website Redesign Billable Services/i)).not.toBeInTheDocument();

    // 3. Hours: 11, 11, 11
    const hourCells = screen.getAllByText("11");
    expect(hourCells.length).toBeGreaterThanOrEqual(3);

    // 4. Rate: USD 800, USD 800, USD 800
    const rateCells = screen.getAllByText(/USD\s*800/i);
    expect(rateCells.length).toBeGreaterThanOrEqual(3);

    // 5. Amount: USD 8,800, USD 8,800, USD 8,800
    const amountCells = screen.getAllByText(/USD\s*8,800/i);
    expect(amountCells.length).toBeGreaterThanOrEqual(3);
  });

  it("6 - 8. renders authoritative totals: Subtotal USD 26,400, Tax USD 4,752, Grand Total USD 31,152", async () => {
    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${snapshotUUID}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={50} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    });

    // 6. Subtotal: USD 26,400
    expect(screen.getAllByText(/USD\s*26,400/i).length).toBeGreaterThan(0);

    // 7. Tax: USD 4,752 (and components CGST, SGST)
    expect(screen.getByText("CGST")).toBeInTheDocument();
    expect(screen.getByText("SGST")).toBeInTheDocument();
    expect(screen.getAllByText(/USD\s*4,752/i).length).toBeGreaterThan(0);

    // 8. Grand Total: USD 31,152
    expect(screen.getAllByText(/USD\s*31,152/i).length).toBeGreaterThan(0);
  });

  it("9 - 12. renders Client information, Project Code, Payment Terms, and Seller information from preview response", async () => {
    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${snapshotUUID}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={50} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // 9. Client information rendered from preview response
      expect(screen.getAllByText("Account Management").length).toBeGreaterThan(0);
      expect(screen.getByText(/123 Business Park, Tech Zone/i)).toBeInTheDocument();
      expect(screen.getByText("billing@accountmanagement.com")).toBeInTheDocument();
      expect(screen.getByText("36AABCA1234A1Z5")).toBeInTheDocument();
    });

    // 10. Project code rendered from preview response
    expect(screen.getByText("PRJ-WR-001")).toBeInTheDocument();

    // 11. Payment terms rendered from preview response
    expect(screen.getByText("Net 30")).toBeInTheDocument();

    // 12. Seller information rendered from preview response
    expect(screen.getByText("Apser Tech Solutions India Pvt Ltd")).toBeInTheDocument();
    expect(screen.getByText(/36AAACA1234A1Z5/i)).toBeInTheDocument();
    expect(screen.getByText("finance@apsertech.com")).toBeInTheDocument();
    expect(screen.getByText("+91 40 1234 5678")).toBeInTheDocument();
  });

  it("13 - 15. generated=false displays placeholders; DRAFT - NOT GENERATED not inside document; generated=true renders official invoice fields", async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${snapshotUUID}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={50} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    });

    // 13. generated=false displays: "Assigned on generation", "Set on generation", "Set on generation"
    expect(screen.getByText("Assigned on generation")).toBeInTheDocument();
    expect(screen.getAllByText("Set on generation").length).toBeGreaterThanOrEqual(2);

    // 14. "DRAFT – NOT GENERATED" is NOT displayed inside the invoice document
    expect(screen.queryByText(/DRAFT.*NOT GENERATED/i)).not.toBeInTheDocument();

    unmount();

    // 15. generated=true renders actual invoice number, invoice date, due date
    invoiceService.previewInvoice.mockResolvedValueOnce({
      ...mockPreviewResponse,
      generated: true,
      invoiceId: "inv-uuid-8888",
      invoiceNumber: "INV-2026-0088",
      invoiceDate: "2026-10-07",
      dueDate: "2026-11-06",
      status: "GENERATED",
    });

    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${snapshotUUID}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={50} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("INV-2026-0088").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Assigned on generation")).not.toBeInTheDocument();
    expect(screen.queryByText("Set on generation")).not.toBeInTheDocument();
  });

  it("16 - 18. Generate Official Invoice action works, and NO secondary preview data API is required", async () => {
    render(
      <MemoryRouter initialEntries={[`/account-receivable/invoice-generation/${snapshotUUID}`]}>
        <Routes>
          <Route
            path="/account-receivable/invoice-generation/:snapshotId"
            element={<InvoiceGenerationDetail minPresentationDuration={50} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    });

    // 18. Verify previewInvoice was called and NO secondary APIs were invoked
    expect(invoiceService.previewInvoice).toHaveBeenCalledWith(snapshotUUID);
    expect(billingDataAcquisitionService.getBillingSnapshotByPeriod).not.toHaveBeenCalled();
    expect(billingDataAcquisitionService.fetchActiveBillingConfigurations).not.toHaveBeenCalled();
    expect(companyProfileService.getActiveCompanyProfile).not.toHaveBeenCalled();

    // 16. Generate button
    const genBtn = screen.getByRole("button", { name: /Generate Official Invoice/i });
    expect(genBtn).toBeInTheDocument();
    fireEvent.click(genBtn);

    // 17. Calls generateInvoice POST
    await waitFor(() => {
      expect(invoiceService.generateInvoice).toHaveBeenCalledWith(snapshotUUID);
    });
  });
});
