import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import BulkImportPage, { splitFiles } from "./BulkImportPage";
import BulkImportJobPage from "./BulkImportJobPage";
import { useImportJob, useImportJobs, useRecordImport, useSkipImportRow, useUploadImport } from "../hooks/useBulkImport";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../hooks/useBulkImport", async () => {
  const actual = await vi.importActual("../hooks/useBulkImport");
  return {
    isJobRunning: actual.isJobRunning,
    useImportJobs: vi.fn(),
    useImportJob: vi.fn(),
    useUploadImport: vi.fn(),
    useRecordImport: vi.fn(),
    useSkipImportRow: vi.fn(),
  };
});
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const m = (value) => ({ mutateAsync: vi.fn().mockResolvedValue(value), isPending: false });
const file = (name, type = "application/pdf") => new File(["x"], name, { type });

const job = {
  job_id: 31, kind: "PAYMENTS", source: "MANUAL_UPLOAD", status: "VALIDATED", file_name: "october-payments.xlsx", created_by_name: "Priya",
  created_at: "2026-10-12T09:00:00Z", total_rows: 3, counts: { ready: 1, needs_review: 1, error: 1, recorded: 0, pending: 0, skipped: 0 },
  rows: [
    { row_id: 1, row_number: 2, status: "READY", data: { invoice_number: "INV-7", amount: "1180.00", reference_number: "SBIN426281234567", payment_date: "2026-10-08" },
      extracted_fields: { amount: "1180.00", reference_number: "SBIN426281234567", payment_date: "2026-10-08" }, document_name: "advice-7.pdf", messages: [] },
    { row_id: 2, row_number: 3, status: "NEEDS_REVIEW", data: { invoice_number: "INV-8", amount: "500.00", reference_number: "SBIN426281234568", payment_date: "2026-10-08" },
      extracted_fields: { amount: "450.00", reference_number: "SBIN426281234568", payment_date: "2026-10-08" }, document_name: "advice-8.pdf",
      messages: [{ severity: "review", message: "Receipt amount 450.00 but the sheet says 500.00" }] },
    { row_id: 3, row_number: 4, status: "ERROR", data: { invoice_number: "INV-9" }, extracted_fields: {}, document_name: null,
      messages: [{ severity: "error", message: "Document 'advice-9.pdf' was not uploaded with the sheet" }] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  useApPermissions.mockReturnValue({ canRecordPayment: true, canUpdateTdsTracking: true });
  useImportJobs.mockReturnValue({ data: { items: [{ ...job, rows: undefined }], total: 1 }, isLoading: false });
  useUploadImport.mockReturnValue(m({ job_id: 32 }));
  useImportJob.mockReturnValue({ data: job, isLoading: false, isError: false });
  useRecordImport.mockReturnValue(m({ ...job, summary: { recorded: 1, failed: 0 } }));
  useSkipImportRow.mockReturnValue(m(job));
});

describe("splitFiles", () => {
  it("separates the sheet, documents and unsupported files", () => {
    const out = splitFiles([file("pay.xlsx"), file("a.pdf"), file("all.zip"), file("notes.txt"), file("second.xlsx")]);
    expect(out.sheet.name).toBe("pay.xlsx");
    expect(out.documents.map((f) => f.name)).toEqual(["a.pdf", "all.zip"]);
    expect(out.ignored.map((f) => f.name)).toEqual(["notes.txt"]);
    expect(out.extraSheets.map((f) => f.name)).toEqual(["second.xlsx"]);
  });
});

describe("BulkImportPage", () => {
  const renderPage = (entry = "/accounts-payable/bulk-import?type=payments") =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/accounts-payable/bulk-import" element={<BulkImportPage />} />
          <Route path="/accounts-payable/bulk-import/:jobId" element={<p>job page</p>} />
        </Routes>
      </MemoryRouter>,
    );

  it("payments default to receipts only - no sheet, no template", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole("tab", { name: "Receipts only" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: /Download template/ })).toBeNull();
    await user.upload(screen.getByTestId("import-file-input"), [file("advice-7.pdf"), file("advice-8.pdf")]);
    expect(screen.queryByText("Add the filled .xlsx sheet")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Match 2 receipts" }));
    const call = useUploadImport.mock.results[0].value.mutateAsync.mock.calls[0][0];
    expect(call.receiptsOnly).toBe(true);
    expect(call.documents.map((f) => f.name)).toEqual(["advice-7.pdf", "advice-8.pdf"]);
    expect(await screen.findByText("job page")).toBeInTheDocument();
  });

  it("uploads the sheet with its documents and opens the import", async () => {
    const user = userEvent.setup();
    renderPage("/accounts-payable/bulk-import?type=payments&mode=sheet");
    expect(screen.getByText("october-payments.xlsx")).toBeInTheDocument();
    await user.upload(screen.getByTestId("import-file-input"), [file("pay.xlsx"), file("advice-7.pdf"), file("advice-8.pdf")]);
    expect(screen.getByText("2 documents")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Upload and check" }));
    const call = useUploadImport.mock.results[0].value.mutateAsync.mock.calls[0][0];
    expect(call.type).toBe("payments");
    expect(call.receiptsOnly).toBe(false);
    expect(call.workbook.name).toBe("pay.xlsx");
    expect(call.documents.map((f) => f.name)).toEqual(["advice-7.pdf", "advice-8.pdf"]);
    expect(await screen.findByText("job page")).toBeInTheDocument();
  });

  it("TDS history: past challans and filings from a sheet, under its own page", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/accounts-payable/tds/history-import"]}>
        <Routes>
          <Route path="/accounts-payable/tds/history-import" element={<BulkImportPage scope="tds-history" />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Import past TDS records")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Payments" })).toBeNull();
    expect(screen.getByRole("tab", { name: "TDS challans" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "TDS filings" })).toBeInTheDocument();
    await user.upload(screen.getByTestId("import-file-input"), [file("challan.pdf")]);
    expect(screen.getByText("Add the filled .xlsx sheet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload and check" })).toBeDisabled();
  });

  it("the payments page shows no TDS imports, and says so without payment permission", () => {
    useApPermissions.mockReturnValue({ canRecordPayment: false, canUpdateTdsTracking: true });
    renderPage("/accounts-payable/bulk-import");
    expect(screen.queryByRole("tab", { name: "TDS challans" })).toBeNull();
    expect(screen.getByText("You do not have permission to record payments.")).toBeInTheDocument();
  });
});

