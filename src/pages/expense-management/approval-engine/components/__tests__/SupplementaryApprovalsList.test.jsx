import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SupplementaryApprovalsList from "@/pages/expense-management/approval-engine/components/SupplementaryApprovalsList";
import { financeClaimService, managerClaimService } from "@/pages/expense-management/api/supplementaryClaimApi";

vi.mock("@/pages/expense-management/api/supplementaryClaimApi", async (importOriginal) => ({
  ...(await importOriginal()),
  managerClaimService: { queue: vi.fn(), approve: vi.fn(), reject: vi.fn(), clarify: vi.fn() },
  financeClaimService: { queue: vi.fn(), approve: vi.fn(), reject: vi.fn(), clarify: vi.fn() },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));
vi.mock("@/pages/expense-management/approval-engine/components/EmployeeLabel", () => ({
  default: ({ employeeId }) => <span>{employeeId}</span>,
}));

function renderList(props) {
  return render(
    <MemoryRouter>
      <table>
        <SupplementaryApprovalsList activeTab="pending" isFinance={false} isManager {...props} />
      </table>
    </MemoryRouter>,
  );
}

describe("SupplementaryApprovalsList queue errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("names the missing Finance permission when the Finance queue is refused, instead of showing an empty list", async () => {
    financeClaimService.queue.mockRejectedValue({ response: { status: 403, data: { message: "Missing permission" } } });

    renderList({ isManager: false, isFinance: true });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Finance Executive role");
    expect(alert).toHaveTextContent("Ask your administrator");
  });

  it("shows the server's reason for other failures", async () => {
    managerClaimService.queue.mockRejectedValue({ response: { status: 500, data: { message: "Queue unavailable" } } });

    renderList({ isManager: true, isFinance: false });

    expect(await screen.findByRole("alert")).toHaveTextContent("Queue unavailable");
  });

  it("shows no error when the queue loads", async () => {
    managerClaimService.queue.mockResolvedValue({ data: { data: [] } });

    renderList({ isManager: true, isFinance: false });

    await waitFor(() => expect(managerClaimService.queue).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
