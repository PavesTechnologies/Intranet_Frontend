import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import APDashboardPage from "./APDashboardPage";
import {
  DEFAULT_NOTIFICATION_FILTERS,
  useNotifications,
} from "../../notifications/hooks/useNotifications";
import { AP_ROUTES } from "../../constants/routes";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../notifications/hooks/useNotifications", () => ({
  DEFAULT_NOTIFICATION_FILTERS: { pageSize: 25 },
  useNotifications: vi.fn(),
}));

const base = {
  priority: "HIGH",
  is_read: false,
  is_resolved: false,
  created_at: "2026-09-20T09:00:00",
  payload: {},
};

const PROCUREMENT = {
  ...base,
  id: 1,
  notification_type: "PR_APPROVED_SOURCING",
  module: "PROCUREMENT",
  title: "PR-000071 — Procurement action required",
  message: "Ready for sourcing.",
  entity_type: "PURCHASE_REQUISITION",
  entity_id: "71",
  entity_display_id: "PR-000071",
};

/** Read, but still unresolved work. */
const READ_PAYMENT = {
  ...base,
  id: 2,
  notification_type: "PAYMENT_READY",
  module: "PAYMENTS",
  title: "INV-2001 — Invoice ready for payment",
  message: "Ready for payment.",
  entity_type: "INVOICE",
  entity_id: "2001",
  entity_display_id: "INV-2001",
  is_read: true,
};

const RESOLVED = {
  ...base,
  id: 3,
  notification_type: "PAYMENT_FAILED",
  module: "PAYMENTS",
  title: "PAY-000005 — Payment failed",
  message: "Payment failed.",
  priority: "CRITICAL",
  entity_type: "PAYMENT",
  entity_id: "5",
  entity_display_id: "PAY-000005",
  is_resolved: true,
};

/** Unread but informational - not work. */
const INFORMATIONAL = {
  ...base,
  id: 4,
  notification_type: "SOME_INFO_NOTICE",
  module: "VENDOR_MANAGEMENT",
  title: "Informational update",
  message: "Vendor is active.",
  entity_type: "VENDOR_ONBOARDING_REQUEST",
  entity_id: "8",
  entity_display_id: "VOR-000008",
  priority: "MEDIUM",
};

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no IntersectionObserver; the dashboard's section tracker needs one to mount.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  useNotifications.mockReturnValue({
    notifications: [PROCUREMENT, READ_PAYMENT, RESOLVED, INFORMATIONAL],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
});

const renderDashboard = () => render(<APDashboardPage />, { wrapper: MemoryRouter });

describe("APDashboardPage — Requires Attention", () => {
  it("reads the same unified query the header bell and Notification Center use", () => {
    renderDashboard();

    // Exactly the shared default filters: no unread-only, module or dashboard-specific call.
    useNotifications.mock.calls.forEach(([filters]) => {
      expect(filters).toEqual(DEFAULT_NOTIFICATION_FILTERS);
    });
  });

  it("shows only unresolved actionable items, from every module", async () => {
    renderDashboard();

    expect(await screen.findByText(PROCUREMENT.title)).toBeInTheDocument();
    // Read, but not done yet.
    expect(screen.getByText(READ_PAYMENT.title)).toBeInTheDocument();
    // Resolved work and informational notices are not "attention".
    expect(screen.queryByText(RESOLVED.title)).not.toBeInTheDocument();
    expect(screen.queryByText(INFORMATIONAL.title)).not.toBeInTheDocument();
  });

  it("labels each item with the backend's module", async () => {
    renderDashboard();

    await screen.findByText(PROCUREMENT.title);
    const modules = screen
      .getAllByTestId("notification-module")
      .map((chip) => chip.getAttribute("data-module"));

    expect(modules).toEqual(expect.arrayContaining(["PROCUREMENT", "PAYMENTS"]));
  });

  it("opens the unified Notification Center from View All", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole("button", { name: /view all/i }));

    expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.NOTIFICATIONS);
  });

  it("deep-links an item to its business page", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByText(READ_PAYMENT.title));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.INVOICE_DETAIL("2001")),
    );
  });
});
