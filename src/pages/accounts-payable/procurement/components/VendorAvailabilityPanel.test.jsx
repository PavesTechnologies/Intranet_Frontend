import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import VendorAvailabilityPanel from "./VendorAvailabilityPanel";
import { useVendorAvailability, useOnboardingRequestsForPr } from "../hooks/useVendorOnboarding";

const PR = { id: 12, pr_number: "PR-0012", justification: "Replace laptops" };

const renderPanel = (prStatusCode = "APPROVED") =>
  render(
    <VendorAvailabilityPanel
      pr={PR}
      prStatusCode={prStatusCode}
      departmentName="IT"
      categoryName="Hardware"
    />,
    { wrapper: MemoryRouter },
  );

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("../hooks/useVendorOnboarding", () => ({
  useVendorAvailability: vi.fn(),
  useOnboardingRequestsForPr: vi.fn(),
}));

vi.mock("../hooks/useVendorOnboardingMutations", () => ({
  useCreateOnboardingRequest: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

let permissions = {};
vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: () => permissions,
}));

const idleAvailability = (data) => ({
  data,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  permissions = {
    canCheckVendorAvailability: true,
    canCreateOnboarding: true,
    canProcessOnboarding: true,
  };
  useVendorAvailability.mockReturnValue(idleAvailability(undefined));
  useOnboardingRequestsForPr.mockReturnValue({ data: [], isLoading: false });
});

describe("VendorAvailabilityPanel", () => {
  it("hides itself from a user without the availability permission", () => {
    permissions = { canCheckVendorAvailability: false };
    const { container } = renderPanel();
    expect(container).toBeEmptyDOMElement();
  });

  it("offers the availability check before anything has been run", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /check vendor availability/i })).toBeInTheDocument();
    expect(screen.queryByText(/vendor onboarding required/i)).not.toBeInTheDocument();
  });

  it("shows the available vendors and a route to RFQ when the backend says available", async () => {
    useVendorAvailability.mockReturnValue(
      idleAvailability({
        pr_id: 12,
        available: true,
        vendors: [
          { vendor_id: 5, vendor_name: "Acme Supplies", vendor_code: "V-005", email: "a@acme.test" },
        ],
      }),
    );

    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /check vendor availability/i }));

    expect(screen.getByText("Vendor Available")).toBeInTheDocument();
    expect(screen.getByText("Acme Supplies")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue to rfq/i })).toBeInTheDocument();
    expect(screen.queryByText(/vendor onboarding required/i)).not.toBeInTheDocument();
  });

  it("asks for a vendor onboarding request when the backend says unavailable", async () => {
    useVendorAvailability.mockReturnValue(
      idleAvailability({ pr_id: 12, available: false, vendors: [] }),
    );

    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /check vendor availability/i }));

    expect(screen.getByText("Vendor Onboarding Required")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create vendor onboarding request/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue to rfq/i })).not.toBeInTheDocument();
  });

  it("shows an in-flight onboarding request with its stage and assigned intaker", () => {
    useOnboardingRequestsForPr.mockReturnValue({
      data: [
        {
          id: 3,
          pr_id: 12,
          status_code: "PRE_SCREEN_PENDING",
          assigned_to: "intaker-1",
          requested_vendor_name: "Globex",
          vendor_id: 9,
        },
      ],
      isLoading: false,
    });

    renderPanel();

    expect(screen.getByText("Request #3")).toBeInTheDocument();
    expect(screen.getAllByText("Pre-Screen Pending").length).toBeGreaterThan(0);
    expect(screen.getByText("intaker-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open internal request/i })).toBeInTheDocument();
  });

  it("tells the officer to resume with RFQ once onboarding has completed", () => {
    useOnboardingRequestsForPr.mockReturnValue({
      data: [{ id: 3, pr_id: 12, status_code: "COMPLETED", assigned_to: "intaker-1", vendor_id: 9 }],
      isLoading: false,
    });
    // A COMPLETED request auto-enables the availability query — the vendor is now there.
    useVendorAvailability.mockReturnValue(
      idleAvailability({
        pr_id: 12,
        available: true,
        vendors: [{ vendor_id: 9, vendor_name: "Globex", vendor_code: null, email: null }],
      }),
    );

    renderPanel();

    expect(
      screen.getAllByText("Vendor onboarding completed. You can continue with RFQ.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /continue to rfq/i })).toBeInTheDocument();
    // A settled request must not offer the workspace again.
    expect(
      screen.queryByRole("button", { name: /open internal request/i }),
    ).not.toBeInTheDocument();
  });

  it("does not offer a new onboarding request once the PR has left APPROVED", async () => {
    useVendorAvailability.mockReturnValue(
      idleAvailability({ pr_id: 12, available: false, vendors: [] }),
    );

    const user = userEvent.setup();
    renderPanel("VENDOR_SELECTION");
    await user.click(screen.getByRole("button", { name: /check vendor availability/i }));

    expect(
      screen.queryByRole("button", { name: /create vendor onboarding request/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/only be requested while the requisition is approved/i)).toBeInTheDocument();
  });

  it("lets an onboarding viewer without the availability permission see and open the request", () => {
    permissions = { canCheckVendorAvailability: false, canViewOnboarding: true };
    useOnboardingRequestsForPr.mockReturnValue({
      data: [{ id: 3, pr_id: 12, status_code: "COMPLETED", assigned_to: "intaker-1", vendor_id: 9 }],
      isLoading: false,
    });

    renderPanel();

    expect(screen.getByText("Request #3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view onboarding request/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /check vendor availability/i }),
    ).not.toBeInTheDocument();
    // The availability endpoint is never queried without its permission.
    expect(useVendorAvailability).toHaveBeenCalledWith(12, { enabled: false });
  });
});
