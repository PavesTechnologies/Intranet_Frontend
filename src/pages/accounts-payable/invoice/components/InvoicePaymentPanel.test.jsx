import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InvoicePaymentPanel from "./InvoicePaymentPanel";
import { useMarkReadyForPaymentMutation } from "../../payment/hooks/usePaymentMutations";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../../payment/hooks/usePaymentMutations", () => ({
  useMarkReadyForPaymentMutation: vi.fn(),
}));

vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: vi.fn(),
}));

const renderPanel = (invoice) => render(<InvoicePaymentPanel invoice={invoice} />, { wrapper: MemoryRouter });

const baseInvoice = {
  id: 7,
  invoiceNumber: "INV-0007",
  netAmount: 1000,
  amountPaid: 0,
  currency: { symbol: "₹" },
};

beforeEach(() => {
  vi.clearAllMocks();
  useMarkReadyForPaymentMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
});

describe("InvoicePaymentPanel", () => {
  it("offers Mark Ready for Payment only when Approved and permitted", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: true });
    renderPanel({ ...baseInvoice, status: "Approved" });
    expect(screen.getByRole("button", { name: /mark ready for payment/i })).toBeInTheDocument();
  });

  it("hides Mark Ready for Payment without canMarkPaid, even when Approved", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: false });
    renderPanel({ ...baseInvoice, status: "Approved" });
    expect(screen.queryByRole("button", { name: /mark ready for payment/i })).not.toBeInTheDocument();
  });

  it("does not offer Mark Ready for Payment for a status other than Approved", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: true });
    renderPanel({ ...baseInvoice, status: "Pending Approval" });
    expect(screen.queryByRole("button", { name: /mark ready for payment/i })).not.toBeInTheDocument();
  });

  it("confirms before calling the mutation, with the invoice id", async () => {
    useApPermissions.mockReturnValue({ canMarkPaid: true });
    const mutate = vi.fn();
    useMarkReadyForPaymentMutation.mockReturnValue({ mutate, isPending: false });
    const user = userEvent.setup();
    renderPanel({ ...baseInvoice, status: "Approved" });

    await user.click(screen.getByRole("button", { name: /mark ready for payment/i }));
    expect(mutate).not.toHaveBeenCalled(); // not yet — confirmation dialog first

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(mutate).toHaveBeenCalledWith(7, expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }));
  });

  it("offers Pay for Ready for Payment / Partially Paid with an outstanding balance, gated by canMarkPaid", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: true });
    renderPanel({ ...baseInvoice, status: "Ready for Payment", netAmount: 1000, amountPaid: 400 });
    expect(screen.getByRole("link", { name: /pay invoice/i })).toBeInTheDocument();
  });

  it("does not offer Pay once the balance is fully settled", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: true });
    renderPanel({ ...baseInvoice, status: "Ready for Payment", netAmount: 1000, amountPaid: 1000 });
    expect(screen.queryByRole("link", { name: /pay invoice/i })).not.toBeInTheDocument();
  });

  it("shows the net/paid/balance summary from real invoice figures", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: false });
    renderPanel({ ...baseInvoice, status: "Partially Paid", netAmount: 1000, amountPaid: 400 });
    expect(screen.getByText("₹1,000.00")).toBeInTheDocument();
    expect(screen.getByText("₹400.00")).toBeInTheDocument();
    expect(screen.getByText("₹600.00")).toBeInTheDocument();
  });
});