describe("BulkImportJobPage", () => {
  const renderJob = () =>
    render(
      <MemoryRouter initialEntries={["/accounts-payable/bulk-import/31"]}>
        <Routes>
          <Route path="/accounts-payable/bulk-import/:jobId" element={<BulkImportJobPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it("compares each row with its document and records the verified ones", async () => {
    const user = userEvent.setup();
    renderJob();
    expect(screen.getByRole("heading", { name: "Payments import #31" })).toBeInTheDocument();
    const review = screen.getByText("INV-8").closest("tr");
    expect(within(review).getByText("₹450.00")).toHaveClass("text-amber-700");
    expect(within(review).getByText(/Receipt amount 450.00/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Record 1 verified row" }));
    await waitFor(() => expect(useRecordImport.mock.results[0].value.mutateAsync).toHaveBeenCalledWith({ jobId: 31 }));
  });

  it("accepts a reviewed row only after confirmation, and skips rows", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderJob();
    await user.click(within(screen.getByText("INV-8").closest("tr")).getByRole("button", { name: "Accept & record" }));
    expect(confirm).toHaveBeenCalled();
    expect(useRecordImport.mock.results[0].value.mutateAsync).toHaveBeenCalledWith({ jobId: 31, rowIds: [2], acceptReview: true });
    await user.click(within(screen.getByText("INV-9").closest("tr")).getByRole("button", { name: "Skip" }));
    expect(useSkipImportRow.mock.results[0].value.mutateAsync).toHaveBeenCalledWith(3);
    confirm.mockRestore();
  });
});

describe("shared transfer rows", () => {
  it("compares the receipt with the transfer total, not the single row", () => {
    const shared = (id, inv, amount) => ({ row_id: id, row_number: id + 1, status: "READY", group_key: "UTR:HDFC1", document_name: "batch.pdf",
      data: { invoice_number: inv, amount, reference_number: "HDFC1", payment_date: "2026-10-09" },
      extracted_fields: { amount: "94000.00", reference_number: "HDFC1", payment_date: "2026-10-09" }, messages: [] });
    useImportJob.mockReturnValue({ data: { ...job, rows: [shared(1, "INV-A", "57120.00"), shared(2, "INV-B", "36880.00")] }, isLoading: false, isError: false });
    render(
      <MemoryRouter initialEntries={["/accounts-payable/bulk-import/31"]}>
        <Routes>
          <Route path="/accounts-payable/bulk-import/:jobId" element={<BulkImportJobPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const rowB = screen.getByText("INV-B").closest("tr");
    expect(within(rowB).getByText("₹36,880.00 (of ₹94,000.00)")).toBeInTheDocument();
    expect(within(rowB).getByText("₹94,000.00")).not.toHaveClass("text-amber-700");
  });
});
