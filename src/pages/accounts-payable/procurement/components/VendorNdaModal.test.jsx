import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VendorNdaModal from "./VendorNdaModal";
import { useVendorNda } from "../hooks/useNda";

const sendMutateAsync = vi.fn();
const saveMutateAsync = vi.fn();
const refetchNdaDetail = vi.fn();

// GET /apm/nda/{nda_id} — the persisted content the editor loads from.
let ndaDetailData = null;

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

let permissions = {
  canViewNda: true,
  canGenerateNda: true,
  canSendNda: true,
  canUploadSignedNda: true,
};
vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: () => permissions,
}));

vi.mock("../hooks/useNda", () => ({
  useVendorNda: vi.fn(),
  useNdaDetail: () => ({ data: ndaDetailData, refetch: refetchNdaDetail, isLoading: false }),
  useUpdateNdaContent: () => ({ mutateAsync: saveMutateAsync, isPending: false }),
  useGenerateNda: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSendNda: () => ({ mutateAsync: sendMutateAsync, isPending: false }),
  useUpdateNdaStatus: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadSignedNda: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// The vendor profile supplies the address / tax registration the document names.
vi.mock("../../vendor/hooks/useVendorDetail", () => ({
  default: () => ({
    vendor: { vendor_name: "ZIRA TECH LASER", email: "zira34@gmail.com", vendor_code: "V-1043" },
    addresses: [
      {
        is_primary: true,
        address_line1: "12 Industrial Estate",
        city: "Pune",
        state: "MH",
        postal_code: "411001",
        vendor_tax: [{ registration_type: "GSTIN", registration_number: "27AABCZ1234H1Z5" }],
      },
    ],
  }),
}));

const nda = (overrides = {}) => ({
  nda_id: 55,
  vendor_id: 9,
  status_code: "PENDING",
  recipient_email: "zira34@gmail.com",
  document_key: "nda/55/generated.pdf",
  signed_document_key: null,
  template_version: "v1",
  valid_from: "2026-03-21",
  valid_until: "2027-03-21",
  created_at: "2026-03-21T10:00:00Z",
  ...overrides,
});

const renderModal = (props = {}) =>
  render(
    <VendorNdaModal
      isOpen
      onClose={vi.fn()}
      vendorId={9}
      vendorName="ZIRA TECH LASER"
      vendorCode="V-1043"
      prId={12}
      prNumber="PR-25"
      prDate="2026-03-12"
      departmentId={3}
      purchaseCategoryId={4}
      departmentName="Engineering"
      categoryName="IT Services"
      businessRequirement="Laser cutting subcontracting"
      ndaRequired
      recipientEmail="zira34@gmail.com"
      {...props}
    />,
  );

const withNda = (overrides) =>
  useVendorNda.mockReturnValue({
    data: { outcome: "NOT_FOUND", nda: nda(overrides) },
    isLoading: false,
    isError: false,
    error: null,
  });

const PERSISTED_CONTENT = "<p>Persisted NDA body from the server</p>";

const documentSurface = () => document.querySelector(".nda-document");

/** Types into the contentEditable surface the way the editor reports a change. */
const editDocument = (html) => {
  const surface = documentSurface();
  surface.innerHTML = html;
  fireEvent.input(surface);
};

/**
 * The confirmation dialog renders inside the workspace modal, so it is the innermost (last)
 * dialog in the document. Scoping to it matters: the workspace footer also has a "Send NDA"
 * button, and an unscoped query would click that one and merely reopen the dialog.
 */
const confirmDialog = () => screen.getAllByRole("dialog").pop();

beforeEach(() => {
  vi.clearAllMocks();
  permissions = {
    canViewNda: true,
    canGenerateNda: true,
    canSendNda: true,
    canUploadSignedNda: true,
  };
  sendMutateAsync.mockResolvedValue({ sent: true, recipient_email: "zira34@gmail.com" });
  saveMutateAsync.mockResolvedValue({ nda_id: 55, version: 4 });
  ndaDetailData = { nda_id: 55, content: PERSISTED_CONTENT, version: 3 };
  refetchNdaDetail.mockResolvedValue({ data: ndaDetailData });
  withNda();
});

describe("VendorNdaModal — editable NDA document", () => {
  it("populates the document from the vendor and PR when nothing is saved yet", () => {
    // No persisted body — the generated template stands in until the first save.
    ndaDetailData = { nda_id: 55, content: null, version: null };
    renderModal();
    const doc = documentSurface();

    expect(doc).toBeTruthy();
    expect(doc.textContent).toContain("ZIRA TECH LASER");
    expect(doc.textContent).toContain("zira34@gmail.com");
    expect(doc.textContent).toContain("V-1043");
    expect(doc.textContent).toContain("PR-25");
    expect(doc.textContent).toContain("Engineering");
    expect(doc.textContent).toContain("IT Services");
    expect(doc.textContent).toContain("Laser cutting subcontracting");
    // Address and tax registration come from the vendor record, not from a guess.
    expect(doc.textContent).toContain("12 Industrial Estate, Pune, MH, 411001");
    expect(doc.textContent).toContain("GSTIN 27AABCZ1234H1Z5");
  });

  it("makes the document editable while the NDA is still a draft", () => {
    ndaDetailData = { nda_id: 55, content: null, version: null };
    renderModal();
    expect(documentSurface().getAttribute("contenteditable")).toBe("true");
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Numbered list" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("locks the system-populated identity fields against editing", () => {
    ndaDetailData = { nda_id: 55, content: null, version: null };
    renderModal();
    const systemFields = documentSurface().querySelectorAll(".nda-field-system");

    expect(systemFields.length).toBeGreaterThan(0);
    systemFields.forEach((field) => expect(field.getAttribute("contenteditable")).toBe("false"));

    // Editable regions are present and are not locked.
    const editableFields = documentSurface().querySelectorAll(".nda-field-editable");
    expect(editableFields.length).toBeGreaterThan(0);
    editableFields.forEach((field) => expect(field.getAttribute("contenteditable")).toBeNull());
  });

  it("stops offering editing once the NDA has been sent", () => {
    withNda({ status_code: "SENT" });
    renderModal();

    expect(documentSurface().getAttribute("contenteditable")).toBe("false");
    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^send nda$/i })).not.toBeInTheDocument();
  });
});

