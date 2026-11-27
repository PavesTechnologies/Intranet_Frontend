import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import AccountingExportPage from "./AccountingExportPage";
import * as hooks from "../hooks/useAccountingExport";
import { useApPermissions } from "../../hooks/useApPermissions";
import { downloadBlob } from "../../utils/documentUpload";

vi.mock("../hooks/useAccountingExport", () => ({
  useExportPreview: vi.fn(), useExportHistory: vi.fn(), useRunExport: vi.fn(), useLedgers: vi.fn(), useUpdateLedgers: vi.fn(),
}));
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));
vi.mock("../../utils/documentUpload", () => ({ downloadBlob: vi.fn(), extractFileNameFromContentDisposition: (_h, f) => f }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const VOUCHER = {
  source_type: "INVOICE", source_id: 7, voucher_type: "Journal", number: "APM/INV/7", date: "2026-09-02", reference: "AWSIN26-4365006",
  narration: "Purchase invoice AWSIN26-4365006 - AMAZON WEB SERVICES", party: "AMAZON WEB SERVICES", amount: 262420.2, exported_at: null,
  lines: [
    { ledger: "IT software Expenses", debit: 222390, credit: 0, bill: null },
    { ledger: "Input IGST", debit: 40030.2, credit: 0, bill: null },
    { ledger: "AMAZON WEB SERVICES", debit: 0, credit: 240150.2, bill: "AWSIN26-4365006" },
    { ledger: "TDS Payable - 194J", debit: 0, credit: 22270, bill: null },
  ],
};
const PREVIEW = { total: 3, selected: 1, already_exported: 2, unbalanced: [], by_type: { INVOICE: { count: 1, amount: 262420.2 } }, vouchers: [VOUCHER] };
const LEDGERS = {
  company: "", ledgers: [{ key: "BANK", label: "Bank (payments and TDS deposits)", group: "Bank Accounts", name: "Bank Account" }],
  categories: [{ category_id: 2, category: "IT software", name: "IT software Expenses" }],
};

let exporter;
let saver;
beforeEach(() => {
  vi.clearAllMocks();
  exporter = { mutateAsync: vi.fn().mockResolvedValue({ data: new Blob(["<x/>"]), headers: { "x-voucher-count": "1" } }), isPending: false };
  saver = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
  hooks.useExportPreview.mockReturnValue({ data: PREVIEW, isLoading: false, isError: false });
  hooks.useExportHistory.mockReturnValue({ data: [] });
  hooks.useRunExport.mockReturnValue(exporter);
  hooks.useLedgers.mockReturnValue({ data: LEDGERS, isLoading: false });
  hooks.useUpdateLedgers.mockReturnValue(saver);
  useApPermissions.mockReturnValue({ canEditLedgers: true });
});

const renderPage = () => render(<AccountingExportPage />, { wrapper: MemoryRouter });

describe("AccountingExportPage", () => {
  it("previews the vouchers and their ledger lines", async () => {
    renderPage();
    expect(screen.getByText(/2 voucher\(s\) in this period were exported before/)).toBeInTheDocument();
    await userEvent.click(screen.getByText("APM/INV/7"));
    expect(screen.getByText("TDS Payable - 194J")).toBeInTheDocument();
    expect(screen.getByText("Input IGST")).toBeInTheDocument();
  });

  it("exports in the chosen format and downloads the file", async () => {
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText("Format"), "ZOHO_CSV");
    await userEvent.click(screen.getByRole("button", { name: /Export 1 voucher/ }));
    expect(exporter.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ format: "ZOHO_CSV", includeExported: false,
      types: ["INVOICE", "PAYMENT", "NOTE", "CHALLAN"] }));
    expect(downloadBlob).toHaveBeenCalled();
  });

  it("re-export and voucher kinds feed the preview", async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText("Re-export already exported"));
    await userEvent.click(screen.getByLabelText("TDS deposits"));
    expect(hooks.useExportPreview).toHaveBeenLastCalledWith(expect.objectContaining({ includeExported: true,
      types: ["INVOICE", "PAYMENT", "NOTE"] }));
  });

  it("saves ledger names, and blocks blanks", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /Ledger names/ }));
    const bank = screen.getByLabelText("Bank (payments and TDS deposits)");
    await userEvent.clear(bank);
    expect(screen.getByRole("button", { name: "Save ledger names" })).toBeDisabled();
    await userEvent.type(bank, "HDFC Bank - 50200012345");
    await userEvent.click(screen.getByRole("button", { name: "Save ledger names" }));
    expect(saver.mutateAsync).toHaveBeenCalledWith({ company: "", ledgers: { BANK: "HDFC Bank - 50200012345" }, categories: { 2: "IT software Expenses" } });
  });

  it("ledger names are read-only without the permission", async () => {
    useApPermissions.mockReturnValue({ canEditLedgers: false });
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /Ledger names/ }));
    expect(screen.getByLabelText("Bank (payments and TDS deposits)")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save ledger names" })).toBeNull();
  });
});
