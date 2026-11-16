import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import InvoiceAuditHistory from "./InvoiceAuditHistory";
import { useInvoiceHistory } from "../hooks/useInvoiceHistory";
import { useEmployeeDirectory } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";

vi.mock("../hooks/useInvoiceHistory", () => ({
  useInvoiceHistory: vi.fn(),
}));

vi.mock("../../../expense-management/approval-engine/hooks/useEmployeeDirectory", () => ({
  useEmployeeDirectory: vi.fn(),
  resolveEmployeeName: (map, id) => map?.get(id)?.name || id,
}));

beforeEach(() => {
  useEmployeeDirectory.mockReturnValue({ data: new Map([["5100031", { name: "Jagadish Pannala" }]]) });
});

function event(action, overrides = {}) {
  return {
    action,
    changed_by: "user-1",
    changed_at: "2026-09-17T10:00:00Z",
    new_values: {},
    old_values: null,
    ...overrides,
  };
}

describe("InvoiceAuditHistory — payment lifecycle events", () => {
  it("labels every payment event in plain language, with amount and payment id", () => {
    useInvoiceHistory.mockReturnValue({
      data: [
        event("INVOICE_PAYMENT_SCHEDULED", { new_values: { payment_id: 7, allocated_amount: "400.00" } }),
        event("INVOICE_PAYMENT_SENT", { new_values: { payment_id: 7, allocated_amount: "400.00" } }),
        event("INVOICE_PAYMENT_CLEARED", { new_values: { payment_id: 7, allocated_amount: "400.00", status_code: "PARTIALLY_PAID" } }),
        event("INVOICE_PAYMENT_FAILED", { new_values: { payment_id: 8, allocated_amount: "100.00" } }),
      ],
      isLoading: false,
      error: null,
    });

    render(<InvoiceAuditHistory invoiceId={1} />);

    expect(screen.getByText("Payment scheduled")).toBeInTheDocument();
    expect(screen.getByText("Payment sent to bank")).toBeInTheDocument();
    expect(screen.getByText("Payment cleared")).toBeInTheDocument();
    expect(screen.getByText("Payment attempt failed")).toBeInTheDocument();
    expect(screen.getAllByText(/₹400.00 · Payment #7/).length).toBe(3);
    expect(screen.getByText(/₹100.00 · Payment #8/)).toBeInTheDocument();
  });

  it("falls back to the raw action code for an event this component doesn't know about yet", () => {
    useInvoiceHistory.mockReturnValue({ data: [event("SOME_FUTURE_ACTION")], isLoading: false, error: null });
    render(<InvoiceAuditHistory invoiceId={1} />);
    expect(screen.getByText("SOME_FUTURE_ACTION")).toBeInTheDocument();
  });

  it("shows an empty state with no history", () => {
    useInvoiceHistory.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<InvoiceAuditHistory invoiceId={1} />);
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument();
  });
});

describe("InvoiceAuditHistory — who did it", () => {
  it("resolves changed_by (a numeric employee id) to a real name via the employee directory", () => {
    useInvoiceHistory.mockReturnValue({
      data: [event("INVOICE_CREATED", { changed_by: "5100031" })],
      isLoading: false,
      error: null,
    });
    render(<InvoiceAuditHistory invoiceId={1} />);
    expect(screen.getByText(/Jagadish Pannala/)).toBeInTheDocument();
    expect(screen.queryByText(/5100031/)).not.toBeInTheDocument();
  });

  it("falls back to the raw id when the directory can't resolve it, rather than showing nothing", () => {
    useInvoiceHistory.mockReturnValue({
      data: [event("INVOICE_CREATED", { changed_by: "9999999" })],
      isLoading: false,
      error: null,
    });
    render(<InvoiceAuditHistory invoiceId={1} />);
    expect(screen.getByText(/9999999/)).toBeInTheDocument();
  });
});
