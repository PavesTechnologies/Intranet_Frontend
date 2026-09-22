import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NdaPanel from "./NdaPanel";
import {
  useVendorNda,
  useGenerateNda,
  useSendNda,
  useUpdateNdaStatus,
  useUploadSignedNda,
} from "../hooks/useNda";
import ndaService from "../services/ndaService";
import { validateSignedNdaFile } from "../constants/vendorOnboarding";

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("../hooks/useNda", () => ({
  useVendorNda: vi.fn(),
  useGenerateNda: vi.fn(),
  useSendNda: vi.fn(),
  useUpdateNdaStatus: vi.fn(),
  useUploadSignedNda: vi.fn(),
}));

vi.mock("../services/ndaService", () => ({
  default: { getNdaDocumentUrl: vi.fn() },
}));

let permissions = {};
vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: () => permissions,
}));

const uploadMutateAsync = vi.fn();
const statusMutateAsync = vi.fn();
const sendMutateAsync = vi.fn();
const generateMutateAsync = vi.fn();

const nda = (overrides = {}) => ({
  nda_id: 55,
  vendor_id: 9,
  status_code: "SENT",
  recipient_email: "vendor@test.com",
  document_key: "nda/generated.pdf",
  signed_document_key: null,
  template_version: "v1",
  valid_from: null,
  valid_until: null,
  sent_at: "2026-09-10T10:00:00Z",
  signed_at: null,
  completed_at: null,
  ...overrides,
});

const lookup = (ndaRow, outcome = "NOT_FOUND") => ({
  data: { vendor_id: 9, outcome, reason: null, nda: ndaRow, ndas: ndaRow ? [ndaRow] : [] },
  isLoading: false,
  isError: false,
  error: null,
});

const renderPanel = (props = {}) =>
  render(
    <NdaPanel
      vendorId={9}
      departmentId={1}
      purchaseCategoryId={10}
      prId={12}
      ndaRequired
      recipientEmail="vendor@test.com"
      {...props}
    />,
  );

const pdf = (name = "signed-nda.pdf", size = 1024) => {
  const file = new File(["%PDF-1.7"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

beforeEach(() => {
  vi.clearAllMocks();
  permissions = {
    canViewNda: true,
    canGenerateNda: true,
    canSendNda: true,
    canUploadSignedNda: true,
  };
  uploadMutateAsync.mockResolvedValue({
    nda_id: 55,
    status_code: "SIGNED",
    message: "Signed NDA uploaded successfully; pending internal review",
  });
  statusMutateAsync.mockResolvedValue({});
  useVendorNda.mockReturnValue(lookup(nda()));
  useGenerateNda.mockReturnValue({ mutateAsync: generateMutateAsync, isPending: false });
  useSendNda.mockReturnValue({ mutateAsync: sendMutateAsync, isPending: false });
  useUpdateNdaStatus.mockReturnValue({ mutateAsync: statusMutateAsync, isPending: false });
  useUploadSignedNda.mockReturnValue({ mutateAsync: uploadMutateAsync, isPending: false });
});

const openUploadAndPick = async (user, file = pdf()) => {
  await user.click(screen.getByRole("button", { name: /upload signed nda/i }));
  const input = document.querySelector('input[type="file"]');
  await user.upload(input, file);
  return input;
};

describe("NdaPanel — signed NDA upload", () => {
  it("offers the upload from SENT and posts the chosen PDF", async () => {
    const user = userEvent.setup();
    renderPanel();

    await openUploadAndPick(user);
    expect(screen.getByText("signed-nda.pdf")).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: /^upload signed nda$/i }).at(-1),
    );

    await waitFor(() => expect(uploadMutateAsync).toHaveBeenCalledTimes(1));
    expect(uploadMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ ndaId: 55, file: expect.any(File) }),
    );
  });

  it("restricts the file input to PDFs", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /upload signed nda/i }));

    // The file dialog itself filters non-PDFs out; validateSignedNdaFile (covered at the
    // bottom of this file) is the guard for anything that gets past it.
    expect(document.querySelector('input[type="file"]')).toHaveAttribute(
      "accept",
      ".pdf,application/pdf",
    );
  });

  it("rejects an oversized PDF before any request is made", async () => {
    const user = userEvent.setup();
    renderPanel();

    await openUploadAndPick(user, pdf("huge.pdf", 26 * 1024 * 1024));

    expect(screen.getByText("File is too large. Maximum size is 25MB.")).toBeInTheDocument();
    expect(uploadMutateAsync).not.toHaveBeenCalled();
  });

  it("keeps the modal open and shows the backend reason when the upload fails", async () => {
    uploadMutateAsync.mockRejectedValue({
      response: { status: 415, data: { detail: "Signed NDA must be a PDF document" } },
    });

    const user = userEvent.setup();
    renderPanel();
    await openUploadAndPick(user);
    await user.click(
      screen.getAllByRole("button", { name: /^upload signed nda$/i }).at(-1),
    );

    expect(await screen.findByText("Signed NDA must be a PDF document")).toBeInTheDocument();
    // Still open — the user can pick a different file without starting over.
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it("does not offer the upload without the upload permission", () => {
    permissions = { ...permissions, canUploadSignedNda: false };
    renderPanel();
    expect(screen.queryByRole("button", { name: /upload signed nda/i })).not.toBeInTheDocument();
  });

  it("offers a corrected upload from REJECTED", () => {
    useVendorNda.mockReturnValue(lookup(nda({ status_code: "REJECTED" })));
    renderPanel();
    expect(
      screen.getByRole("button", { name: /upload corrected signed nda/i }),
    ).toBeInTheDocument();
  });

  it("does not offer an upload from PENDING or COMPLETED", () => {
    useVendorNda.mockReturnValue(lookup(nda({ status_code: "PENDING" })));
    const { unmount } = renderPanel();
    expect(screen.queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
    unmount();

    useVendorNda.mockReturnValue(lookup(nda({ status_code: "COMPLETED" })));
    renderPanel();
    expect(screen.queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
  });
});

describe("NdaPanel — internal review of a SIGNED NDA", () => {
  beforeEach(() => {
    useVendorNda.mockReturnValue(
      lookup(nda({ status_code: "SIGNED", signed_document_key: "nda/signed.pdf" })),
    );
  });

  it("offers Accept & Complete and Reject, not a raw status list", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /accept & complete/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark completed/i })).not.toBeInTheDocument();
  });

  it("completes through the status API", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /accept & complete/i }));
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() =>
      expect(statusMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ ndaId: 55, statusCode: "COMPLETED" }),
      ),
    );
  });

  it("requires a reason before a rejection can be confirmed", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /^reject$/i }));
    expect(screen.getByRole("button", { name: /confirm/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/rejection reason/i), "Wrong signatory");
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() =>
      expect(statusMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: "REJECTED", reason: "Wrong signatory" }),
      ),
    );
  });

  it("opens the signed document through a presigned URL, never an S3 key", async () => {
    ndaService.getNdaDocumentUrl.mockResolvedValue({
      nda_id: 55,
      url: "https://s3.example/presigned",
      expires_in_seconds: 300,
    });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);

    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /view signed nda/i }));

    await waitFor(() =>
      expect(ndaService.getNdaDocumentUrl).toHaveBeenCalledWith(55, { signed: true }),
    );
    expect(open).toHaveBeenCalledWith(
      "https://s3.example/presigned",
      "_blank",
      "noopener,noreferrer",
    );
    open.mockRestore();
  });
});

