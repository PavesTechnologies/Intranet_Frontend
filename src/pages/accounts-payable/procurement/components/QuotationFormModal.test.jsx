import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuotationFormModal from "./QuotationFormModal";
import { useExtractQuotationFields } from "../hooks/useQuotationMutations";

const extractMutateAsync = vi.fn();
const createMutateAsync = vi.fn();

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("../hooks/useQuotationMutations", () => ({
  useCreateQuotation: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useExtractQuotationFields: vi.fn(),
}));

vi.mock("../hooks/useVendorOptions", () => ({
  default: () => ({
    vendorOptions: [
      { value: 7, label: "Extracted Vendor Ltd" },
      { value: 9, label: "Hand Picked Vendor" },
    ],
    isLoading: false,
  }),
}));

vi.mock("./QuotationDocumentPreview", () => ({ default: () => <div /> }));

const FULL_EXTRACTION = {
  data: {
    vendor_id: 7,
    quotation_number: "QT-2026-0142",
    quotation_date: "02-09-2026",
    total_amount: 436600,
    delivery_days: 15,
    payment_terms: "30 days from invoice date",
  },
};

const renderModal = () =>
  render(<QuotationFormModal isOpen onClose={vi.fn()} prId={12} />);

const uploadFile = () => {
  const input = document.querySelector('input[type="file"]');
  const file = new File(["quote"], "quote.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
};

const fieldByLabel = (label) => screen.getByLabelText(label);

/** Resolves the pending extraction promise on demand. */
let resolveExtraction;

beforeEach(() => {
  vi.clearAllMocks();
  createMutateAsync.mockResolvedValue({});
  extractMutateAsync.mockResolvedValue(FULL_EXTRACTION);
  useExtractQuotationFields.mockReturnValue({
    mutateAsync: extractMutateAsync,
    isPending: false,
  });
});

describe("QuotationFormModal — automatic extraction on upload", () => {
  it("starts extraction as soon as a document is chosen", async () => {
    renderModal();
    const file = uploadFile();

    await waitFor(() => expect(extractMutateAsync).toHaveBeenCalledWith(file));
  });

  it("fills the form from the extracted values", async () => {
    renderModal();
    uploadFile();

    await waitFor(() => expect(fieldByLabel(/quotation number/i)).toHaveValue("QT-2026-0142"));
    expect(fieldByLabel(/total amount/i)).toHaveValue(436600);
    expect(fieldByLabel(/delivery days/i)).toHaveValue(15);
    expect(fieldByLabel(/payment terms/i)).toHaveValue("30 days from invoice date");
    // Normalized through the existing extraction rules, not passed through raw. A leading
    // segment of 12 or less is read as the month (normalizeExtractedDate), so 02-09-2026
    // resolves to 9 February 2026.
    expect(fieldByLabel(/quotation date/i)).toHaveValue("2026-02-09");
  });

  it("never overwrites a value the user typed while extraction was running", async () => {
    const user = userEvent.setup();

    // Hold the extraction open so the user can type before it resolves.
    extractMutateAsync.mockImplementation(
      () => new Promise((resolve) => {
        resolveExtraction = () => resolve(FULL_EXTRACTION);
      }),
    );

    renderModal();
    uploadFile();

    await user.type(fieldByLabel(/quotation number/i), "MANUAL-001");

    resolveExtraction();

    // The extracted payment terms still land in the field the user left alone...
    await waitFor(() =>
      expect(fieldByLabel(/payment terms/i)).toHaveValue("30 days from invoice date"),
    );
    // ...but the typed value stands.
    expect(fieldByLabel(/quotation number/i)).toHaveValue("MANUAL-001");
  });

  it("does not flag required fields while extraction is still running", async () => {
    // Never resolves — the form must stay quiet rather than reporting a vendor as missing
    // while the document is still being read.
    extractMutateAsync.mockImplementation(() => new Promise(() => {}));

    renderModal();
    uploadFile();

    await waitFor(() => expect(extractMutateAsync).toHaveBeenCalled());
    expect(screen.queryByText(/required — not found in the document/i)).not.toBeInTheDocument();
  });

  it("flags a required field left empty once extraction has finished", async () => {
    // Backend read the document but could not resolve a vendor.
    extractMutateAsync.mockResolvedValue({
      data: { ...FULL_EXTRACTION.data, vendor_id: null },
    });

    renderModal();
    uploadFile();

    expect(
      await screen.findByText(/required — not found in the document/i),
    ).toBeInTheDocument();
  });

  it("clears the required flag once the vendor is chosen by hand", async () => {
    const user = userEvent.setup();
    extractMutateAsync.mockResolvedValue({
      data: { ...FULL_EXTRACTION.data, vendor_id: null },
    });

    renderModal();
    uploadFile();
    await screen.findByText(/required — not found in the document/i);

    await user.click(screen.getByRole("button", { name: /select vendor/i }));
    await user.click(screen.getByRole("option", { name: "Hand Picked Vendor" }));

    await waitFor(() =>
      expect(screen.queryByText(/required — not found in the document/i)).not.toBeInTheDocument(),
    );
  });

  it("keeps the file and allows manual entry when extraction fails", async () => {
    const user = userEvent.setup();
    extractMutateAsync.mockRejectedValue({
      response: { status: 502, data: { detail: "Textract is unavailable." } },
    });

    renderModal();
    uploadFile();

    expect(await screen.findByText("Textract is unavailable.")).toBeInTheDocument();
    // The upload is not discarded, and a retry is offered.
    expect(screen.getByText("quote.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry extraction/i })).toBeInTheDocument();

    // A failed extraction must not block the form.
    await user.type(fieldByLabel(/quotation number/i), "MANUAL-002");
    expect(fieldByLabel(/quotation number/i)).toHaveValue("MANUAL-002");
  });
});
