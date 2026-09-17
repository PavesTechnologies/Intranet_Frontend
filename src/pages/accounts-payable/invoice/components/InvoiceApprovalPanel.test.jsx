import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import InvoiceApprovalPanel from "./InvoiceApprovalPanel";
import { useInvoiceApproval, useSendForApprovalMutation, useApproveInvoiceMutation, useRejectInvoiceMutation } from "../hooks/useInvoiceApprovals";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useApprovalPolicyDetail } from "../../system-configuration/hooks/useApprovalPolicies";

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

vi.mock("../../system-configuration/hooks/useDepartments", () => ({
  default: () => ({ data: [{ id: 1, code: "FIN", name: "Finance", is_active: true }] }),
}));

vi.mock("../../system-configuration/hooks/usePurchaseCategories", () => ({
  default: () => ({ data: [{ id: 10, code: "HW", name: "Hardware", is_active: true }] }),
}));

vi.mock("../../system-configuration/hooks/useApprovalPolicies", () => ({
  useApprovalPolicyDetail: vi.fn(),
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
  useApprovalPolicyDetail.mockReturnValue({
    data: { id: 5, name: "IT Hardware Policy", department_id: 1, purchase_category_id: 10, is_default: false },
  });
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
    // The pending approver/level also surfaces in the "Waiting On" summary now, so scope these
    // assertions to the timeline list — the outer <ol>, first in DOM order ahead of the nested
    // per-step <ul> of approvers — to avoid matching both the summary and the nested list.
    const timeline = screen.getAllByRole("list")[0];
    expect(within(timeline).getByText("Level 1")).toBeInTheDocument();
    expect(within(timeline).getByText(/Any One/)).toBeInTheDocument();
    expect(within(timeline).getByText("Approver:user-1")).toBeInTheDocument();
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

  it("shows which policy matched, resolved by name/department/category", () => {
    useApprovalPolicyDetail.mockReturnValue({
      data: { id: 5, name: "IT Hardware Policy", department_id: 1, purchase_category_id: 10, is_default: false },
    });
    setApproval({
      data: {
        status: "IN_PROGRESS",
        approval_policy_id: 5,
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
    expect(screen.getByText("IT Hardware Policy")).toBeInTheDocument();
    expect(screen.getByText("Finance · Hardware")).toBeInTheDocument();
  });

  it("labels the fallback clearly when the matched policy is the default policy", () => {
    useApprovalPolicyDetail.mockReturnValue({
      data: { id: 9, name: "Default Policy", department_id: null, purchase_category_id: null, is_default: true },
    });
    setApproval({
      data: {
        status: "IN_PROGRESS",
        approval_policy_id: 9,
        steps: [
          {
            id: 1,
            level_number: 1,
            approver_type: "ROLE",
            role_code: "SUPER_ADMIN",
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
    expect(screen.getByText("Default Policy")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText(/Catch-all fallback/)).toBeInTheDocument();
  });

  it("summarizes who's currently blocking approval in the Waiting On box", () => {
    setApproval({
      data: {
        status: "IN_PROGRESS",
        approval_policy_id: 5,
        steps: [
          {
            id: 1,
            level_number: 1,
            approver_type: "DEPARTMENT_APPROVER",
            approval_rule: "ANY_ONE",
            status: "APPROVED",
            approvers: [{ id: 100, user_uuid: "user-1", status: "APPROVED", decided_at: "2026-01-01T00:00:00Z" }],
          },
          {
            id: 2,
            level_number: 2,
            approver_type: "ROLE",
            role_code: "FINANCE_MANAGER",
            approval_rule: "ALL",
            status: "PENDING",
            approvers: [
              { id: 101, user_uuid: "user-2", status: "PENDING" },
              { id: 102, user_uuid: "user-3", status: "PENDING" },
            ],
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    // The same pending approvers also appear in the timeline below — scope to the Waiting On
    // box itself (found via its own heading) so this only asserts what that summary shows.
    const waitingOnBox = screen.getByText("Waiting On").closest("div");
    expect(within(waitingOnBox).getByText(/Currently at level 2/)).toBeInTheDocument();
    expect(within(waitingOnBox).getByText("Approver:user-2")).toBeInTheDocument();
    expect(within(waitingOnBox).getByText("Approver:user-3")).toBeInTheDocument();
    // Level 1 already resolved — shouldn't be named as who's currently blocking.
    expect(within(waitingOnBox).queryByText(/Currently at level 1/)).not.toBeInTheDocument();
  });

  it("says so when the matched step has no eligible approver assigned yet", () => {
    setApproval({
      data: {
        status: "IN_PROGRESS",
        approval_policy_id: 5,
        steps: [
          {
            id: 1,
            level_number: 1,
            approver_type: "DEPARTMENT_APPROVER",
            approval_rule: "ANY_ONE",
            status: "PENDING",
            approvers: [],
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.getByText(/no eligible approver has been/)).toBeInTheDocument();
  });
});
