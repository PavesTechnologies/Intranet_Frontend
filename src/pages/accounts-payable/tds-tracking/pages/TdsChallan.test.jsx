import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TdsChallanNewPage from "./TdsChallanNewPage";
import TdsFilingNewPage, { lastQuarter } from "./TdsFilingNewPage";
import TdsChallansPage from "./TdsChallansPage";
import * as hooks from "../hooks/useTdsChallans";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../hooks/useTdsChallans", () => ({
  useChallanCandidates: vi.fn(),
  useFilingCandidates: vi.fn(),
  useExtractChallan: vi.fn(),
  useExtractFiling: vi.fn(),
  useValidateChallan: vi.fn(),
  useValidateFiling: vi.fn(),
  useCreateChallan: vi.fn(),
  useCreateFiling: vi.fn(),
  useChallanList: vi.fn(),
  useFilingList: vi.fn(),
  useChallanDetail: vi.fn(),
  useFilingDetail: vi.fn(),
}));
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const m = (value) => ({ mutateAsync: vi.fn().mockResolvedValue(value), isPending: false });
const candidate = (id, tds) => ({
  invoice_id: id, invoice_number: `INV-${id}`, vendor_name: "Acme", section: "194C", tds_amount: tds,
  deduction_date: "2026-09-15", deposit_due_date: "2026-10-07", overdue: false, deposit_date: "2026-10-05", challan_number: "00123",
});

beforeEach(() => {
  vi.clearAllMocks();
  useApPermissions.mockReturnValue({ canUpdateTdsTracking: true });
  hooks.useChallanCandidates.mockReturnValue({ data: { items: [candidate(1, "5000.00"), candidate(2, "7000.00")] }, isLoading: false });
  hooks.useExtractChallan.mockReturnValue(m({
    fields: {
      challan_serial_no: { value: "00123", confidence: 95 }, bsr_code: { value: "0510308", confidence: 95 },
      deposit_date: { value: "2026-10-07", confidence: 95 }, tax_amount: { value: "12000.00", confidence: 95 },
      section_code: { value: "194C", confidence: 90 }, interest: { value: null, confidence: 0 },
    },
    cin: "05103080710202600123", cin_mismatch: false,
  }));
  hooks.useValidateChallan.mockReturnValue(m({ valid: true, errors: [], warnings: [] }));
  hooks.useCreateChallan.mockReturnValue(m({ cin: "05103080710202600123", invoice_count: 2 }));
  hooks.useFilingCandidates.mockReturnValue({
    data: { items: [candidate(1, "5000.00"), candidate(2, "7000.00")], period_start: "2026-07-01", period_end: "2026-09-30", statement_due_date: "2026-10-31", suggested_form: "26Q" },
    isLoading: false,
  });
  hooks.useExtractFiling.mockReturnValue(m({ fields: {} }));
  hooks.useValidateFiling.mockReturnValue(m({ valid: false, errors: [{ code: "QUARTER", message: "INV-2: deducted outside Q2" }], warnings: [] }));
  hooks.useCreateFiling.mockReturnValue(m({}));
});

