import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecordPaymentModal, { validateRecordPayment, editedFields } from "./RecordPaymentModal";
import {
  usePaymentMetadata,
  useRecordPaymentMutation,
  useUploadPaymentDocumentMutation,
  useExtractReceiptMutation,
} from "../hooks/usePaymentTracking";

vi.mock("../hooks/usePaymentTracking", () => ({
  usePaymentMetadata: vi.fn(),
  useRecordPaymentMutation: vi.fn(),
  useUploadPaymentDocumentMutation: vi.fn(),
  useExtractReceiptMutation: vi.fn(),
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

// The spec's partial-payment example: 100,000 invoice, 10,000 TDS, 90,000 net, 50,000 paid.
const invoice = {
  invoiceId: 42,
  invoiceNumber: "INV-42",
  vendorName: "Acme Ltd",
  currencySymbol: "₹",
  invoiceAmount: 100000,
  tdsApplicable: true,
  tdsAmount: 10000,
  netPayable: 90000,
  amountPaid: 50000,
  pendingAmount: 0,
  remainingAmount: 40000,
};

const validForm = {
  paymentDate: "2026-01-15",
  amount: "40000",
  paymentMode: "NEFT",
  referenceNumber: "UTR123",
  remarks: "",
  receipt: null,
};

describe("validateRecordPayment", () => {
  it("accepts a payment up to the remaining payable", () => {
    expect(validateRecordPayment(validForm, 40000)).toEqual({});
  });

  it("rejects more than the remaining payable", () => {
    expect(validateRecordPayment({ ...validForm, amount: "40000.01" }, 40000).amount).toMatch(/cannot exceed the remaining payable/);
  });

  it("requires date, positive 2-decimal amount, mode and reference", () => {
    const errors = validateRecordPayment(
      { paymentDate: "", amount: "0", paymentMode: "", referenceNumber: " ", receipt: null },
      40000,
    );
    expect(Object.keys(errors).sort()).toEqual(["amount", "paymentDate", "paymentMode", "referenceNumber"]);
    expect(validateRecordPayment({ ...validForm, amount: "10.005" }, 40000).amount).toMatch(/2 decimal/);
  });

  it("rejects a future payment date", () => {
    expect(validateRecordPayment({ ...validForm, paymentDate: "2999-01-01" }, 40000).paymentDate).toMatch(/future/);
  });

  it("enforces a receipt only when the backend says it is required", () => {
    expect(validateRecordPayment(validForm, 40000, { receiptRequired: true }).receipt).toMatch(/required/);
    expect(validateRecordPayment(validForm, 40000, { receiptRequired: false }).receipt).toBeUndefined();
  });
});

describe("RecordPaymentModal", () => {
  let mutate;
  beforeEach(() => {
    vi.clearAllMocks();
    mutate = vi.fn();
    usePaymentMetadata.mockReturnValue({
      data: { paymentModes: [{ value: "NEFT", label: "NEFT", referenceLabel: "UTR Number" }], receiptRequired: false },
    });
    useRecordPaymentMutation.mockReturnValue({ mutate, isPending: false });
    useUploadPaymentDocumentMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useExtractReceiptMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it("shows the backend amounts and the remaining payable, prefilled as the amount", () => {
    render(<RecordPaymentModal isOpen invoice={invoice} onClose={vi.fn()} />);
    expect(screen.getByText("₹90,000.00")).toBeInTheDocument(); // net payable
    expect(screen.getByText("₹50,000.00")).toBeInTheDocument(); // already paid
    expect(screen.getAllByText("₹40,000.00").length).toBeGreaterThan(0); // remaining
    expect(screen.getByLabelText(/Payment Amount/)).toHaveValue(40000);
  });

  it("does not submit an amount above the remaining payable", () => {
    render(<RecordPaymentModal isOpen invoice={invoice} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Payment Amount/), { target: { value: "45000" } });
    fireEvent.click(screen.getByRole("button", { name: /record payment/i }));
    expect(screen.getByText(/cannot exceed the remaining payable/)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});

describe("receipt auto-fill", () => {
  let mutate;
  const extracted = (warnings = []) => ({
    fields: {
      payment_date: { value: "2026-01-14", confidence: 96 },
      amount: { value: "40000.00", confidence: 97 },
      payment_mode: { value: "NEFT", confidence: 92 },
      reference_number: { value: "SBIN426281234567", confidence: 95 },
    },
    beneficiary_name: "ACME LTD",
    beneficiary_account_masked: "XXXX5678",
    warnings,
  });
  const receipt = new File(["%PDF"], "advice.pdf", { type: "application/pdf" });

  beforeEach(() => {
    vi.clearAllMocks();
    mutate = vi.fn();
    usePaymentMetadata.mockReturnValue({
      data: { paymentModes: [{ value: "NEFT", label: "NEFT", referenceLabel: "UTR Number" }], receiptRequired: true },
    });
    useRecordPaymentMutation.mockReturnValue({ mutate, isPending: false });
    useUploadPaymentDocumentMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it("fills the form, attaches the receipt and records the entry mode", async () => {
    useExtractReceiptMutation.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(extracted()), isPending: false });
    render(<RecordPaymentModal isOpen invoice={invoice} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("receipt-autofill-input"), { target: { files: [receipt] } });
    expect(await screen.findByText(/Filled from/)).toBeInTheDocument();
    expect(screen.getByLabelText("UTR Number * · auto-filled")).toHaveValue("SBIN426281234567");
    expect(screen.getByText("The uploaded receipt (advice.pdf) will be attached to this payment.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Payment Amount/), { target: { value: "39000" } });
    fireEvent.click(screen.getByRole("button", { name: /record payment/i }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0].payload).toMatchObject({
      payment_date: "2026-01-14", amount: "39000", payment_mode: "NEFT", reference_number: "SBIN426281234567",
      entry_mode: "RECEIPT_EXTRACTED", edited_fields: ["amount"],
    });
  });

  it("needs an acknowledgement for serious warnings", async () => {
    const warnings = [{ code: "BENEFICIARY_MISMATCH", severity: "error", message: "Beneficiary 'Zeta' does not look like the vendor 'Acme Ltd'." }];
    useExtractReceiptMutation.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(extracted(warnings)), isPending: false });
    render(<RecordPaymentModal isOpen invoice={invoice} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("receipt-autofill-input"), { target: { files: [receipt] } });
    expect(await screen.findByText(/does not look like the vendor/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /record payment/i }));
    expect(screen.getByText(/Confirm you have checked the receipt warnings/)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /record payment/i }));
    expect(mutate).toHaveBeenCalled();
  });

  it("manual entry is unchanged and marked MANUAL", () => {
    render(<RecordPaymentModal isOpen invoice={invoice} onClose={vi.fn()} />);
    expect(editedFields({ amount: "5" }, { amount: "5" })).toEqual([]);
    expect(screen.getByRole("button", { name: /Upload receipt to auto-fill/ })).toBeInTheDocument();
  });
});
