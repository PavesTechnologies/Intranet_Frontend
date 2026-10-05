import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ApprovalPolicyFormPage from "./ApprovalPolicyFormPage";
import { useApprovalPolicyDetail, useCreateApprovalPolicy, useUpdateApprovalPolicy } from "../hooks/useApprovalPolicies";

// Breadcrumb renders a real <Link>, which needs a router context even though
// useNavigate/useParams are mocked below.
const renderPage = () => render(<ApprovalPolicyFormPage />, { wrapper: MemoryRouter });

const mockNavigate = vi.fn();
let mockParams = {};

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => mockParams };
});

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("../hooks/useDepartments", () => ({
  default: () => ({
    data: [
      { id: 1, code: "FIN", name: "Finance", is_active: true },
      { id: 2, code: "IT", name: "IT", is_active: true },
    ],
  }),
}));

vi.mock("../hooks/usePurchaseCategories", () => ({
  usePurchaseCategoriesByDepartment: () => ({
    data: [{ id: 10, code: "HW", name: "Hardware", is_active: true }],
  }),
}));

vi.mock("../hooks/useApprovalMetadata", () => ({
  useApprovalRoles: () => ({ data: ["AP_MANAGER", "FINANCE_MANAGER"] }),
  useApprovers: () => ({
    data: [{ user_uuid: "user-1", employee_uuid: "user-1", is_user_active: true }],
  }),
}));

vi.mock("../hooks/useApprovalPolicies", () => ({
  useApprovalPolicyDetail: vi.fn(),
  useCreateApprovalPolicy: vi.fn(),
  useUpdateApprovalPolicy: vi.fn(),
}));

vi.mock("../../../expense-management/approval-engine/hooks/useEmployeeDirectory", () => ({
  useEmployeeDirectory: () => ({ data: new Map() }),
  resolveEmployeeName: (map, id) => id,
}));

const idleMutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });

beforeEach(() => {
  vi.clearAllMocks();
  mockParams = {};
  useApprovalPolicyDetail.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
  useCreateApprovalPolicy.mockReturnValue(idleMutation());
  useUpdateApprovalPolicy.mockReturnValue(idleMutation());
});

describe("ApprovalPolicyFormPage — create mode", () => {
  it("renders as a full page (breadcrumb + back action), with one default level and the Active toggle", () => {
    renderPage();
    expect(screen.getByText("Add Approval Policy", { selector: "h1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to approval policies/i })).toBeInTheDocument();
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.queryByText("Level 2")).not.toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("adds and removes levels, and blocks removing the last one", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByLabelText("Remove level")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /add level/i }));
    expect(screen.getByText("Level 2")).toBeInTheDocument();

    const removeButtons = screen.getAllByLabelText("Remove level");
    await user.click(removeButtons[1]);
    expect(screen.queryByText("Level 2")).not.toBeInTheDocument();
  });

  it("shows validation errors and does not create/navigate when required fields are missing", async () => {
    const user = userEvent.setup();
    const createPolicy = idleMutation();
    useCreateApprovalPolicy.mockReturnValue(createPolicy);

    renderPage();
    await user.click(screen.getByRole("button", { name: /save policy/i }));

    expect(await screen.findByText("Policy name is required.")).toBeInTheDocument();
    expect(screen.getByText("Department is required.")).toBeInTheDocument();
    expect(screen.getByText("Purchase category is required.")).toBeInTheDocument();
    expect(createPolicy.mutateAsync).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("navigates back to the Approval Policies tab when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockNavigate).toHaveBeenCalledWith("/accounts-payable/system-configuration", {
      state: { activeTab: "approvalPolicies" },
    });
  });

  it("hides Department/Purchase Category/amount fields and their validation once Default Policy is toggled on", async () => {
    const user = userEvent.setup();
    const createPolicy = idleMutation();
    useCreateApprovalPolicy.mockReturnValue(createPolicy);
    renderPage();

    expect(screen.getByText("Department", { selector: "label" })).toBeInTheDocument();
    expect(screen.getByText("Minimum Amount", { selector: "label" })).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Default Policy" }));

    expect(screen.queryByText("Department", { selector: "label" })).not.toBeInTheDocument();
    expect(screen.queryByText("Purchase Category", { selector: "label" })).not.toBeInTheDocument();
    expect(screen.queryByText("Minimum Amount", { selector: "label" })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/IT Hardware/i), "Fallback Policy");
    await user.click(screen.getByRole("button", { name: /save policy/i }));

    expect(screen.queryByText("Department is required.")).not.toBeInTheDocument();
    expect(createPolicy.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        is_default: true,
        department_id: null,
        purchase_category_id: null,
        min_amount: null,
        max_amount: null,
      }),
    );
  });
});

describe("ApprovalPolicyFormPage — edit mode", () => {
  const editablePolicy = {
    id: 5,
    name: "IT Hardware Policy",
    department_id: 2,
    purchase_category_id: 10,
    min_amount: null,
    max_amount: null,
    description: "",
    is_active: true,
    levels: [{ id: 1, level_number: 1, approver_type: "ROLE", approval_rule: "ANY_ONE", role_code: "" }],
  };

  beforeEach(() => {
    mockParams = { policyId: "5" };
  });

  it("shows a loading state while the policy is being fetched", () => {
    useApprovalPolicyDetail.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
    renderPage();
    expect(screen.getByText("Loading approval policy...")).toBeInTheDocument();
  });

  it("surfaces a load error instead of an empty form", () => {
    useApprovalPolicyDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { data: { detail: "Policy not found" } } },
    });
    renderPage();
    expect(screen.getByText("Policy not found")).toBeInTheDocument();
  });

  it("prefills the form from the fetched policy and hides the Active toggle", () => {
    useApprovalPolicyDetail.mockReturnValue({ data: editablePolicy, isLoading: false, isError: false, error: null });
    renderPage();
    expect(screen.getByText("Edit Approval Policy", { selector: "h1" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("IT Hardware Policy")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("requires a role selection before saving a ROLE-type level", async () => {
    useApprovalPolicyDetail.mockReturnValue({ data: editablePolicy, isLoading: false, isError: false, error: null });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /save policy/i }));
    expect(await screen.findByText("Select a role for this level.")).toBeInTheDocument();
  });
});
