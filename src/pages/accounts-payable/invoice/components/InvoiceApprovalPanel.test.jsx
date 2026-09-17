import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoiceApprovalPanel from "./InvoiceApprovalPanel";
import {
  useInvoiceApproval,
  useSendForApprovalMutation,
  useApproveInvoiceMutation,
  useRejectInvoiceMutation,
  useSendBackInvoiceMutation,
} from "../hooks/useInvoiceApprovals";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useAuth } from "../../../../contexts/AuthContext";
import { useApprovalPolicyDetail } from "../../system-configuration/hooks/useApprovalPolicies";

vi.mock("../hooks/useInvoiceApprovals", () => ({
  useInvoiceApproval: vi.fn(),
  useSendForApprovalMutation: vi.fn(),
  useApproveInvoiceMutation: vi.fn(),
  useRejectInvoiceMutation: vi.fn(),
  useSendBackInvoiceMutation: vi.fn(),
}));

vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: vi.fn(),
}));

vi.mock("../../../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
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

// Pending Approval — the realistic status for most of the tests below, which are about an
// approval already in flight (send_for_approval is what actually reaches Pending Approval now,
// see InvoiceApprovalPanel's canOfferSend). The Send for Approval tests specifically override
// this to "OCR Reviewed", the one status that action is actually offered from.
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
    canSendBackInvoice: true,
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
  useSendBackInvoiceMutation.mockReturnValue({ ...idleMutation });
  useApprovalPolicyDetail.mockReturnValue({
    data: { id: 5, name: "IT Hardware Policy", department_id: 1, purchase_category_id: 10, is_default: false },
  });
  setPermissions();
  // Every fixture below that expects Approve/Reject/Send Back to be visible uses "user-1" as
  // the active step's pending approver — default the signed-in user to match it, so tests that
  // aren't specifically about assignment don't each have to set this up themselves.
  useAuth.mockReturnValue({ user: { user_id: "user-1" } });
});

describe("InvoiceApprovalPanel — approval timeline", () => {
  it("shows a loading state while the approval instance is being fetched", () => {
    setApproval({ data: undefined, isLoading: true, error: null });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.getByText("Loading approval status...")).toBeInTheDocument();
  });

  it("offers Send for Approval once OCR Reviewed and the user is permitted", () => {
    setApproval({ data: undefined, isLoading: false, error: { status: 404 } });
    render(<InvoiceApprovalPanel invoice={{ ...invoice, status: "OCR Reviewed" }} />);
    expect(screen.getByText(/has not been sent for approval yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send for approval/i })).toBeInTheDocument();
  });

  it("hides Send for Approval when the user lacks canSendForApproval", () => {
    setPermissions({ canSendForApproval: false });
    setApproval({ data: undefined, isLoading: false, error: { status: 404 } });
    render(<InvoiceApprovalPanel invoice={{ ...invoice, status: "OCR Reviewed" }} />);
    expect(screen.queryByRole("button", { name: /send for approval/i })).not.toBeInTheDocument();
  });

  // OCR_REVIEWED vs. PENDING_APPROVAL is a real, distinct status transition performed by
  // send_for_approval itself now (see InvoiceApprovalService) — an invoice still at Pending
  // Approval has, by definition, already been sent, so it must never offer to send it again,
  // regardless of whether the approval fetch happens to 404 for some other reason.
  it("does not offer Send for Approval while still Pending Approval, even with no approval data", () => {
    setApproval({ data: undefined, isLoading: false, error: { status: 404 } });
    render(<InvoiceApprovalPanel invoice={{ ...invoice, status: "Pending Approval" }} />);
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

  it("hides Approve/Reject when the signed-in user is not the assigned approver for the active step, even with permission", () => {
    useAuth.mockReturnValue({ user: { user_id: "someone-else" } });
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

describe("InvoiceApprovalPanel — Send Back", () => {
  const inFlightApproval = {
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
  };

  it("shows Send Back alongside Approve/Reject when the user holds the permission", () => {
    setApproval({ data: inFlightApproval, isLoading: false, error: null });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.getByRole("button", { name: /send back/i })).toBeInTheDocument();
  });

  it("hides Send Back for a user without canSendBackInvoice, even mid-flight", () => {
    setPermissions({ canSendBackInvoice: false });
    setApproval({ data: inFlightApproval, isLoading: false, error: null });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.queryByRole("button", { name: /send back/i })).not.toBeInTheDocument();
  });

  it("requires a reason before Send Back can be confirmed", async () => {
    setApproval({ data: inFlightApproval, isLoading: false, error: null });
    const user = userEvent.setup();
    render(<InvoiceApprovalPanel invoice={invoice} />);

    await user.click(screen.getByRole("button", { name: /send back/i }));
    // Both the row trigger and the modal's own submit button are now labeled "Send Back" — the
    // modal's is the one added last.
    const confirmButton = () => {
      const matches = screen.getAllByRole("button", { name: "Send Back" });
      return matches[matches.length - 1];
    };
    expect(confirmButton()).toBeDisabled();

    await user.type(screen.getByLabelText("Reason"), "Please correct the GST amount");
    expect(confirmButton()).toBeEnabled();
  });

  it("calls the send-back mutation with the invoice id and trimmed reason", async () => {
    setApproval({ data: inFlightApproval, isLoading: false, error: null });
    const mutate = vi.fn();
    useSendBackInvoiceMutation.mockReturnValue({ mutate, isPending: false });
    const user = userEvent.setup();
    render(<InvoiceApprovalPanel invoice={invoice} />);

    await user.click(screen.getByRole("button", { name: /send back/i }));
    await user.type(screen.getByLabelText("Reason"), "  Please correct the GST amount  ");
    const matches = screen.getAllByRole("button", { name: "Send Back" });
    await user.click(matches[matches.length - 1]);

    expect(mutate).toHaveBeenCalledWith(
      { invoiceId: 42, comments: "Please correct the GST amount" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("hides Send Back when the signed-in user is not the assigned approver, even with the permission", () => {
    useAuth.mockReturnValue({ user: { user_id: "someone-else" } });
    setApproval({ data: inFlightApproval, isLoading: false, error: null });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.queryByRole("button", { name: /send back/i })).not.toBeInTheDocument();
  });

  it("is not offered once the approval is terminal (already APPROVED)", () => {
    setApproval({
      data: {
        status: "APPROVED",
        approval_policy_id: 5,
        steps: [
          {
            id: 1,
            level_number: 1,
            approver_type: "ROLE",
            role_code: "AP_MANAGER",
            approval_rule: "ANY_ONE",
            status: "APPROVED",
            approvers: [{ id: 100, user_uuid: "user-1", status: "APPROVED", decided_at: "2026-01-01T00:00:00Z" }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    render(<InvoiceApprovalPanel invoice={invoice} />);
    expect(screen.queryByRole("button", { name: /send back/i })).not.toBeInTheDocument();
  });
});
