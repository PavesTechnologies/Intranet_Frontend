import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import VendorEngagementsSection from "./VendorEngagementsSection";
import { useVendorEngagementsByVendor } from "../../vendor-intake/hooks/useVendorIntake";

vi.mock("../../vendor-intake/hooks/useVendorIntake", () => ({
  useVendorEngagementsByVendor: vi.fn(),
}));

vi.mock("../../system-configuration/hooks/useDepartments", () => ({
  default: () => ({
    data: [
      { id: 1, code: "IT", name: "IT", is_active: true },
      { id: 2, code: "FIN", name: "Finance", is_active: true },
    ],
  }),
}));

vi.mock("../../system-configuration/hooks/usePurchaseCategories", () => ({
  default: () => ({
    data: [
      { id: 10, code: "CLOUD", name: "Cloud Services", is_active: true },
      { id: 20, code: "SW", name: "Software", is_active: true },
    ],
  }),
}));

const idle = (data) => ({ data, isLoading: false, isError: false, error: null });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VendorEngagementsSection", () => {
  it("resolves department and category ids to master names for every engagement", () => {
    useVendorEngagementsByVendor.mockReturnValue(
      idle([
        {
          engagement_id: 1,
          department_id: 1,
          category_id: 10,
          purpose_of_onboarding: "Cloud infrastructure",
          pre_screen_status: "PASS",
          nda_final_required: true,
          nda_recommended: true,
        },
        {
          engagement_id: 2,
          department_id: 2,
          category_id: 20,
          purpose_of_onboarding: "Finance application",
          pre_screen_status: "PASS",
          nda_final_required: false,
          nda_recommended: false,
        },
      ]),
    );

    render(<VendorEngagementsSection vendorId={7} />);

    // Multiple engagements for the same vendor all render.
    expect(screen.getByText("IT")).toBeInTheDocument();
    expect(screen.getByText("Cloud Services")).toBeInTheDocument();
    expect(screen.getByText("Cloud infrastructure")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Finance application")).toBeInTheDocument();

    // NDA column reflects the recorded decision per engagement.
    expect(screen.getByText("YES")).toBeInTheDocument();
    expect(screen.getByText("NO")).toBeInTheDocument();
  });

  it("prefers the recorded NDA decision over the screening-rule recommendation", () => {
    useVendorEngagementsByVendor.mockReturnValue(
      idle([
        {
          engagement_id: 1,
          department_id: 1,
          category_id: 10,
          pre_screen_status: "PASS",
          nda_recommended: true,
          nda_final_required: false, // an override wins
        },
      ]),
    );

    render(<VendorEngagementsSection vendorId={7} />);

    expect(screen.getByText("NO")).toBeInTheDocument();
    expect(screen.queryByText("YES")).not.toBeInTheDocument();
  });

  it("shows an empty state rather than inventing an engagement", () => {
    useVendorEngagementsByVendor.mockReturnValue(idle([]));

    render(<VendorEngagementsSection vendorId={7} />);

    expect(screen.getByText(/no engagements yet/i)).toBeInTheDocument();
  });

  it("surfaces a load failure with the backend's message", () => {
    useVendorEngagementsByVendor.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { data: { detail: "Vendor not found" } } },
    });

    render(<VendorEngagementsSection vendorId={7} />);

    expect(screen.getByText("Vendor not found")).toBeInTheDocument();
  });

  it("falls back to an id label when a master name can't be resolved", () => {
    useVendorEngagementsByVendor.mockReturnValue(
      idle([{ engagement_id: 1, department_id: 99, category_id: 98, pre_screen_status: "PASS" }]),
    );

    const { container } = render(<VendorEngagementsSection vendorId={7} />);
    const table = container.querySelector("table");

    expect(within(table).getByText("Department #99")).toBeInTheDocument();
    expect(within(table).getByText("Category #98")).toBeInTheDocument();
  });
});
