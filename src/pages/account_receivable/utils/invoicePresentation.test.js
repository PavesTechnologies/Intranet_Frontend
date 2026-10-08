import { describe, it, expect } from "vitest";
import {
  INVOICE_BILLING_TYPES,
  buildInvoiceLineItems,
  formatDateRange,
  formatPaymentTerms,
  normalizeInvoiceBillingType,
  resolveInvoiceBillingType,
} from "./invoicePresentation";
import { normalizeInvoice } from "../services/invoiceService";

const { TIME_MATERIAL, MILESTONE_PLAN, RECURRING, FIXED_PRICE } = INVOICE_BILLING_TYPES;

describe("formatDateRange", () => {
  it("formats Java LocalDate arrays without timezone shifts", () => {
    expect(formatDateRange([2026, 8, 19], [2026, 10, 7])).toBe("19 Aug 2026 – 07 Oct 2026");
    expect(formatDateRange([2026, 1, 1], [2026, 12, 31])).toBe("01 Jan 2026 – 31 Dec 2026");
  });

  it("accepts ISO and already formatted strings", () => {
    expect(formatDateRange("2026-10-07", "2026-10-07")).toBe("07 Oct 2026 – 07 Oct 2026");
    expect(formatDateRange("07 Oct 2026", "22 Oct 2026")).toBe("07 Oct 2026 – 22 Oct 2026");
  });

  it("handles null / undefined / empty values", () => {
    expect(formatDateRange([2026, 8, 19], null)).toBe("19 Aug 2026 – Not Available");
    expect(formatDateRange(undefined, "2026-10-07")).toBe("Not Available – 07 Oct 2026");
    expect(formatDateRange(null, "", "Not provided")).toBe("Not provided");
    expect(formatDateRange([], [])).toBe("Not Available");
  });
});

describe("formatPaymentTerms", () => {
  it("maps a numeric paymentTermCode to Net N", () => {
    expect(formatPaymentTerms({ paymentTermCode: "15" })).toBe("Net 15");
    expect(formatPaymentTerms({ paymentTermCode: 45 })).toBe("Net 45");
  });
  it("prefers the backend payment term name", () => {
    expect(formatPaymentTerms({ paymentTermName: "Net 30 Days", paymentTermCode: "30" })).toBe("Net 30 Days");
  });
  it("shows a non-numeric code as-is and returns null when missing", () => {
    expect(formatPaymentTerms({ paymentTermCode: "DUE_ON_RECEIPT" })).toBe("DUE_ON_RECEIPT");
    expect(formatPaymentTerms({})).toBeNull();
  });
});

describe("normalizeInvoice — latest GET /api/v1/invoices response", () => {
  const invoice = normalizeInvoice({
    invoiceId: "3973c534-61ac-4fda-bad0-c667c404b181",
    invoiceNumber: "INV-20261007131622",
    status: "GENERATED",
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
  });

  it("maps every header field", () => {
    expect(invoice).toMatchObject({
      invoiceNumber: "INV-20261007131622",
      invoiceStatus: "GENERATED",
      clientName: "Aditya Teja",
      projectName: "Card Integration",
      projectStartDate: "2026-08-19",
      projectEndDate: "2026-10-07",
      billingPeriodStart: "2026-10-07",
      billingPeriodEnd: "2026-10-07",
      invoiceDate: "2026-10-07",
      dueDate: "2026-10-22",
      currency: "USD",
      paymentTermCode: "15",
      paymentTerms: "Net 15",
      subtotal: 65000,
      totalTax: 5850,
      grandTotal: 70850,
    });
  });

  it("keeps project duration and billing period separate", () => {
    expect(formatDateRange(invoice.projectStartDate, invoice.projectEndDate)).toBe("19 Aug 2026 – 07 Oct 2026");
    expect(formatDateRange(invoice.billingPeriodStart, invoice.billingPeriodEnd)).toBe("07 Oct 2026 – 07 Oct 2026");
  });

  it("does not invent a role for line items", () => {
    const withItem = normalizeInvoice({ items: [{ itemName: "Milestone Plan - Period 1", quantity: 1, rate: 65000, amount: 65000 }] });
    expect(withItem.items[0].role).toBeNull();
  });
});

