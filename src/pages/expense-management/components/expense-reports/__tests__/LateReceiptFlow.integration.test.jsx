import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";

// One in-memory late-receipt store shared by the reviewer queue and the employee's panel, so the flow is tested end to
// end at the UI level. The backend rules themselves are covered by the Java tests.
const state = vi.hoisted(() => ({ store: null, roles: ["General"] }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ hasRole: (roles) => roles.some((r) => state.roles.includes(r)) }),
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));
vi.mock("@/pages/expense-management/api/expenseReportsApi", () => {
  const ok = (data) => Promise.resolve({ data: { data } });
  const find = (id) => state.store.late.find((r) => r.receiptId === id);
  return {
    LATE_RECEIPT_REPORT_STATUSES: ["APPROVED", "REIMBURSED", "CLOSED"],
    lateReceiptService: {
      forReport: vi.fn((reportId) => ok(state.store.late.filter((r) => r.reportId === reportId))),
      attach: vi.fn(),
      pendingReview: vi.fn(() => ok(state.store.late.filter((r) => r.verificationStatus === "PENDING_REVIEW"))),
      verify: vi.fn((id, note) => {
        Object.assign(find(id), { verificationStatus: "VERIFIED", verificationNote: note || null });
        return ok({});
      }),
      reject: vi.fn((id, note) => {
        Object.assign(find(id), { verificationStatus: "REJECTED", verificationNote: note });
        return ok({});
      }),
    },
    receiptService: {
      listForReport: vi.fn(() => ok(state.store.reportReceipts)),
      getViewUrl: vi.fn(() => ok({ url: "https://files.example/x.pdf" })),
    },
  };
});

import LateReceiptPanel from "../LateReceiptPanel";
import LateReceiptReviewPage from "../../../pages/finance/LateReceiptReviewPage";

const REPORT_ID = "report-1";
const LINES = [
  { lineItemId: "line-1", merchantName: "Hotel Taj", expenseDate: "2026-11-05", amount: 2500, receiptRequired: true },
  { lineItemId: "line-2", merchantName: "City Cab", expenseDate: "2026-11-06", amount: 400, receiptRequired: true },
];

const lateReceipt = (receiptId, lineItemId) => ({
  receiptId,
  reportId: REPORT_ID,
  reportNumber: "EXP-2026-2027-0009",
  lineItemId,
  employeeId: "5100014",
  expenseDate: "2026-11-05",
  lineAmount: 2500,
  originalFileName: `${receiptId}.pdf`,
  uploadedBy: "5100014",
  uploadedAt: "2026-11-16T10:00:00",
  actualReceiptDate: "2026-11-04",
  lateReason: "The hotel sent the receipt two months after checkout",
  verificationStatus: "PENDING_REVIEW",
  duplicateStatus: "NONE",
});

function renderEmployeePanel() {
  return render(<LateReceiptPanel reportId={REPORT_ID} reportStatus="APPROVED" lineItems={LINES} />);
}

const rowFor = (fileName) =>
  screen.getAllByTestId("late-receipt-row").find((row) => within(row).queryByText(fileName));

const expenseRow = async (merchant) =>
  (await screen.findAllByTestId("expense-status-row")).find((row) => within(row).queryByText(new RegExp(merchant)));

