import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import InvoicePreviewDocument from "./InvoicePreviewDocument";
import { normalizeInvoice } from "../../services/invoiceService";
import { normalizeBillingOccurrence, mergeOccurrenceWithTaxCalc } from "../../services/billingOccurrenceService";

// GET /api/v1/invoices record exactly as the backend returns it today.
const apiInvoice = (overrides = {}) => ({
  invoiceId: "3973c534-61ac-4fda-bad0-c667c404b181",
  invoiceNumber: "INV-20261007131622",
  status: "GENERATED",
  billingSnapshotId: null,
  billingSnapshotNumber: null,
  clientName: "Aditya Teja",
  projectName: "Card Integration",
  projectStartDate: [2026, 8, 19],
  projectEndDate: [2026, 10, 7],
  billingPeriodStart: [2026, 10, 7],
  billingPeriodEnd: [2026, 10, 7],
  invoiceDate: [2026, 10, 7],
  dueDate: [2026, 10, 22],
  currencyCode: "USD",
  paymentTermCode: "15",
  subtotal: 65000.0,
  totalTaxAmount: 5850.0,
  grandTotal: 70850.0,
  ...overrides,
});

// The backend's single occurrence line (what produced the old
// "Role = Unknown / Quantity 1 / Rate = Amount" row).
const occurrenceItem = (name) => ({ invoiceItemId: "ii-1", itemName: name, quantity: 1, rate: 65000, amount: 65000 });

const milestoneOccurrence = (overrides = {}) =>
  normalizeBillingOccurrence({
    billingScheduleId: "occ-1",
    billingConfigurationId: "cfg-1",
    billingTypeName: "Milestone Based",
    periodNumber: 1,
    periodStartDate: [2026, 10, 7],
    periodEndDate: [2026, 10, 7],
    billingDate: [2026, 10, 7],
    billingAmount: 65000,
    projectStartDate: [2026, 8, 19],
    projectEndDate: [2026, 10, 7],
    ...overrides,
  });

const recurringOccurrence = () =>
  normalizeBillingOccurrence({
    billingScheduleId: "occ-r",
    recurringConfigurationId: "rec-1",
    periodNumber: 1,
    periodStartDate: [2026, 10, 1],
    periodEndDate: [2026, 10, 31],
    billingDate: [2026, 10, 7],
    billingAmount: 65000,
  });

const headers = () => screen.getAllByRole("columnheader").map((th) => th.textContent);
const lineItemsTable = () => screen.getAllByRole("table")[0];

