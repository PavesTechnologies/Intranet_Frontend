import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InvoiceRowActions from "./InvoiceRowActions";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: vi.fn(),
}));

// Several tests render more than once (to compare a denied vs. granted permission) within the
// same `it` block — clean up the previous render first so only one row is ever in the DOM,
// otherwise both renders' "Pay"/"Approve"/etc. links coexist and every query becomes ambiguous.
const renderRow = (invoice) => {
  cleanup();
  return render(<InvoiceRowActions invoice={invoice} />, { wrapper: MemoryRouter });
};

const baseInvoice = { id: 1, invoiceNumber: "INV-0001" };

/**
 * Action visibility = permission AND invoice status (spec section 22) — every case below pairs
 * a status with the ONE permission that should reveal its action, confirming the row shows
 * nothing extra without it and the right thing with it. "View" is always present regardless.
 */
describe("InvoiceRowActions — status + permission visibility matrix", () => {
  beforeEach(() => vi.clearAllMocks());

  it("always shows View, regardless of permissions", () => {
    useApPermissions.mockReturnValue({});
    renderRow({ ...baseInvoice, status: "Draft" });
    expect(screen.getByRole("link", { name: "View" })).toBeInTheDocument();
  });

  it("OCR Failed: OCR Review link requires canReviewOcr", () => {
    useApPermissions.mockReturnValue({ canReviewOcr: false });
    renderRow({ ...baseInvoice, status: "OCR Failed" });
    expect(screen.queryByRole("link", { name: "OCR Review" })).not.toBeInTheDocument();

    useApPermissions.mockReturnValue({ canReviewOcr: true });
    renderRow({ ...baseInvoice, status: "OCR Failed" });
    expect(screen.getByRole("link", { name: "OCR Review" })).toBeInTheDocument();
  });

  it("Returned for Review: Edit & Review requires canReviewOcr, not canApproveInvoice", () => {
    useApPermissions.mockReturnValue({ canApproveInvoice: true, canReviewOcr: false });
    renderRow({ ...baseInvoice, status: "Returned for Review" });
    expect(screen.queryByRole("link", { name: "Edit & Review" })).not.toBeInTheDocument();

    useApPermissions.mockReturnValue({ canReviewOcr: true });
    renderRow({ ...baseInvoice, status: "Returned for Review" });
    expect(screen.getByRole("link", { name: "Edit & Review" })).toBeInTheDocument();
  });

  // Send for Approval requires OCR_REVIEWED specifically — not OCR_REVIEW_PENDING (that invoice
  // hasn't been reviewed/saved yet at all; apply_ocr_review is what advances it to OCR_REVIEWED)
  // and not PENDING_APPROVAL (that invoice has already been sent — see the OCR_REVIEWED vs.
  // PENDING_APPROVAL distinction in invoice_process_service.apply_ocr_review's docstring).
  it("OCR Review Pending: Send for Approval never shows, regardless of permission — nothing has been reviewed yet", () => {
    useApPermissions.mockReturnValue({ canSendForApproval: true });
    renderRow({ ...baseInvoice, status: "OCR Review Pending" });
    expect(screen.queryByRole("link", { name: "Send for Approval" })).not.toBeInTheDocument();
  });

  it("OCR Reviewed: Send for Approval requires canSendForApproval", () => {
    useApPermissions.mockReturnValue({ canSendForApproval: false });
    renderRow({ ...baseInvoice, status: "OCR Reviewed" });
    expect(screen.queryByRole("link", { name: "Send for Approval" })).not.toBeInTheDocument();

    useApPermissions.mockReturnValue({ canSendForApproval: true });
    renderRow({ ...baseInvoice, status: "OCR Reviewed" });
    expect(screen.getByRole("link", { name: "Send for Approval" })).toBeInTheDocument();
  });

  it("Pending Approval: Approve requires canApproveInvoice, Send for Approval never shows regardless of permission", () => {
    useApPermissions.mockReturnValue({ canSendForApproval: true, canApproveInvoice: false });
    renderRow({ ...baseInvoice, status: "Pending Approval" });
    expect(screen.queryByRole("link", { name: "Send for Approval" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Approve" })).not.toBeInTheDocument();

    useApPermissions.mockReturnValue({ canSendForApproval: true, canApproveInvoice: true });
    renderRow({ ...baseInvoice, status: "Pending Approval" });
    expect(screen.queryByRole("link", { name: "Send for Approval" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Approve" })).toBeInTheDocument();
  });

  it("Approved: Mark Ready requires canMarkPaid, and does not appear for other statuses", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: false });
    renderRow({ ...baseInvoice, status: "Approved" });
    expect(screen.queryByRole("link", { name: "Mark Ready" })).not.toBeInTheDocument();

    useApPermissions.mockReturnValue({ canMarkPaid: true });
    renderRow({ ...baseInvoice, status: "Approved" });
    expect(screen.getByRole("link", { name: "Mark Ready" })).toBeInTheDocument();

    renderRow({ ...baseInvoice, status: "Ready for Payment" });
    expect(screen.queryByRole("link", { name: "Mark Ready" })).not.toBeInTheDocument();
  });

  it("Ready for Payment and Partially Paid: Pay requires canMarkPaid", () => {
    useApPermissions.mockReturnValue({ canMarkPaid: true });
    renderRow({ ...baseInvoice, status: "Ready for Payment" });
    expect(screen.getByRole("link", { name: "Pay" })).toBeInTheDocument();

    renderRow({ ...baseInvoice, status: "Partially Paid" });
    expect(screen.getByRole("link", { name: "Pay" })).toBeInTheDocument();

    useApPermissions.mockReturnValue({ canMarkPaid: false });
    renderRow({ ...baseInvoice, status: "Ready for Payment" });
    expect(screen.queryByRole("link", { name: "Pay" })).not.toBeInTheDocument();
  });

  it("Paid: no action beyond View, regardless of permissions held", () => {
    useApPermissions.mockReturnValue({
      canReviewOcr: true,
      canSendForApproval: true,
      canApproveInvoice: true,
      canMarkPaid: true,
    });
    renderRow({ ...baseInvoice, status: "Paid" });
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent("View");
  });
});
