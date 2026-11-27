import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import VendorNotesPage from "./VendorNotesPage";
import * as hooks from "../hooks/useVendorNotes";
import { useApPermissions } from "../../hooks/useApPermissions";
import { validateNote } from "../components/NoteFormModal";

vi.mock("../hooks/useVendorNotes", () => ({
  useVendorNotes: vi.fn(), useApplicableInvoices: vi.fn(), useApplyNote: vi.fn(), useCancelNote: vi.fn(), useRecordNote: vi.fn(),
}));
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));
vi.mock("../components/NoteFormModal", async (orig) => ({ ...(await orig()), default: ({ noteType }) => <div>form {noteType}</div> }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const NOTE = {
  note_id: 3, note_type: "DEBIT_NOTE", vendor_id: 16, vendor_name: "KEKA TECHNOLOGIES PRIVATE LIMITED", note_number: "DN-2026-007",
  note_date: "2026-10-08", reason: "5 licences billed but not received", taxable_value: 4500, gst: 0, total_amount: 4500,
  status: "OPEN", reference_invoice_id: 48, reference_invoice_number: "KTPL/26-27/0633", applied_invoice_id: null,
  applied_invoice_number: null, tds_note: null, itc_period: null, has_document: false, cancel_reason: null,
};

const applyMutate = vi.fn().mockResolvedValue({ tds_note: "TDS base lowered" });

beforeEach(() => {
  vi.clearAllMocks();
  hooks.useVendorNotes.mockReturnValue({ data: { notes: [NOTE], summary: { open: 1, open_amount: 4500, applied: 0, credit_gst: 0 } }, isLoading: false });
  hooks.useApplicableInvoices.mockReturnValue({ data: [{ invoice_id: 50, invoice_number: "KTPL/26-27/0550", outstanding: 64496 }] });
  hooks.useApplyNote.mockReturnValue({ mutateAsync: applyMutate, isPending: false });
  hooks.useCancelNote.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  useApPermissions.mockReturnValue({ canManageVendorNotes: true });
});

const renderPage = () => render(<VendorNotesPage />, { wrapper: MemoryRouter });

describe("VendorNotesPage", () => {
  it("lists notes with what they correct", () => {
    renderPage();
    expect(screen.getByText("DN-2026-007")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "KTPL/26-27/0633" })).toHaveAttribute("href", "/accounts-payable/invoices/48");
    expect(screen.getAllByText("Not applied").length).toBeGreaterThan(0);
  });

  it("applies an open note to a chosen unpaid invoice", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Apply to invoice" }));
    await userEvent.selectOptions(screen.getByLabelText("Invoice to apply to"), "50");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(applyMutate).toHaveBeenCalledWith({ noteId: 3, invoiceId: "50" });
  });

  it("opens the right form", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /Record credit note/ }));
    expect(screen.getByText("form CREDIT_NOTE")).toBeInTheDocument();
  });

  it("is read-only without the manage permission", () => {
    useApPermissions.mockReturnValue({ canManageVendorNotes: false });
    renderPage();
    expect(screen.queryByRole("button", { name: "Apply to invoice" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Record credit note/ })).toBeNull();
  });
});

describe("validateNote", () => {
  const good = { note_number: "CN-1", note_date: "2026-10-01", reason: "Service credit", taxable_value: "1000", cgst: "", sgst: "", igst: "180" };
  it("accepts a valid credit note", () => {
    expect(validateNote(good, "CREDIT_NOTE", 15)).toEqual({});
  });
  it("rejects GST on a debit note and mixed GST", () => {
    expect(validateNote(good, "DEBIT_NOTE", 15).igst).toMatch(/no GST/);
    expect(validateNote({ ...good, cgst: "90" }, "CREDIT_NOTE", 15).igst).toMatch(/not both/);
    expect(Object.keys(validateNote({ ...good, note_number: "", reason: "x", taxable_value: "0" }, "CREDIT_NOTE", null)).sort())
      .toEqual(["note_number", "reason", "taxable_value", "vendor"]);
  });
});
