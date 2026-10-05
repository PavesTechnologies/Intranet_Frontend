import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import InvoiceStatusTabs from "./InvoiceStatusTabs";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: vi.fn(),
}));

const ALL_FLAGS_FALSE = {
  canUploadInvoice: false,
  canReviewOcr: false,
  canViewInvoiceApproval: false,
  canApproveInvoice: false,
  canRejectInvoice: false,
  canSendBackInvoice: false,
  canSendForApproval: false,
  canMarkPaid: false,
  canViewPayment: false,
};

function renderTabs(overrides) {
  useApPermissions.mockReturnValue({ ...ALL_FLAGS_FALSE, ...overrides });
  return render(<InvoiceStatusTabs activeQueueType="all_invoices" onChange={vi.fn()} />);
}

/**
 * Which tabs render is entirely permission-driven (getVisibleQueueTypes) — an AP Executive, an
 * Approver, and a Finance Executive each see a different subset, matching what their UMS
 * permissions actually let them do, not a hardcoded role check.
 */
describe("InvoiceStatusTabs — permission-driven visibility", () => {
  it("AP Executive: All, OCR Review, Approval, Approved — not Ready for Payment/Paid", () => {
    renderTabs({ canUploadInvoice: true, canReviewOcr: true, canSendForApproval: true });
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OCR Review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approval" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approved" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ready for Payment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paid" })).not.toBeInTheDocument();
  });

  it("Approver: Approval, Approved only — not All/OCR Review/Ready for Payment/Paid", () => {
    renderTabs({ canViewInvoiceApproval: true, canApproveInvoice: true, canRejectInvoice: true, canSendBackInvoice: true });
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "OCR Review" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approval" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approved" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ready for Payment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paid" })).not.toBeInTheDocument();
  });

  it("Finance Executive: Approved, Ready for Payment, Paid only", () => {
    renderTabs({ canMarkPaid: true, canViewPayment: true });
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "OCR Review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approval" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approved" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ready for Payment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paid" })).toBeInTheDocument();
  });

  it("a user with no invoice-module permissions still sees Approved (common to every group)", () => {
    renderTabs({});
    expect(screen.getByRole("button", { name: "Approved" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("Admin holding every permission sees every tab", () => {
    renderTabs({
      canUploadInvoice: true,
      canReviewOcr: true,
      canViewInvoiceApproval: true,
      canApproveInvoice: true,
      canRejectInvoice: true,
      canSendBackInvoice: true,
      canSendForApproval: true,
      canMarkPaid: true,
      canViewPayment: true,
    });
    ["All", "OCR Review", "Approval", "Approved", "Ready for Payment", "Paid"].forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });
  });
});
