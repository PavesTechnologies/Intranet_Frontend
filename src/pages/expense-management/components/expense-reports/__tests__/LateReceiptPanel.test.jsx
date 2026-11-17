import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const authState = { roles: [] };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ hasRole: (roles) => roles.some((r) => authState.roles.includes(r)) }),
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));
vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({
  LATE_RECEIPT_REPORT_STATUSES: ["APPROVED", "REIMBURSED", "CLOSED"],
  lateReceiptService: {
    forReport: vi.fn(),
    attach: vi.fn(),
    verify: vi.fn(),
    reject: vi.fn(),
  },
  receiptService: {
    listForReport: vi.fn(),
    getViewUrl: vi.fn(),
  },
}));

import { lateReceiptService, receiptService } from "@/pages/expense-management/api/expenseReportsApi";
import { showStatusToast } from "@/components/toastfy/toast";
import LateReceiptPanel from "../LateReceiptPanel";

const REPORT_ID = "report-1";
const LINE = {
  lineItemId: "line-1",
  merchantName: "Hotel Taj",
  expenseDate: "2026-11-05",
  amount: 2500,
};

const pendingReceipt = (overrides = {}) => ({
  receiptId: "rcpt-1",
  reportId: REPORT_ID,
  lineItemId: "line-1",
  originalFileName: "hotel-receipt.pdf",
  uploadedBy: "5100014",
  uploadedAt: "2027-02-13T10:00:00",
  actualReceiptDate: "2027-02-12",
  lateReason: "The hotel sent the receipt two months after checkout",
  verificationStatus: "PENDING_REVIEW",
  verificationNote: null,
  duplicateMessage: null,
  ...overrides,
});

const respond = (list) => Promise.resolve({ data: { data: list } });

function renderPanel(props = {}) {
  return render(
    <LateReceiptPanel
      reportId={REPORT_ID}
      reportStatus="APPROVED"
      lineItems={[LINE]}
      {...props}
    />
  );
}

function pickFile(file) {
  fireEvent.change(screen.getByLabelText("Receipt file"), { target: { files: [file] } });
}

const pdf = () => new File(["%PDF-1.4 late"], "hotel-receipt.pdf", { type: "application/pdf" });

