import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import InvoicePreviewDocument from "../components/invoice/InvoicePreviewDocument";

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
  subtotal: 250,
  grandTotal: 250,
};

const flight = {
  id: "e-1",
  itemType: "EXPENSE",
  itemName: "Travel",
  sourceReferenceId: "LI-INTERNAL-1",
  workDate: "2026-07-10",
  quantity: 1,
  rate: 250,
  amount: 250,
  expenseDescription: "Client site flight BLR-DEL",
  expenseCategory: "Travel",
  expenseMerchant: "Air Example",
  expenseReportNumber: "EXP-2026-0042",
  originalAmount: 25000,
  originalCurrency: "INR",
  exchangeRate: 0.01,
};

describe("Expense details in the invoice preview", () => {
  it("leads with the real description; category, merchant, report ref and FX note follow; no technical ids", () => {
    const { container } = render(<InvoicePreviewDocument invoice={{ ...baseInvoice, items: [flight] }} />);

    const row = within(screen.getByText("Client site flight BLR-DEL").closest("tr"));
    expect(row.getByText("Travel")).toBeInTheDocument();
    expect(row.getByText("Air Example")).toBeInTheDocument();
    expect(row.getByText("EXP-2026-0042")).toBeInTheDocument();
    expect(row.getByText(/Original 25,000\.00 INR @ 0\.01/)).toBeInTheDocument();
    expect(row.getByText("$250.00", { selector: "td" })).toBeInTheDocument();
    expect(screen.getByText("Expense Report Ref.")).toBeInTheDocument();
    expect(container.textContent).not.toContain("LI-INTERNAL-1");
    // An expense never shows a T&M discount or rate-card column.
    expect(row.queryByText(/%|off/)).not.toBeInTheDocument();
  });

  it("hides every optional field, and the reference column, when XMS supplied none (no placeholders)", () => {
    const bare = { id: "e-2", itemType: "EXPENSE", itemName: "Meals", workDate: "2026-07-11", quantity: 1, rate: 12, amount: 12 };
    render(<InvoicePreviewDocument invoice={{ ...baseInvoice, subtotal: 12, grandTotal: 12, items: [bare] }} />);

    const row = within(screen.getByText("Meals").closest("tr"));
    expect(row.getByText("$12.00", { selector: "td" })).toBeInTheDocument();
    expect(screen.queryByText("Expense Report Ref.")).not.toBeInTheDocument();
    expect(row.queryByText(/Original|@/)).not.toBeInTheDocument();
    expect(row.queryByText(/EXP-/)).not.toBeInTheDocument();
  });

  it("does not repeat a category identical to the description, and shows no FX note without a rate", () => {
    const same = { ...flight, expenseDescription: "Travel", expenseMerchant: null, exchangeRate: null };
    render(<InvoicePreviewDocument invoice={{ ...baseInvoice, items: [same] }} />);

    const row = within(screen.getByText("Travel", { selector: "div" }).closest("tr"));
    expect(row.getAllByText("Travel")).toHaveLength(1);
    expect(row.queryByText(/Original/)).not.toBeInTheDocument();
  });
});
