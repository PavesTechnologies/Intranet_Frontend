import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import InvoiceReturnedBanner from "./InvoiceReturnedBanner";
import { useInvoiceApproval } from "../hooks/useInvoiceApprovals";

vi.mock("../hooks/useInvoiceApprovals", () => ({
  useInvoiceApproval: vi.fn(),
}));

vi.mock("../../system-configuration/components/ApproverLabel", () => ({
  default: ({ userUuid }) => <span>{`Approver:${userUuid}`}</span>,
}));

beforeEach(() => vi.clearAllMocks());

describe("InvoiceReturnedBanner", () => {
  it("renders nothing when there's no approval instance at all", () => {
    useInvoiceApproval.mockReturnValue({ data: undefined });
    const { container } = render(<InvoiceReturnedBanner invoiceId={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while the approval is still in flight (not the send-back's cancelled cycle)", () => {
    useInvoiceApproval.mockReturnValue({ data: { status: "IN_PROGRESS", steps: [] } });
    const { container } = render(<InvoiceReturnedBanner invoiceId={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows who sent it back, when, and why from the cancelled cycle's rejected step-approver", () => {
    useInvoiceApproval.mockReturnValue({
      data: {
        status: "CANCELLED",
        steps: [
          {
            id: 1,
            level_number: 1,
            status: "CANCELLED",
            completed_at: "2026-09-17T06:00:00Z",
            approvers: [
              { id: 100, user_uuid: "user-1", status: "SKIPPED" },
              {
                id: 101,
                user_uuid: "user-2",
                status: "REJECTED",
                decided_at: "2026-09-17T06:00:00Z",
                comments: "Please correct the GST amount",
              },
            ],
          },
        ],
      },
    });
    render(<InvoiceReturnedBanner invoiceId={1} />);

    expect(screen.getByText("Returned for Review")).toBeInTheDocument();
    expect(screen.getByText("Approver:user-2")).toBeInTheDocument();
    expect(screen.getByText("Please correct the GST amount")).toBeInTheDocument();
  });

  it("picks the most recently cancelled step when more than one exists", () => {
    useInvoiceApproval.mockReturnValue({
      data: {
        status: "CANCELLED",
        steps: [
          {
            id: 1,
            level_number: 1,
            status: "CANCELLED",
            completed_at: "2026-09-01T06:00:00Z",
            approvers: [{ id: 100, user_uuid: "user-old", status: "REJECTED", decided_at: "2026-09-01T06:00:00Z", comments: "old reason" }],
          },
          {
            id: 2,
            level_number: 2,
            status: "CANCELLED",
            completed_at: "2026-09-17T06:00:00Z",
            approvers: [{ id: 101, user_uuid: "user-new", status: "REJECTED", decided_at: "2026-09-17T06:00:00Z", comments: "latest reason" }],
          },
        ],
      },
    });
    render(<InvoiceReturnedBanner invoiceId={1} />);

    expect(screen.getByText("Approver:user-new")).toBeInTheDocument();
    expect(screen.getByText("latest reason")).toBeInTheDocument();
    expect(screen.queryByText("old reason")).not.toBeInTheDocument();
  });
});
