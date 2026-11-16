import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "react-toastify";
import NdaHistoryPanel from "./NdaHistoryPanel";
import { useVendorNdaHistory } from "../hooks/useNda";
import ndaService from "../services/ndaService";

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

let permissions = {};
vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: () => permissions,
}));

const replaceMutateAsync = vi.fn();
const statusMutateAsync = vi.fn();
let replacePending = false;

vi.mock("../hooks/useNda", () => ({
  useVendorNdaHistory: vi.fn(),
  useReplaceNda: () => ({ mutateAsync: replaceMutateAsync, isPending: replacePending }),
  useUpdateNdaStatus: () => ({ mutateAsync: statusMutateAsync, isPending: false }),
}));

vi.mock("../services/ndaService", () => ({
  default: { getNdaDocumentUrl: vi.fn() },
}));

const record = (overrides = {}) => ({
  nda_id: 55,
  vendor_id: 9,
  version: 1,
  status_code: "COMPLETED",
  document_name: "Original_NDA.pdf",
  document_key: "nda/55/generated.pdf",
  created_at: "2026-03-21T10:00:00Z",
  department_id: 3,
  purchase_category_id: 4,
  department_name: "Engineering",
  purchase_category_name: "IT Services",
  ...overrides,
});

const withHistory = (data) =>
  useVendorNdaHistory.mockReturnValue({ data, isLoading: false, isError: false, error: null });

const singleActive = (overrides) => {
  const active = record(overrides);
  withHistory({ vendor_id: 9, count: 1, active: [active], versions: [active] });
};

const pdf = (name = "Updated_NDA.pdf") => new File(["%PDF-1.4"], name, { type: "application/pdf" });

const renderPanel = (props = {}) =>
  render(<NdaHistoryPanel vendorId={9} prId={12} currentNdaId={55} {...props} />);

const lastDialog = () => screen.getAllByRole("dialog").pop();

const openReplaceAndPick = async (user, file = pdf()) => {
  await user.click(screen.getByRole("button", { name: /Replace NDA/ }));
  fireEvent.change(screen.getByLabelText("New NDA (PDF)"), { target: { files: [file] } });
};

beforeEach(() => {
  vi.clearAllMocks();
  replacePending = false;
  permissions = { canViewNda: true, canGenerateNda: true, canSendNda: true };
  replaceMutateAsync.mockResolvedValue({
    nda_id: 77,
    status_code: "PENDING",
    message: "NDA replaced; version 2 is pending verification.",
  });
  statusMutateAsync.mockResolvedValue({});
  ndaService.getNdaDocumentUrl.mockResolvedValue({ nda_id: 55, url: "https://signed/url" });
  singleActive();
});

describe("NdaHistoryPanel — loading and display", () => {
  it("shows the active NDA with name, version, status, date and scope", () => {
    renderPanel();

    const activeSection = screen.getByText("Active NDA Document").closest("section");
    expect(within(activeSection).getByText("Original_NDA.pdf")).toBeInTheDocument();
    expect(within(activeSection).getByText("v1")).toBeInTheDocument();
    expect(within(activeSection).getByText("Completed")).toBeInTheDocument();
    expect(within(activeSection).getByText("This Engagement")).toBeInTheDocument();
    expect(within(activeSection).getByText(/Engineering · IT Services/)).toBeInTheDocument();
  });

  it("shows the empty state for a vendor with no NDA history", () => {
    withHistory({ vendor_id: 9, count: 0, active: [], versions: [] });
    renderPanel();

    expect(screen.getByText("No NDA available for this vendor yet.")).toBeInTheDocument();
    expect(screen.getByText("No NDA versions on file.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Replace NDA/ })).not.toBeInTheDocument();
  });

  it.each([
    ["PENDING", "Pending"],
    ["COMPLETED", "Completed"],
    ["REJECTED", "Rejected"],
  ])("displays the backend status %s as %s", (statusCode, label) => {
    singleActive({ status_code: statusCode });
    renderPanel();
    const activeSection = screen.getByText("Active NDA Document").closest("section");
    expect(within(activeSection).getByText(label)).toBeInTheDocument();
  });

  it("lists every version, marking active and inactive, with download only on history rows", () => {
    const previous = record({ nda_id: 55, version: 1, status_code: "COMPLETED", is_active: false });
    const current = record({
      nda_id: 77,
      version: 2,
      status_code: "PENDING",
      document_name: "Updated_NDA.pdf",
    });
    withHistory({ vendor_id: 9, count: 2, active: [current], versions: [previous, current] });
    renderPanel({ currentNdaId: 77 });

    const historySection = screen.getByText("NDA Document History").closest("section");
    const rows = within(historySection).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Updated_NDA.pdf")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Active")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Original_NDA.pdf")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Inactive")).toBeInTheDocument();

    // Historical versions are read-only.
    expect(within(rows[1]).queryByRole("button", { name: /Replace/ })).not.toBeInTheDocument();
    expect(within(rows[1]).queryByRole("button", { name: /Accept/ })).not.toBeInTheDocument();
    expect(within(rows[1]).queryByRole("button", { name: /Reject/ })).not.toBeInTheDocument();
  });

  it("shows a readable error when the history cannot be loaded", () => {
    useVendorNdaHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 404, data: { detail: "Vendor not found." } } },
    });
    renderPanel();
    expect(screen.getByText("Vendor not found.")).toBeInTheDocument();
  });

  it("renders nothing without NDA view permission", () => {
    permissions = { canViewNda: false };
    const { container } = renderPanel();
    expect(container).toBeEmptyDOMElement();
  });
});

