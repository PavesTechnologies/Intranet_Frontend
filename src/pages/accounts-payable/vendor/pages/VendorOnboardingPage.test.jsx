import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import VendorOnboardingPage from "./VendorOnboardingPage";
import { useCreateVendorIntake } from "../../vendor-intake/hooks/useVendorIntakeMutations";
import { useVendorEngagement } from "../../vendor-intake/hooks/useVendorIntake";
import { useRunPreScreen } from "../../vendor-intake/hooks/useVendorIntakeMutations";

const renderPage = () => render(<VendorOnboardingPage />, { wrapper: MemoryRouter });

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("../../hooks/useApLookups", () => ({
  default: () => ({
    countryOptions: [{ value: 1, label: "India" }],
    currencyOptions: [{ value: 1, label: "INR — Indian Rupee" }],
    paymentTermOptions: [{ value: 1, label: "Net 30" }],
    vendorStatusOptions: [],
    isLoading: false,
  }),
}));

vi.mock("../../system-configuration/hooks/useDepartments", () => ({
  default: () => ({
    data: [
      { id: 1, code: "FIN", name: "Finance", is_active: true },
      { id: 2, code: "IT", name: "IT", is_active: true },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../system-configuration/hooks/usePurchaseCategories", () => ({
  default: () => ({ data: [{ id: 10, code: "HW", name: "Hardware", is_active: true }] }),
  usePurchaseCategoriesByDepartment: (departmentId) => ({
    // Mirrors the real server-side department_id filter: nothing until a department is picked.
    data: departmentId === 2 ? [{ id: 10, code: "HW", name: "Hardware", is_active: true }] : [],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../hooks/useVendorDetail", () => ({
  default: () => ({ vendor: { vendor_id: 7, vendor_name: "Acme Supplies" } }),
}));

vi.mock("../../vendor-intake/hooks/useVendorIntakeMutations", () => ({
  useCreateVendorIntake: vi.fn(),
  useRunPreScreen: vi.fn(),
  useUpdateNdaDecision: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../vendor-intake/hooks/useVendorIntake", () => ({
  useVendorEngagement: vi.fn(),
  useVendorEngagementsByVendor: () => ({ data: [] }),
}));

vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: () => ({
    canOnboardVendor: true,
    canProcessOnboarding: true,
    canViewNda: true,
    canGenerateNda: true,
    canSendNda: true,
  }),
}));

// Onboarding-request mode is off in these tests (no ?onboardingRequestId), but the page calls
// both hooks unconditionally, so they still need to resolve without a QueryClientProvider.
vi.mock("../../procurement/hooks/useVendorOnboarding", () => ({
  useOnboardingRequest: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("../../procurement/hooks/useVendorOnboardingMutations", () => ({
  useStartOnboarding: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const createMutateAsync = vi.fn();
const preScreenMutate = vi.fn();

const PRE_SCREEN_RESULT = {
  engagement_id: 42,
  result: "PASS",
  reason: null,
  nda_recommended: true,
  nda_document_status: "PENDING",
  checks: [
    {
      name: "Duplicate/Existing Engagement Check",
      passed: true,
      status: "PASS",
      reason: null,
    },
    { name: "Basic Eligibility Check", passed: true, status: "PASS", reason: null },
    {
      name: "Category/Business Rule Check",
      passed: true,
      status: "PASS",
      reason: "NDA recommended for this department/category",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  createMutateAsync.mockResolvedValue({
    engagement_id: 42,
    vendor_id: 7,
    vendor_created: true,
    pre_screen_status: "PENDING",
    message: "Vendor intake saved successfully",
  });
  useCreateVendorIntake.mockReturnValue({
    mutateAsync: createMutateAsync,
    isPending: false,
  });
  useRunPreScreen.mockReturnValue({
    mutate: preScreenMutate,
    data: PRE_SCREEN_RESULT,
    isPending: false,
    isError: false,
    error: null,
  });
  useVendorEngagement.mockReturnValue({
    data: {
      engagement_id: 42,
      vendor_id: 7,
      department_id: 2,
      category_id: 10,
      business_requirement: "Replace end-of-life laptops",
      purpose_of_onboarding: "Preferred reseller",
      pre_screen_status: "PASS",
      pre_screen_result_reason: null,
      nda_recommended: true,
      nda_override: null,
      nda_override_reason: null,
      nda_final_required: null,
      nda_document_status: "PENDING",
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
});

/** Picks an option out of a headlessui Listbox rendered by FormSelect. */
const selectOption = async (user, labelText, optionText) => {
  const label = screen.getByText(labelText);
  const trigger = label.parentElement.querySelector("button");
  await user.click(trigger);
  await user.click(await screen.findByText(optionText));
};

describe("VendorOnboardingPage — Register Vendor (intake) step", () => {
  it("renders the existing vendor fields alongside the new Onboarding Details section", () => {
    renderPage();

    expect(screen.getByText("Register Vendor", { selector: "h1" })).toBeInTheDocument();
    // Existing vendor fields are preserved.
    expect(screen.getByLabelText(/Vendor Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vendor Code/)).toBeInTheDocument();
    expect(screen.getByLabelText(/PAN Number/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByText("GST Registration")).toBeInTheDocument();
    expect(screen.getByText("Address")).toBeInTheDocument();

    // New onboarding section.
    expect(screen.getByText("Onboarding Details")).toBeInTheDocument();
    expect(screen.getByText("Department *")).toBeInTheDocument();
    expect(screen.getByText("Purchase Category *")).toBeInTheDocument();
    expect(screen.getByLabelText("Business Requirement")).toBeInTheDocument();
    expect(screen.getByLabelText("Purpose of Onboarding")).toBeInTheDocument();
  });

  it("blocks submission and flags Department/Purchase Category when they are missing", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Vendor Name/), "Acme Supplies");
    await user.click(screen.getByRole("button", { name: /register vendor/i }));

    expect(await screen.findByText("Department is required.")).toBeInTheDocument();
    expect(screen.getByText("Purchase category is required.")).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("posts the intake with business_requirement and purpose_of_onboarding as separate fields", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Vendor Name/), "Acme Supplies");
    await selectOption(user, "Department *", /IT/);
    await selectOption(user, "Purchase Category *", /Hardware/);
    await user.type(screen.getByLabelText("Business Requirement"), "Replace end-of-life laptops");
    await user.type(screen.getByLabelText("Purpose of Onboarding"), "Preferred reseller");
    await user.type(screen.getByLabelText(/Address Line 1/), "12 Industrial Estate");
    await user.type(screen.getByLabelText(/^City/), "Hyderabad");

    await user.click(screen.getByRole("button", { name: /register vendor/i }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        department_id: 2,
        category_id: 10,
        business_requirement: "Replace end-of-life laptops",
        purpose_of_onboarding: "Preferred reseller",
        gst_registered: false,
        gstin: null,
        vendor_name: "Acme Supplies",
        country_id: 1,
        address_line1: "12 Industrial Estate",
        city: "Hyderabad",
      }),
    );
  });

  it("clears the chosen category when the department changes", async () => {
    const user = userEvent.setup();
    renderPage();

    await selectOption(user, "Department *", /IT/);
    await selectOption(user, "Purchase Category *", /Hardware/);
    expect(screen.getByText("HW — Hardware")).toBeInTheDocument();

    await selectOption(user, "Department *", /Finance/);

    // Department 1 has no categories in the mock, so the dependent field resets to its
    // placeholder rather than keeping the now-invalid Hardware selection.
    await waitFor(() => expect(screen.queryByText("HW — Hardware")).not.toBeInTheDocument());
    expect(screen.getByText("No active categories for this department")).toBeInTheDocument();
  });
});

describe("VendorOnboardingPage — Pre-Screen step", () => {
  const advanceToPreScreen = async (user) => {
    await user.type(screen.getByLabelText(/Vendor Name/), "Acme Supplies");
    await selectOption(user, "Department *", /IT/);
    await selectOption(user, "Purchase Category *", /Hardware/);
    await user.click(screen.getByRole("button", { name: /register vendor/i }));
    await screen.findByText("Pre-Screen Checks");
  };

  it("moves to Pre-Screen after a successful save and renders the backend checks", async () => {
    const user = userEvent.setup();
    renderPage();
    await advanceToPreScreen(user);

    expect(
      screen.getByText("Essential checks performed before the vendor proceeds further."),
    ).toBeInTheDocument();
    expect(screen.getByText("Duplicate / Existing Engagement Check")).toBeInTheDocument();
    expect(screen.getByText("Basic Eligibility Check")).toBeInTheDocument();
    expect(screen.getByText("Category / Business Rule Check")).toBeInTheDocument();

    // Overall verdict comes from the backend response, not from the checks.
    expect(screen.getByText("Pre-Screen Result")).toBeInTheDocument();
    expect(screen.getAllByText("PASS").length).toBeGreaterThan(0);

    // NDA values are the backend's.
    expect(screen.getByText("NDA Document Status")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();

    // PASS allows continuation.
    expect(screen.getByRole("button", { name: /continue to vendor record/i })).toBeEnabled();
  });

  it("blocks continuation and shows the backend reason on NEED_INFORMATION", async () => {
    useRunPreScreen.mockReturnValue({
      mutate: preScreenMutate,
      data: {
        ...PRE_SCREEN_RESULT,
        result: "NEED_INFORMATION",
        reason: "Vendor intake data is incomplete: no registered address on file",
        checks: [
          PRE_SCREEN_RESULT.checks[0],
          {
            name: "Basic Eligibility Check",
            passed: false,
            status: "NEED_INFORMATION",
            reason: "Vendor intake data is incomplete: no registered address on file",
          },
          PRE_SCREEN_RESULT.checks[2],
        ],
      },
      isPending: false,
      isError: false,
      error: null,
    });

    const user = userEvent.setup();
    renderPage();
    await advanceToPreScreen(user);

    expect(
      screen.getAllByText("Vendor intake data is incomplete: no registered address on file").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /continue to vendor record/i })).toBeDisabled();

    // The eligibility card attributes the failure from the backend's own per-check status.
    const eligibilityCard = screen.getByText("Basic Eligibility Check").closest("div.rounded-xl");
    expect(within(eligibilityCard).getByText("Incomplete")).toBeInTheDocument();
    expect(within(eligibilityCard).getByText("Not Blocked")).toBeInTheDocument();
  });

  it("blocks continuation on FAIL", async () => {
    useRunPreScreen.mockReturnValue({
      mutate: preScreenMutate,
      data: {
        ...PRE_SCREEN_RESULT,
        result: "FAIL",
        reason: "A duplicate engagement already exists for this vendor, department and category",
        checks: [
          {
            name: "Duplicate/Existing Engagement Check",
            passed: false,
            status: "FAIL",
            reason:
              "A duplicate engagement already exists for this vendor, department and category",
          },
          PRE_SCREEN_RESULT.checks[1],
          PRE_SCREEN_RESULT.checks[2],
        ],
      },
      isPending: false,
      isError: false,
      error: null,
    });

    const user = userEvent.setup();
    renderPage();
    await advanceToPreScreen(user);

    expect(screen.getByRole("button", { name: /continue to vendor record/i })).toBeDisabled();
    expect(screen.getAllByText("FAIL").length).toBeGreaterThan(0);
  });
});
