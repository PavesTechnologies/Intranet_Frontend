import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));
vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({
  lateReceiptService: {
    pendingReview: vi.fn(),
    verify: vi.fn(),
    reject: vi.fn(),
  },
  receiptService: {
    getViewUrl: vi.fn(),
  },
}));

import { lateReceiptService, receiptService } from "@/pages/expense-management/api/expenseReportsApi";
import { showStatusToast } from "@/components/toastfy/toast";
import LateReceiptReviewPage from "../LateReceiptReviewPage";

const respond = (data) => Promise.resolve({ data: { data } });

const item = (overrides = {}) => ({
  receiptId: "rcpt-1",
  reportNumber: "EXP-2026-2027-0001",
  employeeId: "5100014",
  expenseDate: "2026-11-05",
  lineAmount: 2500,
  originalFileName: "hotel-receipt.pdf",
  uploadedBy: "5100014",
  uploadedAt: "2026-11-16T10:00:00",
  actualReceiptDate: "2026-11-04",
  lateReason: "The hotel sent the receipt two months after checkout",
  verificationStatus: "PENDING_REVIEW",
  duplicateStatus: "NONE",
  ...overrides,
});

const itemRows = () => screen.findAllByTestId("late-review-item");

describe("LateReceiptReviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lateReceiptService.pendingReview.mockImplementation(() => respond([item()]));
    lateReceiptService.verify.mockImplementation(() => respond({}));
    lateReceiptService.reject.mockImplementation(() => respond({}));
    receiptService.getViewUrl.mockImplementation(() => respond({ url: "https://files.example/hotel.pdf" }));
  });

  it("lists the late receipts waiting for review, with report and employee", async () => {
    render(<LateReceiptReviewPage />);

    const row = (await screen.findAllByTestId("late-review-item"))[0];
    expect(within(row).getByText("hotel-receipt.pdf")).toBeInTheDocument();
    expect(within(row).getByText(/Report EXP-2026-2027-0001/)).toBeInTheDocument();
    expect(within(row).getByText(/Employee 5100014/)).toBeInTheDocument();
    expect(within(row).getByText(/Reason: The hotel sent/)).toBeInTheDocument();
  });

  it("shows an empty state when nothing is waiting", async () => {
    lateReceiptService.pendingReview.mockImplementation(() => respond([]));

    render(<LateReceiptReviewPage />);

    expect(await screen.findByText(/no late receipts are waiting for review/i)).toBeInTheDocument();
  });

  it("shows the server's message and a retry when the queue cannot be loaded", async () => {
    lateReceiptService.pendingReview.mockImplementation(() =>
      Promise.reject({ response: { data: { message: "Only Finance or AP can review late receipts" } } }));

    render(<LateReceiptReviewPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Only Finance or AP can review late receipts");
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("disables Verify when a duplicate blocks it, and still allows Reject", async () => {
    lateReceiptService.pendingReview.mockImplementation(() => respond([
      item({ duplicateStatus: "BLOCKING", duplicateMessage: "This receipt is already claimed on EXP-2026-2027-0002." }),
    ]));

    render(<LateReceiptReviewPage />);

    const row = (await itemRows())[0];
    expect(within(row).getByRole("button", { name: "Verify" })).toBeDisabled();
    expect(within(row).getByRole("button", { name: "Reject" })).toBeEnabled();
    expect(within(row).getByText(/Reject this receipt instead/)).toBeInTheDocument();
  });

  it("requires a note of at least 10 characters before rejecting", async () => {
    render(<LateReceiptReviewPage />);

    const row = (await itemRows())[0];
    fireEvent.change(within(row).getByLabelText("Review note for hotel-receipt.pdf"), { target: { value: "too short" } });
    fireEvent.click(within(row).getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith(expect.stringMatching(/at least 10 characters/), "error"));
    expect(lateReceiptService.reject).not.toHaveBeenCalled();
  });

  it("verifies with the note when one is given, and refreshes the queue", async () => {
    lateReceiptService.pendingReview
      .mockImplementationOnce(() => respond([item()]))
      .mockImplementationOnce(() => respond([]));

    render(<LateReceiptReviewPage />);

    const row = (await itemRows())[0];
    fireEvent.change(within(row).getByLabelText("Review note for hotel-receipt.pdf"), {
      target: { value: "Matches the hotel invoice" },
    });
    fireEvent.click(within(row).getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(lateReceiptService.verify).toHaveBeenCalledWith("rcpt-1", "Matches the hotel invoice"));
    expect(await screen.findByText(/no late receipts are waiting for review/i)).toBeInTheDocument();
  });

  it("shows the server's refusal when a verify is refused", async () => {
    lateReceiptService.verify.mockImplementation(() =>
      Promise.reject({ response: { data: { message: "The receipt total is 2000 but the claimed amount is 2500. Add a note explaining the difference to verify it." } } }));

    render(<LateReceiptReviewPage />);

    fireEvent.click(within((await itemRows())[0]).getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith(expect.stringMatching(/Add a note explaining/), "error"));
  });
});
