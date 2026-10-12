import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PaymentReadyPage from "./PaymentReadyPage";
import { useReadyForPayment } from "../hooks/usePaymentTracking";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../hooks/usePaymentTracking", () => ({
  useReadyForPayment: vi.fn(),
  usePaymentMetadata: vi.fn(() => ({ data: { paymentModes: [] } })),
  useRecordPaymentMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUploadPaymentDocumentMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));

const row = {
  invoiceId: 7,
  invoiceNumber: "INV-7",
  vendorName: "Acme Ltd",
  invoiceDate: "2026-09-01",
  dueDate: "2026-09-30",
  currencySymbol: "₹",
  invoiceAmount: 177000,
  tdsApplicable: true,
  tdsAmount: 17700,
  netPayable: 159300,
  amountPaid: 0,
  remainingAmount: 159300,
  statusCode: "READY_FOR_PAYMENT",
  statusName: "Ready for Payment",
  isOverdue: true,
};

const listState = (items) => ({
  items,
  total: items.length,
  page: 1,
  setPage: vi.fn(),
  totalPages: 1,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
});

const renderPage = () => render(<PaymentReadyPage />, { wrapper: MemoryRouter });

beforeEach(() => vi.clearAllMocks());

describe("PaymentReadyPage", () => {
  it("lists ready invoices with the backend's TDS / net payable / remaining figures", () => {
    useApPermissions.mockReturnValue({ canRecordPayment: true });
    useReadyForPayment.mockReturnValue(listState([row]));
    renderPage();
    expect(screen.getByText("INV-7")).toBeInTheDocument();
    expect(screen.getByText("₹17,700.00")).toBeInTheDocument();
    expect(screen.getAllByText("₹1,59,300.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("(overdue)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /record payment/i })).toBeInTheDocument();
  });

  it("hides Record Payment without PAYMENT_PROCESS", () => {
    useApPermissions.mockReturnValue({ canRecordPayment: false });
    useReadyForPayment.mockReturnValue(listState([row]));
    renderPage();
    expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toBeInTheDocument();
  });

  it("shows the empty state", () => {
    useApPermissions.mockReturnValue({ canRecordPayment: true });
    useReadyForPayment.mockReturnValue(listState([]));
    renderPage();
    expect(screen.getByText("No invoices are currently ready for payment.")).toBeInTheDocument();
  });

  it("shows a friendly error instead of the raw API error", () => {
    useApPermissions.mockReturnValue({ canRecordPayment: true });
    useReadyForPayment.mockReturnValue({ ...listState([]), isError: true, error: { response: { status: 403 } } });
    renderPage();
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
  });
});
