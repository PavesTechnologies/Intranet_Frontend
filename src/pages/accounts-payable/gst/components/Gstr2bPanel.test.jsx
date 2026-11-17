import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Gstr2bPanel from "./Gstr2bPanel";
import * as hooks from "../hooks/useGstItc";
import { GSTIN, MATCH_DETAIL, OTHER_GSTIN, PERIODS, REGISTER, SUMMARY, matchItem, query, registerRow, setupGstHooks } from "../__fixtures__/gstFixtures";

vi.mock("../hooks/useGstItc", async () => {
  const { HOOK_NAMES } = await import("../__fixtures__/gstFixtures");
  return Object.fromEntries(HOOK_NAMES.map((n) => [n, vi.fn()]));
});
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let m;
beforeEach(() => {
  vi.clearAllMocks();
  m = setupGstHooks(hooks);
});

function renderPanel({ canManage = true, status = "", period = "2026-10", onStatusChange = vi.fn(), onOpenItc = vi.fn() } = {}) {
  render(
    <MemoryRouter>
      <Gstr2bPanel period={period} periods={PERIODS} canManage={canManage} status={status} onStatusChange={onStatusChange} onOpenItc={onOpenItc} />
    </MemoryRouter>,
  );
  return { onStatusChange, onOpenItc };
}

