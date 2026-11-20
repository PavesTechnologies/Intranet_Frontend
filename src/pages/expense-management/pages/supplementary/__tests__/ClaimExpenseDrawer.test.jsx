import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ClaimExpenseDrawer from "@/pages/expense-management/pages/supplementary/ClaimExpenseDrawer";
import { supplementaryClaimService, supplementaryReceiptService } from "@/pages/expense-management/api/supplementaryClaimApi";

vi.mock("@/pages/expense-management/api/supplementaryClaimApi", async (importOriginal) => ({
  ...(await importOriginal()),
  supplementaryClaimService: { updateItem: vi.fn() },
  supplementaryReceiptService: { viewUrl: vi.fn(), downloadUrl: vi.fn(), upload: vi.fn(), detach: vi.fn() },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

const item = {
  claimItemId: "item-1",
  expenseDate: "2026-11-10",
  categoryId: "cat-1",
  merchantName: "Metro Mart",
  description: "Groceries",
  amount: 588,
  employeePaymentMethod: "UPI",
  notes: "kept note",
  receipts: [{ receiptId: "r1", originalFileName: "receipt_03_10Nov.png" }],
};

const categories = [{ categoryId: "cat-1", categoryName: "Meals" }];

function renderDrawer(props = {}) {
  const onChanged = vi.fn();
  const onClose = vi.fn();
  render(
    <ClaimExpenseDrawer
      claimId="claim-1"
      claimNumber="SUP-1"
      item={item}
      editable
      categories={categories}
      periodStart="2026-11-10"
      periodEnd="2026-11-13"
      onChanged={onChanged}
      onClose={onClose}
      {...props}
    />,
  );
  return { onChanged, onClose };
}

describe("ClaimExpenseDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supplementaryReceiptService.viewUrl.mockResolvedValue({ data: { data: { url: "https://files.test/r1.png" } } });
  });

  it("shows the expense in the line item drawer layout, with the receipt previewed on the left", async () => {
    renderDrawer();

    expect(screen.getByRole("heading", { name: "Edit Line Item" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Metro Mart")).toBeInTheDocument();
    expect(screen.getByDisplayValue("588")).toBeInTheDocument();
    expect(supplementaryReceiptService.viewUrl).toHaveBeenCalledWith("r1");
    expect(await screen.findByRole("img", { name: "receipt_03_10Nov.png" })).toHaveAttribute("src", "https://files.test/r1.png");
  });

  it("saves the edit and sends back the notes it does not change", async () => {
    supplementaryClaimService.updateItem.mockResolvedValue({ data: { data: { claimId: "claim-1" } } });
    const { onChanged, onClose } = renderDrawer();

    fireEvent.change(screen.getByDisplayValue("588"), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(supplementaryClaimService.updateItem).toHaveBeenCalledWith(
      "claim-1",
      "item-1",
      expect.objectContaining({ amount: 600, notes: "kept note", merchantName: "Metro Mart", categoryId: "cat-1" }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("refuses to save without a category and sends nothing", () => {
    renderDrawer({ item: { ...item, categoryId: "" } });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Choose a category.");
    expect(supplementaryClaimService.updateItem).not.toHaveBeenCalled();
  });

  it("cancel closes the drawer and saves nothing", () => {
    const { onClose, onChanged } = renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
    expect(supplementaryClaimService.updateItem).not.toHaveBeenCalled();
  });

  it("asks for confirmation before removing a receipt, then removes it", async () => {
    supplementaryReceiptService.detach.mockResolvedValue({ data: { data: { claimId: "claim-1" } } });
    const { onChanged } = renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Remove receipt_03_10Nov.png" }));
    expect(supplementaryReceiptService.detach).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Remove Receipt" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(supplementaryReceiptService.detach).toHaveBeenCalledWith("claim-1", "item-1", "r1");
  });

  it("hides upload and receipt removal once the claim can no longer be changed", () => {
    renderDrawer({ editable: false });

    expect(screen.queryByLabelText("Choose receipt file")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove receipt_03_10Nov.png" })).not.toBeInTheDocument();
    // Viewing and downloading stay available.
    expect(screen.getByRole("button", { name: "Download receipt_03_10Nov.png" })).toBeInTheDocument();
  });
});
