import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SupplementaryClaimDetailPage from "@/pages/expense-management/pages/supplementary/SupplementaryClaimDetailPage";
import { supplementaryClaimService, supplementaryReceiptService } from "@/pages/expense-management/api/supplementaryClaimApi";
import { lookupService } from "@/pages/expense-management/api/expenseReportsApi";

vi.mock("@/pages/expense-management/api/supplementaryClaimApi", async (importOriginal) => ({
  ...(await importOriginal()),
  supplementaryClaimService: { get: vi.fn() },
  supplementaryReceiptService: { releasable: vi.fn(), suggestion: vi.fn(), uploadScan: vi.fn(), upload: vi.fn(), attach: vi.fn(), detach: vi.fn(), viewUrl: vi.fn(), downloadUrl: vi.fn() },
}));
vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({
  lookupService: { getActiveCategories: vi.fn() },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

const claim = (status) => ({
  claimId: "claim-1",
  claimNumber: "SUP-1",
  status,
  employeeId: "5100014",
  totalAmount: 588,
  currencyCode: "INR",
  items: [
    {
      claimItemId: "item-1",
      expenseDate: "2026-11-10",
      categoryId: "cat-1",
      merchantName: "Metro Mart",
      amount: 588,
      currencyCode: "INR",
      receipts: [{ receiptId: "r1", originalFileName: "receipt.png" }],
    },
  ],
  history: [],
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/expense-management/expenses/supplementary/claim-1"]}>
      <Routes>
        <Route path="/expense-management/expenses/supplementary/:claimId" element={<SupplementaryClaimDetailPage mode="employee" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("expense row action icons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupService.getActiveCategories.mockResolvedValue([{ categoryId: "cat-1", categoryName: "Meals" }]);
    supplementaryReceiptService.releasable.mockResolvedValue({ data: { data: [] } });
  });

  it("shows Edit and Delete icons on a Draft claim with expenses", async () => {
    supplementaryClaimService.get.mockResolvedValue({ data: { data: claim("DRAFT") } });
    renderPage();
    expect(await screen.findByRole("button", { name: "Edit expense" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete expense" })).toBeInTheDocument();
  });

  it("shows them on a claim that needs clarification", async () => {
    supplementaryClaimService.get.mockResolvedValue({ data: { data: claim("CLARIFICATION_REQUIRED") } });
    renderPage();
    expect(await screen.findByRole("button", { name: "Edit expense" })).toBeInTheDocument();
  });

  it("shows them disabled on a claim waiting for Finance", async () => {
    supplementaryClaimService.get.mockResolvedValue({ data: { data: claim("PENDING_FINANCE") } });
    renderPage();
    expect(await screen.findByText("Metro Mart")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit expense" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete expense" })).toBeDisabled();
  });
});
