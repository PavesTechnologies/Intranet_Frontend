import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SupplementaryClaimsPage from "@/pages/expense-management/pages/supplementary/SupplementaryClaimsPage";
import { supplementaryClaimService } from "@/pages/expense-management/api/supplementaryClaimApi";
import { expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";

vi.mock("@/pages/expense-management/api/supplementaryClaimApi", async (importOriginal) => ({
  ...(await importOriginal()),
  supplementaryClaimService: { listMine: vi.fn(), cancel: vi.fn(), eligibility: vi.fn(), create: vi.fn() },
}));
vi.mock("@/pages/expense-management/api/expenseReportsApi", () => ({
  expenseReportService: { getAll: vi.fn() },
}));
vi.mock("@/components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

const claim = (id, status, extra = {}) => ({
  claimId: id,
  claimNumber: `SUP-${id}`,
  reportNumber: `EXP-${id}`,
  status,
  totalAmount: 588,
  currencyCode: "INR",
  createdAt: "2026-11-18T10:00:00",
  items: [{ claimItemId: `${id}-1`, amount: 588 }],
  paymentStatus: "NONE",
  ...extra,
});

const ALL_CLAIMS = [
  claim("DRAFT0", "DRAFT", { items: [] }),
  claim("DRAFT1", "DRAFT"),
  claim("PEND", "PENDING_FINANCE"),
  claim("CLAR", "CLARIFICATION_REQUIRED"),
  claim("SET", "SETTLED", { paymentStatus: "PAID", paymentReference: "UTR-123" }),
];

function renderPage() {
  return render(
    <MemoryRouter>
      <SupplementaryClaimsPage />
    </MemoryRouter>,
  );
}

const listResponse = (rows) => ({ data: { data: rows } });

describe("My Supplementary Claims page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    expenseReportService.getAll.mockResolvedValue({ data: { data: [] } });
  });

  it("shows the title and the five summary cards calculated from the claims", async () => {
    supplementaryClaimService.listMine.mockResolvedValue(listResponse(ALL_CLAIMS));
    renderPage();

    expect(screen.getByRole("heading", { name: "My Supplementary Claims" })).toBeInTheDocument();
    expect(await screen.findByTestId("summary-Total claims")).toHaveTextContent("5");
    expect(screen.getByTestId("summary-Draft")).toHaveTextContent("2");
    expect(screen.getByTestId("summary-Pending approval")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-Clarification required")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-Settled")).toHaveTextContent("1");
  });

  it("renders the table columns and keeps a Draft with zero expenses visible", async () => {
    supplementaryClaimService.listMine.mockResolvedValue(listResponse(ALL_CLAIMS));
    renderPage();

    const table = await screen.findByRole("table");
    for (const header of ["Claim reference", "Original report", "Created", "Expense items", "Claim amount", "Status", "Payment"]) {
      expect(within(table).getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    const zeroRow = within(table).getByText("SUP-DRAFT0").closest("tr");
    expect(within(zeroRow).getByText("Draft")).toBeInTheDocument();
    expect(within(zeroRow).getByText("0")).toBeInTheDocument();
  });

  it("opens each claim's detail page from View, including a Draft with zero expenses", async () => {
    supplementaryClaimService.listMine.mockResolvedValue(listResponse([claim("DRAFT0", "DRAFT", { items: [] })]));
    renderPage();

    const view = await screen.findByRole("link", { name: "View SUP-DRAFT0" });
    expect(view).toHaveAttribute("href", "/expense-management/expenses/supplementary/DRAFT0");
  });

  it("offers Edit and Cancel only where the claim rules allow them", async () => {
    supplementaryClaimService.listMine.mockResolvedValue(listResponse(ALL_CLAIMS));
    renderPage();
    await screen.findByRole("table");

    expect(screen.getByRole("link", { name: "Edit SUP-DRAFT1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit SUP-CLAR" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit SUP-PEND" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit SUP-SET" })).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Cancel SUP-DRAFT1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel SUP-PEND" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel SUP-SET" })).not.toBeInTheDocument();
  });

  it("shows the payment reference once a claim is paid", async () => {
    supplementaryClaimService.listMine.mockResolvedValue(listResponse(ALL_CLAIMS));
    renderPage();

    expect(await screen.findByText("UTR-123")).toBeInTheDocument();
  });

  it("cancels a claim only after confirmation, then reloads the list", async () => {
    supplementaryClaimService.listMine.mockResolvedValue(listResponse(ALL_CLAIMS));
    supplementaryClaimService.cancel.mockResolvedValue({ data: { data: {} } });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Cancel SUP-DRAFT1" }));
    expect(supplementaryClaimService.cancel).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Cancel Claim" }));

    await waitFor(() => expect(supplementaryClaimService.cancel).toHaveBeenCalledWith("DRAFT1"));
    await waitFor(() => expect(supplementaryClaimService.listMine).toHaveBeenCalledTimes(2));
  });

  it("searches by claim or report reference and filters by status", async () => {
    supplementaryClaimService.listMine.mockResolvedValue(listResponse(ALL_CLAIMS));
    renderPage();
    await screen.findByRole("table");

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "EXP-PEND" } });
    expect(screen.getByText("Showing 1 of 5 claims")).toBeInTheDocument();
    expect(screen.queryByText("SUP-DRAFT1")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "DRAFT" } });
    expect(screen.getByText("Showing 2 of 5 claims")).toBeInTheDocument();
  });

  it("says when nothing matches and clears the filters", async () => {
    supplementaryClaimService.listMine.mockResolvedValue(listResponse(ALL_CLAIMS));
    renderPage();
    await screen.findByRole("table");

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no-such-claim" } });
    expect(screen.getByText("No claims match your search or filter.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Showing 5 of 5 claims")).toBeInTheDocument();
  });

  it("sorts by claim amount", async () => {
    supplementaryClaimService.listMine.mockResolvedValue(listResponse([
      claim("LOW", "DRAFT", { totalAmount: 10 }),
      claim("HIGH", "DRAFT", { totalAmount: 900 }),
    ]));
    renderPage();
    await screen.findByRole("table");

    fireEvent.change(screen.getByLabelText("Sort claims"), { target: { value: "amount-desc" } });
    const refs = screen.getAllByText(/^SUP-/).map((el) => el.textContent);
    expect(refs).toEqual(["SUP-HIGH", "SUP-LOW"]);
  });

  it("shows the empty state when the employee has no claims, with a way to raise one", async () => {
    supplementaryClaimService.listMine.mockResolvedValue(listResponse([]));
    renderPage();

    expect(await screen.findByText("No supplementary claims yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows a loading state while the claims load", () => {
    supplementaryClaimService.listMine.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole("status", { name: "Loading claims" })).toBeInTheDocument();
  });

  it("shows an error with a retry when the claims cannot load", async () => {
    supplementaryClaimService.listMine
      .mockRejectedValueOnce({ response: { data: { message: "Service unavailable" } } })
      .mockResolvedValueOnce(listResponse(ALL_CLAIMS));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("keeps the raise-a-claim section on the page", async () => {
    supplementaryClaimService.listMine.mockResolvedValue(listResponse([]));
    renderPage();

    expect(await screen.findByRole("heading", { name: "Raise a new claim" })).toBeInTheDocument();
  });
});
