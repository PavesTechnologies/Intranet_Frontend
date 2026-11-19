import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Gstr2bPanel from "./Gstr2bPanel";
import { formatMoney } from "../../dashboard/components/insights";
import * as hooks from "../hooks/useGstItc";
import { GSTIN, MATCH_DETAIL, OTHER_GSTIN, PERIODS, PREVIEW, REGISTER, SUMMARY, matchItem, query, registerRow, setupGstHooks } from "../__fixtures__/gstFixtures";

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

function renderPanel({
  canManage = true, status = "", group = "", period = "2026-10", onStatusChange = vi.fn(), onGroupChange = vi.fn(), onOpenItc = vi.fn(),
  importRequested = false, onImportHandled = vi.fn(),
} = {}) {
  render(
    <MemoryRouter>
      <Gstr2bPanel period={period} periods={PERIODS} canManage={canManage} status={status} onStatusChange={onStatusChange}
        group={group} onGroupChange={onGroupChange} importRequested={importRequested} onImportHandled={onImportHandled} onOpenItc={onOpenItc} />
    </MemoryRouter>,
  );
  return { onStatusChange, onGroupChange, onOpenItc, onImportHandled };
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

  it("filters by the four match groups with the backend's counts", async () => {
    const { onGroupChange } = renderPanel();
    const chips = screen.getByRole("group", { name: "Filter by match group" });
    for (const [label, n] of [["Matched", 9], ["Partially matched", 3], ["Unmatched", 1], ["Review required", 2]]) {
      expect(within(chips).getByRole("button", { name: `${label} · ${n}` })).toBeInTheDocument();
    }
    await userEvent.click(within(chips).getByRole("button", { name: "Review required · 2" }));
    expect(onGroupChange).toHaveBeenCalledWith("REVIEW_REQUIRED");
  });

  it("sends match_group to GET /gstr2b/matches and keeps the detailed status on each row", () => {
    hooks.useGstr2bMatches.mockReturnValue(query({ items: [
      matchItem({ match_id: 2, reconciliation_status: "MISMATCHED", match_status: "MISMATCH", match_group: "PARTIALLY_MATCHED",
        tax_difference: 500, review_status: "ON_HOLD", review_remarks: "Waiting for the supplier's amendment" }),
    ], total: 1 }));
    renderPanel({ group: "PARTIALLY_MATCHED" });
    expect(hooks.useGstr2bMatches).toHaveBeenLastCalledWith(expect.objectContaining({ matchGroup: "PARTIALLY_MATCHED" }));
    const row = within(screen.getByRole("table")).getAllByRole("row")[1];
    expect(row).toHaveTextContent("Partially matched");
    expect(row).toHaveTextContent("Mismatched"); // the detailed backend status
    expect(row).toHaveTextContent("Review: Waiting for the supplier's amendment");
    expect(row).toHaveTextContent(`+${formatMoney(500, "INR")}`);
  });

  it("still filters by the detailed status through the backend", async () => {
    const { onStatusChange } = renderPanel();
    await userEvent.selectOptions(screen.getByLabelText("Detailed status"), "MISSING_IN_AP");
    expect(onStatusChange).toHaveBeenCalledWith("MISSING_IN_AP");
    await userEvent.selectOptions(screen.getByLabelText("Detailed status"), screen.getByRole("option", { name: /Needs action/ }));
    expect(onStatusChange).toHaveBeenLastCalledWith(expect.stringContaining("MISSING_IN_GSTR2B"));
  });

  it("opens the import when the workflow asks for the upload, once", () => {
    const { onImportHandled } = renderPanel({ importRequested: true });
    expect(screen.getByLabelText("GSTR-2B file")).toBeInTheDocument();
    expect(onImportHandled).toHaveBeenCalledTimes(1);
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

const setPeriod = async (value) => {
  const period = screen.getByLabelText("Import return period");
  await userEvent.clear(period);
  await userEvent.type(period, value);
};

/** Opens the modal, (optionally) picks the mode and period, uploads and previews. */
async function previewUpload({ file = xlsx(), period, mode } = {}) {
  await userEvent.click(screen.getByRole("button", { name: /Import GSTR-2B/ }));
  if (mode) await userEvent.click(screen.getByRole("radio", { name: mode }));
  if (period) await setPeriod(period);
  await userEvent.upload(screen.getByLabelText("GSTR-2B file"), file);
  await userEvent.click(screen.getByRole("button", { name: "Preview" }));
  return file;
}

describe("Gstr2bPanel - Excel import and replacement", () => {
  it("previews, then imports an Excel file for a new period without replace", async () => {
    m.usePreviewGstr2b.mutateAsync.mockResolvedValue({
      ...PREVIEW, return_period: "2026-09", total_records: 12, accepted_records: 10, skipped_records: 1, rejected_records: 1,
      validation_errors: [{ sheet: "B2B", row: 14, document_number: "X-1", field: "supplier_gstin", message: "supplier GSTIN 'X' is not a valid GSTIN" }],
    });
    m.useImportGstr2b.mutateAsync.mockResolvedValue({
      return_period: "2026-09", import_mode: "OFFICIAL", is_demo: false, import_status: "COMPLETED_WITH_ERRORS", total_records: 12,
      success_records: 10, accepted_records: 10, skipped_records: 1, failed_records: 1, rejected_records: 1,
      status_counts: { MATCHED: 9, MISMATCHED: 1 }, errors: [{ section: "B2B", row: 14, document: "X-1", errors: ["invalid GSTIN"] }],
    });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Import GSTR-2B/ }));
    expect(screen.getByRole("radio", { name: "Official GST Portal Excel" })).toBeChecked(); // the default mode
    expect(screen.getByLabelText("Supported file format")).toHaveTextContent(/B2B, B2BA, B2B-CDNR and B2B-CDNRA/);
    expect(screen.getByLabelText("Supported file format")).toHaveTextContent(/GSTIN of supplier/);
    await setPeriod("2026-09");
    const file = xlsx();
    await userEvent.upload(screen.getByLabelText("GSTR-2B file"), file);
    expect(screen.getByText("GSTR2B_102026.xlsx")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Import" })).toBeNull(); // nothing is imported before the preview
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(m.usePreviewGstr2b.mutateAsync).toHaveBeenCalledWith({ file, returnPeriod: "2026-09", importMode: "OFFICIAL" });
    const preview = screen.getByRole("region", { name: "Import preview" });
    expect(within(preview).getByText("Will be imported").nextSibling).toHaveTextContent("10");
    expect(within(preview).getByText("Rejected").nextSibling).toHaveTextContent("1");
    expect(within(preview).getByRole("table", { name: "Records to import" })).toHaveTextContent("WWIM/HYD/26-27/03001");
    expect(within(preview).getByText(/Supplier GSTIN -/).closest("li")).toHaveTextContent("B2B · row 14 · X-1");
    expect(m.useImportGstr2b.mutateAsync).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(m.useImportGstr2b.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ file, returnPeriod: "2026-09", replace: false, importMode: "OFFICIAL" }));
    expect(await screen.findByText(/GSTR-2B for Sep 2026 imported/)).toBeInTheDocument();
    expect(screen.getByText("Imported").nextSibling).toHaveTextContent("10");
    expect(screen.getByText(/invalid GSTIN/)).toBeInTheDocument();
  });

  it("rejects files that are not Excel / JSON / CSV", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Import GSTR-2B/ }));
    await userEvent.upload(screen.getByLabelText("GSTR-2B file"), new File(["%PDF"], "gstr2b.pdf", { type: "application/pdf" }), { applyAccept: false });
    expect(screen.getByRole("alert")).toHaveTextContent(/\.xlsx or \.json/);
    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
  });

  it("blocks the import when the preview reports a blocking error", async () => {
    m.usePreviewGstr2b.mutateAsync.mockResolvedValue({
      ...PREVIEW, can_import: false, accepted_records: 5,
      blocking_errors: ["The GSTR-2B for 11-2026 is generated by the GST portal on 14-12-2026 (the 14th of the following month) - it cannot be imported before then"],
    });
    renderPanel();
    await previewUpload({ period: "2026-11" });
    expect(screen.getByRole("alert")).toHaveTextContent(/cannot be imported:.*generated by the GST portal on 14-12-2026/);
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("shows why a file cannot be read - e.g. the demo template uploaded as official", async () => {
    m.usePreviewGstr2b.mutateAsync.mockRejectedValue({ response: { status: 422, data: { detail:
      "This workbook is in the AP demo template layout (sheet 'B2B' has demo template columns such as 'Supplier GSTIN' and 'Document Number'), not a GSTR-2B downloaded from the GST portal. Choose the 'Demo Excel Template' import mode to import it as demo data" } } });
    renderPanel();
    await previewUpload();
    expect(await screen.findByText(/Choose the 'Demo Excel Template' import mode/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Import" })).toBeNull();
    expect(m.useImportGstr2b.mutateAsync).not.toHaveBeenCalled();
  });

  it("asks before replacing an existing import; cancel sends nothing", async () => {
    renderPanel();
    await previewUpload();
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(screen.getByRole("alertdialog", { name: "Replace Existing GSTR-2B Import?" })).toHaveTextContent(/Previous import history will be retained/);
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(m.useImportGstr2b.mutateAsync).not.toHaveBeenCalled();
  });

  it("sends replace=true only after the replacement is confirmed", async () => {
    m.useImportGstr2b.mutateAsync.mockResolvedValue({ return_period: "2026-10", import_status: "COMPLETED", success_records: 3, replaced_import_id: 3, manual_mappings_carried: 2 });
    renderPanel();
    await previewUpload();
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    await userEvent.click(screen.getByRole("button", { name: "Replace Import" }));
    expect(m.useImportGstr2b.mutateAsync).toHaveBeenCalledTimes(1);
    expect(m.useImportGstr2b.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ returnPeriod: "2026-10", replace: true }));
    expect(await screen.findByText(/Replaced import 3/)).toHaveTextContent("2 manual mapping(s) carried over");
  });

  it("asks before replacing when the preview reports an existing import", async () => {
    m.usePreviewGstr2b.mutateAsync.mockResolvedValue({ ...PREVIEW, return_period: "2026-09", replace_required: true,
      existing_import: { import_id: 2, file_name: "a.xlsx" } });
    renderPanel();
    await previewUpload({ period: "2026-09" });
    expect(screen.getByRole("region", { name: "Import preview" })).toHaveTextContent(/a\.xlsx, import 2\)\. Importing replaces it/);
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(screen.getByRole("alertdialog", { name: "Replace Existing GSTR-2B Import?" })).toBeInTheDocument();
    expect(m.useImportGstr2b.mutateAsync).not.toHaveBeenCalled();
  });

  it("falls back to the confirmation when the backend reports an existing import (409)", async () => {
    m.useImportGstr2b.mutateAsync
      .mockRejectedValueOnce({ response: { status: 409, data: { detail: "09-2026 already has a GSTR-2B import (a.xlsx, import 2). Import again with replace=true to supersede it" } } })
      .mockResolvedValueOnce({ return_period: "2026-09", import_status: "COMPLETED", success_records: 3 });
    renderPanel();
    await previewUpload({ period: "2026-09" });
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    await userEvent.click(await screen.findByRole("button", { name: "Replace Import" }));
    expect(m.useImportGstr2b.mutateAsync.mock.calls.map((c) => c[0].replace)).toEqual([false, true]);
  });

  it("shows the backend's refusal of an identical file", async () => {
    m.useImportGstr2b.mutateAsync.mockRejectedValue({ response: { status: 409, data: { detail: "This file is already the current GSTR-2B import for 09-2026 (import 2)" } } });
    renderPanel();
    await previewUpload({ period: "2026-09" });
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(await screen.findByText(/already the current GSTR-2B import/)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

const DEMO_PREVIEW = {
  ...PREVIEW, file_name: "GSTR2B_Nov2026_5_Invoices_Import.xlsx", import_mode: "DEMO", is_demo: true, source_type: "AP_DEMO_EXCEL",
  return_period: "2026-11", total_records: 5, accepted_records: 5,
  warnings: ["The official GSTR-2B for 11-2026 is generated by the GST portal on 14-12-2026 - these demo records are not a supplier filing"],
  demo_notice: "DEMO data from the AP demo Excel template - not a supplier filing and not an official GSTR-2B.",
};

describe("Gstr2bPanel - demo Excel template", () => {
  it("imports the demo template in demo mode and labels it everywhere", async () => {
    m.usePreviewGstr2b.mutateAsync.mockResolvedValue(DEMO_PREVIEW);
    m.useImportGstr2b.mutateAsync.mockResolvedValue({
      import_id: 9, return_period: "2026-11", import_mode: "DEMO", is_demo: true, source_type: "AP_DEMO_EXCEL", import_status: "COMPLETED",
      total_records: 5, accepted_records: 5, skipped_records: 0, rejected_records: 0, status_counts: { MATCHED: 5 },
      validation_errors: [], demo_notice: DEMO_PREVIEW.demo_notice,
    });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Import GSTR-2B/ }));
    await userEvent.click(screen.getByRole("radio", { name: "Demo Excel Template" }));
    const format = screen.getByLabelText("Supported file format");
    expect(format).toHaveTextContent(/worksheet named B2B/);
    expect(format).toHaveTextContent(/Supplier GSTIN, Supplier Name, Document Type, Document Number/);
    expect(format).toHaveTextContent(/never used for ITC/);
    expect(screen.getByRole("button", { name: /Download the demo template/ })).toBeInTheDocument();
    await setPeriod("2026-11");
    const file = xlsx("GSTR2B_Nov2026_5_Invoices_Import.xlsx");
    await userEvent.upload(screen.getByLabelText("GSTR-2B file"), file);
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(m.usePreviewGstr2b.mutateAsync).toHaveBeenCalledWith({ file, returnPeriod: "2026-11", importMode: "DEMO" });
    const preview = screen.getByRole("region", { name: "Import preview" });
    expect(within(preview).getByText("DEMO")).toBeInTheDocument();
    expect(within(preview).getByRole("note")).toHaveTextContent(/not a supplier filing/);
    expect(within(preview).getByText(/Preview · AP demo Excel template/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(m.useImportGstr2b.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ file, returnPeriod: "2026-11", importMode: "DEMO", replace: false }));
    expect(await screen.findByText(/Demo GSTR-2B for Nov 2026 imported/)).toBeInTheDocument();
    // the panel switches to the demo data it just imported
    await waitFor(() => expect(hooks.useGstr2bSummary).toHaveBeenLastCalledWith("2026-10", "DEMO"));
  });

  it("accepts only .xlsx in demo mode", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Import GSTR-2B/ }));
    await userEvent.click(screen.getByRole("radio", { name: "Demo Excel Template" }));
    await userEvent.upload(screen.getByLabelText("GSTR-2B file"), new File(["{}"], "gstr2b.json", { type: "application/json" }), { applyAccept: false });
    expect(screen.getByRole("alert")).toHaveTextContent(/demo template is an Excel workbook/);
    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
  });

  it("asks before replacing an existing demo import, not the official one", async () => {
    m.usePreviewGstr2b.mutateAsync.mockResolvedValue({ ...DEMO_PREVIEW, replace_required: true, existing_import: { import_id: 8, file_name: "demo.xlsx" } });
    renderPanel();
    await previewUpload({ period: "2026-11", mode: "Demo Excel Template" });
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    const dialog = screen.getByRole("alertdialog", { name: "Replace Existing Demo Import?" });
    expect(dialog).toHaveTextContent(/official GSTR-2B import of the period is not affected/);
  });

  it("shows official data by default and demo data only when chosen, under a DEMO banner", async () => {
    const periods = PERIODS.map((p) => (p.period === "2026-10" ? { ...p, demo_imported: true, demo_import_id: 9 } : p));
    hooks.useGstr2bSummary.mockImplementation((period, mode) => query({ ...SUMMARY, is_demo: mode === "DEMO", import_mode: mode,
      demo_notice: mode === "DEMO" ? "DEMO data from the AP demo Excel template - not a supplier filing." : null }));
    render(
      <MemoryRouter>
        <Gstr2bPanel period="2026-10" periods={periods} canManage status="" onStatusChange={vi.fn()} onOpenItc={vi.fn()} />
      </MemoryRouter>,
    );
    expect(hooks.useGstr2bSummary).toHaveBeenLastCalledWith("2026-10", "OFFICIAL");
    expect(screen.getByRole("button", { name: "Official GSTR-2B" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("note")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Demo data" }));
    expect(hooks.useGstr2bSummary).toHaveBeenLastCalledWith("2026-10", "DEMO");
    expect(hooks.useGstr2bMatches).toHaveBeenLastCalledWith(expect.objectContaining({ importMode: "DEMO" }));
    expect(screen.getByRole("note")).toHaveTextContent(/not a supplier filing/);
    expect(screen.getByText(/DEMO · GSTR-2B Reconciliation · Oct 2026/)).toBeInTheDocument();
  });

  it("hides the data-source switch when the period has no demo import", () => {
    renderPanel();
    expect(screen.queryByRole("group", { name: "GSTR-2B data source" })).toBeNull();
    expect(hooks.useGstr2bMatches).toHaveBeenLastCalledWith(expect.objectContaining({ importMode: "OFFICIAL" }));
  });

  it("labels a demo record in the detail drawer", async () => {
    hooks.useGstr2bMatchDetail.mockReturnValue(query({ ...MATCH_DETAIL, is_demo: true, import_mode: "DEMO",
      demo_notice: "DEMO data from the AP demo Excel template - not a supplier filing." }));
    renderPanel();
    const row = within(screen.getByRole("table")).getByText("WWIM/HYD/26-27/03001").closest("tr");
    await userEvent.click(within(row).getByRole("button", { name: "Details" }));
    expect(screen.getByText(/^DEMO · GSTR-2B/)).toBeInTheDocument();
    expect(screen.getAllByRole("note").some((n) => /not a supplier filing/.test(n.textContent))).toBe(true);
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

describe("Gstr2bPanel - GSTR-2B import totals", () => {
  const totals = (extra) => ({ documents: 2, credit_notes: 0, superseded_by_amendment: 0, invoice_value: 75605, documents_without_invoice_value: 0,
    taxable_value: 64500, igst: 0, cgst: 5805, sgst: 5805, cess: 0, total_gst: 11610, ...extra });
  const totalsOf = () => within(screen.getAllByLabelText("GSTR-2B totals").at(-1));

  it("shows invoice value, taxable value and GST separately, as the backend totalled them", async () => {
    m.usePreviewGstr2b.mutateAsync.mockResolvedValue({ ...PREVIEW, totals: totals() });
    m.useImportGstr2b.mutateAsync.mockResolvedValue({ return_period: "2026-09", import_status: "COMPLETED", accepted_records: 2, total_records: 2,
      totals: totals(), match_groups: { matched: 1, partially_matched: 0, unmatched: 1, review_required: 0 } });
    renderPanel();
    await previewUpload({ period: "2026-09" });
    expect(totalsOf().getByText(formatMoney(75605, "INR"))).toBeInTheDocument();
    expect(totalsOf().getByText(formatMoney(64500, "INR"))).toBeInTheDocument();
    expect(totalsOf().getByText(formatMoney(11610, "INR"))).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(screen.getByLabelText("Match groups")).toHaveTextContent("Unmatched: 1"));
    expect(totalsOf().getByText(formatMoney(75605, "INR"))).toBeInTheDocument();
  });

  it("never shows a missing invoice value as ₹0", async () => {
    m.usePreviewGstr2b.mutateAsync.mockResolvedValue({ ...PREVIEW, totals: totals({ invoice_value: 0, documents_without_invoice_value: 2 }) });
    renderPanel();
    await previewUpload({ period: "2026-09" });
    expect(totalsOf().getByText("Not in file")).toBeInTheDocument();
    expect(totalsOf().queryByText(formatMoney(0, "INR"))).toBeNull();
  });

  it("labels an invoice value that excludes documents filed without one", async () => {
    m.usePreviewGstr2b.mutateAsync.mockResolvedValue({ ...PREVIEW, totals: totals({ invoice_value: 59000, documents_without_invoice_value: 1 }) });
    renderPanel();
    await previewUpload({ period: "2026-09" });
    expect(totalsOf().getByText(formatMoney(59000, "INR"))).toBeInTheDocument();
    expect(totalsOf().getByText(/Excludes 1 document\(s\) filed without an invoice value/)).toBeInTheDocument();
  });
});