describe("LateReceiptPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.roles = ["General"];
    lateReceiptService.forReport.mockImplementation(() => respond([]));
    receiptService.listForReport.mockImplementation(() => respond([]));
  });

  it("does not render for a draft report, and does not load receipts", () => {
    const { container } = renderPanel({ reportStatus: "DRAFT" });

    expect(container.firstChild).toBeNull();
    expect(lateReceiptService.forReport).not.toHaveBeenCalled();
  });

  it("lets an employee add a late receipt on an approved report", async () => {
    renderPanel();

    expect(await screen.findByText("No late receipts on this report.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add late receipt/i }));
    expect(screen.getByLabelText("Receipt file")).toBeInTheDocument();
    expect(screen.getByLabelText("Reason for late submission")).toBeInTheDocument();
  });

  it("does not offer Verify or Reject to the employee", async () => {
    lateReceiptService.forReport.mockImplementation(() => respond([pendingReceipt()]));
    renderPanel();

    expect(await screen.findByText("Waiting for review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^verify$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^reject$/i })).toBeNull();
  });

  it("checks the form before anything is sent", async () => {
    renderPanel();
    await screen.findByText("No late receipts on this report.");
    fireEvent.click(screen.getByRole("button", { name: /add late receipt/i }));

    fireEvent.click(screen.getByRole("button", { name: /attach receipt/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose the expense");
    expect(lateReceiptService.attach).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Expense"), { target: { value: "line-1" } });
    fireEvent.click(screen.getByRole("button", { name: /attach receipt/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose the receipt file");

    pickFile(pdf());
    fireEvent.click(screen.getByRole("button", { name: /attach receipt/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("date printed on the receipt");

    const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText("Date printed on the receipt"), { target: { value: future } });
    fireEvent.click(screen.getByRole("button", { name: /attach receipt/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("cannot be in the future");

    fireEvent.change(screen.getByLabelText("Date printed on the receipt"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Reason for late submission"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /attach receipt/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 10 characters");

    expect(lateReceiptService.attach).not.toHaveBeenCalled();
  });

  it("attaches the receipt with its date and reason, then reloads the list", async () => {
    lateReceiptService.attach.mockResolvedValue({ data: { data: {} } });
    renderPanel();
    await screen.findByText("No late receipts on this report.");
    fireEvent.click(screen.getByRole("button", { name: /add late receipt/i }));

    fireEvent.change(screen.getByLabelText("Expense"), { target: { value: "line-1" } });
    pickFile(pdf());
    fireEvent.change(screen.getByLabelText("Date printed on the receipt"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Reason for late submission"), {
      target: { value: "  The hotel sent the receipt two months after checkout  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /attach receipt/i }));

    await waitFor(() => expect(lateReceiptService.attach).toHaveBeenCalledTimes(1));
    const [lineItemId, body] = lateReceiptService.attach.mock.calls[0];
    expect(lineItemId).toBe("line-1");
    expect(body.get("actualReceiptDate")).toBe("2026-11-01");
    expect(body.get("reason")).toBe("The hotel sent the receipt two months after checkout");
    expect(body.get("file").name).toBe("hotel-receipt.pdf");
    expect(showStatusToast).toHaveBeenCalledWith(expect.stringContaining("waiting for Finance or AP review"), "success");
    await waitFor(() => expect(lateReceiptService.forReport).toHaveBeenCalledTimes(2));
  });

  it("shows the server's reason when the attach is refused", async () => {
    lateReceiptService.attach.mockRejectedValue({
      response: { data: { message: "This receipt has already been claimed on expense report EXP-009." } },
    });
    renderPanel();
    await screen.findByText("No late receipts on this report.");
    fireEvent.click(screen.getByRole("button", { name: /add late receipt/i }));
    fireEvent.change(screen.getByLabelText("Expense"), { target: { value: "line-1" } });
    pickFile(pdf());
    fireEvent.change(screen.getByLabelText("Date printed on the receipt"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Reason for late submission"), { target: { value: "Found it in the email archive" } });
    fireEvent.click(screen.getByRole("button", { name: /attach receipt/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already been claimed on expense report EXP-009");
  });

  it("lets Finance verify a late receipt, with an optional note", async () => {
    authState.roles = ["Finance"];
    lateReceiptService.forReport.mockImplementation(() => respond([pendingReceipt()]));
    lateReceiptService.verify.mockResolvedValue({ data: { data: {} } });
    renderPanel({ reportStatus: "CLOSED" });

    await screen.findByText("Waiting for review");
    fireEvent.change(screen.getByLabelText("Review note for hotel-receipt.pdf"), { target: { value: "Matches the folio" } });
    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));

    await waitFor(() => expect(lateReceiptService.verify).toHaveBeenCalledWith("rcpt-1", "Matches the folio"));
    expect(showStatusToast).toHaveBeenCalledWith("Late receipt verified.", "success");
  });

  it("requires a reason before Finance can reject a late receipt", async () => {
    authState.roles = ["AP_Executive"];
    lateReceiptService.forReport.mockImplementation(() => respond([pendingReceipt()]));
    renderPanel();

    await screen.findByText("Waiting for review");
    fireEvent.click(screen.getByRole("button", { name: /^reject$/i }));

    expect(lateReceiptService.reject).not.toHaveBeenCalled();
    expect(showStatusToast).toHaveBeenCalledWith(expect.stringContaining("Give a reason for rejecting"), "error");

    fireEvent.change(screen.getByLabelText("Review note for hotel-receipt.pdf"), {
      target: { value: "Total on the receipt is different from the claim" },
    });
    lateReceiptService.reject.mockResolvedValue({ data: { data: {} } });
    fireEvent.click(screen.getByRole("button", { name: /^reject$/i }));

    await waitFor(() =>
      expect(lateReceiptService.reject).toHaveBeenCalledWith("rcpt-1", "Total on the receipt is different from the claim")
    );
  });

  it("shows the rejected receipt as history, without review buttons", async () => {
    authState.roles = ["Finance"];
    lateReceiptService.forReport.mockImplementation(() =>
      respond([pendingReceipt({ verificationStatus: "REJECTED", verificationNote: "Duplicate of a claimed bill" })])
    );
    renderPanel({ reportStatus: "REIMBURSED" });

    expect(await screen.findByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("Review note: Duplicate of a claimed bill")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^verify$/i })).toBeNull();
  });
});
