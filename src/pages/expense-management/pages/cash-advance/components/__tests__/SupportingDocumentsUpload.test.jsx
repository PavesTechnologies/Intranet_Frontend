import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/pages/expense-management/api/cashAdvanceApi", () => ({
  cashAdvanceApi: { listDocuments: vi.fn(), uploadDocument: vi.fn(), deleteDocument: vi.fn(), documentLink: vi.fn() },
}));

import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import SupportingDocumentsUpload, { fileProblem, formatFileSize, MAX_FILE_BYTES } from "../request/SupportingDocumentsUpload";

const ADVANCE = "adv-1";

const doc = (n, overrides = {}) => ({
  documentId: `doc-${n}`, advanceId: ADVANCE, category: "TRAVEL_ITINERARY", originalFileName: `itinerary-${n}.pdf`,
  contentType: "application/pdf", fileSizeBytes: 2048, uploadedBy: "EMP001", uploadedAt: "2026-11-12T09:00:00", ...overrides,
});

const pdf = (name = "itinerary.pdf", size = 1024) => {
  const file = new File(["%PDF-1.4"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

function chooseFiles(files) {
  fireEvent.change(screen.getByLabelText("Add supporting documents"), { target: { files } });
}

describe("SupportingDocumentsUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cashAdvanceApi.listDocuments.mockResolvedValue([]);
    cashAdvanceApi.uploadDocument.mockResolvedValue({});
    cashAdvanceApi.deleteDocument.mockResolvedValue({});
  });

  it("lists each document with its name, category and size", async () => {
    cashAdvanceApi.listDocuments.mockResolvedValue([doc(1, { category: "CLIENT_APPROVAL", fileSizeBytes: 3 * 1024 * 1024 })]);
    render(<SupportingDocumentsUpload advanceId={ADVANCE} ensureDraft={vi.fn()} />);

    expect(await screen.findByText("itinerary-1.pdf")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Attached documents" })).getByText("Client approval")).toBeInTheDocument();
    expect(screen.getByText("3.00 MB")).toBeInTheDocument();
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
  });

  it("says documents are optional and shows the limits", async () => {
    render(<SupportingDocumentsUpload advanceId={ADVANCE} ensureDraft={vi.fn()} />);
    expect(await screen.findByText(/optional/)).toBeInTheDocument();
    expect(screen.getByText(/0 of 5/)).toBeInTheDocument();
  });

  it("uploads the file with the category chosen, then refreshes the list", async () => {
    render(<SupportingDocumentsUpload advanceId={ADVANCE} ensureDraft={vi.fn()} />);
    await screen.findByText(/No documents added yet/);

    fireEvent.change(screen.getByLabelText("Document type"), { target: { value: "CLIENT_APPROVAL" } });
    const file = pdf("client-email.pdf");
    chooseFiles([file]);

    await waitFor(() => expect(cashAdvanceApi.uploadDocument).toHaveBeenCalledWith(ADVANCE, "CLIENT_APPROVAL", file));
    await waitFor(() => expect(cashAdvanceApi.listDocuments).toHaveBeenCalledTimes(2));
  });

  it("saves the draft first when the request has none, and uploads to the id it returns", async () => {
    const ensureDraft = vi.fn().mockResolvedValue("adv-new");
    render(<SupportingDocumentsUpload advanceId={null} ensureDraft={ensureDraft} />);

    chooseFiles([pdf()]);

    await waitFor(() => expect(ensureDraft).toHaveBeenCalledTimes(1));
    expect(cashAdvanceApi.uploadDocument).toHaveBeenCalledWith("adv-new", "OTHER", expect.any(File));
  });

  it("refuses a sixth document without uploading anything", async () => {
    cashAdvanceApi.listDocuments.mockResolvedValue([1, 2, 3, 4, 5].map((n) => doc(n)));
    render(<SupportingDocumentsUpload advanceId={ADVANCE} ensureDraft={vi.fn()} />);
    await screen.findByText("itinerary-5.pdf");

    expect(screen.queryByLabelText("Add supporting documents")).toBeDisabled();
    chooseFiles([pdf("sixth.pdf")]);
    expect(await screen.findByText(/at most 5 supporting documents/)).toBeInTheDocument();
    expect(cashAdvanceApi.uploadDocument).not.toHaveBeenCalled();
  });

  it("refuses a file type that is not allowed, before any upload", async () => {
    render(<SupportingDocumentsUpload advanceId={ADVANCE} ensureDraft={vi.fn()} />);
    await screen.findByText(/No documents added yet/);

    chooseFiles([new File(["x"], "setup.exe", { type: "application/octet-stream" })]);
    expect(await screen.findByText(/this file type is not allowed/)).toBeInTheDocument();
    expect(cashAdvanceApi.uploadDocument).not.toHaveBeenCalled();
  });

  it("refuses a file over 5 MB, before any upload", async () => {
    render(<SupportingDocumentsUpload advanceId={ADVANCE} ensureDraft={vi.fn()} />);
    await screen.findByText(/No documents added yet/);

    chooseFiles([pdf("huge.pdf", MAX_FILE_BYTES + 1)]);
    expect(await screen.findByText(/larger than 5 MB/)).toBeInTheDocument();
    expect(cashAdvanceApi.uploadDocument).not.toHaveBeenCalled();
  });

  it("shows a failed upload with the reason, and retries it", async () => {
    cashAdvanceApi.uploadDocument
      .mockRejectedValueOnce({ response: { data: { message: "Storage is unavailable" } } })
      .mockResolvedValueOnce({});
    render(<SupportingDocumentsUpload advanceId={ADVANCE} ensureDraft={vi.fn()} />);
    await screen.findByText(/No documents added yet/);

    chooseFiles([pdf("retry-me.pdf")]);
    expect(await screen.findByText(/Failed: Storage is unavailable/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    await waitFor(() => expect(cashAdvanceApi.uploadDocument).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(/Failed:/)).not.toBeInTheDocument());
  });

  it("removes a document and refreshes the list", async () => {
    cashAdvanceApi.listDocuments.mockResolvedValueOnce([doc(1)]).mockResolvedValueOnce([]);
    render(<SupportingDocumentsUpload advanceId={ADVANCE} ensureDraft={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Remove itinerary-1.pdf/ }));
    await waitFor(() => expect(cashAdvanceApi.deleteDocument).toHaveBeenCalledWith(ADVANCE, "doc-1"));
    await waitFor(() => expect(screen.queryByText("itinerary-1.pdf")).not.toBeInTheDocument());
  });

  it("opens a view or download link for an attached document", async () => {
    cashAdvanceApi.listDocuments.mockResolvedValue([doc(1)]);
    cashAdvanceApi.documentLink.mockResolvedValue({ url: "https://signed.example/doc-1" });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<SupportingDocumentsUpload advanceId={ADVANCE} ensureDraft={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Download itinerary-1.pdf/ }));
    await waitFor(() => expect(cashAdvanceApi.documentLink).toHaveBeenCalledWith(ADVANCE, "doc-1", "download"));
    await waitFor(() => expect(open).toHaveBeenCalledWith("https://signed.example/doc-1", "_blank", "noopener,noreferrer"));
    open.mockRestore();
  });

  it("disables adding and removing when the form is disabled", async () => {
    cashAdvanceApi.listDocuments.mockResolvedValue([doc(1)]);
    render(<SupportingDocumentsUpload advanceId={ADVANCE} ensureDraft={vi.fn()} disabled />);
    await screen.findByText("itinerary-1.pdf");

    expect(screen.getByLabelText("Add supporting documents")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Remove itinerary-1.pdf/ })).toBeDisabled();
  });
});

describe("file checks", () => {
  it("accepts PDF, JPG, PNG and DOCX within the size limit", () => {
    ["a.pdf", "a.jpg", "a.jpeg", "a.png", "a.docx", "A.PDF"].forEach((name) => {
      expect(fileProblem(pdf(name))).toBeNull();
    });
  });

  it("names the rule that failed", () => {
    expect(fileProblem(pdf("a.gif"))).toMatch(/not allowed/);
    expect(fileProblem(pdf("a.pdf", 0))).toMatch(/empty/);
    expect(fileProblem(pdf("a.pdf", MAX_FILE_BYTES + 1))).toMatch(/larger than 5 MB/);
  });

  it("formats sizes for people", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.00 MB");
  });
});
