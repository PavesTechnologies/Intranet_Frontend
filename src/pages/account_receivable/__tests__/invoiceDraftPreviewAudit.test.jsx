import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import InvoicePreviewDocument from "../components/invoice/InvoicePreviewDocument";

describe("Invoice Generation — Draft Preview Audit Verification", () => {
  it("renders a pre-generation draft preview with clean 'Pending Generation' and 'Upon Generation' without fabricated dates or numbers", () => {
    const previewData = {
      isDraftPreview: true,
      generated: false,
      invoiceNumber: null,
      invoiceDate: null,
      dueDate: null,
      clientName: "Acme Corporation",
      projectName: "ERP Migration",
      currency: "USD",
      subtotal: 5000,
      totalTax: 0,
      grandTotal: 5000,
      items: [
        {
          id: "item-1",
          itemName: "Cloud Architecture Design",
          quantity: 10,
          rate: 500,
          amount: 5000,
        },
      ],
      taxComponents: [],
    };

    render(<InvoicePreviewDocument invoice={previewData} />);

    // Invoice Number must display "Pending Generation"
    expect(screen.getByText("Pending Generation")).toBeInTheDocument();

    // Invoice Date and Due Date must display "Upon Generation" rather than today or today + 30 days
    // (no invoice date from the API: "Upon Generation"; no due date: explicitly "Not available", never invented)
    expect(screen.getByText("Upon Generation")).toBeInTheDocument();
    expect(screen.getByText("Due Date")).toBeInTheDocument();
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.queryByText("Payment Due")).not.toBeInTheDocument();

    // Title should be "INVOICE", but the "DRAFT PREVIEW" status badge must NOT be present in preview box
    expect(screen.getByText("INVOICE")).toBeInTheDocument();
    expect(screen.queryByText("DRAFT PREVIEW")).not.toBeInTheDocument();

    // Client and Project must match backend data exactly
    expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    expect(screen.getByText("ERP Migration")).toBeInTheDocument();
  });

  it("handles missing optional seller and client fields gracefully without fabricated fallbacks", () => {
    const minimalInvoice = {
      isDraftPreview: true,
      generated: false,
      clientName: null,
      projectName: null,
      billingAddress: null,
      gstinOrTaxId: null,
      sellerLegalName: null,
      sellerAddress: null,
      sellerGstin: null,
      subtotal: 0,
      totalTax: 0,
      grandTotal: 0,
      items: [],
      taxComponents: [],
    };

    const { container } = render(<InvoicePreviewDocument invoice={minimalInvoice} />);

    // Must NOT contain fabricated seller name, address, or GSTIN
    expect(screen.queryByText(/Paves Technologies Private Limited/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Q-City/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/36AAPCP4212K1Z6/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AAPCP4212K/i)).not.toBeInTheDocument();

    // Must NOT contain fabricated client fallbacks
    expect(screen.queryByText(/Account Management/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Valued Client/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Registered corporate address on file/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unregistered \/ Overseas Recipient/i)).not.toBeInTheDocument();

    // Must NOT contain fabricated seal or approval text
    expect(screen.queryByText(/CORPORATE SEAL/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Digitally Verified & Approved/i)).not.toBeInTheDocument();

    // Must NOT contain hardcoded SAC code
    expect(screen.queryByText(/998314/i)).not.toBeInTheDocument();

    // Empty items state
    expect(screen.getByText(/No line items available for this draft invoice/i)).toBeInTheDocument();
  });

  it("authoritatively displays tax components from backend tax calculation and zero-rated supply when total tax is zero", () => {
    const zeroTaxInvoice = {
      isDraftPreview: true,
      generated: false,
      clientName: "Global Client Ltd",
      projectName: "Mobile App",
      currency: "USD",
      subtotal: 10000,
      totalTax: 0,
      grandTotal: 10000,
      taxRegionCode: "EXPORT",
      items: [
        {
          id: "it-1",
          itemName: "Software Development",
          quantity: 1,
          rate: 10000,
          amount: 10000,
        },
      ],
      taxComponents: [],
    };

    render(<InvoicePreviewDocument invoice={zeroTaxInvoice} />);

    // Supply classification should be Export of Services (Zero Rated)
    // Supply classification now lives in the summary ("Nature of Supply"), not in the header.
    expect(screen.getByText(/Nature of Supply: Export of Services \(Zero Rated\)/)).toBeInTheDocument();

    // Schedule should show zero-rated message, not fabricated Integrated Tax 18%
    expect(screen.getByText(/Zero-rated or exempt supply/i)).toBeInTheDocument();
    expect(screen.queryByText(/Integrated Tax \(IGST \/ GST\)/i)).not.toBeInTheDocument();
  });

  it("authoritatively displays multi-component domestic taxes (e.g. CGST 9% + SGST 9%) without hardcoded assumptions", () => {
    const domesticTaxInvoice = {
      isDraftPreview: true,
      generated: false,
      clientName: "Domestic Client Pvt Ltd",
      projectName: "Portal Development",
      currency: "INR",
      subtotal: 20000,
      totalTax: 3600,
      grandTotal: 23600,
      taxComponents: [
        {
          id: "cgst-1",
          taxTypeCode: "CGST",
          appliedRate: 9.0,
          taxAmount: 1800,
          taxableAmount: 20000,
        },
        {
          id: "sgst-1",
          taxTypeCode: "SGST",
          appliedRate: 9.0,
          taxAmount: 1800,
          taxableAmount: 20000,
        },
      ],
      items: [
        {
          id: "item-1",
          itemName: "Module Implementation",
          quantity: 20,
          rate: 1000,
          amount: 20000,
        },
      ],
    };

    render(<InvoicePreviewDocument invoice={domesticTaxInvoice} />);

    expect(screen.getByText(/Nature of Supply: Taxable Supply of Services/)).toBeInTheDocument();
    expect(screen.getAllByText(/CGST/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/SGST/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/9\.0%/).length).toBeGreaterThanOrEqual(2);
  });

  it("consolidates financial sections into a single 'Tax & Invoice Summary' without duplicated schedules or ledgers", () => {
    const invoice = {
      isDraftPreview: true,
      generated: false,
      clientName: "Alpha Corp",
      projectName: "App Modernization",
      currency: "INR",
      subtotal: 10000,
      totalTax: 1800,
      grandTotal: 11800,
      taxComponents: [
        {
          id: "igst-1",
          taxTypeCode: "IGST",
          appliedRate: 18.0,
          taxAmount: 1800,
          taxableAmount: 10000,
        },
      ],
      items: [
        {
          id: "it-1",
          itemName: "Cloud Architecture",
          quantity: 1,
          rate: 10000,
          amount: 10000,
        },
      ],
    };

    render(<InvoicePreviewDocument invoice={invoice} />);

    // Unified Section Header
    expect(screen.getByText("Tax & Invoice Summary")).toBeInTheDocument();

    // Replaced separate sections must NOT exist
    expect(screen.queryByText("Statutory Tax Breakdown Schedule")).not.toBeInTheDocument();
    expect(screen.queryByText("Financial Summary Ledger")).not.toBeInTheDocument();

    // Taxable Subtotal and Total Invoice Amount
    expect(screen.getByText("Taxable Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Total Invoice Amount")).toBeInTheDocument();

    // Amount Chargeable in words directly beneath the total
    expect(screen.getByText("Amount Chargeable (in words):")).toBeInTheDocument();
  });

  it("removes internal snapshot reference from customer-facing invoice while preserving billing model", () => {
    const invoiceWithSnapshot = {
      isDraftPreview: true,
      generated: false,
      snapshotNumber: "SNAP-2026-0042",
      snapshotId: "b8a92e10-9f20-41a4-bcae-214958194812",
      billingType: "TIME_AND_MATERIALS",
      clientName: "Beta Corp",
      projectName: "ERP Refresh",
      currency: "USD",
      subtotal: 3000,
      totalTax: 0,
      grandTotal: 3000,
      items: [],
    };

    render(<InvoicePreviewDocument invoice={invoiceWithSnapshot} snapshotNumber="SNAP-2026-0042" />);

    // Customer-facing preview must NOT display Snapshot Reference
    expect(screen.queryByText(/Snapshot Reference/i)).not.toBeInTheDocument();
    expect(screen.queryByText("SNAP-2026-0042")).not.toBeInTheDocument();

    // Billing model must still be rendered
    expect(screen.getByText("Billing Model:")).toBeInTheDocument();
  });

  it("dynamically displays Reverse Charge: Yes/No only when supported by persisted invoice or tax data", () => {
    // 1. When reverseCharge is true
    const { unmount: unmount1 } = render(
      <InvoicePreviewDocument
        invoice={{
          isDraftPreview: true,
          reverseCharge: true,
          clientName: "Client A",
          projectName: "Project A",
        }}
      />
    );
    expect(screen.getByText("Reverse Charge")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    unmount1();

    // 2. When reverseCharge is false
    const { unmount: unmount2 } = render(
      <InvoicePreviewDocument
        invoice={{
          isDraftPreview: true,
          reverseCharge: false,
          clientName: "Client B",
          projectName: "Project B",
        }}
      />
    );
    expect(screen.getByText("Reverse Charge")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    unmount2();

    // 3. When reverse charge data is not present, do not render a hardcoded No
    render(
      <InvoicePreviewDocument
        invoice={{
          isDraftPreview: true,
          clientName: "Client C",
          projectName: "Project C",
        }}
      />
    );
    expect(screen.queryByText("Reverse Charge")).not.toBeInTheDocument();
  });
  it("places payment instructions below the Tax & Invoice Summary", () => {
    render(
      <InvoicePreviewDocument
        invoice={{
          isDraftPreview: true,
          clientName: "Gamma Corp",
          projectName: "Portal",
          currency: "USD",
          subtotal: 1000,
          totalTax: 0,
          grandTotal: 1000,
          paymentInstructions: "Bank: Example Bank / Account: 000123",
          items: [{ id: "i-1", itemName: "Consulting", quantity: 1, rate: 1000, amount: 1000 }],
          taxComponents: [],
        }}
      />
    );

    const summary = screen.getByText("Tax & Invoice Summary");
    const instructions = screen.getByText("Payment Instructions");
    // DOCUMENT_POSITION_FOLLOWING: the instructions come after the summary in the document.
    expect(summary.compareDocumentPosition(instructions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Account: 000123/)).toBeInTheDocument();
  });

  it("does not invent a seller state when none is stored", () => {
    render(
      <InvoicePreviewDocument
        invoice={{
          isDraftPreview: true,
          clientName: "Delta Corp",
          projectName: "Portal",
          sellerLegalName: "Seller Ltd",
          sellerGstin: "36AAAAA0000A1Z5",
          subtotal: 0,
          totalTax: 0,
          grandTotal: 0,
          items: [],
          taxComponents: [],
        }}
      />
    );

    expect(screen.queryByText(/Telangana/i)).not.toBeInTheDocument();
  });
});