const xlsx = (name = "GSTR2B_102026.xlsx") => new File(["PK"], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

describe("Gstr2bPanel - backend matching results", () => {
  it("shows every reconciliation status, including legacy names, exactly as returned", () => {
    renderPanel();
    const table = screen.getByRole("table");
    for (const label of ["Matched", "Mismatched", "Missing in AP", "Missing in GSTR-2B", "Partially Matched", "Duplicate", "Requires Review"]) {
      expect(within(table).getAllByText(label).length).toBeGreaterThan(0);
    }
    // a book invoice missing in GSTR-2B has no 2B document, and a document missing in AP no invoice
    expect(within(table).getByText("KTPL/26-27/0527").closest("tr")).toHaveTextContent("Not in GSTR-2B");
    expect(within(table).getByText("WWIM/HYD/26-27/03001").closest("tr")).toHaveTextContent("Not in AP");
    expect(within(table).getByText(/CGST: supplier filed/)).toBeInTheDocument();
  });

  it("filters by status through the backend and shows the summary counts", async () => {
    const { onStatusChange } = renderPanel();
    await userEvent.click(screen.getByRole("button", { name: `Missing in AP · ${SUMMARY.missing_in_ap}` }));
    expect(onStatusChange).toHaveBeenCalledWith("MISSING_IN_AP");
    await userEvent.click(screen.getByRole("button", { name: "Needs action" }));
    expect(onStatusChange).toHaveBeenLastCalledWith(expect.stringContaining("MISSING_IN_GSTR2B"));
  });

  it("passes the selected status and a debounced search to GET /gstr2b/matches", async () => {
    renderPanel({ status: "MISMATCHED" });
    await userEvent.type(screen.getByPlaceholderText("Vendor, GSTIN or invoice no."), GSTIN);
    await waitFor(() => expect(hooks.useGstr2bMatches).toHaveBeenLastCalledWith(
      expect.objectContaining({ returnPeriod: "2026-10", status: "MISMATCHED", search: GSTIN, page: 1 }),
    ));
  });

  it("explains a period without an import, and hides import without permission", () => {
    hooks.useGstr2bSummary.mockReturnValue(query({ ...SUMMARY, import_status: "NOT_IMPORTED" }));
    renderPanel({ canManage: false, period: "2026-11" });
    expect(screen.getByText(/No GSTR-2B imported for Nov 2026 yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Import GSTR-2B/ })).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("Gstr2bPanel - Excel import and replacement", () => {
  it("imports an Excel file for a new period without replace", async () => {
    m.useImportGstr2b.mutateAsync.mockResolvedValue({
      return_period: "2026-09", import_status: "COMPLETED_WITH_ERRORS", total_records: 12, success_records: 10, skipped_records: 1, failed_records: 1,
      status_counts: { MATCHED: 9, MISMATCHED: 1 }, errors: [{ section: "B2B", row: 14, document: "X-1", errors: ["invalid GSTIN"] }],
    });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Import GSTR-2B/ }));
    const period = screen.getByLabelText("Import return period");
    await userEvent.clear(period);
    await userEvent.type(period, "2026-09");
    const file = xlsx();
    await userEvent.upload(screen.getByLabelText("GSTR-2B file"), file);
    expect(screen.getByText("GSTR2B_102026.xlsx")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(m.useImportGstr2b.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ file, returnPeriod: "2026-09", replace: false }));
    expect(await screen.findByText(/GSTR-2B for Sep 2026 imported/)).toBeInTheDocument();
    expect(screen.getByText("Imported").nextSibling).toHaveTextContent("10");
    expect(screen.getByText(/invalid GSTIN/)).toBeInTheDocument();
  });

  it("rejects files that are not Excel / JSON / CSV", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Import GSTR-2B/ }));
    await userEvent.upload(screen.getByLabelText("GSTR-2B file"), new File(["%PDF"], "gstr2b.pdf", { type: "application/pdf" }), { applyAccept: false });
    expect(screen.getByRole("alert")).toHaveTextContent(/\.xlsx or \.json/);
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("asks before replacing an existing import; cancel sends nothing", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Import GSTR-2B/ }));
    await userEvent.upload(screen.getByLabelText("GSTR-2B file"), xlsx());
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(screen.getByRole("alertdialog", { name: "Replace Existing GSTR-2B Import?" })).toHaveTextContent(/Previous import history will be retained/);
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(m.useImportGstr2b.mutateAsync).not.toHaveBeenCalled();
  });

  it("sends replace=true only after the replacement is confirmed", async () => {
    m.useImportGstr2b.mutateAsync.mockResolvedValue({ return_period: "2026-10", import_status: "COMPLETED", success_records: 3, replaced_import_id: 3, manual_mappings_carried: 2 });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Import GSTR-2B/ }));
    await userEvent.upload(screen.getByLabelText("GSTR-2B file"), xlsx());
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    await userEvent.click(screen.getByRole("button", { name: "Replace Import" }));
    expect(m.useImportGstr2b.mutateAsync).toHaveBeenCalledTimes(1);
    expect(m.useImportGstr2b.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ returnPeriod: "2026-10", replace: true }));
    expect(await screen.findByText(/Replaced import 3/)).toHaveTextContent("2 manual mapping(s) carried over");
  });

  it("falls back to the confirmation when the backend reports an existing import (409)", async () => {
    m.useImportGstr2b.mutateAsync
      .mockRejectedValueOnce({ response: { status: 409, data: { detail: "09-2026 already has a GSTR-2B import (a.xlsx, import 2). Import again with replace=true to supersede it" } } })
      .mockResolvedValueOnce({ return_period: "2026-09", import_status: "COMPLETED", success_records: 3 });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Import GSTR-2B/ }));
    const period = screen.getByLabelText("Import return period");
    await userEvent.clear(period);
    await userEvent.type(period, "2026-09");
    await userEvent.upload(screen.getByLabelText("GSTR-2B file"), xlsx());
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    await userEvent.click(await screen.findByRole("button", { name: "Replace Import" }));
    expect(m.useImportGstr2b.mutateAsync.mock.calls.map((c) => c[0].replace)).toEqual([false, true]);
  });

  it("shows the backend's refusal of an identical file", async () => {
    m.useImportGstr2b.mutateAsync.mockRejectedValue({ response: { status: 409, data: { detail: "This file is already the current GSTR-2B import for 09-2026 (import 2)" } } });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Import GSTR-2B/ }));
    const period = screen.getByLabelText("Import return period");
    await userEvent.clear(period);
    await userEvent.type(period, "2026-09");
    await userEvent.upload(screen.getByLabelText("GSTR-2B file"), xlsx());
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(await screen.findByText(/already the current GSTR-2B import/)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("Gstr2bPanel - exception resolution", () => {
  const openDetail = async () => {
    renderPanel();
    const row = within(screen.getByRole("table")).getByText("WWIM/HYD/26-27/03001").closest("tr");
    await userEvent.click(within(row).getByRole("button", { name: "Details" }));
    expect(hooks.useGstr2bMatchDetail).toHaveBeenCalledWith(3);
  };

  it("maps a document only to invoices of the same supplier GSTIN, with a comment", async () => {
    hooks.useGstr2bMatches.mockImplementation(({ status }) => query(status === "MISSING_IN_GSTR2B"
      ? { items: [matchItem({ match_id: null, reconciliation_status: "MISSING_IN_GSTR2B", supplier_gstr2b_details: null,
          purchase_invoice_details: { invoice_id: 42, invoice_number: "KTPL/26-27/0527", invoice_date: "2026-10-03", supplier_gstin: GSTIN, taxable_value: 100, gst_total: 18 } })] }
      : { items: [matchItem({ match_id: 3, reconciliation_status: "MISSING_IN_AP", purchase_invoice_details: null,
          supplier_gstr2b_details: { ...MATCH_DETAIL.supplier_gstr2b_details } })], total: 1 }));
    hooks.useGstRegister.mockReturnValue(query({ ...REGISTER, invoices: [
      registerRow({ invoice_id: 55, invoice_number: "OTHER-GSTIN/1", supplier_gstin: OTHER_GSTIN }),
      registerRow({ invoice_id: 56, invoice_number: "SAME-GSTIN/2", supplier_gstin: GSTIN }),
      registerRow({ invoice_id: 57, invoice_number: "REJECTED/3", supplier_gstin: GSTIN, invoice_status: "REJECTED" }),
    ] }));
    m.useMapGstr2bMatch.mutateAsync.mockResolvedValue({ reconciliation_status: "MISMATCHED" });
    await openDetail();
    await userEvent.click(screen.getByRole("button", { name: "Map to AP invoice" }));
    expect(screen.getByText("KTPL/26-27/0527")).toBeInTheDocument();
    expect(screen.getByText("SAME-GSTIN/2")).toBeInTheDocument();
    expect(screen.queryByText("OTHER-GSTIN/1")).toBeNull();
    expect(screen.queryByText("REJECTED/3")).toBeNull();

    await userEvent.click(screen.getByLabelText("Select SAME-GSTIN/2"));
    const map = screen.getByRole("button", { name: "Map invoice" });
    expect(map).toBeDisabled(); // comment required
    await userEvent.type(screen.getByLabelText(/Comments \(required\)/), "Supplier mistyped the number");
    await userEvent.click(map);
    expect(m.useMapGstr2bMatch.mutateAsync).toHaveBeenCalledWith({ matchId: 3, invoiceId: 56, comments: "Supplier mistyped the number" });
  });

  it("puts a record on hold with remarks", async () => {
    await openDetail();
    await userEvent.click(screen.getByRole("button", { name: "Put on hold" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "Put on hold" })).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/Remarks/), "Waiting for supplier's amendment");
    await userEvent.click(within(dialog).getByRole("button", { name: "Put on hold" }));
    expect(m.useReviewGstr2bMatch.mutateAsync).toHaveBeenCalledWith({ matchId: 3, decision: "ON_HOLD", remarks: "Waiting for supplier's amendment" });
  });

  it("is read-only for a record of a replaced import", async () => {
    hooks.useGstr2bMatchDetail.mockReturnValue(query({ ...MATCH_DETAIL, import_is_current: false }));
    await openDetail();
    expect(screen.getByText(/From a replaced import/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Map to AP invoice" })).toBeNull();
  });
});
