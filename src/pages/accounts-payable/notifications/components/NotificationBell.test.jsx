import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import NotificationBell, { DROPDOWN_LIMIT } from "./NotificationBell";
import {
  DEFAULT_NOTIFICATION_FILTERS,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "../hooks/useNotifications";
import { AP_ROUTES } from "../../constants/routes";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../hooks/useNotifications", () => ({
  DEFAULT_NOTIFICATION_FILTERS: { pageSize: 25 },
  useNotifications: vi.fn(),
  useUnreadNotificationCount: vi.fn(),
  useMarkNotificationRead: vi.fn(),
}));

/** One user's notifications from four different AP modules, as the unified stream returns. */
const PROCUREMENT = {
  id: 1,
  notification_type: "PR_APPROVED_SOURCING",
  module: "PROCUREMENT",
  title: "PR-000071 — Procurement action required",
  message: "PR-000071 is approved and ready for sourcing.",
  priority: "HIGH",
  entity_type: "PURCHASE_REQUISITION",
  entity_id: "71",
  action_label: "Start RFQ",
  is_read: false,
  is_resolved: false,
  created_at: "2026-09-29T09:00:00",
  payload: {},
};

const VENDOR = {
  id: 2,
  notification_type: "VENDOR_ONBOARDING_FAILED",
  module: "VENDOR_MANAGEMENT",
  title: "VOR-000008 — Vendor onboarding failed",
  message: "Vendor onboarding has failed.",
  priority: "HIGH",
  entity_type: "VENDOR_ONBOARDING_REQUEST",
  entity_id: "8",
  action_label: "Review onboarding issue",
  is_read: true,
  is_resolved: false,
  created_at: "2026-09-28T09:00:00",
  payload: { metadata: { pr_id: 71 } },
};

const INVOICE = {
  id: 3,
  notification_type: "INVOICE_REVIEW_REQUIRED",
  module: "INVOICE_MANAGEMENT",
  title: "INV-1024 — Invoice review required",
  message: "Invoice INV-1024 needs review.",
  priority: "HIGH",
  entity_type: "INVOICE",
  entity_id: "1024",
  action_label: "Review invoice",
  is_read: false,
  is_resolved: false,
  created_at: "2026-09-27T09:00:00",
  payload: {},
};

const RESOLVED_PAYMENT = {
  id: 4,
  notification_type: "PAYMENT_FAILED",
  module: "PAYMENTS",
  title: "PAY-000005 — Payment failed",
  message: "Payment PAY-000005 has failed.",
  priority: "CRITICAL",
  entity_type: "PAYMENT",
  entity_id: "5",
  action_label: "Resolve payment failure",
  is_read: true,
  is_resolved: true,
  created_at: "2026-09-26T09:00:00",
  payload: {},
};

const UNKNOWN = {
  id: 5,
  notification_type: "SOME_FUTURE_TYPE",
  module: "SOME_FUTURE_MODULE",
  title: "Something new happened",
  message: "A type this build has never seen.",
  priority: "LOW",
  entity_type: "SOME_FUTURE_ENTITY",
  entity_id: "1",
  action_label: null,
  is_read: false,
  is_resolved: false,
  created_at: "2026-09-25T09:00:00",
  payload: {},
};

const STREAM = [PROCUREMENT, VENDOR, INVOICE, RESOLVED_PAYMENT, UNKNOWN];

let markRead;

const listState = (overrides = {}) => ({
  notifications: STREAM,
  total: STREAM.length,
  unreadCount: 3,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides,
});

const renderBell = (path = "/accounts-payable/dashboard") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NotificationBell />
    </MemoryRouter>,
  );

const openDropdown = async (user) => {
  await user.click(screen.getByRole("button", { name: /^notifications/i }));
  return screen.findByRole("dialog", { name: "Notifications" });
};

