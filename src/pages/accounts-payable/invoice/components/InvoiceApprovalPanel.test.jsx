import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import InvoiceApprovalPanel from "./InvoiceApprovalPanel";
import { useInvoiceApproval, useSendForApprovalMutation, useApproveInvoiceMutation, useRejectInvoiceMutation } from "../hooks/useInvoiceApprovals";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../hooks/useInvoiceApprovals", () => ({
  useInvoiceApproval: vi.fn(),
  useSendForApprovalMutation: vi.fn(),
  useApproveInvoiceMutation: vi.fn(),
  useRejectInvoiceMutation: vi.fn(),
}));

vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: vi.fn(),
}));

vi.mock("../../system-configuration/components/ApproverLabel", () => ({
  default: ({ userUuid }) => <span>{`Approver:${userUuid}`}</span>,
}));

// Pending Approval, not OCR Review Pending — the backend's send-for-approval route rejects
// anything still at OCR Review Pending (it has to be reviewed/saved first, which is what
// advances it to Pending Approval in the first place; see InvoiceApprovalPanel's canOfferSend).
const invoice = {
  id: 42,
  invoiceNumber: "INV-0042",
  status: "Pending Approval",
  netAmount: 15000,
  vendor: { name: "Acme Supplies" },
  currency: { symbol: "₹" },
};

const idleMutation = { mutate: vi.fn(), isPending: false };

function setPermissions(overrides = {}) {
  useApPermissions.mockReturnValue({
    canSendForApproval: true,
    canApproveInvoice: true,
    canRejectInvoice: true,
    ...overrides,
  });
}

function setApproval(result) {
  useInvoiceApproval.mockReturnValue(result);
}

beforeEach(() => {
  vi.clearAllMocks();
  useSendForApprovalMutation.mockReturnValue({ ...idleMutation });
  useApproveInvoiceMutation.mockReturnValue({ ...idleMutation });
  useRejectInvoiceMutation.mockReturnValue({ ...idleMutation });
  setPermissions();
});

describe("InvoiceApprovalPanel — approval timeline", () => {
  it("shows a loading state while the approval instance is being fetched", () => {
    setApproval({ data: undefined, isLoading: true, error: null });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.getByText("Loading approval status...")).toBeInTheDocument();
  });

  it("offers Send for Approval when there's no approval instance yet (404) and the user is permitted", () => {
    setApproval({ data: undefined, isLoading: false, error: { status: 404 } });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.getByText(/has not been sent for approval yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send for approval/i })).toBeInTheDocument();
  });

  it("hides Send for Approval when the user lacks canSendForApproval", () => {
    setPermissions({ canSendForApproval: false });
    setApproval({ data: undefined, isLoading: false, error: { status: 404 } });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.queryByRole("button", { name: /send for approval/i })).not.toBeInTheDocument();
  });

  it("surfaces the backend's error message on a real API failure (not a 404)", () => {
    setApproval({
      data: undefined,
      isLoading: false,
      error: { status: 500, response: { data: { detail: "Database unavailable" } } },
    });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });

  it("renders a single ANY_ONE level with its approvers and status, with Approve/Reject visible while pending", () => {
    setApproval({
      data: {
        status: "IN_PROGRESS",
        steps: [
          {
            id: 1,
            level_number: 1,
            approver_type: "ROLE",
            role_code: "AP_MANAGER",
            approval_rule: "ANY_ONE",
            status: "PENDING",
            approvers: [{ id: 100, user_uuid: "user-1", status: "PENDING" }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByText(/Any One/)).toBeInTheDocument();
    expect(screen.getByText("Approver:user-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("renders an ALL-rule multi-level workflow with every level visible", () => {
    setApproval({
      data: {
        status: "IN_PROGRESS",
        steps: [
          {
            id: 1,
            level_number: 1,
            approver_type: "DEPARTMENT_APPROVER",
            approval_rule: "ALL",
            status: "APPROVED",
            approvers: [{ id: 100, user_uuid: "user-1", status: "APPROVED", decided_at: "2026-01-01T00:00:00Z" }],
          },
          {
            id: 2,
            level_number: 2,
            approver_type: "USER",
            approval_rule: "ALL",
            status: "PENDING",
            approvers: [{ id: 101, user_uuid: "user-2", status: "PENDING" }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByText("Level 2")).toBeInTheDocument();
    expect(screen.getAllByText(/^· All$/).length).toBe(2);
  });

  it("hides Approve/Reject once the approval is already APPROVED, and lists the decision in history", () => {
    setApproval({
      data: {
        status: "APPROVED",
        steps: [
          {
            id: 1,
            level_number: 1,
            approver_type: "ROLE",
            role_code: "AP_MANAGER",
            approval_rule: "ANY_ONE",
            status: "APPROVED",
            approvers: [{ id: 100, user_uuid: "user-1", status: "APPROVED", decided_at: "2026-01-01T00:00:00Z", comments: "Looks good" }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    expect(screen.getByText(/Level 1 — APPROVED by/)).toBeInTheDocument();
    expect(screen.getByText('"Looks good"')).toBeInTheDocument();
  });

  it("hides Approve/Reject once the approval is REJECTED, and lists the rejection in history", () => {
    setApproval({
      data: {
        status: "REJECTED",
        steps: [
          {
            id: 1,
            level_number: 1,
            approver_type: "ROLE",
            role_code: "AP_MANAGER",
            approval_rule: "ANY_ONE",
            status: "REJECTED",
            approvers: [{ id: 100, user_uuid: "user-1", status: "REJECTED", decided_at: "2026-01-01T00:00:00Z", comments: "Missing PO" }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.getByText(/Level 1 — REJECTED by/)).toBeInTheDocument();
  });

  it("shows 'no approval decisions recorded yet' when in flight but nobody has decided", () => {
    setApproval({
      data: {
        status: "PENDING",
        steps: [
          {
            id: 1,
            level_number: 1,
            approver_type: "DEPARTMENT_APPROVER",
            approval_rule: "ANY_ONE",
            status: "PENDING",
            approvers: [{ id: 100, user_uuid: "user-1", status: "PENDING" }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.getByText("No approval decisions recorded yet.")).toBeInTheDocument();
  });

  it("does not show Approve/Reject for a user without those permissions, even mid-flight", () => {
    setPermissions({ canApproveInvoice: false, canRejectInvoice: false });
    setApproval({
      data: {
        status: "IN_PROGRESS",
        steps: [
          {
            id: 1,
            level_number: 1,
            approver_type: "ROLE",
            role_code: "AP_MANAGER",
            approval_rule: "ANY_ONE",
            status: "PENDING",
            approvers: [{ id: 100, user_uuid: "user-1", status: "PENDING" }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });
});
