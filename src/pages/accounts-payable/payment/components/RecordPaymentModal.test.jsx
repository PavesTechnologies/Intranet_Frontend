import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RecordPaymentModal, { validateRecordPayment } from "./RecordPaymentModal";
import {
  usePaymentMetadata,
  useRecordPaymentMutation,
  useUploadPaymentDocumentMutation,
} from "../hooks/usePaymentTracking";

vi.mock("../hooks/usePaymentTracking", () => ({
  usePaymentMetadata: vi.fn(),
  useRecordPaymentMutation: vi.fn(),
  useUploadPaymentDocumentMutation: vi.fn(),
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
