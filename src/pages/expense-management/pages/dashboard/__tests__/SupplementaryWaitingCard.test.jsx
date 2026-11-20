import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SupplementaryWaitingCard, {
  financeWaitingSummary,
} from "@/pages/expense-management/pages/dashboard/SupplementaryWaitingCard";
import { financeClaimService } from "@/pages/expense-management/api/supplementaryClaimApi";

vi.mock("@/pages/expense-management/api/supplementaryClaimApi", async (importOriginal) => ({
  ...(await importOriginal()),
  financeClaimService: { queue: vi.fn() },
}));

const claim = (id, totalAmount, extra = {}) => ({
  claimId: id,
  claimNumber: `SUP-${id}`,
  status: "PENDING_FINANCE",
  totalAmount,
  currencyCode: "INR",
  ...extra,
});

const queue = (rows) => ({ data: { data: rows } });

function renderCard() {
  return render(
    <MemoryRouter initialEntries={["/expense-management/dashboard"]}>
      <Routes>
        <Route path="/expense-management/dashboard" element={<SupplementaryWaitingCard />} />
        <Route path="/expense-management/approvals" element={<p>My Approvals page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("financeWaitingSummary", () => {
  it("counts only claims that are pending Finance and sums their amounts", () => {
    const summary = financeWaitingSummary([
      claim("1", 588),
      claim("2", 100.5),
      claim("3", 900, { status: "PENDING_MANAGER" }),
      claim("4", 50, { status: "SETTLED" }),
    ]);

    expect(summary.count).toBe(2);
    expect(summary.totals).toEqual({ INR: 688.5 });
  });

  it("keeps totals per currency instead of adding different currencies together", () => {
    const summary = financeWaitingSummary([claim("1", 100, { currencyCode: "INR" }), claim("2", 40, { currencyCode: "USD" })]);

    expect(summary.totals).toEqual({ INR: 100, USD: 40 });
  });

  it("is zero for an empty queue", () => {
    expect(financeWaitingSummary([])).toEqual({ count: 0, totals: {} });
  });
});

describe("SupplementaryWaitingCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the number and total of claims awaiting Finance, from the Finance queue", async () => {
    financeClaimService.queue.mockResolvedValue(queue([claim("1", 588), claim("2", 412)]));
    renderCard();

    expect(await screen.findByTestId("supp-waiting-count")).toHaveTextContent("2 claims");
    expect(screen.getByTestId("supp-waiting-total")).toHaveTextContent("1,000.00");
    expect(financeClaimService.queue).toHaveBeenCalledTimes(1);
  });

  it("ignores any row in the queue that is no longer pending Finance", async () => {
    financeClaimService.queue.mockResolvedValue(queue([claim("1", 200), claim("2", 999, { status: "SETTLED" })]));
    renderCard();

    expect(await screen.findByTestId("supp-waiting-count")).toHaveTextContent("1 claim");
    expect(screen.getByTestId("supp-waiting-total")).toHaveTextContent("200.00");
  });

  it("shows a clear empty state when nothing is waiting", async () => {
    financeClaimService.queue.mockResolvedValue(queue([]));
    renderCard();

    expect(await screen.findByText("No supplementary claims are waiting for Finance.")).toBeInTheDocument();
    expect(screen.queryByTestId("supp-waiting-count")).not.toBeInTheDocument();
  });

  it("shows a loading state while the queue loads", () => {
    financeClaimService.queue.mockReturnValue(new Promise(() => {}));
    renderCard();

    expect(screen.getByRole("status", { name: "Loading supplementary claims" })).toBeInTheDocument();
  });

  it("names the missing permission when the queue is refused, and shows no figures", async () => {
    financeClaimService.queue.mockRejectedValue({ response: { status: 403 } });
    renderCard();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Finance Executive role");
    expect(screen.queryByTestId("supp-waiting-count")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("shows the failure with the server's message, and retries on request", async () => {
    financeClaimService.queue
      .mockRejectedValueOnce({ response: { status: 500, data: { message: "Queue unavailable" } } })
      .mockResolvedValueOnce(queue([claim("1", 75)]));
    renderCard();

    expect(await screen.findByRole("alert")).toHaveTextContent("Queue unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByTestId("supp-waiting-count")).toHaveTextContent("1 claim");
    await waitFor(() => expect(financeClaimService.queue).toHaveBeenCalledTimes(2));
  });

  it("opens My Approvals from its action", async () => {
    financeClaimService.queue.mockResolvedValue(queue([]));
    renderCard();

    fireEvent.click(await screen.findByRole("button", { name: "Open My Approvals" }));
    expect(await screen.findByText("My Approvals page")).toBeInTheDocument();
  });
});