describe("resolveInvoiceBillingType", () => {
  it("uses an explicit backend billing type first", () => {
    expect(resolveInvoiceBillingType({ invoice: { billingTypeName: "Timesheet Based" } })).toBe(TIME_MATERIAL);
    expect(resolveInvoiceBillingType({ invoice: { billingTypeCode: "MILESTONE_PLAN" } })).toBe(MILESTONE_PLAN);
  });

  it("follows the occurrence's billing type and configuration link", () => {
    expect(resolveInvoiceBillingType({ occurrence: { billingTypeName: "Milestone Based" } })).toBe(MILESTONE_PLAN);
    expect(resolveInvoiceBillingType({ occurrence: { recurringConfigurationId: "rec-1" } })).toBe(RECURRING);
    expect(resolveInvoiceBillingType({ occurrence: { billingConfigurationId: "cfg-1" } })).toBe(MILESTONE_PLAN);
    expect(resolveInvoiceBillingType({ occurrence: { scheduleType: "FIXED", billingConfigurationId: "cfg-1" } })).toBe(
      FIXED_PRICE
    );
  });

  it("uses the billing configuration context (T&M snapshot flow)", () => {
    expect(resolveInvoiceBillingType({ invoice: {}, context: { billingTypeCode: "TIME_MATERIAL" } })).toBe(TIME_MATERIAL);
  });

  it("never infers from item names, amounts or a bare billingSnapshotId", () => {
    expect(
      resolveInvoiceBillingType({
        invoice: { billingSnapshotId: "snap-1", items: [{ itemName: "Milestone Plan - Period 1", role: "Developer", amount: 1 }] },
      })
    ).toBeNull();
    expect(normalizeInvoiceBillingType("Milestone Plan - Period 1")).toBeNull();
  });
});

describe("buildInvoiceLineItems", () => {
  it("milestone line has no role, quantity or rate", () => {
    const { columns, rows } = buildInvoiceLineItems({
      billingType: MILESTONE_PLAN,
      items: [{ itemName: "Milestone Plan - Period 1", quantity: 1, rate: 65000, amount: 65000 }],
      occurrence: { periodNumber: 1, billingDate: "2026-10-07" },
      currency: "USD",
    });
    expect(columns.map((c) => c.key)).toEqual(["payment", "billingDate", "amount"]);
    expect(rows).toEqual([expect.objectContaining({ payment: "Payment 1", billingDate: "07 Oct 2026", amount: "USD 65,000.00" })]);
  });

  it("milestone prefers a backend milestone name and then shows the sequence", () => {
    const { columns, rows } = buildInvoiceLineItems({
      billingType: MILESTONE_PLAN,
      items: [],
      occurrence: { periodNumber: 2, milestoneName: "Design Sign-off", paymentPercentage: 40, billingAmount: 4000, billingDate: [2026, 11, 1] },
      currency: "INR",
    });
    expect(columns.map((c) => c.label)).toEqual(["Payment / Milestone", "Sequence", "Payment %", "Billing Date", "Amount"]);
    expect(rows[0]).toMatchObject({ payment: "Design Sign-off", sequence: "2", percent: "40%", billingDate: "01 Nov 2026", amount: "₹4,000.00" });
  });

  it("recurring line uses the occurrence billing period and date", () => {
    const { columns, rows } = buildInvoiceLineItems({
      billingType: RECURRING,
      items: [],
      occurrence: { periodStartDate: "2026-10-01", periodEndDate: "2026-10-31", billingDate: "2026-10-07", billingAmount: 65000 },
      currency: "USD",
    });
    expect(columns.map((c) => c.label)).toEqual(["Recurring Item", "Billing Period", "Billing Date", "Amount"]);
    expect(rows[0]).toMatchObject({
      item: "Recurring Billing",
      billingPeriod: "01 Oct 2026 – 31 Oct 2026",
      billingDate: "07 Oct 2026",
      amount: "USD 65,000.00",
    });
  });

  it("missing occurrence dates render '—', never invented", () => {
    const { rows } = buildInvoiceLineItems({ billingType: RECURRING, items: [{ itemName: "Support", amount: 10 }], currency: "USD" });
    expect(rows[0]).toMatchObject({ billingPeriod: "—", billingDate: "—" });
  });

  it("T&M keeps resource columns", () => {
    const { columns, rows } = buildInvoiceLineItems({
      billingType: TIME_MATERIAL,
      items: [{ resourceName: "Developer", role: "Java Developer", quantity: 40, rate: 50, amount: 2000 }],
      currency: "USD",
    });
    expect(columns.map((c) => c.label)).toEqual(["Resource / Item", "Role", "Quantity", "Rate", "Amount"]);
    expect(rows[0]).toMatchObject({ item: "Developer", role: "Java Developer", quantity: "40.00", rate: "USD 50.00", amount: "USD 2,000.00" });
  });
});
