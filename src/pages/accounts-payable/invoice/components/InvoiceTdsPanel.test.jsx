import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoiceTdsPanel from "./InvoiceTdsPanel";
import {
  useInvoiceTds,
  useDetermineTdsMutation,
  useUpdateTdsMutation,
  useVerifyTdsMutation,
} from "../hooks/useInvoiceTds";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../hooks/useInvoiceTds", () => ({
  useInvoiceTds: vi.fn(),
  useDetermineTdsMutation: vi.fn(),
  useUpdateTdsMutation: vi.fn(),
  useVerifyTdsMutation: vi.fn(),
}));

vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: vi.fn(),
}));

const idleMutation = { mutate: vi.fn(), isPending: false };

/** Picks an option out of a headlessui Listbox rendered by FormSelect — same helper as
 * VendorOnboardingPage.test.jsx uses for the same component. */
const selectOption = async (user, labelText, optionText) => {
  const label = screen.getByText(labelText);
  const trigger = label.parentElement.querySelector("button");
  await user.click(trigger);
  await user.click(await screen.findByText(optionText));
};

const invoice = {
  id: 42,
  invoiceNumber: "INV-0042",
  status: "OCR Reviewed",
  currency: { symbol: "₹" },
};

function setPermissions(overrides = {}) {
  useApPermissions.mockReturnValue({
    canViewTds: true,
    canDetermineTds: true,
    canEditTds: true,
    canVerifyTds: true,
    ...overrides,
  });
}

const determinedTds = {
  invoice_id: 42,
  tds_applicable: true,
  payment_nature: { id: 1, code: "PROFESSIONAL_SERVICE", name: "Professional Services" },
  tds_rule: {
    tax_rule_id: 1,
    rule_code: "TDS_194J",
    rule_name: "TDS - Professional or Technical Services",
    legal_reference: "Section 194J, Income-tax Act (FY2026-27)",
  },
  taxable_base: 100000,
  tds_rate: 10,
  tds_amount: 10000,
  threshold_amount: 30000,
  prior_period_aggregate: 3605.75,
  current_transaction_amount: 100000,
  aggregate_amount: 103605.75,
  pan_status: "VALID",
  entity_type: null,
  determination_status: "DETERMINED",
  determination_reason: "TDS - Professional or Technical Services applies.",
  determined_at: "2026-01-01T00:00:00Z",
  determined_by: "AP Executive",
  verified_at: null,
  verified_by: null,
  remarks: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  useDetermineTdsMutation.mockReturnValue({ ...idleMutation });
  useUpdateTdsMutation.mockReturnValue({ ...idleMutation });
  useVerifyTdsMutation.mockReturnValue({ ...idleMutation });
  setPermissions();
});

describe("InvoiceTdsPanel — visibility", () => {
  it("renders nothing when the user has no TDS view access at all", () => {
    setPermissions({ canViewTds: false });
    useInvoiceTds.mockReturnValue({ data: undefined, isLoading: false, error: { status: 404 } });
    const { container } = render(<InvoiceTdsPanel invoice={invoice} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a loading state while the determination is being fetched", () => {
    useInvoiceTds.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<InvoiceTdsPanel invoice={invoice} />);
    expect(screen.getByText("Loading TDS status...")).toBeInTheDocument();
  });

  it("surfaces the backend's error message on a real API failure (not a 404)", () => {
    useInvoiceTds.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 500, response: { data: { detail: "Database unavailable" } } },
    });
    render(<InvoiceTdsPanel invoice={invoice} />);
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });
});