describe("Invoice header mapping from GET /api/v1/invoices", () => {
  it("E–K: project duration, billing period, dates, payment terms, totals, currency", () => {
    const invoice = normalizeInvoice(apiInvoice());
    render(<InvoicePreviewDocument invoice={invoice} occurrence={milestoneOccurrence()} />);

    expect(screen.getByText("INV-20261007131622")).toBeInTheDocument();
    expect(screen.getByText("Aditya Teja")).toBeInTheDocument();
    expect(screen.getByText("Card Integration")).toBeInTheDocument();
    // E / F — two separate rows, never swapped
    expect(screen.getByText("19 Aug 2026 – 07 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("07 Oct 2026 – 07 Oct 2026")).toBeInTheDocument();
    // G / H — straight from invoiceDate / dueDate
    expect(screen.getByText("22 Oct 2026")).toBeInTheDocument();
    expect(screen.getAllByText("07 Oct 2026").length).toBeGreaterThan(0);
    // I
    expect(screen.getByText("Net 15")).toBeInTheDocument();
    // J
    expect(screen.getAllByText("USD 65,000.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("USD 5,850.00").length).toBeGreaterThan(0);
    expect(screen.getByText("USD 70,850.00")).toBeInTheDocument();
    // no raw LocalDate arrays anywhere
    expect(document.body.textContent).not.toMatch(/2026,\s*\d/);
  });

  it("K: renders the backend currency, not USD", () => {
    const invoice = normalizeInvoice(apiInvoice({ currencyCode: "EUR", subtotal: 1000, totalTaxAmount: 190, grandTotal: 1190 }));
    render(<InvoicePreviewDocument invoice={invoice} occurrence={milestoneOccurrence({ billingAmount: 1000 })} />);
    expect(screen.getByText("EUR 1,190.00")).toBeInTheDocument();
    expect(screen.queryByText(/USD/)).not.toBeInTheDocument();
  });

  it("missing projectEndDate shows Not Available, never the billing period", () => {
    const invoice = normalizeInvoice(apiInvoice({ projectEndDate: null }));
    render(<InvoicePreviewDocument invoice={invoice} occurrence={milestoneOccurrence({ projectEndDate: null })} />);
    expect(screen.getByText("19 Aug 2026 – Not Available")).toBeInTheDocument();
  });

  it("missing payment terms keeps the existing 'Not provided' fallback", () => {
    const invoice = normalizeInvoice(apiInvoice({ paymentTermCode: null }));
    render(<InvoicePreviewDocument invoice={invoice} />);
    expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Net /)).not.toBeInTheDocument();
  });
});

describe("Billing-type-specific invoice line items", () => {
  it("A. T&M keeps Resource / Role / Quantity / Rate / Amount", () => {
    const invoice = normalizeInvoice(
      apiInvoice({
        billingSnapshotId: "snap-1",
        items: [{ resourceName: "Developer", role: "Java Developer", quantity: 40, rate: 50, amount: 2000 }],
      })
    );
    render(<InvoicePreviewDocument invoice={invoice} snapshotData={{ billingTypeCode: "TIME_MATERIAL" }} />);

    expect(headers()).toEqual(expect.arrayContaining(["Resource / Item", "Role", "Quantity", "Rate", "Amount"]));
    const table = within(lineItemsTable());
    expect(table.getByText("Developer")).toBeInTheDocument();
    expect(table.getByText("Java Developer")).toBeInTheDocument();
    expect(table.getByText("40.00")).toBeInTheDocument();
    expect(table.getByText("USD 50.00")).toBeInTheDocument();
    expect(table.getByText("USD 2,000.00")).toBeInTheDocument();
  });

  it("B. Milestone Plan renders a payment line — no fake Role / Quantity / Rate", () => {
    const invoice = normalizeInvoice(apiInvoice({ items: [occurrenceItem("Milestone Plan - Period 1")] }));
    render(<InvoicePreviewDocument invoice={invoice} occurrence={milestoneOccurrence()} />);

    const lineHeaders = within(lineItemsTable()).getAllByRole("columnheader").map((th) => th.textContent);
    expect(lineHeaders).toEqual(["#", "Payment / Milestone", "Billing Date", "Amount"]);
    const table = within(lineItemsTable());
    expect(table.getByText("Payment 1")).toBeInTheDocument();
    expect(table.getByText("07 Oct 2026")).toBeInTheDocument();
    expect(table.getByText("USD 65,000.00")).toBeInTheDocument();
    expect(table.queryByText("Unknown")).not.toBeInTheDocument();
    expect(table.queryByText("1.00")).not.toBeInTheDocument();
    expect(screen.getByText("Milestone Plan")).toBeInTheDocument();
  });

  it("B. Milestone Plan shows Payment % only when the backend sends it", () => {
    const invoice = normalizeInvoice(apiInvoice({ items: [occurrenceItem("Milestone Plan - Period 1")] }));
    render(<InvoicePreviewDocument invoice={invoice} occurrence={milestoneOccurrence({ paymentPercentage: 100 })} />);
    const table = within(lineItemsTable());
    expect(table.getByRole("columnheader", { name: "Payment %" })).toBeInTheDocument();
    expect(table.getByText("100%")).toBeInTheDocument();
  });

  it("B. Milestone Plan draft preview (no invoice items yet) builds the line from the occurrence", () => {
    render(
      <InvoicePreviewDocument
        invoice={{ invoiceStatus: "DRAFT_PREVIEW", isDraftPreview: true, currency: "USD", items: [] }}
        occurrence={milestoneOccurrence()}
      />
    );
    const table = within(lineItemsTable());
    expect(table.getByText("Payment 1")).toBeInTheDocument();
    expect(table.getByText("USD 65,000.00")).toBeInTheDocument();
  });

  it("C. Recurring renders Recurring Item / Billing Period / Billing Date / Amount", () => {
    const invoice = normalizeInvoice(
      apiInvoice({
        billingPeriodStart: [2026, 10, 1],
        billingPeriodEnd: [2026, 10, 31],
        items: [occurrenceItem("Monthly Recurring Billing")],
      })
    );
    render(<InvoicePreviewDocument invoice={invoice} occurrence={recurringOccurrence()} />);

    const lineHeaders = within(lineItemsTable()).getAllByRole("columnheader").map((th) => th.textContent);
    expect(lineHeaders).toEqual(["#", "Recurring Item", "Billing Period", "Billing Date", "Amount"]);
    const table = within(lineItemsTable());
    expect(table.getByText("Monthly Recurring Billing")).toBeInTheDocument();
    expect(table.getByText("01 Oct 2026 – 31 Oct 2026")).toBeInTheDocument();
    expect(table.getByText("07 Oct 2026")).toBeInTheDocument();
    expect(table.getByText("USD 65,000.00")).toBeInTheDocument();
  });

  it("D. Legacy Fixed Price renders a fixed-price billing line, not a resource line", () => {
    const invoice = normalizeInvoice(
      apiInvoice({ billingTypeName: "Fixed Price", items: [occurrenceItem("Fixed Price Billing")] })
    );
    render(
      <InvoicePreviewDocument
        invoice={invoice}
        occurrence={normalizeBillingOccurrence({
          billingScheduleId: "occ-f",
          scheduleType: "FIXED",
          periodStartDate: [2026, 10, 1],
          periodEndDate: [2026, 10, 7],
          billingDate: [2026, 10, 7],
          billingAmount: 65000,
        })}
      />
    );
    const lineHeaders = within(lineItemsTable()).getAllByRole("columnheader").map((th) => th.textContent);
    expect(lineHeaders).toEqual(["#", "Description", "Billing Period", "Billing Date", "Amount"]);
    expect(within(lineItemsTable()).getByText("Fixed Price Billing")).toBeInTheDocument();
  });

  it("billing type is never inferred from the item name", () => {
    // No billing type anywhere -> previous generic layout, even though the item says "Milestone".
    const invoice = normalizeInvoice(apiInvoice({ items: [occurrenceItem("Milestone Plan - Period 1")] }));
    render(<InvoicePreviewDocument invoice={invoice} />);
    expect(within(lineItemsTable()).getByRole("columnheader", { name: "Description / Item" })).toBeInTheDocument();
    expect(screen.queryByText("Payment 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });

  it("tax breakdown stays a separate table from the line items", () => {
    const invoice = normalizeInvoice(
      apiInvoice({
        items: [occurrenceItem("Milestone Plan - Period 1")],
        taxBreakdown: [{ taxTypeCode: "IGST", applicabilityType: "DIFFERENT_JURISDICTION", appliedRate: 9, taxableAmount: 65000, taxAmount: 5850 }],
      })
    );
    render(<InvoicePreviewDocument invoice={invoice} occurrence={milestoneOccurrence()} />);
    const [lines, taxes] = screen.getAllByRole("table");
    expect(within(lines).queryByText("IGST")).not.toBeInTheDocument();
    expect(within(taxes).getByText("IGST")).toBeInTheDocument();
    expect(within(taxes).getByText("9.00%")).toBeInTheDocument();
  });
});

// Shapes captured from the live AR backend (GET /api/billing-occurrences/{id}
// and GET /api/billing-occurrences/{id}/tax-calculation).
describe("Preview line items survive the occurrence + tax-calculation merge", () => {
  const liveOccurrence = {
    billingScheduleId: "ce3da3e8-2097-452a-bd61-0d9e55e5a94e",
    billingConfigurationId: "ab5c8f92-eb9c-4e43-9759-117cd0f67776",
    recurringConfigurationId: null,
    periodNumber: 1,
    periodStartDate: [2026, 10, 7],
    periodEndDate: [2026, 10, 7],
    billingDate: [2026, 10, 7],
    billingAmount: 32500,
    scheduleType: "PRIMARY",
    periodStatus: "TAX_CALCULATED",
    isInvoiced: false,
    projectName: "Card Integration",
    clientName: "Aditya Teja",
    currencyCode: "USD",
  };
  const liveTaxCalc = {
    taxCalculationId: "b6802479",
    billingSnapshotId: null,
    billingScheduleId: "ce3da3e8-2097-452a-bd61-0d9e55e5a94e",
    projectName: "Card Integration",
    clientName: "Aditya Teja",
    billingPeriodStart: [2026, 10, 7],
    billingPeriodEnd: [2026, 10, 7],
    currencyCode: "USD",
    taxableAmount: 32500,
    components: [{ taxTypeCode: "IGST", appliedRate: 9, taxAmount: 2925, applicabilityType: "DIFFERENT_JURISDICTION" }],
    totalTaxAmount: 2925,
    grandTotal: 35425,
  };

  it("keeps the configuration link, sequence and billing date the tax response lacks", () => {
    const merged = mergeOccurrenceWithTaxCalc(
      normalizeBillingOccurrence(liveOccurrence),
      normalizeBillingOccurrence(liveTaxCalc)
    );
    expect(merged.billingConfigurationId).toBe("ab5c8f92-eb9c-4e43-9759-117cd0f67776");
    expect(merged.periodNumber).toBe(1);
    expect(merged.totalTaxAmount).toBe(2925);

    render(
      <InvoicePreviewDocument
        invoice={{ invoiceStatus: "DRAFT_PREVIEW", isDraftPreview: true, currency: "USD", items: [] }}
        occurrence={merged}
      />
    );
    const table = within(lineItemsTable());
    expect(table.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "#",
      "Payment / Milestone",
      "Billing Date",
      "Amount",
    ]);
    expect(table.getByText("Payment 1")).toBeInTheDocument();
    expect(table.getByText("07 Oct 2026")).toBeInTheDocument();
    expect(table.getByText("USD 32,500.00")).toBeInTheDocument();
    expect(screen.getByText("1 Item")).toBeInTheDocument();
    expect(screen.queryByText(/billing snapshot/i)).not.toBeInTheDocument();
  });

  it("generated T&M invoice (live detail shape, itemType TIME_ENTRY) keeps the resource layout", () => {
    const invoice = normalizeInvoice(
      apiInvoice({
        billingSnapshotId: "f4cf25a8",
        items: [
          { invoiceItemId: "a", itemType: "TIME_ENTRY", itemName: "Bolli Teja", resourceName: "Bolli Teja", quantity: 11, rate: 800, amount: 8800, workDate: [2026, 8, 6], role: "Unknown" },
        ],
      })
    );
    render(<InvoicePreviewDocument invoice={invoice} />);
    const lineHeaders = within(lineItemsTable()).getAllByRole("columnheader").map((th) => th.textContent);
    expect(lineHeaders).toEqual(["#", "Resource / Item", "Role", "Work Date", "Quantity", "Rate", "Amount"]);
    expect(within(lineItemsTable()).getByText("USD 8,800.00")).toBeInTheDocument();
  });

  it("genuinely empty line items show the generic message and 0 items", () => {
    render(<InvoicePreviewDocument invoice={normalizeInvoice(apiInvoice())} />);
    expect(screen.getByText("No invoice line items available.")).toBeInTheDocument();
    expect(screen.getByText("0 Items")).toBeInTheDocument();
  });
});