beforeEach(() => {
  vi.clearAllMocks();
  markRead = vi.fn((id) => Promise.resolve({ id, is_read: true }));
  useUnreadNotificationCount.mockReturnValue({
    unreadCount: 0,
    isLoading: false,
    isError: false,
    error: null,
  });
  useNotifications.mockReturnValue(listState());
  useMarkNotificationRead.mockReturnValue({ mutateAsync: markRead, isPending: false });
});

describe("NotificationBell — badge", () => {
  it("shows the backend's unread count on the badge", () => {
    useUnreadNotificationCount.mockReturnValue({ unreadCount: 7, isLoading: false, isError: false });

    renderBell();

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /notifications, 7 unread/i }),
    ).toBeInTheDocument();
  });

  it("hides the badge entirely when nothing is unread", () => {
    renderBell();

    const bell = screen.getByRole("button", { name: "Notifications" });
    expect(bell).toBeInTheDocument();
    expect(bell).not.toHaveTextContent(/\d/);
  });

  it("caps a very large count rather than overflowing the badge", () => {
    useUnreadNotificationCount.mockReturnValue({ unreadCount: 250, isLoading: false, isError: false });

    renderBell();

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("uses the one global count - the same on every AP module's page", () => {
    useUnreadNotificationCount.mockReturnValue({ unreadCount: 4, isLoading: false, isError: false });

    ["/accounts-payable/procurement", "/accounts-payable/invoices", "/accounts-payable/payments/ready"].forEach(
      (path) => {
        const { unmount } = renderBell(path);
        expect(screen.getByRole("button", { name: /notifications, 4 unread/i })).toBeInTheDocument();
        unmount();
      },
    );

    // Never asked for a module- or page-scoped count.
    useUnreadNotificationCount.mock.calls.forEach(([options]) => {
      expect(options).toEqual({ enabled: true });
    });
  });

  it("does not render, or query, outside Accounts Payable", () => {
    renderBell("/dashboard");

    expect(screen.queryByRole("button", { name: /notifications/i })).not.toBeInTheDocument();
    // The AP endpoints must not be called on behalf of a user who is not in AP.
    expect(useUnreadNotificationCount).toHaveBeenCalledWith({ enabled: false });
    expect(useNotifications).toHaveBeenCalledWith(DEFAULT_NOTIFICATION_FILTERS, { enabled: false });
  });

  it("enables the count query on an AP route", () => {
    renderBell("/accounts-payable/invoices");

    expect(useUnreadNotificationCount).toHaveBeenCalledWith({ enabled: true });
  });

  it("shows no badge when the count request failed", () => {
    useUnreadNotificationCount.mockReturnValue({
      unreadCount: 0,
      isLoading: false,
      isError: true,
      error: new Error("boom"),
    });

    renderBell();

    // A failed count must not invent a number, and must not break the header.
    const bell = screen.getByRole("button", { name: "Notifications" });
    expect(bell).not.toHaveTextContent(/\d/);
  });
});

