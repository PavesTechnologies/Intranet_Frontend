import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InviteVendorsModal from "./InviteVendorsModal";
import { useRfqEligibilityBatch } from "../hooks/useRfqEligibility";

const inviteMutateAsync = vi.fn();

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// The NDA actions on a row are permission-gated, so the modal now reads the AP permission
// flags. Granted here so the row actions are exercised; a separate test revokes them.
let permissions = { canViewNda: true };
vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: () => permissions,
}));

vi.mock("../hooks/useRfqMutations", () => ({
  useInviteVendors: () => ({ mutateAsync: inviteMutateAsync, isPending: false }),
}));

// Candidates come from the PR's vendor availability, already scoped by the backend to this
// requisition's department and purchase category.
let availableVendors = [];
vi.mock("../hooks/useVendorOnboarding", () => ({
  useVendorAvailability: () => ({
    data: { pr_id: 12, available: availableVendors.length > 0, vendors: availableVendors },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("../hooks/useRfqEligibility", () => ({
  useRfqEligibilityBatch: vi.fn(),
}));

const onManageNda = vi.fn();

const renderModal = (props = {}) =>
  render(
    <InviteVendorsModal
      isOpen
      onClose={vi.fn()}
      rfqId="7"
      prId={12}
      departmentName="Engineering"
      categoryName="IT Services"
      onManageNda={onManageNda}
      {...props}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  permissions = { canViewNda: true };
  availableVendors = [
    { vendor_id: 1, vendor_name: "Eligible Co", email: "ok@test.com" },
    { vendor_id: 2, vendor_name: "Blocked Co", email: "no@test.com" },
  ];
  inviteMutateAsync.mockResolvedValue({});
  useRfqEligibilityBatch.mockReturnValue({
    eligibilityByVendorId: new Map([
      [1, { vendor_id: 1, eligible: true, reason: null, checks: [], failed_checks: [] }],
      [
        2,
        {
          vendor_id: 2,
          eligible: false,
          reason: "Mandatory NDA is not completed.",
          checks: [],
          failed_checks: [
            { check: "NDA", status: "PENDING", passed: false, message: "Mandatory NDA is not completed." },
          ],
        },
      ],
    ]),
    isLoading: false,
    isError: false,
    error: null,
  });
});

describe("InviteVendorsModal — RFQ eligibility gating", () => {
  it("marks each vendor with the backend's eligibility verdict", () => {
    renderModal();
    expect(screen.getByText("RFQ Eligible")).toBeInTheDocument();
    expect(screen.getByText("RFQ Blocked")).toBeInTheDocument();
  });

  it("disables a blocked vendor and shows the backend's reason verbatim", () => {
    renderModal();

    const blockedCheckbox = screen.getByText("Blocked Co").closest("label").querySelector("input");
    expect(blockedCheckbox).toBeDisabled();
    expect(screen.getByText("Mandatory NDA is not completed.")).toBeInTheDocument();
  });

  it("only invites the eligible vendor when both are clicked", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByText("Blocked Co").closest("label").querySelector("input"));
    await user.click(screen.getByText("Eligible Co").closest("label").querySelector("input"));
    await user.click(screen.getByRole("button", { name: /^invite/i }));

    expect(inviteMutateAsync).toHaveBeenCalledWith([1]);
  });

  it("does not block anyone when the eligibility check itself is unavailable", () => {
    useRfqEligibilityBatch.mockReturnValue({
      eligibilityByVendorId: new Map(),
      isLoading: false,
      isError: true,
      error: { response: { data: { detail: "Eligibility service unavailable" } } },
    });

    renderModal();

    // The server re-checks on invite, so an unknown verdict must not lock the user out.
    expect(screen.getByText("Blocked Co").closest("label").querySelector("input")).toBeEnabled();
    expect(screen.getByText(/Eligibility service unavailable/)).toBeInTheDocument();
  });
});

/**
 * The NDA state on a row is the NDA gate of the backend's eligibility verdict — never
 * inferred here — and each row carries only its own vendor's NDA.
 */
const withNdaStatus = (status, { eligible = false } = {}) => {
  useRfqEligibilityBatch.mockReturnValue({
    eligibilityByVendorId: new Map([
      [1, { vendor_id: 1, eligible: true, reason: null, checks: [], failed_checks: [] }],
      [
        2,
        {
          vendor_id: 2,
          eligible,
          reason: eligible ? null : "Mandatory NDA is not completed.",
          checks: [{ check: "NDA", status, passed: eligible, message: null }],
          failed_checks: eligible
            ? []
            : [{ check: "NDA", status, passed: false, message: "Mandatory NDA is not completed." }],
        },
      ],
    ]),
    isLoading: false,
    isError: false,
    error: null,
  });
};

describe("InviteVendorsModal — NDA row actions", () => {
  it("offers Generate NDA only when the backend reports no NDA exists yet", async () => {
    const user = userEvent.setup();
    withNdaStatus("NOT_FOUND");
    renderModal();

    expect(screen.getByText("NDA Required")).toBeInTheDocument();
    expect(screen.getByText("RFQ Blocked")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /generate nda/i }));

    // Opens the workspace for that one vendor, carrying that vendor's identity only.
    expect(onManageNda).toHaveBeenCalledWith({
      vendorId: 2,
      vendorName: "Blocked Co",
      email: "no@test.com",
      vendorCode: null,
    });
  });

  it("moves the action on with the NDA as the backend reports it", () => {
    withNdaStatus("PENDING");
    renderModal();
    expect(screen.getByText("NDA Generated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send nda/i })).toBeInTheDocument();
  });

  it("asks for the signed document once the NDA has been sent, and keeps RFQ blocked", () => {
    withNdaStatus("SENT");
    renderModal();

    expect(screen.getByText("NDA Sent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload signed nda/i })).toBeInTheDocument();
    expect(screen.getByText("RFQ Blocked")).toBeInTheDocument();
    expect(screen.getByText("Blocked Co").closest("label").querySelector("input")).toBeDisabled();
  });

  it("treats a signed NDA as still blocked and pending internal review", () => {
    withNdaStatus("SIGNED");
    renderModal();

    expect(screen.getByText("Signed — Pending Review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review signed nda/i })).toBeInTheDocument();
    expect(screen.getByText("RFQ Blocked")).toBeInTheDocument();
  });

  it("lets a rejected NDA be corrected by re-uploading the signed document", () => {
    withNdaStatus("REJECTED");
    renderModal();
    expect(screen.getByText("NDA Rejected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload signed nda/i })).toBeInTheDocument();
  });

  it("offers a fresh NDA when the existing one has expired", () => {
    withNdaStatus("EXPIRED");
    renderModal();
    expect(screen.getByText("NDA Expired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate new nda/i })).toBeInTheDocument();
  });

  it("makes a completed NDA selectable with no action left to take", () => {
    withNdaStatus("COMPLETED", { eligible: true });
    renderModal();

    expect(screen.getByText("NDA Completed")).toBeInTheDocument();
    expect(screen.getAllByText("RFQ Eligible")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /nda/i })).not.toBeInTheDocument();
    expect(screen.getByText("Blocked Co").closest("label").querySelector("input")).toBeEnabled();
  });

  it("leaves a vendor needing no NDA selectable", () => {
    withNdaStatus("NOT_REQUIRED", { eligible: true });
    renderModal();

    expect(screen.getByText("NDA Not Required")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate nda/i })).not.toBeInTheDocument();
    expect(screen.getByText("Blocked Co").closest("label").querySelector("input")).toBeEnabled();
  });

  it("does not offer to generate for a blocker the NDA gate did not report", () => {
    // Blocked on something else entirely — only the backend knows whether an NDA applies.
    useRfqEligibilityBatch.mockReturnValue({
      eligibilityByVendorId: new Map([
        [1, { vendor_id: 1, eligible: true, reason: null, checks: [], failed_checks: [] }],
        [
          2,
          {
            vendor_id: 2,
            eligible: false,
            reason: "Vendor onboarding is not complete.",
            checks: [{ check: "ONBOARDING", status: "IN_PROGRESS", passed: false, message: null }],
            failed_checks: [
              { check: "ONBOARDING", status: "IN_PROGRESS", passed: false, message: null },
            ],
          },
        ],
      ]),
      isLoading: false,
      isError: false,
      error: null,
    });

    renderModal();

    expect(screen.getByText("Vendor onboarding is not complete.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate nda/i })).not.toBeInTheDocument();
  });

  it("hides the NDA action from a user without NDA view permission", () => {
    permissions = { canViewNda: false };
    withNdaStatus("NOT_FOUND");
    renderModal();

    expect(screen.queryByRole("button", { name: /generate nda/i })).not.toBeInTheDocument();
    // The backend's own reason is still shown, so the blocker is not silently hidden.
    expect(screen.getByText("Mandatory NDA is not completed.")).toBeInTheDocument();
  });
});

describe("InviteVendorsModal — candidate scoping", () => {
  it("offers only the vendors the PR's department and category make available", () => {
    renderModal();

    expect(screen.getByText("Eligible Co")).toBeInTheDocument();
    expect(screen.getByText("Blocked Co")).toBeInTheDocument();
    // Nothing from the wider vendor master leaks in — the list is exactly what the backend
    // returned for this requisition.
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("excludes vendors already invited to this RFQ", () => {
    renderModal({ excludeVendorIds: [1] });

    expect(screen.queryByText("Eligible Co")).not.toBeInTheDocument();
    expect(screen.getByText("Blocked Co")).toBeInTheDocument();
  });

  it("explains that onboarding is needed when the requisition has no available vendors", () => {
    availableVendors = [];
    renderModal();

    expect(
      screen.getByText(/no vendors are available for this requisition's department/i),
    ).toBeInTheDocument();
  });

  it("says so when every available vendor is already invited", () => {
    renderModal({ excludeVendorIds: [1, 2] });

    expect(
      screen.getByText(/every available vendor for this requisition has already been invited/i),
    ).toBeInTheDocument();
  });
});