describe("NdaPanel — NOT_REQUIRED", () => {
  it("shows the bypass and offers no NDA actions at all", () => {
    renderPanel({ ndaRequired: false });

    expect(screen.getByText("NDA Not Required")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate nda/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
  });
});

describe("validateSignedNdaFile", () => {
  const withSize = (file, size) => {
    Object.defineProperty(file, "size", { value: size });
    return file;
  };

  it("accepts a PDF within the size limit", () => {
    expect(validateSignedNdaFile(pdf())).toBe("");
  });

  it("rejects a non-PDF", () => {
    const docx = withSize(new File(["x"], "scan.docx", { type: "application/msword" }), 100);
    expect(validateSignedNdaFile(docx)).toBe("The signed NDA must be a PDF document.");
  });

  it("accepts a .pdf whose MIME type the browser did not set", () => {
    const untyped = withSize(new File(["%PDF"], "signed.pdf", { type: "" }), 100);
    expect(validateSignedNdaFile(untyped)).toBe("");
  });

  it("rejects an empty file", () => {
    expect(validateSignedNdaFile(pdf("empty.pdf", 0))).toBe("The selected file is empty.");
  });

  it("rejects a file over 25MB", () => {
    expect(validateSignedNdaFile(pdf("big.pdf", 26 * 1024 * 1024))).toBe(
      "File is too large. Maximum size is 25MB.",
    );
  });

  it("rejects nothing selected", () => {
    expect(validateSignedNdaFile(null)).toBe("Select the signed NDA PDF to upload.");
  });
});

describe("NdaPanel — reusing an NDA the vendor already has", () => {
  const completed = {
    nda_id: 41,
    status_code: "COMPLETED",
    template_version: "v1",
    valid_from: "2026-01-01",
    valid_until: "2099-01-01",
  };

  /** No NDA for this scope yet, but the vendor has other agreements on file. */
  const withCandidates = (ndas) =>
    useVendorNda.mockReturnValue({
      data: { vendor_id: 9, outcome: "NOT_FOUND", reason: null, nda: null, ndas },
      isLoading: false,
      isError: false,
      error: null,
    });

  it("offers the existing agreement instead of going straight to Generate", () => {
    withCandidates([completed]);
    renderPanel();

    expect(screen.getByText(/existing nda available for this vendor/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /use existing nda/i })).toBeInTheDocument();
    // The bare Generate button would duplicate the choice offered inside the panel.
    expect(screen.queryByRole("button", { name: /^generate nda$/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /generate new nda instead/i }),
    ).toBeInTheDocument();
  });

  it("requests reuse through the existing generate call, for this vendor and PR", async () => {
    const user = userEvent.setup();
    withCandidates([completed]);
    generateMutateAsync.mockResolvedValue({ nda_id: 41, reused: true, message: "Reused." });

    renderPanel();
    await user.click(screen.getByRole("button", { name: /use existing nda/i }));

    // No second NDA record is created — the backend resolves this to the existing one.
    expect(generateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ vendor_id: 9, pr_id: 12 }),
    );
  });

  it("falls back to the normal Generate flow when nothing on file is reusable", () => {
    withCandidates([
      { ...completed, status_code: "EXPIRED" },
      { ...completed, nda_id: 42, status_code: "REJECTED" },
      { ...completed, nda_id: 43, status_code: "SIGNED" },
    ]);
    renderPanel();

    expect(screen.queryByText(/existing nda available for this vendor/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^generate nda$/i })).toBeInTheDocument();
  });

  it("stops offering reuse once this engagement has its own NDA", () => {
    useVendorNda.mockReturnValue({
      data: {
        vendor_id: 9,
        outcome: "VALID",
        reason: null,
        nda: nda({ status_code: "PENDING" }),
        ndas: [completed],
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPanel();
    expect(screen.queryByText(/existing nda available for this vendor/i)).not.toBeInTheDocument();
  });
});
