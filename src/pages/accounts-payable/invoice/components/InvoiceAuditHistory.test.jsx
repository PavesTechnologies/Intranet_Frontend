import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import InvoiceAuditHistory from "./InvoiceAuditHistory";
import { useInvoiceHistory } from "../hooks/useInvoiceHistory";
import { useInvoiceApproval } from "../hooks/useInvoiceApprovals";
import { useEmployeeDirectory } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";

vi.mock("../hooks/useInvoiceHistory", () => ({
  useInvoiceHistory: vi.fn(),
}));

vi.mock("../hooks/useInvoiceApprovals", () => ({
  useInvoiceApproval: vi.fn(),
}));

vi.mock("../../../expense-management/approval-engine/hooks/useEmployeeDirectory", () => ({
  useEmployeeDirectory: vi.fn(),
  resolveEmployeeName: (map, id) => map?.get(id)?.name || id,
}));

const baseInvoice = { id: 1, invoiceNumber: "INV-001", status: "Pending Approval", amountPaid: 0, netAmount: 1000 };

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

function mockHistory(data, extra = {}) {
  useInvoiceHistory.mockReturnValue({ data, isLoading: false, error: null, refetch: vi.fn(), isFetching: false, ...extra });
}

beforeEach(() => {
  useEmployeeDirectory.mockReturnValue({ data: new Map([["5100031", { name: "Jagadish Pannala" }]]) });
  useInvoiceApproval.mockReturnValue({ data: undefined });
});

describe("InvoiceAuditHistory — collapsible card", () => {
  it("is collapsed by default, showing only the header and activity count", () => {
    mockHistory([event("INVOICE_CREATED"), event("INVOICE_OCR_REVIEWED")]);
    render(<InvoiceAuditHistory invoice={baseInvoice} />);
    const toggle = screen.getByRole("button", { name: /activity/i, expanded: false });
    expect(toggle).toBeInTheDocument();
    expect(screen.getByText("2 activities")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /workflow progress/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Invoice uploaded")).not.toBeInTheDocument();
  });

  it("opens and closes from the header", () => {
    mockHistory([event("INVOICE_CREATED")]);
    render(<InvoiceAuditHistory invoice={baseInvoice} />);
    const toggle = screen.getByRole("button", { name: /activity/i, expanded: false });

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: /workflow progress/i })).toBeInTheDocument();
    expect(screen.getByText("Invoice uploaded")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Invoice uploaded")).not.toBeInTheDocument();
  });
});