describe("InvoiceTdsPanel — Determine", () => {
  it("shows 'not yet determined' with a Determine TDS button once OCR Reviewed, for a permitted user", () => {
    useInvoiceTds.mockReturnValue({ data: undefined, isLoading: false, error: { status: 404 } });
    render(<InvoiceTdsPanel invoice={{ ...invoice, status: "OCR Reviewed" }} />);
    expect(screen.getByText(/TDS not yet determined/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /determine tds/i })).toBeInTheDocument();
  });

  it("hides Determine TDS for a user without canDetermineTds", () => {
    setPermissions({ canDetermineTds: false });
    useInvoiceTds.mockReturnValue({ data: undefined, isLoading: false, error: { status: 404 } });
    render(<InvoiceTdsPanel invoice={{ ...invoice, status: "OCR Reviewed" }} />);
    expect(screen.queryByRole("button", { name: /determine tds/i })).not.toBeInTheDocument();
  });

  it("hides Determine TDS while still at OCR Review Pending (too early — no confirmed vendor/amounts yet)", () => {
    useInvoiceTds.mockReturnValue({ data: undefined, isLoading: false, error: { status: 404 } });
    render(<InvoiceTdsPanel invoice={{ ...invoice, status: "OCR Review Pending" }} />);
    expect(screen.queryByRole("button", { name: /determine tds/i })).not.toBeInTheDocument();
  });

  it("calls the determine mutation with the invoice id, with no payment nature override", async () => {
    useInvoiceTds.mockReturnValue({ data: undefined, isLoading: false, error: { status: 404 } });
    const mutate = vi.fn();
    useDetermineTdsMutation.mockReturnValue({ mutate, isPending: false });
    const user = userEvent.setup();
    render(<InvoiceTdsPanel invoice={{ ...invoice, status: "OCR Reviewed" }} />);

    await user.click(screen.getByRole("button", { name: /determine tds/i }));
    expect(mutate).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});

describe("InvoiceTdsPanel — DETERMINED: read-only fields and correction", () => {
  it("shows the calculated fields read-only, with Payment Nature resolved by name", () => {
    useInvoiceTds.mockReturnValue({ data: determinedTds, isLoading: false, error: null });
    render(<InvoiceTdsPanel invoice={invoice} />);
    expect(screen.getByText("Professional Services")).toBeInTheDocument();
    expect(screen.getByText("TDS - Professional or Technical Services")).toBeInTheDocument();
    expect(screen.getByText("Section 194J, Income-tax Act (FY2026-27)")).toBeInTheDocument();
    expect(screen.getByText("₹1,00,000.00")).toBeInTheDocument(); // taxable base
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByText("₹10,000.00")).toBeInTheDocument(); // tds amount
    expect(screen.getByText("VALID")).toBeInTheDocument();
  });

  it("offers Correct Payment Nature for a user with canEditTds, and saves via the update mutation", async () => {
    useInvoiceTds.mockReturnValue({ data: determinedTds, isLoading: false, error: null });
    const mutate = vi.fn();
    useUpdateTdsMutation.mockReturnValue({ mutate, isPending: false });
    const user = userEvent.setup();
    render(<InvoiceTdsPanel invoice={invoice} />);

    await user.click(screen.getByRole("button", { name: /correct payment nature/i }));
    await selectOption(user, "Payment Nature", "Rent");
    await user.click(screen.getByRole("button", { name: /save correction/i }));

    expect(mutate).toHaveBeenCalledWith(
      { invoiceId: 42, paymentNatureCode: "RENT" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("hides Correct Payment Nature for a user without canEditTds (e.g. Finance)", () => {
    setPermissions({ canEditTds: false });
    useInvoiceTds.mockReturnValue({ data: determinedTds, isLoading: false, error: null });
    render(<InvoiceTdsPanel invoice={invoice} />);
    expect(screen.queryByRole("button", { name: /correct payment nature/i })).not.toBeInTheDocument();
  });
});

describe("InvoiceTdsPanel — Verify (Finance)", () => {
  it("offers Verify TDS for a user with canVerifyTds once DETERMINED", () => {
    useInvoiceTds.mockReturnValue({ data: determinedTds, isLoading: false, error: null });
    render(<InvoiceTdsPanel invoice={invoice} />);
    expect(screen.getByRole("button", { name: /verify tds/i })).toBeInTheDocument();
  });

  it("hides Verify TDS for a user without canVerifyTds (e.g. AP Executive)", () => {
    setPermissions({ canVerifyTds: false });
    useInvoiceTds.mockReturnValue({ data: determinedTds, isLoading: false, error: null });
    render(<InvoiceTdsPanel invoice={invoice} />);
    expect(screen.queryByRole("button", { name: /verify tds/i })).not.toBeInTheDocument();
  });

  it("confirms before calling the verify mutation, with optional remarks", async () => {
    useInvoiceTds.mockReturnValue({ data: determinedTds, isLoading: false, error: null });
    const mutate = vi.fn();
    useVerifyTdsMutation.mockReturnValue({ mutate, isPending: false });
    const user = userEvent.setup();
    render(<InvoiceTdsPanel invoice={invoice} />);

    await user.click(screen.getByRole("button", { name: /verify tds/i }));
    await user.type(screen.getByLabelText(/remarks/i), "Confirmed against Finance review");
    await user.click(screen.getByRole("button", { name: /confirm verification/i }));

    expect(mutate).toHaveBeenCalledWith(
      { invoiceId: 42, remarks: "Confirmed against Finance review" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});

describe("InvoiceTdsPanel — VERIFIED (locked)", () => {
  const verifiedTds = {
    ...determinedTds,
    determination_status: "VERIFIED",
    verified_at: "2026-01-02T00:00:00Z",
    verified_by: "Finance Executive",
  };

  it("hides Determine/Correct/Verify actions and shows the verified banner", () => {
    useInvoiceTds.mockReturnValue({ data: verifiedTds, isLoading: false, error: null });
    render(<InvoiceTdsPanel invoice={invoice} />);
    expect(screen.queryByRole("button", { name: /determine tds/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /correct payment nature/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /verify tds/i })).not.toBeInTheDocument();
    expect(screen.getByText(/TDS Verified/)).toBeInTheDocument();
    expect(screen.getByText(/Finance Executive/)).toBeInTheDocument();
  });
});
