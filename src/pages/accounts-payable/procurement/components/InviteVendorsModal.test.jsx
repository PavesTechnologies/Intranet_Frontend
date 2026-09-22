import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InviteVendorsModal from "./InviteVendorsModal";
import { useRfqEligibilityBatch } from "../hooks/useRfqEligibility";

const inviteMutateAsync = vi.fn();

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("../hooks/useRfqMutations", () => ({
  useInviteVendors: () => ({ mutateAsync: inviteMutateAsync, isPending: false }),
}));

vi.mock("../hooks/useVendorOptions", () => ({
  default: () => ({
    activeVendors: [
      { vendor_id: 1, vendor_name: "Eligible Co", email: "ok@test.com" },
      { vendor_id: 2, vendor_name: "Blocked Co", email: "no@test.com" },
    ],
    isLoading: false,
  }),
}));

vi.mock("../hooks/useRfqEligibility", () => ({
  useRfqEligibilityBatch: vi.fn(),
}));

const renderModal = () =>
  render(<InviteVendorsModal isOpen onClose={vi.fn()} rfqId="7" prId={12} />);

beforeEach(() => {
  vi.clearAllMocks();
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
