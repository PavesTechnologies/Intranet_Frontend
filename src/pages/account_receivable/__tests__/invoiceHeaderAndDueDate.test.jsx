import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import InvoicePreviewDocument from "../components/invoice/InvoicePreviewDocument";

const draft = {
  isDraftPreview: true,
  generated: false,
  invoiceNumber: null,
  clientName: "Acme Corporation",
  projectName: "ERP Migration",
  currency: "USD",
  subtotal: 100,
  totalTax: 0,
  grandTotal: 100,
  paymentTermName: "Net 30",
  sellerLegalName: "Paves Technologies Private Limited",
  sellerAddressLine1: "Plot 12, Hitech City Main Road, Madhapur",
  sellerAddressLine2: "Phase 2, Block C, Tower B",
  sellerCity: "Hyderabad",
  sellerState: "Telangana",
  sellerPostalCode: "500081",
  sellerCountry: "India",
  sellerGstin: "36AAAAA0000A1Z5",
  sellerPhone: "+91 40 1234 5678",
  sellerEmail: "billing@example.com",
  items: [{ id: "i1", itemName: "Design", quantity: 1, rate: 100, amount: 100 }],
  taxComponents: [],
};

const dueDateCell = () => screen.getByText("Due Date").nextSibling;

describe("Invoice header, seller address, due date and client name", () => {
  it("keeps one INVOICE heading with no subtitle and no Supply Classification card in the header", () => {
    const { container } = render(<InvoicePreviewDocument invoice={draft} />);

    const header = container.querySelector("header");
    expect(within(header).getByText("INVOICE")).toBeInTheDocument();
    expect(screen.queryByText("(Pre-generation draft preview)")).not.toBeInTheDocument();
    expect(within(header).queryByText("Supply Classification")).not.toBeInTheDocument();
    expect(within(header).queryByText(/Taxable Supply of Services/)).not.toBeInTheDocument();
  });

  it("lays the seller address out one element per line, with tax registration and contacts below", () => {
    const { container } = render(<InvoicePreviewDocument invoice={draft} />);

    const address = within(container.querySelector("header")).getByText(/Plot 12, Hitech City Main Road/);
    expect(address.textContent).toBe(
      "Plot 12, Hitech City Main Road, Madhapur\nPhase 2, Block C, Tower B\nHyderabad, Telangana 500081\nIndia"
    );
    expect(address.className).toContain("whitespace-pre-line");
    const header = within(container.querySelector("header"));
    expect(header.getByText("36AAAAA0000A1Z5")).toBeInTheDocument();
    expect(header.getByText("+91 40 1234 5678")).toBeInTheDocument();
    expect(header.getByText("billing@example.com")).toBeInTheDocument();
  });

  it("omits missing optional seller address parts without empty lines", () => {
    const { container } = render(
      <InvoicePreviewDocument invoice={{ ...draft, sellerAddressLine2: null, sellerPostalCode: null, sellerCountry: null }} />
    );
    const address = within(container.querySelector("header")).getByText(/Plot 12/);
    expect(address.textContent).toBe("Plot 12, Hitech City Main Road, Madhapur\nHyderabad, Telangana");
  });

  it.each([
    ["2026-10-21", "2026-11-20", "20 Nov 2026"], // Net 30
    ["2026-10-21", "2026-11-05", "05 Nov 2026"], // Net 15
    ["2026-12-20", "2027-02-03", "03 Feb 2027"], // Net 45 across a year boundary
  ])("shows the backend due date for invoice date %s (%s) as a calendar date with no timezone shift", (invoiceDate, dueDate, shown) => {
    render(<InvoicePreviewDocument invoice={{ ...draft, invoiceDate, dueDate }} />);

    expect(screen.queryByText("Payment Due")).not.toBeInTheDocument();
    expect(dueDateCell().textContent).toBe(shown);
  });

  it("says the due date is not available, never invents one, when the backend has none", () => {
    render(<InvoicePreviewDocument invoice={{ ...draft, invoiceDate: "2026-10-21", dueDate: null }} />);
    expect(dueDateCell().textContent).toBe("Not available");
    expect(screen.queryByText("Upon Generation")).not.toBeInTheDocument();
  });

  it("shows the real client name, and never a UUID or an empty value as the legal name", () => {
    const { unmount } = render(<InvoicePreviewDocument invoice={draft} />);
    expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    unmount();

    const uuid = "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c";
    render(<InvoicePreviewDocument invoice={{ ...draft, clientName: uuid }} />);
    expect(screen.queryByText(uuid)).not.toBeInTheDocument();
    expect(screen.getByText("Client name not available")).toBeInTheDocument();
  });
});
