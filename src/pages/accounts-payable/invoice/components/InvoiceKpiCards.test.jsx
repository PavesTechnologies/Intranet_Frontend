import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoiceKpiCards from "./InvoiceKpiCards";
import { useInvoiceSummary } from "../hooks/useInvoiceSummary";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../hooks/useInvoiceSummary", () => ({ useInvoiceSummary: vi.fn() }));
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));

const DATA = {
  totalInvoicesThisMonth: 4, pendingApprovalCount: 2, readyForPaymentCount: 1, readyForPaymentBalance: 5000,
  paidThisMonthCount: 3, paidThisMonthAmount: 12000,
  statusCounts: { total: 52, toReview: 7, returned: 1, readyToSend: 2, pendingApproval: 5, approved: 6, approvedOrLater: 40, rejected: 1 },
};
const AP_EXEC = { canUploadInvoice: true, canReviewOcr: true, canSendForApproval: true };
const FINANCE = { canMarkPaid: true, canVerifyTds: true, canViewPayment: true };

beforeEach(() => {
  vi.clearAllMocks();
  useInvoiceSummary.mockReturnValue({ isLoading: false, isError: false, data: DATA });
});

describe("InvoiceKpiCards", () => {
  it("AP Executive: the counts they act on, in business words", () => {
    useApPermissions.mockReturnValue(AP_EXEC);
    render(<InvoiceKpiCards />);
    ["All invoices", "To review", "Sent back for correction", "Ready to send", "Waiting for approval", "Approved"].forEach((t) =>
      expect(screen.getByText(t)).toBeInTheDocument());
    expect(screen.getByText("52")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.queryByText("Ready for payment")).toBeNull();
    expect(screen.queryByText(/OCR/)).toBeNull();
  });

  it("Finance: approved to release, ready for payment, paid this month", () => {
    useApPermissions.mockReturnValue(FINANCE);
    render(<InvoiceKpiCards />);
    expect(screen.getByText("Approved - to release")).toBeInTheDocument();
    expect(screen.getByText("Ready for payment")).toBeInTheDocument();
    expect(screen.getByText("Paid this month")).toBeInTheDocument();
    expect(screen.queryByText("To review")).toBeNull();
  });

  it("a card opens its tab when that tab is available", async () => {
    useApPermissions.mockReturnValue(AP_EXEC);
    const onSelect = vi.fn();
    render(<InvoiceKpiCards onSelect={onSelect} visibleQueues={["all_invoices", "ocr_review", "approval", "approved"]} />);
    await userEvent.click(screen.getByRole("button", { name: "To review: open the list" }));
    expect(onSelect).toHaveBeenCalledWith("ocr_review");
  });

  it("shows placeholders while loading, without reading any field off data", () => {
    useApPermissions.mockReturnValue(AP_EXEC);
    useInvoiceSummary.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    render(<InvoiceKpiCards />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  // The regression this guards: a failed summary fetch (e.g. a 403 for a caller lacking
  // INVOICE_VIEW) used to crash the whole page.
  it("shows placeholders on a fetch error instead of crashing on undefined data", () => {
    useApPermissions.mockReturnValue(FINANCE);
    useInvoiceSummary.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    expect(() => render(<InvoiceKpiCards />)).not.toThrow();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