describe("VendorNdaModal — send", () => {
  it("confirms the recipient before sending, and sends only that vendor's NDA", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: /^send nda$/i }));

    const dialog = confirmDialog();
    expect(within(dialog).getByText("zira34@gmail.com")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Non-Disclosure Agreement – PR-25"),
    ).toBeInTheDocument();
    // The attachment is named, never as an object path.
    expect(within(dialog).getByText("generated.pdf")).toBeInTheDocument();
    expect(within(dialog).queryByText(/nda\/55\//)).not.toBeInTheDocument();

    const confirm = within(dialog).getAllByRole("button", { name: /send nda/i }).pop();
    await user.click(confirm);

    expect(sendMutateAsync).toHaveBeenCalledTimes(1);
    expect(sendMutateAsync).toHaveBeenCalledWith(55);
  });

  it("reports a delivery failure returned as a 200 with sent:false", async () => {
    const { toast } = await import("react-toastify");
    const user = userEvent.setup();
    sendMutateAsync.mockResolvedValue({ sent: false, error: "Mailbox unavailable." });

    renderModal();
    await user.click(screen.getByRole("button", { name: /^send nda$/i }));
    const confirm = within(confirmDialog()).getByRole("button", { name: /send nda/i });
    await user.click(confirm);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Mailbox unavailable."));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("hides Send from a user without the send permission", () => {
    permissions = { ...permissions, canSendNda: false };
    renderModal();
    expect(screen.queryByRole("button", { name: /^send nda$/i })).not.toBeInTheDocument();
  });
});

const saveButton = () => screen.getByRole("button", { name: /save draft/i });
const footerSendButton = () => screen.getByRole("button", { name: /^send nda$/i });

const openSendAndConfirm = async (user) => {
  await user.click(footerSendButton());
  await user.click(within(confirmDialog()).getByRole("button", { name: /send nda/i }));
};

