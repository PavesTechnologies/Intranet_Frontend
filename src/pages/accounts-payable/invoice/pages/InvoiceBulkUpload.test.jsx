import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InvoiceBulkUploadPage, { checkSelection } from "./InvoiceBulkUploadPage";
import InvoiceBulkBatchPage from "./InvoiceBulkBatchPage";
import {
  useBulkBatch,
  useBulkBatches,
  useBulkUploadLimits,
  useRetryBatchMutation,
  useRetryItemMutation,
  useSkipItemMutation,
  useUploadBatchMutation,
  isBatchRunning,
} from "../hooks/useBulkUpload";
import { useApPermissions } from "../../hooks/useApPermissions";

vi.mock("../hooks/useBulkUpload", async () => {
  const actual = await vi.importActual("../hooks/useBulkUpload");
  return {
    isBatchRunning: actual.isBatchRunning,
    useBulkBatch: vi.fn(),
    useBulkBatches: vi.fn(),
    useBulkUploadLimits: vi.fn(),
    useRetryBatchMutation: vi.fn(),
    useRetryItemMutation: vi.fn(),
    useSkipItemMutation: vi.fn(),
    useUploadBatchMutation: vi.fn(),
  };
});
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mutation = (impl = vi.fn()) => ({ mutateAsync: impl, isPending: false });
const pdf = (name, size = 1000) => new File([new Uint8Array(size)], name, { type: "application/pdf" });

const counts = { queued: 0, created: 0, vendor_not_found: 0, duplicate: 0, failed: 0, skipped: 0 };
const batch = {
  batch_id: 12,
  source_type: "MANUAL_UPLOAD",
  source_name: "march.zip",
  status: "NEEDS_ATTENTION",
  total_files: 4,
  uploaded_by_name: "Asha",
  created_at: "2026-10-10T09:00:00Z",
  counts: { ...counts, created: 2, vendor_not_found: 1, duplicate: 1 },
  items: [
    { item_id: 1, sequence_no: 1, file_name: "inv-1.pdf", file_size: 2048, status: "CREATED", attempt_count: 1, can_retry: false, can_skip: false,
      invoice_id: 101, invoice_number: "INV-1", vendor_name: "Acme", is_valid: false, validation_issues: ["Buyer GSTIN mismatch"] },
    { item_id: 2, sequence_no: 2, file_name: "inv-2.pdf", file_size: 2048, status: "CREATED", attempt_count: 1, can_retry: false, can_skip: false,
      invoice_id: 102, invoice_number: "INV-2", vendor_name: "Acme", is_valid: true, validation_issues: [] },
    { item_id: 3, sequence_no: 3, file_name: "new-vendor.pdf", file_size: 2048, status: "VENDOR_NOT_FOUND", attempt_count: 1, can_retry: true, can_skip: true,
      error_message: "Vendor could not be matched. Onboard the vendor and retry.", vendor_name: "Zeta", vendor_gstin: "29ABCDE1234F1Z5" },
    { item_id: 4, sequence_no: 4, file_name: "copy.pdf", file_size: 2048, status: "DUPLICATE", attempt_count: 0, can_retry: false, can_skip: false,
      error_message: "Same file as #1 (inv-1.pdf) in this batch." },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  useApPermissions.mockReturnValue({ canUploadInvoice: true, canOnboardVendor: true, canBulkUploadInvoices: true });
  useBulkUploadLimits.mockReturnValue({ data: { max_files: 25, max_file_mb: 10, max_zip_mb: 250 } });
  useBulkBatches.mockReturnValue({ data: { items: [batch], total: 1 }, isLoading: false, isError: false });
  useUploadBatchMutation.mockReturnValue(mutation(vi.fn().mockResolvedValue({ batch_id: 12, total_files: 2 })));
  useRetryBatchMutation.mockReturnValue(mutation(vi.fn().mockResolvedValue(batch)));
  useRetryItemMutation.mockReturnValue(mutation(vi.fn().mockResolvedValue(batch)));
  useSkipItemMutation.mockReturnValue(mutation(vi.fn().mockResolvedValue(batch)));
  useBulkBatch.mockReturnValue({ data: batch, isLoading: false, isError: false });
});