const at = (path, element) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path.split("?")[0]} element={element} />
        <Route path="*" element={<p>elsewhere</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe("TdsChallanNewPage", () => {
  it("auto-fills from the challan, matches invoices to the tax and confirms with the file", async () => {
    const user = userEvent.setup();
    at("/accounts-payable/tds/challans/new", <TdsChallanNewPage />);
    const file = new File(["%PDF"], "challan.pdf", { type: "application/pdf" });
    await user.upload(screen.getByTestId("document-input"), file);
    expect(await screen.findByDisplayValue("0510308")).toBeInTheDocument();
    expect(screen.getAllByText("· auto-filled").length).toBeGreaterThan(3);
    expect(screen.getByText(/challan.pdf/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Select INV-1"));
    expect(screen.getByTestId("challan-difference")).toHaveTextContent("Difference");
    await user.click(screen.getByLabelText("Select INV-2"));
    expect(screen.getByTestId("challan-difference")).toHaveTextContent("Totals match");

    await user.click(screen.getByRole("button", { name: /Confirm challan for 2 invoices/ }));
    await waitFor(() => expect(hooks.useCreateChallan.mock.results[0].value.mutateAsync).toHaveBeenCalled());
    const call = hooks.useCreateChallan.mock.results[0].value.mutateAsync.mock.calls[0][0];
    expect(call.header).toMatchObject({ challan_serial_no: "00123", bsr_code: "0510308", deposit_date: "2026-10-07", tax_amount: "12000.00", total_amount: "12000.00" });
    expect(call.allocations).toEqual([{ invoice_id: 1, allocated_tds_amount: "5000.00" }, { invoice_id: 2, allocated_tds_amount: "7000.00" }]);
    expect(call.file.name).toBe("challan.pdf");
    expect(await screen.findByText("elsewhere")).toBeInTheDocument();
  });

  it("shows the check result and does not confirm when invalid", async () => {
    const user = userEvent.setup();
    hooks.useValidateChallan.mockReturnValue(m({ valid: false, errors: [{ code: "SUM", message: "Selected invoices' TDS 5,000.00 does not match the challan tax" }], warnings: [] }));
    at("/accounts-payable/tds/challans/new", <TdsChallanNewPage />);
    await user.click(screen.getByLabelText("Select INV-1"));
    await user.click(screen.getByRole("button", { name: /Confirm challan/ }));
    expect(await screen.findByText(/does not match the challan tax/)).toBeInTheDocument();
    expect(hooks.useCreateChallan.mock.results[0].value.mutateAsync).not.toHaveBeenCalled();
  });
});

describe("TdsFilingNewPage", () => {
  it("defaults to the last completed quarter", () => {
    expect(lastQuarter(new Date(2026, 9, 10))).toEqual({ financialYear: "2026-27", quarter: 2 });
    expect(lastQuarter(new Date(2026, 4, 2))).toEqual({ financialYear: "2025-26", quarter: 4 });
  });

  it("selects the quarter's deposited invoices and shows blocking checks", async () => {
    const user = userEvent.setup();
    at("/accounts-payable/tds/filings/new", <TdsFilingNewPage />);
    expect(screen.getByLabelText("Select INV-1")).toBeChecked();
    expect(screen.getByText(/2 of 2 selected/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Confirm filing for 2 invoices/ }));
    expect(await screen.findByText(/deducted outside Q2/)).toBeInTheDocument();
    expect(hooks.useCreateFiling.mock.results[0].value.mutateAsync).not.toHaveBeenCalled();
  });
});

describe("TdsChallansPage", () => {
  it("lists challans and opens one with its invoices", async () => {
    const user = userEvent.setup();
    hooks.useChallanList.mockReturnValue({ data: { items: [{ challan_id: 3, cin: "05103080710202600123", deposit_date: "2026-10-07", section_code: "194C", invoice_count: 2, total_amount: "12000.00", has_document: true }], total: 1 }, isLoading: false });
    hooks.useFilingList.mockReturnValue({ data: { items: [], total: 0 }, isLoading: false });
    hooks.useChallanDetail.mockImplementation((id) => ({
      data: id ? { cin: "05103080710202600123", deposit_date: "2026-10-07", bsr_code: "0510308", challan_serial_no: "00123", tax_amount: "12000", interest: "0", total_amount: "12000", has_document: true, allocations: [{ ...candidate(1, "5000"), allocated_tds_amount: "5000" }] } : undefined,
      isLoading: false,
    }));
    hooks.useFilingDetail.mockReturnValue({ data: undefined, isLoading: false });
    at("/accounts-payable/tds/challans", <TdsChallansPage />);
    expect(screen.getByRole("button", { name: /Record challan/ })).toBeInTheDocument();
    await user.click(screen.getByText("05103080710202600123"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("INV-1")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /View challan/ })).toBeInTheDocument();
  });
});
