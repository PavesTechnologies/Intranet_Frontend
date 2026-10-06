import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import InvoicePreviewDocument from "./InvoicePreviewDocument";

describe("Redesigned Corporate Invoice Document (InvoicePreviewDocument)", () => {
  const mockCompanyProfile = {
    legalName: "Acme Global Solutions Ltd.",
    addressLine1: "123 Financial Tower, 14th Floor",
    addressLine2: "Business District",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400051",
    country: "India",
    taxRegistrationNumber: "27AABCA1234F1Z5",
    email: "billing@acmeglobal.com",
    phoneNumber: "+91 22 5555 0100",
  };

  const mockActualInvoice = {
    invoiceId: "inv-actual-001",
    invoiceNumber: "INV-2026-8801",
    invoiceStatus: "GENERATED",
    invoiceDate: "2026-10-01",
    dueDate: "2026-10-31",
    currency: "USD",
    clientName: "Zenith Enterprises Inc.",
    billingAddress: "500 Corporate Parkway, Suite 300, San Jose, CA 95110",
    email: "ap@zenith.com",
    phone: "4085550199",
    countryCode: "US",
    gstinOrTaxId: "US-EIN-987654321",
    projectName: "Cloud Migration Initiative",
    projectCode: "CMI-2026",
    billingPeriod: "01 Oct 2026 - 31 Oct 2026",
    paymentTermName: "Net 30 Days",
    snapshotNumber: "BS-202610-001",
    taxRegionName: "US-CA",
    supplierState: "Maharashtra",
    customerState: "California",
    placeOfSupply: "California",
    subtotal: 10000.0,
    totalTax: 1800.0,
    grandTotal: 11800.0,
    items: [
      {
        id: "item-1",
        resourceName: "Sarah Connor",
        role: "Principal Architect",
        workDate: "2026-10-15",
        hours: 50,
        rate: 200,
        amount: 10000,
      },
    ],
    taxBreakdown: [
      {
        id: "tax-igst",
        taxTypeCode: "IGST",
        taxComponent: "Integrated Goods and Services Tax",
        applicability: "DIFFERENT_JURISDICTION",
        rate: 18.0,
        taxableAmount: 10000.0,
        amount: 1800.0,
      },
    ],
    additionalNotes: "Authorized for electronic fund transfer upon manager validation.",
  };

  it("Requirement 1: Seller information renders from actual company profile data", () => {
    render(
      <InvoicePreviewDocument
        invoice={mockActualInvoice}
        companyProfile={mockCompanyProfile}
      />
    );

    expect(screen.getByText("Acme Global Solutions Ltd.")).toBeInTheDocument();
    expect(screen.getByText(/123 Financial Tower/)).toBeInTheDocument();
    expect(screen.getByText("27AABCA1234F1Z5")).toBeInTheDocument();
    expect(screen.getByText("billing@acmeglobal.com")).toBeInTheDocument();
    expect(screen.getByText("+91 22 5555 0100")).toBeInTheDocument();
  });

  it("Requirement 2: Client information renders from actual backend invoice data", () => {
    render(
      <InvoicePreviewDocument
        invoice={mockActualInvoice}
        companyProfile={mockCompanyProfile}
      />
    );

    expect(screen.getByText("BILL TO")).toBeInTheDocument();
    expect(screen.getByText("Zenith Enterprises Inc.")).toBeInTheDocument();
    expect(screen.getByText(/500 Corporate Parkway/)).toBeInTheDocument();
    expect(screen.getByText("ap@zenith.com")).toBeInTheDocument();
    expect(screen.getByText("US-EIN-987654321")).toBeInTheDocument();
  });

  it("Requirement 3: Project information renders from actual backend data", () => {
    render(
      <InvoicePreviewDocument
        invoice={mockActualInvoice}
        companyProfile={mockCompanyProfile}
      />
    );

    expect(screen.getByText("PROJECT / BILLING DETAILS")).toBeInTheDocument();
    expect(screen.getByText("Cloud Migration Initiative")).toBeInTheDocument();
    expect(screen.getByText("CMI-2026")).toBeInTheDocument();
    expect(screen.getByText("01 Oct 2026 - 31 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("Net 30 Days")).toBeInTheDocument();
    expect(screen.getByText("BS-202610-001")).toBeInTheDocument();
  });

  it("Requirement 4: Invoice metadata renders from actual backend data", () => {
    render(
      <InvoicePreviewDocument
        invoice={mockActualInvoice}
        companyProfile={mockCompanyProfile}
      />
    );

    expect(screen.getByText("TAX INVOICE")).toBeInTheDocument();
    expect(screen.getByText("INV-2026-8801")).toBeInTheDocument();
    expect(screen.getByText("INVOICE GENERATED")).toBeInTheDocument();
    expect(screen.getAllByText("USD").length).toBeGreaterThan(0);
  });

  it("Requirement 5: Line items render from actual data with accurate roles, dates, hours, and rates", () => {
    render(
      <InvoicePreviewDocument
        invoice={mockActualInvoice}
        companyProfile={mockCompanyProfile}
      />
    );

    expect(screen.getByText("INVOICE LINE ITEMS")).toBeInTheDocument();
    expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
    expect(screen.getByText("Principal Architect")).toBeInTheDocument();
    expect(screen.getByText("50.00")).toBeInTheDocument();
    expect(screen.getByText("USD 200.00")).toBeInTheDocument();
    expect(screen.getAllByText("USD 10,000.00").length).toBeGreaterThan(0);
  });

  it("Requirement 6: Tax components render from actual tax calculation breakdown", () => {
    render(
      <InvoicePreviewDocument
        invoice={mockActualInvoice}
        companyProfile={mockCompanyProfile}
      />
    );

    expect(screen.getByText("TAX BREAKDOWN")).toBeInTheDocument();
    expect(screen.getByText("IGST")).toBeInTheDocument();
    expect(screen.getByText("Different Jurisdiction")).toBeInTheDocument();
    expect(screen.getByText("18.00%")).toBeInTheDocument();
    expect(screen.getAllByText("USD 1,800.00").length).toBeGreaterThanOrEqual(1);
  });

  it("Requirement 7: Financial totals render authoritative backend values with prominent Grand Total", () => {
    render(
      <InvoicePreviewDocument
        invoice={mockActualInvoice}
        companyProfile={mockCompanyProfile}
      />
    );

    expect(screen.getByText("FINANCIAL SUMMARY")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText("Grand Total")).toBeInTheDocument();
    expect(screen.getByText("USD 11,800.00")).toBeInTheDocument();
  });

  it("Requirement 8: Missing fields show 'Not configured' or 'Not provided' rather than mock data", () => {
    const minimalInvoice = {
      currency: "USD",
      subtotal: 0,
      totalTax: 0,
      grandTotal: 0,
    };

    render(
      <InvoicePreviewDocument
        invoice={minimalInvoice}
        companyProfile={null}
      />
    );

    // Fallbacks appear for unprovided seller/client/project fields
    const notConfiguredElements = screen.getAllByText("Not configured");
    expect(notConfiguredElements.length).toBeGreaterThan(0);

    const notProvidedElements = screen.getAllByText("Not provided");
    expect(notProvidedElements.length).toBeGreaterThan(0);
  });

  it("Requirement 9: Fixed / Installment billing renders cleanly without forcing empty T&M columns", () => {
    const fixedPriceInvoice = {
      invoiceId: "inv-fixed-001",
      invoiceNumber: "INV-FIXED-2026",
      invoiceStatus: "GENERATED",
      currency: "USD",
      subtotal: 25000.0,
      totalTax: 0.0,
      grandTotal: 25000.0,
      items: [
        {
          id: "item-fixed-1",
          itemName: "Milestone 1: Architecture Sign-off",
          quantity: 1,
          rate: 25000,
          amount: 25000,
        },
      ],
      taxBreakdown: [],
    };

    render(
      <InvoicePreviewDocument
        invoice={fixedPriceInvoice}
        companyProfile={mockCompanyProfile}
      />
    );

    expect(screen.getByText("Milestone 1: Architecture Sign-off")).toBeInTheDocument();
    expect(screen.getAllByText("USD 25,000.00").length).toBeGreaterThan(0);

    // Does NOT force irrelevant Work Date or Role table headers when neither item has them
    expect(screen.queryByRole("columnheader", { name: /^Role$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /^Work Date$/i })).not.toBeInTheDocument();
  });

  it("Requirement 10-13: Strictly NO mock bank details, NO QR code, NO fake HSN/SAC, NO mock signatures", () => {
    const { container } = render(
      <InvoicePreviewDocument
        invoice={mockActualInvoice}
        companyProfile={mockCompanyProfile}
      />
    );

    // No mock bank details
    expect(screen.queryByText(/bank name/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ifsc/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/account number/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/branch/i)).not.toBeInTheDocument();

    // No QR code
    expect(screen.queryByText(/qr code/i)).not.toBeInTheDocument();
    expect(container.querySelector("svg[data-qr]")).not.toBeInTheDocument();

    // No HSN/SAC column
    expect(screen.queryByText(/hsn/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sac/i)).not.toBeInTheDocument();

    // No mock signature / stamp
    expect(screen.queryByText(/authorized signatory/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/digital signature/i)).not.toBeInTheDocument();

    // No fake boilerplate terms
    expect(screen.queryByText(/goods once sold/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/subject to local jurisdiction/i)).not.toBeInTheDocument();
  });

  it("Requirement 14: Only real notes/terms render if actual data exists, omitted otherwise", () => {
    const invoiceWithoutNotes = {
      ...mockActualInvoice,
      additionalNotes: null,
      termsAndConditions: null,
    };

    const { rerender } = render(
      <InvoicePreviewDocument
        invoice={invoiceWithoutNotes}
        companyProfile={mockCompanyProfile}
      />
    );

    // NOTES & TERMS section is omitted completely when no actual notes exist
    expect(screen.queryByText("NOTES & TERMS")).not.toBeInTheDocument();

    // When actual notes exist in backend data, section renders
    rerender(
      <InvoicePreviewDocument
        invoice={mockActualInvoice}
        companyProfile={mockCompanyProfile}
      />
    );
    expect(screen.getByText("NOTES & TERMS")).toBeInTheDocument();
    expect(
      screen.getByText("Authorized for electronic fund transfer upon manager validation.")
    ).toBeInTheDocument();
  });
});
