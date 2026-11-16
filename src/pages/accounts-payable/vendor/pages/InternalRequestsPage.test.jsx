import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import InternalRequestsPage from "./InternalRequestsPage";
import { useOnboardingRequests } from "../../procurement/hooks/useVendorOnboarding";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../procurement/hooks/useVendorOnboarding", () => ({
  useOnboardingRequests: vi.fn(),
}));

vi.mock("../../procurement/hooks/usePurchaseRequisitions", () => ({
  useAllPurchaseRequisitions: () => ({
    data: [
      { id: 12, pr_number: "PR-0012" },
      { id: 13, pr_number: "PR-0013" },
    ],
  }),
}));

vi.mock("../../procurement/hooks/useVendorOptions", () => ({
  default: () => ({ vendorNameById: new Map([[9, "Globex"]]) }),
}));

vi.mock("../../procurement/hooks/useNda", () => ({
  useVendorNda: () => ({ data: { nda: { status_code: "COMPLETED" } }, isLoading: false }),
}));

vi.mock("../../system-configuration/hooks/useDepartments", () => ({
  default: () => ({ data: [{ id: 1, name: "IT" }] }),
}));

vi.mock("../../system-configuration/hooks/usePurchaseCategories", () => ({
  default: () => ({ data: [{ id: 10, name: "Cloud Services" }] }),
}));

vi.mock("../../hooks/useApLookups", () => ({
  useVendorOnboardingStatuses: () => ({
    data: [
      { status_id: 1, status_code: "CREATED", status_name: "Created" },
      { status_id: 5, status_code: "COMPLETED", status_name: "Completed" },
    ],
  }),
}));

vi.mock("../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { user_id: "intaker-1", name: "Ira Intaker" } }),
}));

vi.mock("../../procurement/components/RequesterLabel", () => ({
  default: ({ createdBy }) => <span>{createdBy}</span>,
}));

let permissions = {};
vi.mock("../../hooks/useApPermissions", () => ({
  useApPermissions: () => permissions,
}));

const REQUESTS = [
  {
    id: 3,
    pr_id: 12,
    department_id: 1,
    purchase_category_id: 10,
    status_code: "PRE_SCREEN_PENDING",
    requested_vendor_name: "Acme Supplies",
    created_by: "officer-1",
    created_at: "2026-09-01T10:00:00Z",
    vendor_id: 9,
  },
  {
    id: 4,
    pr_id: 13,
    department_id: 1,
    purchase_category_id: 10,
    status_code: "COMPLETED",
    requested_vendor_name: null,
    vendor_id: 9,
    created_by: "officer-2",
    created_at: "2026-09-02T10:00:00Z",
  },
];

const renderPage = () => render(<InternalRequestsPage />, { wrapper: MemoryRouter });

beforeEach(() => {
  vi.clearAllMocks();
  permissions = { canViewOnboarding: true, canProcessOnboarding: true, canViewNda: true };
  useOnboardingRequests.mockReturnValue({
    data: REQUESTS,
    isLoading: false,
    isError: false,
    error: null,
  });
});

describe("InternalRequestsPage", () => {
  it("refuses access without the onboarding view permission", () => {
    permissions = { canViewOnboarding: false };
    renderPage();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });

  it("lists requests with ids resolved to PR number, department and category names", () => {
    renderPage();

    expect(screen.getByText("Acme Supplies")).toBeInTheDocument();
    expect(screen.getByText("PR-0012")).toBeInTheDocument();
    expect(screen.getAllByText("IT").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cloud Services").length).toBeGreaterThan(0);
    // Vendor name falls back to the created vendor when none was requested by name.
    expect(screen.getByText("Globex")).toBeInTheDocument();
    // NDA status comes from the NDA API, not from the request row.
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
  });

  it("filters the list by search term across vendor, PR and request id", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText(/search by vendor/i), "Acme");

    // SearchInput debounces before it reports the term.
    await waitFor(() => expect(screen.queryByText("Globex")).not.toBeInTheDocument());
    expect(screen.getByText("Acme Supplies")).toBeInTheDocument();
  });

  it("asks the backend for a status-filtered list rather than filtering locally", async () => {
    const user = userEvent.setup();
    renderPage();

    // Scoped to the listbox — "Completed" also appears as an NDA status pill in the table.
    await user.click(screen.getByText("All Statuses"));
    await user.click(await screen.findByRole("option", { name: "Completed" }));

    expect(useOnboardingRequests).toHaveBeenCalledWith(
      expect.objectContaining({ statusId: 5 }),
    );
  });

  it("sends assigned_to when the intaker filters to their own queue", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText(/assigned to me/i));

    expect(useOnboardingRequests).toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: "intaker-1" }),
    );
  });

  it("offers View only, never a process action, without the process permission", () => {
    permissions = { canViewOnboarding: true, canProcessOnboarding: false, canViewNda: true };
    renderPage();

    expect(screen.getAllByRole("button", { name: /view/i }).length).toBe(REQUESTS.length);
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review/i })).not.toBeInTheDocument();
  });
});
