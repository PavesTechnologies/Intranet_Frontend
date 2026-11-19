import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Several receipts picked at once: uploaded and scanned one after another, each prepared as its own review form,
// saved in turn, and the caller refreshed once at the end.

const { api, reload, split } = vi.hoisted(() => ({
  api: { post: vi.fn(), get: vi.fn() },
  reload: vi.fn(),
  split: { reset: () => {}, validate: () => true, save: async () => ({ ok: true }) },
}));

vi.mock("@/api/axiosInstance", () => ({ default: api }));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));
vi.mock("@/components/Modal/modal", () => ({ default: ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null) }));
vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({
  lookupService: { getAllocationContext: vi.fn(() => Promise.resolve({})) },
}));
vi.mock("@/pages/expense-management/components/expense-reports/TaxBreakdownPanel", () => ({
  default: () => null,
  emptyTaxValue: {},
  taxRequestFieldsForConfirm: () => ({}),
  taxValueFromOcr: (v) => ({ v }),
  validateTaxValue: () => null,
}));
vi.mock("@/pages/expense-management/components/expense-reports/SplitAllocation", () => ({
  SplitAllocationSection: () => null,
  crossDepartmentCostCenterLabels: () => [],
  useSplitAllocation: () => split,
}));
vi.mock("@/pages/expense-management/components/expense-reports/BillableClientFields", () => ({
  BillableClientFields: () => null,
  projectIdForClient: () => "",
  projectOptionsForClient: () => [],
  useActiveClients: () => ({ clients: [], reload, loading: false }),
}));
vi.mock("@/pages/expense-management/components/expense-reports/expenseDateRange", () => ({
  expenseDateError: () => null,
  expenseDateHint: () => "",
  useExpenseDateRange: () => ({}),
}));
vi.mock("@/pages/expense-management/components/expense-reports/CurrencyConversionCard", () => ({ default: () => null }));

import LineItemEntryFlow from "../LineItemEntryFlow";

const ocr = (merchantName, totalAmount) => ({
  data: {
    data: {
      processingStatus: "OCR_COMPLETED",
      merchantName,
      totalAmount,
      taxAmount: 0,
      receiptDate: "2026-11-10",
      currencyCode: "INR",
      categoryId: "cat-1",
      confidenceScore: 0.99,
    },
  },
});

// "How did you pay?" is required before a scanned line can be saved.
const choosePaymentMethod = () =>
  fireEvent.change(document.getElementById("ocrEmployeePaymentMethod"), { target: { value: "CASH" } });

const renderFlow = (onSaved) =>
  render(
    <LineItemEntryFlow
      isOpen
      onClose={vi.fn()}
      onManual={vi.fn()}
      onSaved={onSaved}
      reportId="rep-1"
      report={{ costCenterId: "cc-1", currencyId: "cur-1" }}
      categories={[{ categoryId: "cat-1", categoryName: "Meals" }]}
      currencies={[{ currencyId: "cur-1", currencyCode: "INR" }]}
      categoryOptions={[{ value: "cat-1", label: "Meals" }]}
      costCenterOptions={[{ value: "cc-1", label: "Engineering" }]}
      currencyOptions={[{ value: "cur-1", label: "INR", code: "INR" }]}
      projects={[]}
    />,
  );

describe("line item entry: several receipts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => "blob:preview");
    global.URL.revokeObjectURL = vi.fn();
    let upload = 0;
    api.post.mockImplementation((url) => {
      if (url.endsWith("/confirm")) return Promise.resolve({ data: { data: { lineItemId: `line-${url}` } } });
      upload += 1;
      return Promise.resolve({ data: { data: { receiptId: `r${upload}` } } });
    });
    api.get.mockImplementation((url) => Promise.resolve(url.includes("/r1/") ? ocr("Cafe One", 100) : ocr("Taxi Two", 250)));
  });

  it("scans the receipts one by one and prepares a line item for each", async () => {
    const onSaved = vi.fn();
    renderFlow(onSaved);

    fireEvent.click(screen.getByText("Automatic (AI Scan)"));
    const input = document.getElementById("ocr-receipt-upload");
    expect(input.multiple).toBe(true);
    fireEvent.change(input, {
      target: { files: [new File(["a"], "cafe.png", { type: "image/png" }), new File(["b"], "taxi.pdf", { type: "application/pdf" })] },
    });

    // only the first receipt is uploaded until its scan finishes
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-batch-progress]")).not.toBeNull();

    // first receipt's own review form
    await waitFor(() => expect(screen.getByDisplayValue("Cafe One")).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByText("Receipt 1 of 2")).toBeInTheDocument();

    choosePaymentMethod();
    fireEvent.click(screen.getByRole("button", { name: /Save & next|Save & Confirm/ }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/xms/employee/receipts/r1/confirm", expect.anything(), expect.anything()));
    expect(onSaved).not.toHaveBeenCalled(); // the page refreshes once, at the end

    // then the second receipt, scanned after the first
    await waitFor(() => expect(screen.getByDisplayValue("Taxi Two")).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByText("Receipt 2 of 2")).toBeInTheDocument();
    const uploads = api.post.mock.calls.filter(([url]) => url.endsWith("/receipts"));
    expect(uploads).toHaveLength(2);

    choosePaymentMethod();
    fireEvent.click(screen.getByRole("button", { name: "Save & Confirm" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith("/xms/employee/receipts/r2/confirm", expect.anything(), expect.anything());
  }, 15000);

  it("a skipped receipt is not added", async () => {
    const onSaved = vi.fn();
    renderFlow(onSaved);
    fireEvent.click(screen.getByText("Automatic (AI Scan)"));
    fireEvent.change(document.getElementById("ocr-receipt-upload"), {
      target: { files: [new File(["a"], "cafe.png", { type: "image/png" }), new File(["b"], "taxi.pdf", { type: "application/pdf" })] },
    });

    await waitFor(() => expect(screen.getByDisplayValue("Cafe One")).toBeInTheDocument(), { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: "Skip this receipt" }));

    await waitFor(() => expect(screen.getByDisplayValue("Taxi Two")).toBeInTheDocument(), { timeout: 5000 });
    choosePaymentMethod();
    fireEvent.click(screen.getByRole("button", { name: "Save & Confirm" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(api.post).not.toHaveBeenCalledWith("/xms/employee/receipts/r1/confirm", expect.anything(), expect.anything());
  }, 15000);
});