describe("NdaHistoryPanel — replacement", () => {
  it("confirms, then replaces the exact NDA and reports the backend's message", async () => {
    const user = userEvent.setup();
    renderPanel();

    const file = pdf();
    await openReplaceAndPick(user, file);
    expect(screen.getByText("Updated_NDA.pdf")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Reason (optional)"), "Legal update");

    await user.click(within(lastDialog()).getByRole("button", { name: "Replace NDA" }));
    const confirm = lastDialog();
    expect(within(confirm).getByText("Replace Existing NDA?")).toBeInTheDocument();
    expect(replaceMutateAsync).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole("button", { name: "Replace NDA" }));

    await waitFor(() => expect(replaceMutateAsync).toHaveBeenCalledTimes(1));
    expect(replaceMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ vendorId: 9, file, ndaId: 55, reason: "Legal update" }),
    );
    expect(toast.success).toHaveBeenCalledWith("NDA replaced; version 2 is pending verification.");
    await waitFor(() =>
      expect(screen.queryByText("Replace NDA Document")).not.toBeInTheDocument(),
    );
  });

  it("does not submit when the replacement is cancelled at confirmation", async () => {
    const user = userEvent.setup();
    renderPanel();

    await openReplaceAndPick(user);
    await user.click(within(lastDialog()).getByRole("button", { name: "Replace NDA" }));
    await user.click(within(lastDialog()).getByRole("button", { name: "Cancel" }));

    expect(replaceMutateAsync).not.toHaveBeenCalled();
    // Back on the form with the file still selected.
    expect(screen.getByText("Replace NDA Document")).toBeInTheDocument();
    expect(screen.getByText("Updated_NDA.pdf")).toBeInTheDocument();
  });

  it("rejects a non-PDF before anything is uploaded", async () => {
    const user = userEvent.setup();
    renderPanel();

    await openReplaceAndPick(user, new File(["x"], "nda.docx", { type: "application/msword" }));

    expect(screen.getByText("The replacement NDA must be a PDF document.")).toBeInTheDocument();
    expect(within(lastDialog()).getByRole("button", { name: "Replace NDA" })).toBeDisabled();
    expect(replaceMutateAsync).not.toHaveBeenCalled();
  });

  it.each([
    [413, "File is too large. Maximum size is 25MB."],
    [415, "Unsupported file format. Upload a PDF document."],
    [409, "This NDA has already been replaced. Refresh to see the latest version."],
    [502, "The document could not be stored. Please try again."],
  ])("keeps the form and shows a meaningful message on a %s", async (status, message) => {
    replaceMutateAsync.mockRejectedValue({ response: { status, data: {} } });
    const user = userEvent.setup();
    renderPanel();

    await openReplaceAndPick(user);
    await user.click(within(lastDialog()).getByRole("button", { name: "Replace NDA" }));
    await user.click(within(lastDialog()).getByRole("button", { name: "Replace NDA" }));

    await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument());
    expect(toast.error).toHaveBeenCalledWith(message);
    expect(toast.success).not.toHaveBeenCalled();
    // File kept, and the user can retry.
    expect(screen.getByText("Updated_NDA.pdf")).toBeInTheDocument();
    expect(within(lastDialog()).getByRole("button", { name: "Replace NDA" })).toBeEnabled();
  });

  it("prefers the backend's own error detail", async () => {
    replaceMutateAsync.mockRejectedValue({
      response: { status: 422, data: { detail: "NDA 55 is not active." } },
    });
    const user = userEvent.setup();
    renderPanel();

    await openReplaceAndPick(user);
    await user.click(within(lastDialog()).getByRole("button", { name: "Replace NDA" }));
    await user.click(within(lastDialog()).getByRole("button", { name: "Replace NDA" }));

    await waitFor(() => expect(screen.getByText("NDA 55 is not active.")).toBeInTheDocument());
  });

  it("submits only once on a double click at confirmation", async () => {
    let resolve;
    replaceMutateAsync.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    renderPanel();

    await openReplaceAndPick(user);
    await user.click(within(lastDialog()).getByRole("button", { name: "Replace NDA" }));
    const confirmButton = within(lastDialog()).getByRole("button", { name: "Replace NDA" });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(replaceMutateAsync).toHaveBeenCalledTimes(1);
    resolve({ status_code: "PENDING" });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("hides Replace NDA without the generate permission", () => {
    permissions = { canViewNda: true, canGenerateNda: false, canSendNda: false };
    renderPanel();
    expect(screen.queryByRole("button", { name: /Replace NDA/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View \/ Download/ })).toBeInTheDocument();
  });

  it("only replaces the NDA whose Replace button was used when several scopes are active", async () => {
    const a = record({ nda_id: 5, department_name: "Engineering" });
    const b = record({ nda_id: 6, department_name: "Finance", document_name: "Finance_NDA.pdf" });
    withHistory({ vendor_id: 9, count: 2, active: [a, b], versions: [a, b] });
    const user = userEvent.setup();
    renderPanel({ currentNdaId: 5 });

    await user.click(screen.getAllByRole("button", { name: /Replace NDA/ })[1]);
    fireEvent.change(screen.getByLabelText("New NDA (PDF)"), { target: { files: [pdf()] } });
    await user.click(within(lastDialog()).getByRole("button", { name: "Replace NDA" }));
    await user.click(within(lastDialog()).getByRole("button", { name: "Replace NDA" }));

    await waitFor(() =>
      expect(replaceMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ ndaId: 6 })),
    );
  });
});

