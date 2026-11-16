import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequestAdvancePage from "../RequestAdvancePage";
import { cashAdvanceApi } from "../../../api/cashAdvanceApi";
import { lookupService } from "../../../api/expenseReportsApi";

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => vi.fn(),
}));
vi.mock("../../../api/cashAdvanceApi");
vi.mock("../../../api/expenseReportsApi");
vi.mock("@/components/toastfy/toast");

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RequestAdvancePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillTitleAndAmount() {
  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Pune trip" } });
  fireEvent.change(screen.getByLabelText(/^Amount Required/), { target: { value: "5000" } });
}

describe("RequestAdvancePage: supporting documents and drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupService.getActiveCostCenters.mockResolvedValue([]);
    lookupService.getActiveCurrencies.mockResolvedValue([{ currencyId: "cur-1", currencyCode: "INR", currencyName: "Rupee" }]);
    cashAdvanceApi.getMyAdvances.mockResolvedValue({ data: { data: [] } });
    cashAdvanceApi.myProfile.mockResolvedValue({ employeeId: "EMP001", fullName: "Ravi Menon" });
    cashAdvanceApi.listDocuments.mockResolvedValue([]);
    cashAdvanceApi.create.mockResolvedValue({ data: { data: { advanceId: "adv-1" } } });
    cashAdvanceApi.update.mockResolvedValue({ data: { data: {} } });
  });

  it("shows the optional supporting documents section on the request form", async () => {
    renderPage();
    expect(await screen.findByText(/Supporting documents/)).toBeInTheDocument();
  });

  it("saves the draft once, then updates that same draft on the next save (no duplicate drafts)", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument());
    await fillTitleAndAmount();

    fireEvent.click(screen.getByRole("button", { name: /Save Draft/i }));
    await waitFor(() => expect(cashAdvanceApi.create).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /Save Draft/i }));
    await waitFor(() => expect(cashAdvanceApi.update).toHaveBeenCalledWith("adv-1", expect.objectContaining({ title: "Pune trip" })));
    expect(cashAdvanceApi.create).toHaveBeenCalledTimes(1);
  });

  it("saves the draft on the first document, so the document has a request to belong to", async () => {
    cashAdvanceApi.uploadDocument.mockResolvedValue({});
    renderPage();
    await waitFor(() => expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument());
    await fillTitleAndAmount();

    const file = new File(["%PDF-1.4"], "itinerary.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Add supporting documents"), { target: { files: [file] } });

    await waitFor(() => expect(cashAdvanceApi.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(cashAdvanceApi.uploadDocument).toHaveBeenCalledWith("adv-1", "OTHER", file));
  });

  it("asks for a title and amount before a document can create the draft", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument());

    const file = new File(["%PDF-1.4"], "itinerary.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Add supporting documents"), { target: { files: [file] } });

    // shown in the alert and on the failed row
    await waitFor(() => expect(screen.getAllByText(/Enter a title and an amount before adding documents/).length).toBeGreaterThan(0));
    expect(cashAdvanceApi.create).not.toHaveBeenCalled();
    expect(cashAdvanceApi.uploadDocument).not.toHaveBeenCalled();
  });
});