describe("late receipt flow: employee attaches, Finance reviews, employee sees the result", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.roles = ["General"];
    state.store = {
      late: [lateReceipt("rcpt-1", "line-1"), lateReceipt("rcpt-2", "line-2")],
      reportReceipts: [],
    };
  });

  it("a verified late receipt shows as Verified to the employee, and its expense no longer offers Add receipt", async () => {
    const { unmount: unmountReviewer } = render(<LateReceiptReviewPage />);
    const queueRow = (await screen.findAllByTestId("late-review-item"))
      .find((row) => within(row).queryByText("rcpt-1.pdf"));
    fireEvent.change(within(queueRow).getByLabelText("Review note for rcpt-1.pdf"), {
      target: { value: "Matches the hotel invoice" },
    });
    fireEvent.click(within(queueRow).getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(state.store.late.find((r) => r.receiptId === "rcpt-1").verificationStatus).toBe("VERIFIED"));
    unmountReviewer();

    renderEmployeePanel();

    expect(await screen.findByText("rcpt-1.pdf")).toBeInTheDocument();
    expect(within(rowFor("rcpt-1.pdf")).getByText("Verified")).toBeInTheDocument();
    expect(within(rowFor("rcpt-1.pdf")).getByText(/Review note: Matches the hotel invoice/)).toBeInTheDocument();

    const hotel = await expenseRow("Hotel Taj");
    expect(within(hotel).getByText("Late receipt verified")).toBeInTheDocument();
    expect(within(hotel).queryByRole("button", { name: "Add receipt" })).toBeNull();
    const cab = await expenseRow("City Cab");
    expect(within(cab).getByText("Late receipt under review")).toBeInTheDocument();
    expect(within(cab).queryByRole("button", { name: "Add receipt" })).toBeNull();
  });

  it("a rejected late receipt shows as Rejected with the reason, and its expense can take another receipt", async () => {
    const { unmount: unmountReviewer } = render(<LateReceiptReviewPage />);
    const queueRow = (await screen.findAllByTestId("late-review-item"))
      .find((row) => within(row).queryByText("rcpt-2.pdf"));
    fireEvent.change(within(queueRow).getByLabelText("Review note for rcpt-2.pdf"), {
      target: { value: "The receipt is for a different trip" },
    });
    fireEvent.click(within(queueRow).getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(state.store.late.find((r) => r.receiptId === "rcpt-2").verificationStatus).toBe("REJECTED"));
    unmountReviewer();

    renderEmployeePanel();

    expect(await screen.findByText("rcpt-2.pdf")).toBeInTheDocument();
    expect(within(rowFor("rcpt-2.pdf")).getByText("Rejected")).toBeInTheDocument();
    expect(within(rowFor("rcpt-2.pdf")).getByText(/Review note: The receipt is for a different trip/)).toBeInTheDocument();

    const cab = await expenseRow("City Cab");
    expect(within(cab).getByText("Late receipt rejected")).toBeInTheDocument();
    expect(within(cab).getByRole("button", { name: "Add receipt" })).toBeInTheDocument();
    const hotel = await expenseRow("Hotel Taj");
    expect(within(hotel).queryByRole("button", { name: "Add receipt" })).toBeNull();
  });

  it("Add receipt on an expense opens the form with that expense already chosen", async () => {
    state.store.late = [lateReceipt("rcpt-2", "line-2")];
    state.store.late[0].verificationStatus = "REJECTED";

    renderEmployeePanel();

    const cab = await expenseRow("City Cab");
    fireEvent.click(within(cab).getByRole("button", { name: "Add receipt" }));

    expect(screen.getByLabelText("Expense")).toHaveValue("line-2");
  });

  it("an expense with no receipt whose category requires one is shown as needing it", async () => {
    state.store.late = [];

    render(
      <LateReceiptPanel
        reportId={REPORT_ID}
        reportStatus="APPROVED"
        lineItems={LINES}
        tripStartDate="2026-11-04"
        tripEndDate="2026-11-07"
      />
    );

    const cab = await expenseRow("City Cab");
    expect(within(cab).getByText("Receipt needed")).toBeInTheDocument();
    expect(within(screen.getByTestId("expense-receipt-status")).getByText(/Trip:/)).toBeInTheDocument();
  });

  it("an expense that already has its original receipt does not offer Add receipt", async () => {
    state.store.late = [];
    state.store.reportReceipts = [{ receiptId: "orig-1", lineItemId: "line-1" }];

    renderEmployeePanel();

    const hotel = await expenseRow("Hotel Taj");
    expect(within(hotel).getByText("Receipt attached")).toBeInTheDocument();
    expect(within(hotel).queryByRole("button", { name: "Add receipt" })).toBeNull();
  });
});
