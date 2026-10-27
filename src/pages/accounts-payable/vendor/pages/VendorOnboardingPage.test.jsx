import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import VendorOnboardingPage from "./VendorOnboardingPage";
import { useCreateVendorIntake } from "../../vendor-intake/hooks/useVendorIntakeMutations";
import { useVendorEngagement } from "../../vendor-intake/hooks/useVendorIntake";
import { useRunPreScreen } from "../../vendor-intake/hooks/useVendorIntakeMutations";
import { useOnboardingRequest } from "../../procurement/hooks/useVendorOnboarding";

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

// Onboarding-request mode is off unless a test renders with ?onboardingRequestId and sets the
// request below; the page calls the hook unconditionally, so it must always resolve.
vi.mock("../../procurement/hooks/useVendorOnboarding", () => ({
  useOnboardingRequest: vi.fn(),
}));

// Step 2 of request mode has its own tests; here it only needs to show which request it got.
vi.mock("../../procurement/components/VendorOnboardingProcessPanel", () => ({
  default: ({ request }) => (
    <div>
      Onboarding workspace for engagement {request.engagement_id} ({request.status_code})
    </div>
  ),
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

const refetchOnboardingRequest = vi.fn();

const mockOnboardingRequest = (data) =>
  useOnboardingRequest.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchOnboardingRequest,
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockOnboardingRequest(undefined);
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
    // Normal intake never carries the internal-request link.
    expect(createMutateAsync.mock.calls[0][0]).not.toHaveProperty("onboarding_request_id");
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

describe("VendorOnboardingPage — internal vendor request onboarding", () => {
  const REQUEST = {
    id: 77,
    pr_id: 12,
    department_id: 2,
    purchase_category_id: 10,
    status_id: 1,
    status_code: "ASSIGNED",
    pr_number: "PR-0012",
    department_name: "IT",
    purchase_category_name: "Hardware",
    awaiting_intake: true,
    intake_defaults: {
      onboarding_request_id: 77,
      department_id: 2,
      category_id: 10,
      business_requirement: "Replace end-of-life laptops",
      purpose_of_onboarding: "Preferred reseller",
      vendor_name: "Acme Supplies",
      email: "sales@acme.example",
    },
    business_requirement: "Replace end-of-life laptops",
    purpose_of_onboarding: "Preferred reseller",
    requested_vendor_name: "Acme Supplies",
    requested_vendor_email: "sales@acme.example",
    vendor_id: null,
    engagement_id: null,
    assigned_to: "intaker-1",
    created_by: "officer-1",
  };

  const INTAKE_RESPONSE = {
    engagement_id: 42,
    vendor_id: 7,
    vendor_created: true,
    pre_screen_status: "PENDING",
    message: "Vendor intake saved successfully",
    onboarding_request_id: 77,
    onboarding_status_code: "PRE_SCREEN_PENDING",
  };

  const renderForRequest = (id = REQUEST.id) =>
    render(
      <MemoryRouter initialEntries={[`/accounts-payable/vendors/onboard?onboardingRequestId=${id}`]}>
        <VendorOnboardingPage />
      </MemoryRouter>,
    );

  const apiError = (status, detail) =>
    Object.assign(new Error("Request failed"), { response: { status, data: { detail } } });

  const submitButton = () => screen.getByRole("button", { name: /onboard vendor/i });

  beforeEach(() => {
    mockOnboardingRequest(REQUEST);
    createMutateAsync.mockResolvedValue(INTAKE_RESPONSE);
  });

  it("opens the existing intake form prefilled from intake_defaults with the request context", () => {
    renderForRequest();

    expect(
      screen.getByText("Onboard Vendor — Internal Request", { selector: "h1" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Internal Request Context")).toBeInTheDocument();
    expect(screen.getAllByText("PR-0012").length).toBeGreaterThan(0);
    expect(screen.getAllByText("IT").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hardware").length).toBeGreaterThan(0);

    // Same form as normal onboarding, with the request's values filled in.
    expect(screen.getByLabelText(/Vendor Name/)).toHaveValue("Acme Supplies");
    expect(screen.getByLabelText(/Email/)).toHaveValue("sales@acme.example");
    expect(screen.getByLabelText("Business Requirement")).toHaveValue(
      "Replace end-of-life laptops",
    );
    expect(screen.getByLabelText("Purpose of Onboarding")).toHaveValue("Preferred reseller");

    // Department/category are locked to the request — no editable selects.
    expect(screen.queryByText("Department *")).not.toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it("posts to the normal intake with onboarding_request_id and the request context unchanged", async () => {
    const user = userEvent.setup();
    renderForRequest();

    await user.clear(screen.getByLabelText(/Vendor Name/));
    await user.type(screen.getByLabelText(/Vendor Name/), "Acme Supplies Pvt Ltd");
    await user.click(submitButton());

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        onboarding_request_id: 77,
        department_id: 2,
        category_id: 10,
        business_requirement: "Replace end-of-life laptops",
        purpose_of_onboarding: "Preferred reseller",
        vendor_name: "Acme Supplies Pvt Ltd",
        email: "sales@acme.example",
        gst_registered: false,
        country_id: 1,
      }),
    );

    // The returned onboarding status is reflected and the request is re-read.
    expect(
      await screen.findByText(/Onboarding workspace for engagement 42 \(PRE_SCREEN_PENDING\)/),
    ).toBeInTheDocument();
    expect(refetchOnboardingRequest).toHaveBeenCalled();
  });

  it("does not offer the form when the request is not awaiting intake", () => {
    mockOnboardingRequest({
      ...REQUEST,
      awaiting_intake: false,
      intake_defaults: null,
      status_code: "CANCELLED",
    });
    renderForRequest();

    expect(screen.getByText("This request is not awaiting vendor intake")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /onboard vendor/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Vendor Name/)).not.toBeInTheDocument();
  });

  it("allows manual entry when intake_defaults is missing, keeping the request's department/category", async () => {
    mockOnboardingRequest({ ...REQUEST, intake_defaults: null });
    const user = userEvent.setup();
    renderForRequest();

    expect(screen.getByLabelText(/Vendor Name/)).toHaveValue("");

    await user.click(submitButton());
    expect(await screen.findByText("This field is required.")).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Vendor Name/), "Manual Vendor");
    await user.click(submitButton());

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        onboarding_request_id: 77,
        department_id: 2,
        category_id: 10,
        vendor_name: "Manual Vendor",
        business_requirement: null,
      }),
    );
  });

  it("explains a 409 as already processed, refreshes the request and keeps the form data", async () => {
    createMutateAsync.mockRejectedValue(
      apiError(409, "Vendor intake has already been completed for this onboarding request"),
    );
    const user = userEvent.setup();
    renderForRequest();

    await user.click(submitButton());

    expect(
      await screen.findByText(/already been processed or is no longer eligible/i),
    ).toBeInTheDocument();
    expect(refetchOnboardingRequest).toHaveBeenCalled();
    expect(screen.getByLabelText(/Vendor Name/)).toHaveValue("Acme Supplies");
  });

  it("keeps a duplicate-engagement 409 distinct from an ineligible request", async () => {
    createMutateAsync.mockRejectedValue(
      apiError(409, "An engagement already exists for this vendor, department and category"),
    );
    const user = userEvent.setup();
    renderForRequest();

    await user.click(submitButton());

    expect(await screen.findByText("Duplicate Engagement")).toBeInTheDocument();
    expect(refetchOnboardingRequest).not.toHaveBeenCalled();
  });

  it("explains a 404 as an unknown internal request", async () => {
    createMutateAsync.mockRejectedValue(apiError(404, "Vendor onboarding request not found"));
    const user = userEvent.setup();
    renderForRequest();

    await user.click(submitButton());

    expect(
      await screen.findByText(/internal vendor request could not be found/i),
    ).toBeInTheDocument();
  });

  it("shows the backend's 422 detail and lets the intaker retry with the form intact", async () => {
    createMutateAsync
      .mockRejectedValueOnce(
        apiError(422, "Department and category must match the vendor onboarding request"),
      )
      .mockResolvedValueOnce(INTAKE_RESPONSE);
    const user = userEvent.setup();
    renderForRequest();

    await user.click(submitButton());
    expect(
      await screen.findByText("Department and category must match the vendor onboarding request"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Vendor Name/)).toHaveValue("Acme Supplies");

    await user.click(submitButton());
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(2));
  });

  it("keeps a network failure recoverable without losing entered data", async () => {
    createMutateAsync.mockRejectedValueOnce(new Error("Network Error"));
    const user = userEvent.setup();
    renderForRequest();

    await user.type(screen.getByLabelText(/Phone Number/), "9876543210");
    await user.click(submitButton());

    expect(await screen.findByText("Network Error")).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/)).toHaveValue("9876543210");
    expect(submitButton()).toBeEnabled();
  });
});