describe("NotificationBell — dropdown", () => {
  it("does not load the list until the dropdown is opened", async () => {
    const user = userEvent.setup();
    renderBell();

    expect(useNotifications).toHaveBeenLastCalledWith(DEFAULT_NOTIFICATION_FILTERS, { enabled: false });

    await openDropdown(user);

    // The same unified query - and cache entry - the dashboard and Notification Center use.
    expect(useNotifications).toHaveBeenLastCalledWith(DEFAULT_NOTIFICATION_FILTERS, { enabled: true });
  });

  it("opens a compact dropdown instead of navigating", async () => {
    const user = userEvent.setup();
    renderBell();

    const bell = screen.getByRole("button", { name: /^notifications/i });
    expect(bell).toHaveAttribute("aria-expanded", "false");

    await openDropdown(user);

    expect(bell).toHaveAttribute("aria-expanded", "true");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows notifications from every module in the same list, each with its module", async () => {
    const user = userEvent.setup();
    renderBell("/accounts-payable/procurement");

    const dialog = await openDropdown(user);
    const list = within(dialog).getByRole("list", { name: "Latest notifications" });

    const modules = within(list)
      .getAllByTestId("notification-module")
      .map((chip) => chip.getAttribute("data-module"));

    // Opened from Procurement, but not filtered to it.
    expect(modules).toEqual([
      "PROCUREMENT",
      "VENDOR_MANAGEMENT",
      "INVOICE_MANAGEMENT",
      "PAYMENTS",
      "SOME_FUTURE_MODULE",
    ]);
    expect(within(list).getByText("Some Future Module")).toBeInTheDocument();
  });

  it("shows the action label only on unresolved actionable items", async () => {
    const user = userEvent.setup();
    renderBell();

    const dialog = await openDropdown(user);

    expect(within(dialog).getByText("Start RFQ")).toBeInTheDocument();
    // Resolved: history, not work.
    expect(within(dialog).queryByText("Resolve payment failure")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Resolved")).toBeInTheDocument();
  });

  it("gives each item a meaningful accessible name including unread state", async () => {
    const user = userEvent.setup();
    renderBell();

    const dialog = await openDropdown(user);

    expect(
      within(dialog).getByRole("button", { name: `${PROCUREMENT.title} (Unread, High priority)` }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: `${RESOLVED_PAYMENT.title} (Resolved, Critical priority)` }),
    ).toBeInTheDocument();
  });

  it("shows only the latest few notifications", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: DROPDOWN_LIMIT + 4 }, (_, index) => ({
      ...PROCUREMENT,
      id: 100 + index,
      title: `PR-${index} — Procurement action required`,
    }));
    useNotifications.mockReturnValue(listState({ notifications: many }));

    renderBell();
    const dialog = await openDropdown(user);

    expect(within(dialog).getAllByRole("listitem")).toHaveLength(DROPDOWN_LIMIT);
  });

  it("marks an unread item read and navigates to its business page", async () => {
    const user = userEvent.setup();
    renderBell();

    const dialog = await openDropdown(user);
    await user.click(within(dialog).getByRole("button", { name: new RegExp(INVOICE.title) }));

    await waitFor(() => expect(markRead).toHaveBeenCalledWith(3));
    expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.INVOICE_DETAIL("1024"));
    // The dropdown closes behind the navigation.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("navigates without re-marking an item that is already read", async () => {
    const user = userEvent.setup();
    renderBell();

    const dialog = await openDropdown(user);
    await user.click(within(dialog).getByRole("button", { name: new RegExp(VENDOR.title) }));

    expect(markRead).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.VENDOR_INTERNAL_REQUEST_DETAIL("8"));
  });

  it("falls back to the Notification Center for an item with no business page", async () => {
    const user = userEvent.setup();
    renderBell();

    const dialog = await openDropdown(user);
    await user.click(within(dialog).getByRole("button", { name: new RegExp(UNKNOWN.title) }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.NOTIFICATIONS));
  });

  it("opens the Notification Center from View all", async () => {
    const user = userEvent.setup();
    renderBell();

    const dialog = await openDropdown(user);
    await user.click(within(dialog).getByRole("button", { name: /view all notifications/i }));

    expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.NOTIFICATIONS);
  });

  it("closes on Escape and returns focus to the bell", async () => {
    const user = userEvent.setup();
    renderBell();

    await openDropdown(user);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^notifications/i })).toHaveFocus();
  });

  it("shows a clear empty state", async () => {
    const user = userEvent.setup();
    useNotifications.mockReturnValue(listState({ notifications: [], total: 0 }));

    renderBell();
    const dialog = await openDropdown(user);

    expect(within(dialog).getByText("No notifications")).toBeInTheDocument();
  });

  it("keeps the header working when the list request fails", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    useNotifications.mockReturnValue(listState({ notifications: [], isError: true, refetch }));

    renderBell();
    const dialog = await openDropdown(user);

    expect(within(dialog).getByText("Unable to load notifications right now.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