describe("NdaHistoryPanel — verification", () => {
  it("offers Accept & Complete / Reject on an active pending replacement", async () => {
    singleActive({ nda_id: 77, version: 2, status_code: "PENDING" });
    const user = userEvent.setup();
    renderPanel({ currentNdaId: 77 });

    await user.click(screen.getByRole("button", { name: "Accept & Complete" }));
    await user.click(within(lastDialog()).getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(statusMutateAsync).toHaveBeenCalledWith({
        ndaId: 77,
        statusCode: "COMPLETED",
        reason: undefined,
      }),
    );
  });

  it("requires a reason to reject", async () => {
    singleActive({ nda_id: 77, version: 2, status_code: "PENDING" });
    const user = userEvent.setup();
    renderPanel({ currentNdaId: 77 });

    await user.click(screen.getByRole("button", { name: "Reject" }));
    const confirm = within(lastDialog()).getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText("Rejection Reason *"), "Wrong entity name");
    await user.click(confirm);

    await waitFor(() =>
      expect(statusMutateAsync).toHaveBeenCalledWith({
        ndaId: 77,
        statusCode: "REJECTED",
        reason: "Wrong entity name",
      }),
    );
  });

  it("hides verification without the send permission, and for a completed NDA", () => {
    singleActive({ nda_id: 77, version: 2, status_code: "PENDING" });
    permissions = { canViewNda: true, canGenerateNda: true, canSendNda: false };
    const { unmount } = renderPanel({ currentNdaId: 77 });
    expect(screen.queryByRole("button", { name: "Accept & Complete" })).not.toBeInTheDocument();
    unmount();

    permissions = { canViewNda: true, canGenerateNda: true, canSendNda: true };
    singleActive({ nda_id: 77, version: 2, status_code: "COMPLETED" });
    renderPanel({ currentNdaId: 77 });
    expect(screen.queryByRole("button", { name: "Accept & Complete" })).not.toBeInTheDocument();
  });
});

describe("NdaHistoryPanel — download", () => {
  it("downloads a historical version through a fresh short-lived URL", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const previous = record({ nda_id: 55, version: 1, is_active: false });
    const current = record({ nda_id: 77, version: 2, status_code: "PENDING" });
    withHistory({ vendor_id: 9, count: 2, active: [current], versions: [previous, current] });
    const user = userEvent.setup();
    renderPanel({ currentNdaId: 77 });

    const historySection = screen.getByText("NDA Document History").closest("section");
    const oldRow = within(historySection).getAllByRole("listitem")[1];
    await user.click(within(oldRow).getByRole("button", { name: /Download/ }));

    await waitFor(() =>
      expect(ndaService.getNdaDocumentUrl).toHaveBeenCalledWith(55, { signed: false }),
    );
    expect(openSpy).toHaveBeenCalledWith("https://signed/url", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });

  it("reports an expired or missing document link instead of opening it", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    ndaService.getNdaDocumentUrl.mockRejectedValue({
      response: { status: 404, data: { detail: "Document link has expired." } },
    });
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /View \/ Download/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Document link has expired."));
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
