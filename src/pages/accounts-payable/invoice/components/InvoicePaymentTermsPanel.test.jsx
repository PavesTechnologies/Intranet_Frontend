import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoicePaymentTermsPanel from "./InvoicePaymentTermsPanel";
import {
  useInvoicePaymentTerms,
  useRecheckPaymentTermsMutation,
  useVerifyPaymentTermsMutation,
} from "../hooks/useInvoicePaymentTerms";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../hooks/useInvoicePaymentTerms", () => ({
  useInvoicePaymentTerms: vi.fn(),
  useRecheckPaymentTermsMutation: vi.fn(),
  useVerifyPaymentTermsMutation: vi.fn(),
}));
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));

const invoice = { id: 7, invoiceNumber: "TST-OMS-1415", status: "Approved", invoiceType: "PO" };

const mismatch = {
  invoice_id: 7,
  evaluated: true,
  validation_status: "MISMATCH",
  reason_code: "INVOICE_VS_PO",
  reason_text: "The invoice payment terms differ from the purchase order; the PO terms apply.",
  reference_source: "PO",
  invoice_terms_text: "Net 30",
  invoice_term_days: 30,
  po_terms_text: "Net 45",
  po_term_days: 45,
  vendor_master_term_days: 30,
  applied_term_days: 45,
  due_basis: "INVOICE_DATE",
  basis_date: "2026-08-20",
  contractual_due_date: "2026-10-04",
  statutory_due_date: null,
  effective_due_date: "2026-10-04",
  days_to_due: -5,
  is_overdue: true,
  is_exception: true,
  blocks_ready_for_payment: true,
};

let verifyMutation;

function setup({ terms = mismatch, permissions = {} } = {}) {
  useApPermissions.mockReturnValue({
    canViewPaymentTerms: true,
    canVerifyPaymentTerms: true,
    canRecheckPaymentTerms: true,
    ...permissions,
  });
  useInvoicePaymentTerms.mockReturnValue({ data: terms, isLoading: false, error: null });
  useRecheckPaymentTermsMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  verifyMutation = { mutate: vi.fn(), isPending: false };
  useVerifyPaymentTermsMutation.mockReturnValue(verifyMutation);
  return render(<InvoicePaymentTermsPanel invoice={invoice} />);
}

describe("InvoicePaymentTermsPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the mismatch, every source side by side, and the overdue effective date", () => {
    setup();
    expect(screen.getByText("Term mismatch")).toBeInTheDocument();
    expect(screen.getByText(/differ from the purchase order/)).toBeInTheDocument();
    expect(screen.getByText(/must be verified before this invoice can be marked ready/)).toBeInTheDocument();
    expect(screen.getByText("Net 30")).toBeInTheDocument();
    expect(screen.getAllByText("45 days").length).toBeGreaterThan(0);
    expect(screen.getByText("5 days overdue")).toBeInTheDocument();
  });

  it("verifies with the chosen days and mandatory remarks", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /verify terms/i }));
    const verifyButton = screen.getByRole("button", { name: /^verify$/i });
    expect(verifyButton).toBeDisabled(); // remarks still empty

    await user.type(screen.getByLabelText(/remarks/i), "Confirmed PO terms with vendor");
    await user.click(verifyButton);
    expect(verifyMutation.mutate).toHaveBeenCalledWith(
      { invoiceId: 7, appliedTermDays: 45, dueBasis: "INVOICE_DATE", remarks: "Confirmed PO terms with vendor" },
      expect.any(Object),
    );
  });

  it("hides the verify action without INVOICE_PAYMENT_TERM_VERIFY", () => {
    setup({ permissions: { canVerifyPaymentTerms: false } });
    expect(screen.queryByRole("button", { name: /verify terms/i })).not.toBeInTheDocument();
  });

  it("explains a not-yet-checked legacy invoice", () => {
    setup({ terms: { invoice_id: 7, evaluated: false } });
    expect(screen.getByText(/have not been checked for this invoice yet/)).toBeInTheDocument();
  });

  it("renders nothing without a view permission", () => {
    const { container } = setup({ permissions: { canViewPaymentTerms: false } });
    expect(container).toBeEmptyDOMElement();
  });
});
