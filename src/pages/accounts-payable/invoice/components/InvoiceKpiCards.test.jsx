import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import InvoiceKpiCards from "./InvoiceKpiCards";
import { useInvoiceSummary } from "../hooks/useInvoiceSummary";

vi.mock("../hooks/useInvoiceSummary", () => ({
  useInvoiceSummary: vi.fn(),
}));

describe("InvoiceKpiCards", () => {
  it("renders real figures once the summary loads", () => {
    useInvoiceSummary.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        totalInvoicesThisMonth: 4,
        pendingApprovalCount: 2,
        readyForPaymentCount: 1,
        readyForPaymentBalance: 5000,
        paidThisMonthCount: 3,
        paidThisMonthAmount: 12000,
      },
    });
    render(<InvoiceKpiCards />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows placeholders while loading, without reading any field off data", () => {
    useInvoiceSummary.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    render(<InvoiceKpiCards />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  // The regression this guards: a failed summary fetch (e.g. a 403 for a caller lacking
  // INVOICE_VIEW) used to crash the whole page — data stayed undefined but isLoading settled to
  // false, and the component read data.totalInvoicesThisMonth unconditionally.
  it("shows placeholders on a fetch error instead of crashing on undefined data", () => {
    useInvoiceSummary.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    expect(() => render(<InvoiceKpiCards />)).not.toThrow();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
