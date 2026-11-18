import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({
  receiptService: { getAll: vi.fn(), getViewUrl: vi.fn() },
}));

import { receiptService } from "@/pages/expense-management/api/expenseReportsApi";
import ReceiptViewer from "../ReceiptViewer";

const original = { receiptId: "r-orig", originalFileName: "cab.pdf", contentType: "application/pdf", attachmentKind: "ORIGINAL" };
const late = (overrides = {}) => ({
  receiptId: "r-late",
  originalFileName: "cab-late.pdf",
  contentType: "application/pdf",
  attachmentKind: "LATE",
  verificationStatus: "REJECTED",
  verificationNote: "The receipt is for a different date",
  ...overrides,
});

function renderViewer(receipts) {
  receiptService.getAll.mockResolvedValue({ data: { data: receipts } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReceiptViewer lineItemId="line-1" />
    </QueryClientProvider>,
  );
}

describe("ReceiptViewer: late receipts for the approver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    receiptService.getViewUrl.mockResolvedValue({ data: { data: { url: "https://files.example/x.pdf" } } });
  });

  it("labels a late receipt with Finance's decision and note", async () => {
    renderViewer([late()]);

    const banner = await screen.findByTestId("late-receipt-banner");
    expect(banner).toHaveTextContent("Late receipt · Rejected by Finance");
    expect(banner).toHaveTextContent("Finance note: The receipt is for a different date");
  });

  it("shows no late label on an original receipt, and marks the late one in the switcher", async () => {
    renderViewer([original, late({ verificationStatus: "VERIFIED", verificationNote: null })]);

    expect(await screen.findByRole("button", { name: /PDF 2 · Late/ })).toBeInTheDocument();
    expect(screen.queryByTestId("late-receipt-banner")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /PDF 2 · Late/ }));
    expect(await screen.findByTestId("late-receipt-banner")).toHaveTextContent("Verified by Finance");
  });

  it("shows a late receipt still waiting for Finance as under review", async () => {
    renderViewer([late({ verificationStatus: "PENDING_REVIEW", verificationNote: null })]);

    expect(await screen.findByTestId("late-receipt-banner")).toHaveTextContent("Under Finance review");
  });
});
