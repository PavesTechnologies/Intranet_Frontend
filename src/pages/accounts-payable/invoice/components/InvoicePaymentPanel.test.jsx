import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InvoicePaymentPanel from "./InvoicePaymentPanel";
import { useMarkReadyForPaymentMutation } from "../../payment/hooks/usePaymentMutations";
import { useInvoiceTds } from "../hooks/useInvoiceTds";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../../payment/hooks/usePaymentMutations", () => ({
  useMarkReadyForPaymentMutation: vi.fn(),
}));

vi.mock("../hooks/useInvoiceTds", () => ({
  useInvoiceTds: vi.fn(),
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
  // Default to already-verified so the pre-existing tests below (written before TDS gating
  // existed) keep exercising Mark Ready for Payment as before — the TDS-specific describe block
  // overrides this per case.
  useInvoiceTds.mockReturnValue({ data: { determination_status: "VERIFIED" }, isLoading: false, error: null });
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

describe("InvoicePaymentPanel — TDS gate (Phase 1 frontend-only sequencing)", () => {
  it("hides Mark Ready for Payment when Approved but TDS is only DETERMINED, not VERIFIED", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: true });
    useInvoiceTds.mockReturnValue({ data: { determination_status: "DETERMINED" }, isLoading: false, error: null });
    renderPanel({ ...baseInvoice, status: "Approved" });
    expect(screen.queryByRole("button", { name: /mark ready for payment/i })).not.toBeInTheDocument();
    expect(screen.getByText(/TDS must be verified/i)).toBeInTheDocument();
  });

  it("hides Mark Ready for Payment when Approved and TDS hasn't been determined at all (404)", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: true });
    useInvoiceTds.mockReturnValue({ data: undefined, isLoading: false, error: { status: 404 } });
    renderPanel({ ...baseInvoice, status: "Approved" });
    expect(screen.queryByRole("button", { name: /mark ready for payment/i })).not.toBeInTheDocument();
  });

  it("offers Mark Ready for Payment once TDS is VERIFIED", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: true });
    useInvoiceTds.mockReturnValue({ data: { determination_status: "VERIFIED" }, isLoading: false, error: null });
    renderPanel({ ...baseInvoice, status: "Approved" });
    expect(screen.getByRole("button", { name: /mark ready for payment/i })).toBeInTheDocument();
  });

  it("shows Net Vendor Payable straight from invoice.payableAmount (backend-enforced, not re-derived)", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: false });
    useInvoiceTds.mockReturnValue({
      data: { determination_status: "VERIFIED", tds_amount: 100 },
      isLoading: false,
      error: null,
    });
    renderPanel({ ...baseInvoice, status: "Approved", netAmount: 1000, amountPaid: 0, payableAmount: 900 });
    expect(screen.getByText("Net Vendor Payable")).toBeInTheDocument();
    expect(screen.getByText("₹900.00")).toBeInTheDocument();
  });

  it("does not show Net Vendor Payable before TDS has been determined (payableAmount is null)", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: false });
    useInvoiceTds.mockReturnValue({ data: undefined, isLoading: false, error: { status: 404 } });
    renderPanel({ ...baseInvoice, status: "Approved", payableAmount: null });
    expect(screen.queryByText("Net Vendor Payable")).not.toBeInTheDocument();
  });
});

describe("InvoicePaymentPanel — TDS Deducted summary", () => {
  const determinedTds = {
    determination_status: "DETERMINED",
    tds_applicable: true,
    tds_amount: 17700,
    tds_rate: 10,
    tds_rule: {
      rule_name: "TDS - Professional or Technical Services",
      legal_reference: "Section 194J, Income-tax Act (FY2026-27)",
    },
    determination_reason: "TDS - Professional or Technical Services applies.",
  };

  it("shows the amount and one-line basis, without needing to scroll to the TDS panel", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: false });
    useInvoiceTds.mockReturnValue({ data: determinedTds, isLoading: false, error: null });
    renderPanel({ ...baseInvoice, status: "Approved" });
    expect(screen.getByText("TDS Deducted")).toBeInTheDocument();
    expect(
      screen.getByText(
        "₹17,700.00 — 10% under TDS - Professional or Technical Services (Section 194J, Income-tax Act (FY2026-27))",
      ),
    ).toBeInTheDocument();
  });

  it("reveals the full determination reason on demand, without navigating away", async () => {
    useApPermissions.mockReturnValue({ canMarkPaid: false });
    useInvoiceTds.mockReturnValue({ data: determinedTds, isLoading: false, error: null });
    const user = userEvent.setup();
    renderPanel({ ...baseInvoice, status: "Approved" });

    expect(screen.queryByText(determinedTds.determination_reason)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /why this determination/i }));
    expect(screen.getByText(determinedTds.determination_reason)).toBeInTheDocument();
  });

  it("shows 'Not yet verified' before verification, and Verified by/on after", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: false });
    useInvoiceTds.mockReturnValue({ data: determinedTds, isLoading: false, error: null });
    const { rerender } = renderPanel({ ...baseInvoice, status: "Approved" });
    expect(screen.getByText("Not yet verified")).toBeInTheDocument();

    useInvoiceTds.mockReturnValue({
      data: { ...determinedTds, determination_status: "VERIFIED", verified_by: "Finance Executive", verified_at: "2026-01-02T00:00:00Z" },
      isLoading: false,
      error: null,
    });
    rerender(<InvoicePaymentPanel invoice={{ ...baseInvoice, status: "Approved" }} />);
    expect(screen.getByText(/Verified by Finance Executive on/)).toBeInTheDocument();
  });

  it("shows 'No TDS deducted' plainly when tds_applicable is false, rather than hiding the section", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: false });
    useInvoiceTds.mockReturnValue({
      data: { determination_status: "VERIFIED", tds_applicable: false },
      isLoading: false,
      error: null,
    });
    renderPanel({ ...baseInvoice, status: "Approved" });
    expect(screen.getByText("TDS Deducted")).toBeInTheDocument();
    expect(screen.getByText("No TDS deducted")).toBeInTheDocument();
  });
});