describe("InvoiceAuditHistory — business labels", () => {
  it("labels every payment event in plain language, with amount and payment id", () => {
    mockHistory([
      event("INVOICE_PAYMENT_SCHEDULED", { new_values: { payment_id: 7, allocated_amount: "400.00" } }),
      event("INVOICE_PAYMENT_SENT", { new_values: { payment_id: 7, allocated_amount: "400.00" } }),
      event("INVOICE_PAYMENT_CLEARED", { new_values: { payment_id: 7, allocated_amount: "400.00", status_code: "PARTIALLY_PAID" } }),
      event("INVOICE_PAYMENT_FAILED", { new_values: { payment_id: 8, allocated_amount: "100.00" } }),
    ]);
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);

    expect(screen.getByText("Payment scheduled")).toBeInTheDocument();
    expect(screen.getByText("Payment sent to bank")).toBeInTheDocument();
    expect(screen.getByText("Payment cleared")).toBeInTheDocument();
    expect(screen.getByText("Payment attempt failed")).toBeInTheDocument();
    expect(screen.getAllByText(/₹400.00 · Payment #7/).length).toBe(3);
    expect(screen.getByText(/₹100.00 · Payment #8/)).toBeInTheDocument();
  });

  it("gives an unknown event a readable label", () => {
    mockHistory([event("SOME_FUTURE_ACTION")]);
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    expect(screen.getByText("Some future action")).toBeInTheDocument();
  });

  it("describes TDS determination with rate, amount and payment nature", () => {
    mockHistory([
      event("INVOICE_TDS_DETERMINED", {
        new_values: { tds_applicable: true, payment_nature_code: "PROFESSIONAL_SERVICE", tds_rule_id: 1, tds_rate: 10, tds_amount: 17700 },
      }),
    ]);
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    expect(screen.getByText("TDS determination completed")).toBeInTheDocument();
    expect(screen.getByText(/10% · ₹17,700.00 \(Professional service\)/)).toBeInTheDocument();
  });

  it("shows rejection reason and level", () => {
    mockHistory([event("INVOICE_REJECTED", { new_values: { level_number: 2, comments: "Duplicate bill" } })]);
    render(<InvoiceAuditHistory invoice={{ ...baseInvoice, status: "Rejected" }} defaultOpen />);
    expect(screen.getByText(/Rejected at level 2 · Reason: "Duplicate bill"/)).toBeInTheDocument();
  });
});

describe("InvoiceAuditHistory — who did it", () => {
  it("resolves changed_by to a real name via the employee directory", () => {
    mockHistory([event("INVOICE_CREATED", { changed_by: "5100031" })]);
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    expect(screen.getByText("Jagadish Pannala")).toBeInTheDocument();
    expect(screen.queryByText(/5100031/)).not.toBeInTheDocument();
  });

  it("falls back to the raw id when the directory can't resolve it", () => {
    mockHistory([event("INVOICE_CREATED", { changed_by: "9999999" })]);
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    expect(screen.getByText("9999999")).toBeInTheDocument();
  });

  it("marks service actors as automated", () => {
    mockHistory([event("AP_AUTOMATION_RESULT", { changed_by: "AP_AUTOMATION", new_values: { outcome: "AUTO_SENT", reasons: [] } })]);
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    expect(screen.getByText("AP automation")).toBeInTheDocument();
    expect(screen.getByText("· Automated")).toBeInTheDocument();
  });
});

describe("InvoiceAuditHistory — filters", () => {
  const history = [
    event("INVOICE_CREATED"),
    event("INVOICE_TDS_DETERMINED", { new_values: { tds_applicable: false } }),
    event("INVOICE_SENT_FOR_APPROVAL"),
  ];

  it("filters by category with counts and keeps order", () => {
    mockHistory(history);
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    const filters = screen.getByRole("group", { name: /filter activities/i });
    expect(within(filters).getByRole("button", { name: /All Activities\s*3/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(filters).getByRole("button", { name: /Approval\s*1/ }));
    expect(screen.getByText("Submitted for approval")).toBeInTheDocument();
    expect(screen.queryByText("Invoice uploaded")).not.toBeInTheDocument();
  });

  it("shows an empty state for a filter with no activity", () => {
    mockHistory(history);
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    fireEvent.click(screen.getByRole("button", { name: /^Payment\s*0$/ }));
    expect(screen.getByText("No payment activity yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all activities" }));
    expect(screen.getByText("Invoice uploaded")).toBeInTheDocument();
  });
});

describe("InvoiceAuditHistory — details", () => {
  it("expands to show only fields the API returned, including before/after values", () => {
    mockHistory([
      event("INVOICE_READY_FOR_PAYMENT", { old_values: { status_code: "APPROVED" }, new_values: { status_code: "READY_FOR_PAYMENT" } }),
    ]);
    render(<InvoiceAuditHistory invoice={{ ...baseInvoice, status: "Ready for Payment" }} defaultOpen />);
    fireEvent.click(screen.getByRole("button", { name: /view details/i }));
    expect(screen.queryByText("INVOICE_READY_FOR_PAYMENT")).not.toBeInTheDocument();
    expect(screen.queryByText("Event type")).not.toBeInTheDocument();
    expect(screen.getByText("Invoice status")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Ready for Payment")).toBeInTheDocument();
    expect(screen.queryByText("Remarks")).not.toBeInTheDocument();
  });

  it("hides internal surrogate ids from the business details", () => {
    mockHistory([event("INVOICE_TDS_DETERMINED", { new_values: { tds_applicable: true, tds_amount: 100, tds_rule_id: 42 } })]);
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    fireEvent.click(screen.getByRole("button", { name: /view details/i }));
    expect(screen.queryByText(/Tds rule id/i)).not.toBeInTheDocument();
  });

  it("shows back-to-back identical records once, with a count", () => {
    const repeated = event("INVOICE_PAYMENT_TERMS_CHECKED", { new_values: { validation_status: "MISMATCH" } });
    mockHistory([repeated, { ...repeated, changed_at: "2026-09-17T11:00:00Z" }]);
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    expect(screen.getAllByText("Payment terms checked")).toHaveLength(1);
    expect(screen.getByText("×2")).toBeInTheDocument();
  });
});

describe("InvoiceAuditHistory — states", () => {
  it("shows an empty state with no history, and still shows workflow progress", () => {
    mockHistory([]);
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /workflow progress/i })).toBeInTheDocument();
  });

  it("shows a loading skeleton", () => {
    useInvoiceHistory.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    expect(screen.getByRole("status", { name: /loading activity/i })).toBeInTheDocument();
  });

  it("shows an error with retry", () => {
    const refetch = vi.fn();
    mockHistory(undefined, { error: Object.assign(new Error("boom"), { status: 500 }), refetch });
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("uses the approval instance for the current level", () => {
    mockHistory([event("INVOICE_SENT_FOR_APPROVAL")]);
    useInvoiceApproval.mockReturnValue({
      data: { status: "IN_PROGRESS", steps: [{ level_number: 1, status: "APPROVED" }, { level_number: 2, status: "PENDING" }] },
    });
    render(<InvoiceAuditHistory invoice={baseInvoice} defaultOpen />);
    expect(screen.getByText("Level 2 of 2")).toBeInTheDocument();
  });
});