describe("VendorNdaModal — persisted content", () => {
  it("loads the content the backend holds rather than regenerating the template", () => {
    renderModal();
    expect(documentSurface().textContent).toContain("Persisted NDA body from the server");
    // The template is not layered on top of a saved document.
    expect(documentSurface().textContent).not.toContain("NON-DISCLOSURE AGREEMENT");
  });

  it("saves through PUT /content with the NDA id, content and the loaded version", async () => {
    const user = userEvent.setup();
    renderModal();

    expect(saveButton()).toBeDisabled();

    editDocument("<p>Edited body</p>");
    expect(saveButton()).toBeEnabled();

    await user.click(saveButton());

    expect(saveMutateAsync).toHaveBeenCalledWith({
      ndaId: 55,
      content: "<p>Edited body</p>",
      version: 3,
    });
  });

  it("clears the dirty state and takes the new version on a successful save", async () => {
    const user = userEvent.setup();
    renderModal();

    editDocument("<p>Edited body</p>");
    await user.click(saveButton());

    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(screen.getByText("4")).toBeInTheDocument();

    // Saving again sends the version the server just returned, not the one first loaded.
    editDocument("<p>Edited twice</p>");
    await user.click(saveButton());
    expect(saveMutateAsync).toHaveBeenLastCalledWith({
      ndaId: 55,
      content: "<p>Edited twice</p>",
      version: 4,
    });
  });

  it("keeps local edits when the save fails", async () => {
    const { toast } = await import("react-toastify");
    const user = userEvent.setup();
    saveMutateAsync.mockRejectedValue({
      response: { status: 422, data: { detail: "Invalid NDA content." } },
    });

    renderModal();
    editDocument("<p>Edited body</p>");
    await user.click(saveButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid NDA content."));
    expect(documentSurface().textContent).toContain("Edited body");
    // Still dirty, so the user can retry.
    expect(saveButton()).toBeEnabled();
  });

  it("keeps local edits on a 409 and offers Reload Latest", async () => {
    const user = userEvent.setup();
    saveMutateAsync.mockRejectedValue({ response: { status: 409, data: {} } });

    renderModal();
    editDocument("<p>My edits</p>");
    await user.click(saveButton());

    await waitFor(() =>
      expect(
        screen.getByText(
          "This NDA was updated elsewhere. Reload the latest version before saving your changes.",
        ),
      ).toBeInTheDocument(),
    );

    // The conflict must never silently replace what the user wrote.
    expect(documentSurface().textContent).toContain("My edits");
    expect(screen.getByRole("button", { name: /reload latest/i })).toBeInTheDocument();
  });

  it("replaces local content only when Reload Latest is actually clicked", async () => {
    const user = userEvent.setup();
    saveMutateAsync.mockRejectedValue({ response: { status: 409, data: {} } });

    renderModal();
    editDocument("<p>My edits</p>");
    await user.click(saveButton());
    await screen.findByRole("button", { name: /reload latest/i });

    // A real refetch writes through to the query cache, so the hook's data changes too.
    refetchNdaDetail.mockImplementation(async () => {
      ndaDetailData = { nda_id: 55, content: "<p>Someone else's newer body</p>", version: 9 };
      return { data: ndaDetailData };
    });

    await user.click(screen.getByRole("button", { name: /reload latest/i }));

    await waitFor(() =>
      expect(documentSurface().textContent).toContain("Someone else's newer body"),
    );
    expect(documentSurface().textContent).not.toContain("My edits");
    expect(saveButton()).toBeDisabled();
  });
});

describe("VendorNdaModal — save before send", () => {
  it("sends directly when there is nothing unsaved", async () => {
    const user = userEvent.setup();
    renderModal();

    await openSendAndConfirm(user);

    expect(saveMutateAsync).not.toHaveBeenCalled();
    expect(sendMutateAsync).toHaveBeenCalledWith(55);
  });

  it("persists unsaved edits before sending, in that order", async () => {
    const user = userEvent.setup();
    const order = [];
    saveMutateAsync.mockImplementation(async () => {
      order.push("save");
      return { nda_id: 55, version: 4 };
    });
    sendMutateAsync.mockImplementation(async () => {
      order.push("send");
      return { sent: true, recipient_email: "zira34@gmail.com" };
    });

    renderModal();
    editDocument("<p>Edited right before sending</p>");
    await openSendAndConfirm(user);

    await waitFor(() => expect(order).toEqual(["save", "send"]));
    expect(saveMutateAsync).toHaveBeenCalledWith({
      ndaId: 55,
      content: "<p>Edited right before sending</p>",
      version: 3,
    });
  });

  it("does not send when the pre-send save fails", async () => {
    const user = userEvent.setup();
    saveMutateAsync.mockRejectedValue({ response: { status: 409, data: {} } });

    renderModal();
    editDocument("<p>Unsaved edits</p>");
    await openSendAndConfirm(user);

    // The vendor must never receive content the server does not hold.
    await waitFor(() => expect(saveMutateAsync).toHaveBeenCalled());
    expect(sendMutateAsync).not.toHaveBeenCalled();
    expect(documentSurface().textContent).toContain("Unsaved edits");
  });

  it("ignores a duplicate Send click while the first is still running", async () => {
    const user = userEvent.setup();
    let release;
    sendMutateAsync.mockImplementation(
      () => new Promise((resolve) => {
        release = () => resolve({ sent: true, recipient_email: "zira34@gmail.com" });
      }),
    );

    renderModal();
    await user.click(footerSendButton());

    const confirm = within(confirmDialog()).getByRole("button", { name: /send nda/i });
    await user.click(confirm);
    await user.click(confirm);

    expect(sendMutateAsync).toHaveBeenCalledTimes(1);
    release();
  });

  it("ignores a duplicate Save click while the first is still running", async () => {
    const user = userEvent.setup();
    let release;
    saveMutateAsync.mockImplementation(
      () => new Promise((resolve) => {
        release = () => resolve({ nda_id: 55, version: 4 });
      }),
    );

    renderModal();
    editDocument("<p>Edited body</p>");

    await user.click(saveButton());
    await user.click(saveButton());

    expect(saveMutateAsync).toHaveBeenCalledTimes(1);
    release();
  });
});