describe("checkSelection", () => {
  it("mirrors the server's batch rules", () => {
    expect(checkSelection([]).error).toBe("");
    expect(checkSelection(Array.from({ length: 26 }, (_, i) => pdf(`${i}.pdf`))).error).toMatch(/at most 25/);
    expect(checkSelection([new File(["x"], "a.zip"), pdf("b.pdf")]).error).toMatch(/not both/);
    const { error, warnings } = checkSelection([pdf("a.pdf"), new File(["x"], "notes.docx"), pdf("big.pdf", 11 * 1024 * 1024)]);
    expect(error).toBe("");
    expect(warnings).toHaveLength(2);
  });

  it("knows when a batch is still running", () => {
    expect(isBatchRunning({ status: "PROCESSING", counts })).toBe(true);
    expect(isBatchRunning({ status: "NEEDS_ATTENTION", counts })).toBe(false);
  });
});

describe("InvoiceBulkUploadPage", () => {
  it("uploads the selected files and opens the batch", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/accounts-payable/invoices/bulk-upload"]}>
        <Routes>
          <Route path="/accounts-payable/invoices/bulk-upload" element={<InvoiceBulkUploadPage />} />
          <Route path="/accounts-payable/invoices/bulk-upload/:batchId" element={<p>batch page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Bulk Invoice Upload" })).toBeInTheDocument();
    expect(screen.getByText("march.zip")).toBeInTheDocument(); // history
    await user.upload(screen.getByTestId("bulk-file-input"), [pdf("a.pdf"), pdf("b.pdf")]);
    expect(screen.getByText("2 files selected · 2 KB")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Upload 2 files" }));
    const upload = useUploadBatchMutation.mock.results[0].value.mutateAsync;
    expect(upload.mock.calls[0][0].files.map((f) => f.name)).toEqual(["a.pdf", "b.pdf"]);
    expect(await screen.findByText("batch page")).toBeInTheDocument();
  });

  it("blocks an invalid selection", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <InvoiceBulkUploadPage />
      </MemoryRouter>,
    );
    await user.upload(screen.getByTestId("bulk-file-input"), Array.from({ length: 26 }, (_, i) => pdf(`${i}.pdf`)));
    expect(screen.getByRole("alert")).toHaveTextContent("at most 25");
    expect(screen.getByRole("button", { name: "Upload 26 files" })).toBeDisabled();
  });
});

describe("InvoiceBulkBatchPage", () => {
  const renderBatch = () =>
    render(
      <MemoryRouter initialEntries={["/accounts-payable/invoices/bulk-upload/12"]}>
        <Routes>
          <Route path="/accounts-payable/invoices/bulk-upload/:batchId" element={<InvoiceBulkBatchPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it("shows each file's result with the right actions", () => {
    renderBatch();
    expect(screen.getByRole("heading", { name: "Batch #12" })).toBeInTheDocument();
    expect(screen.getByText("4 of 4 files processed")).toBeInTheDocument();
    const vendorRow = screen.getByText("new-vendor.pdf").closest("tr");
    expect(within(vendorRow).getByText("Vendor not found")).toBeInTheDocument();
    expect(within(vendorRow).getByRole("button", { name: "Onboard vendor" })).toBeInTheDocument();
    expect(within(vendorRow).getByRole("button", { name: "Retry" })).toBeInTheDocument();
    const createdRow = screen.getByText("inv-1.pdf").closest("tr");
    expect(within(createdRow).getByText(/1 validation issue to fix in review/)).toBeInTheDocument();
    expect(within(createdRow).getByRole("button", { name: "Open invoice" })).toBeInTheDocument();
    expect(within(createdRow).queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("retries one file, retries all and filters", async () => {
    const user = userEvent.setup();
    renderBatch();
    const vendorRow = screen.getByText("new-vendor.pdf").closest("tr");
    await user.click(within(vendorRow).getByRole("button", { name: "Retry" }));
    expect(useRetryItemMutation.mock.results[0].value.mutateAsync).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole("button", { name: /Retry 1 file/ }));
    expect(useRetryBatchMutation.mock.results[0].value.mutateAsync).toHaveBeenCalledWith(12);
    await user.click(screen.getByRole("tab", { name: /Needs attention/ }));
    expect(screen.queryByText("inv-1.pdf")).toBeNull();
    expect(screen.getByText("new-vendor.pdf")).toBeInTheDocument();
  });
});
