import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Gstr2bPanel from "./Gstr2bPanel";
import * as hooks from "../hooks/useGstItc";

vi.mock("../hooks/useGstItc", () => ({ useGstr2b: vi.fn(), useImportGstr2b: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const GSTIN = "36AADCH8710J1ZH";
const entry = (extra) => ({
  entry_id: 1, supplier_gstin: GSTIN, supplier_name: "WEWORK INDIA", doc_type: "INV", doc_number: "WWIM/HYD/26-27/02902",
  doc_date: "2026-09-01", taxable_value: 270000, tax: 48600, match_status: "MATCHED", matched_invoice_id: 40,
  matched_invoice_number: "WWIM/HYD/26-27/02902", tax_difference: 0, note: null, itc_available: true, ...extra,
});

const DATA = {
  imports: [{ import_id: 3, period: "2026-09-01", file_name: "GSTR2B_092026.json" }],
  period: "2026-09-01", import_id: 3, file_name: "GSTR2B_092026.json", generated_on: "2026-10-14",
  counts: { MATCHED: 1, MISMATCH: 1, NOT_IN_BOOKS: 1, MISSING_IN_2B: 1 },
  entries: [
    entry(),
    entry({ entry_id: 2, doc_number: "WWIM/HYD/26-27/02950", match_status: "MISMATCH", tax_difference: 500, tax: 49100,
            note: "Supplier filed tax 49,100.00 vs 48,600.00 in the books", itc_status: "CLAIMED" }),
    entry({ entry_id: 3, doc_number: "WWIM/HYD/26-27/03001", match_status: "NOT_IN_BOOKS", matched_invoice_id: null,
            matched_invoice_number: null, note: "Filed by the supplier but not in the books" }),
  ],
  missing_in_2b: [{ invoice_id: 41, invoice_number: "KTPL/26-27/0527", invoice_date: "2026-09-01", vendor_name: "KEKA",
                    supplier_gstin: GSTIN, itc: 9567, itc_status: "PENDING" }],
};

const importer = { mutateAsync: vi.fn().mockResolvedValue({ period: "2026-09-01", counts: { MATCHED: 1, MISMATCH: 1, NOT_IN_BOOKS: 1 } }), isPending: false };

beforeEach(() => {
  vi.clearAllMocks();
  hooks.useGstr2b.mockReturnValue({ data: DATA, isLoading: false, isError: false });
  hooks.useImportGstr2b.mockReturnValue(importer);
});

const renderPanel = (canManage = true) => render(<Gstr2bPanel canManage={canManage} />, { wrapper: MemoryRouter });

describe("Gstr2bPanel", () => {
  it("shows what needs action first: mismatches, missing in 2B and not in books", () => {
    renderPanel();
    const table = screen.getByRole("table");
    expect(within(table).getByText("WWIM/HYD/26-27/02950")).toBeInTheDocument();
    expect(within(table).getByText("KTPL/26-27/0527")).toBeInTheDocument();
    expect(within(table).getByText("WWIM/HYD/26-27/03001")).toBeInTheDocument();
    expect(within(table).queryByText("WWIM/HYD/26-27/02902")).toBeNull();
    expect(within(table).getByText(/vs books/)).toBeInTheDocument();
    expect(within(table).getByText(/Credit already claimed/)).toBeInTheDocument();
  });

  it("lists matched documents on their own tab", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("tab", { name: /Matched/ }));
    expect(within(screen.getByRole("table")).getByText("WWIM/HYD/26-27/02902")).toBeInTheDocument();
  });

  it("imports a GSTR-2B file for the chosen period", async () => {
    renderPanel();
    const file = new File(['{"data":{}}'], "GSTR2B_092026.json", { type: "application/json" });
    await userEvent.upload(screen.getByLabelText("GSTR-2B file"), file);
    expect(importer.mutateAsync).toHaveBeenCalledWith({ file, period: expect.stringMatching(/^\d{4}-\d{2}-01$/) });
  });

  it("explains the state before anything is imported, and hides import without permission", () => {
    hooks.useGstr2b.mockReturnValue({ data: { imports: [], period: null, entries: [], missing_in_2b: [], counts: {} }, isLoading: false, isError: false });
    renderPanel(false);
    expect(screen.getByText(/No GSTR-2B imported yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Import GSTR-2B/ })).toBeNull();
  });
});
