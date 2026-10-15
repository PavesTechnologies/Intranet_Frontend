import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import PaymentRunsPage from "./PaymentRunsPage";
import PaymentRunDetailPage from "./PaymentRunDetailPage";
import * as hooks from "../hooks/usePaymentRuns";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../hooks/usePaymentRuns", () => ({
  usePaymentRuns: vi.fn(), usePaymentRun: vi.fn(), useRunCandidates: vi.fn(), useCreateRun: vi.fn(),
  useRunStep: vi.fn(), useConfirmRun: vi.fn(), useConfirmRunFile: vi.fn(), useRemoveRunInvoice: vi.fn(),
}));
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mutation = (value = {}) => ({ mutateAsync: vi.fn().mockResolvedValue(value), isPending: false });
const TRANSFER = {
  reference: "PR00007V00016", vendor_id: 16, vendor_name: "KEKA TECHNOLOGIES PRIVATE LIMITED", amount: 64496, mode: "NEFT",
  bank_name: "HDFC Bank", account_number: "50200012340002", ifsc: "HDFC0DEMO01", status: "PENDING", utr: null,
  invoices: [{ invoice_id: 32, invoice_number: "KTPL/26-27/0550", amount: 64496, status: "PENDING" }],
};
const RUN = (status) => ({ run_id: 7, name: "Week 42", value_date: "2026-10-16", status, total: 64496, invoice_count: 1,
  transfer_count: 1, transfers: [TRANSFER], file_generated_at: status === "APPROVED" ? null : "2026-10-14T10:00:00Z" });

beforeEach(() => {
  vi.clearAllMocks();
  useApPermissions.mockReturnValue({ canPreparePaymentRuns: true, canApprovePaymentRuns: false });
  hooks.usePaymentRuns.mockReturnValue({ data: [], isLoading: false });
  hooks.useRunCandidates.mockReturnValue({ data: [
    { invoice_id: 32, invoice_number: "KTPL/26-27/0550", vendor_name: "KEKA", due_date: "2026-10-31", outstanding: 64496, overdue_days: 0,
      bank: { bank_name: "HDFC Bank", account_last4: "0002" }, blocked: null },
    { invoice_id: 40, invoice_number: "WWIM/HYD/26-27/02585", vendor_name: "WeWork", due_date: "2026-10-15", outstanding: 77760, overdue_days: 0,
      bank: null, blocked: "No primary bank account for this vendor" },
  ], isLoading: false });
  for (const name of ["useCreateRun", "useRunStep", "useConfirmRun", "useConfirmRunFile", "useRemoveRunInvoice"]) hooks[name].mockReturnValue(mutation({ run_id: 7, paid: 1, failed: 0 }));
});

describe("PaymentRunsPage", () => {
  it("creates a run from the payable invoices only", async () => {
    const create = mutation({ run_id: 7 });
    hooks.useCreateRun.mockReturnValue(create);
    render(<PaymentRunsPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole("button", { name: /New payment run/ }));
    expect(screen.getByLabelText("Select WWIM/HYD/26-27/02585")).toBeDisabled();
    expect(screen.getByText("No primary bank account for this vendor")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Select KTPL/26-27/0550"));
    await userEvent.click(screen.getByRole("button", { name: /Create run · 1 invoice/ }));
    expect(create.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ invoice_ids: [32] }));
  });
});

const renderDetail = () => render(
  <MemoryRouter initialEntries={["/accounts-payable/payments/runs/7"]}>
    <Routes><Route path="/accounts-payable/payments/runs/:runId" element={<PaymentRunDetailPage />} /></Routes>
  </MemoryRouter>,
);

describe("PaymentRunDetailPage", () => {
  it("only the approver sees approve; the preparer is told to wait", () => {
    hooks.usePaymentRun.mockReturnValue({ data: RUN("SUBMITTED"), isLoading: false });
    renderDetail();
    expect(screen.queryByRole("button", { name: "Approve run" })).toBeNull();
    expect(screen.getByText(/Waiting for the Finance Manager/)).toBeInTheDocument();
  });

  it("mark sent needs the bank file first", () => {
    hooks.usePaymentRun.mockReturnValue({ data: RUN("APPROVED"), isLoading: false });
    renderDetail();
    expect(screen.getByRole("button", { name: "Mark sent to bank" })).toBeDisabled();
  });

  it("records the bank's UTR for a transfer", async () => {
    const confirm = mutation({ paid: 1, failed: 0 });
    hooks.useConfirmRun.mockReturnValue(confirm);
    hooks.usePaymentRun.mockReturnValue({ data: RUN("SENT"), isLoading: false });
    renderDetail();
    await userEvent.selectOptions(screen.getByLabelText("Result for PR00007V00016"), "PAID");
    await userEvent.type(screen.getByLabelText("UTR for PR00007V00016"), "HDFCN26287412345");
    await userEvent.click(screen.getByRole("button", { name: "Save bank result" }));
    expect(confirm.mutateAsync).toHaveBeenCalledWith({ runId: "7", results: [{ reference: "PR00007V00016", status: "PAID", utr: "HDFCN26287412345" }] });
  });
});
