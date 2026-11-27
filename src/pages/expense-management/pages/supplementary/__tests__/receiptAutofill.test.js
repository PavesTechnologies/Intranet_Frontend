import { describe, expect, it } from "vitest";
import { formFromSuggestion, notesWithTax, paymentMethodFromReceipt } from "../ReceiptFirstExpense";

// Made-up scan, in the shape GET .../supplementary-receipts/{id}/suggestion returns.
const CATEGORIES = [
  { categoryId: "cat-meals", categoryName: "Meals", categoryCode: "200003" },
  { categoryId: "cat-travel", categoryName: "Travel", categoryCode: "200001" },
];
const SCAN = {
  ocrStatus: "OCR_COMPLETED", amount: 500, currencyCode: "INR", receiptDate: "2026-11-04", merchantName: "Bean & Leaf Cafe",
  categoryId: "cat-meals", categoryName: "Meals", paymentMethod: "UPI", taxAmount: 23.81, supplierGstin: "29ABCDE1234F1Z5",
  invoiceNumber: "INV-778", confidenceScore: 0.92,
};

describe("auto-fill from a scanned receipt", () => {
  it("fills every field the scan read, like a report's receipt scan", () => {
    const form = formFromSuggestion(SCAN, { categories: CATEGORIES, periodStart: "2026-11-02", periodEnd: "2026-11-06" });
    expect(form).toMatchObject({
      categoryId: "cat-meals", expenseDate: "2026-11-04", merchantName: "Bean & Leaf Cafe", amount: "500.00",
      employeePaymentMethod: "UPI", description: "Bean & Leaf Cafe · invoice INV-778",
      taxAmount: "23.81", supplierGstin: "29ABCDE1234F1Z5", invoiceNumber: "INV-778",
    });
  });

  it("matches the category by name when no id is suggested, and leaves a date outside the trip blank", () => {
    const form = formFromSuggestion({ ...SCAN, categoryId: null, categoryName: "travel", receiptDate: "2026-12-01" },
      { categories: CATEGORIES, periodStart: "2026-11-02", periodEnd: "2026-11-06" });
    expect(form.categoryId).toBe("cat-travel");
    expect(form.expenseDate).toBe("");
  });

  it("maps the printed payment method to the claim's options", () => {
    expect(paymentMethodFromReceipt("Paid via GPay")).toBe("UPI");
    expect(paymentMethodFromReceipt("CASH")).toBe("CASH");
    expect(paymentMethodFromReceipt("Credit Card ****1234")).toBe("PERSONAL_CARD");
    expect(paymentMethodFromReceipt("Corporate card")).toBe("COMPANY_CARD");
    expect(paymentMethodFromReceipt("")).toBe("");
  });

  it("keeps the GST details with the expense in its notes", () => {
    expect(notesWithTax({ taxAmount: "23.81", supplierGstin: "29ABCDE1234F1Z5", invoiceNumber: "INV-778", notes: "client lunch" }))
      .toBe("GST on receipt: 23.81 · Supplier GSTIN: 29ABCDE1234F1Z5 · Invoice: INV-778\nclient lunch");
    expect(notesWithTax({ taxAmount: "", supplierGstin: "", invoiceNumber: "", notes: "" })).toBeNull();
  });
});
