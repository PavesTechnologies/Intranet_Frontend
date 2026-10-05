import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import NotificationCenterPage from "./NotificationCenterPage";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "../hooks/useNotifications";
import { AP_ROUTES } from "../../constants/routes";
import { formatDateTime } from "../../utils/formatters";

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
  useMarkNotificationRead: vi.fn(),
  useMarkAllNotificationsRead: vi.fn(),
}));

/** NotificationDTO rows, exactly as the API shapes them. */
const UNREAD_PR = {
  id: 1,
  notification_type: "PR_APPROVED_SOURCING",
  module: "PROCUREMENT",
  title: "PR-000059 — Procurement action required",
  message: "PR-000059 has been approved and is ready for sourcing.",
  priority: "HIGH",
  entity_type: "PURCHASE_REQUISITION",
  entity_id: "59",
  entity_display_id: "PR-000059",
  action_label: "Start RFQ",
  deadline: null,
  is_read: false,
  is_resolved: false,
  created_at: "2026-09-20T09:00:00",
  payload: {},
};

const READ_INVOICE = {
  id: 2,
  notification_type: "VENDOR_ONBOARDING_COMPLETED",
  module: "VENDOR_MANAGEMENT",
  title: "VOR-000008 — Vendor onboarding completed",
  message: "Vendor onboarding is complete and the vendor is active.",
  priority: "MEDIUM",
  entity_type: "VENDOR_ONBOARDING_REQUEST",
  entity_id: "8",
  entity_display_id: "VOR-000008",
  action_label: "Continue procurement",
  deadline: null,
  is_read: true,
  is_resolved: false,
  created_at: "2026-09-19T09:00:00",
  payload: {},
};

/** Unread, but a type this build does not treat as work (e.g. a future informational notice). */
const INFO_NOTICE = {
  ...READ_INVOICE,
  id: 90,
  notification_type: "SOME_INFO_NOTICE",
  title: "Informational update",
  is_read: false,
};

const OVERDUE_INVOICE = {
  id: 3,
  notification_type: "INVOICE_OVERDUE",
  module: "INVOICE_MANAGEMENT",
  title: "INV-1052 — Invoice overdue",
  message: "Invoice INV-1052 is past its due date.",
  priority: "CRITICAL",
  entity_type: "INVOICE",
  entity_id: "1052",
  entity_display_id: "INV-1052",
  action_label: "Resolve overdue invoice",
  deadline: "2020-01-01",
  is_read: false,
  is_resolved: false,
  created_at: "2026-09-18T09:00:00",
  payload: {},
};

const UNKNOWN_TYPE = {
  id: 4,
  notification_type: "SOME_FUTURE_TYPE",
  module: "SOME_FUTURE_MODULE",
  title: "Something new happened",
  message: "A notification type this build has never seen.",
  priority: "LOW",
  entity_type: "SOME_FUTURE_ENTITY",
  entity_id: "99",
  entity_display_id: null,
  action_label: "Do the thing",
  deadline: null,
  is_read: false,
  is_resolved: false,
  created_at: "2026-09-17T09:00:00",
  payload: {},
};

/** Read, but the payment has still not been processed - still work for the user. */
const READ_PAYMENT_READY = {
  id: 5,
  notification_type: "PAYMENT_READY",
  module: "PAYMENTS",
  title: "INV-2001 — Invoice ready for payment",
  message: "Invoice INV-2001 is approved and ready for payment.",
  priority: "HIGH",
  entity_type: "INVOICE",
  entity_id: "2001",
  entity_display_id: "INV-2001",
  action_label: "Process payment",
  deadline: null,
  is_read: true,
  is_resolved: false,
  created_at: "2026-09-16T09:00:00",
  payload: { metadata: { vendor_id: 7 } },
};

/** The backend resolved it (payment cleared): history, never pending work. */
const RESOLVED_PAYMENT_FAILED = {
  id: 6,
  notification_type: "PAYMENT_FAILED",
  module: "PAYMENTS",
  title: "PAY-000005 — Payment failed",
  message: "Payment PAY-000005 has failed.",
  priority: "CRITICAL",
  entity_type: "PAYMENT",
  entity_id: "5",
  entity_display_id: "PAY-000005",
  action_label: "Resolve payment failure",
  deadline: "2020-01-01",
  is_read: false,
  is_resolved: true,
  created_at: "2026-09-15T09:00:00",
  payload: { metadata: { vendor_id: 7, invoice_ids: [2001] } },
};

const SYSTEM_CONFIG_EXCEPTION = {
  id: 7,
  notification_type: "SYSTEM_CONFIGURATION_EXCEPTION",
  module: "SYSTEM_CONFIGURATION",
  title: "CDC-000003 — System configuration exception",
  message: "Identity sync for USER failed after 5 retries.",
  priority: "CRITICAL",
  entity_type: "CDC_FAILURE",
  entity_id: "3",
  entity_display_id: "CDC-000003",
  action_label: "Resolve system exception",
  deadline: null,
  is_read: false,
  is_resolved: false,
  created_at: "2026-09-14T09:00:00",
  payload: { metadata: { kafka_topic: "ums.users" } },
};

const ALL = [
  UNREAD_PR,
  READ_INVOICE,
  OVERDUE_INVOICE,
  UNKNOWN_TYPE,
  READ_PAYMENT_READY,
  RESOLVED_PAYMENT_FAILED,
  SYSTEM_CONFIG_EXCEPTION,
];

let markRead;
let markAllRead;

const listState = (overrides = {}) => ({
  notifications: ALL,
  total: ALL.length,
  unreadCount: 3,
  page: 1,
  pageSize: 25,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  ...overrides,
});

const renderPage = () =>
  render(<NotificationCenterPage />, { wrapper: MemoryRouter });

beforeEach(() => {
  vi.clearAllMocks();

  markRead = vi.fn(() => Promise.resolve({ ...UNREAD_PR, is_read: true }));
  markAllRead = vi.fn(() => Promise.resolve({ updated: 3 }));

  useNotifications.mockReturnValue(listState());
  useMarkNotificationRead.mockReturnValue({ mutateAsync: markRead, isPending: false });
  useMarkAllNotificationsRead.mockReturnValue({ mutateAsync: markAllRead, isPending: false });
});

describe("NotificationCenterPage — list", () => {
  it("renders the user's notifications with title, message, priority and timestamp", () => {
    renderPage();

    expect(screen.getByText("Notifications", { selector: "h1" })).toBeInTheDocument();
    expect(screen.getByText(UNREAD_PR.title)).toBeInTheDocument();
    expect(screen.getByText(UNREAD_PR.message)).toBeInTheDocument();
    expect(
      within(screen.getByRole("article", { name: UNREAD_PR.title })).getByText("High"),
    ).toBeInTheDocument();
    // Asserted through the app's own formatter so the expectation does not pin a timezone.
    expect(screen.getByText(formatDateTime(UNREAD_PR.created_at))).toBeInTheDocument();
  });

  it("shows the entity reference when the notification carries one", () => {
    renderPage();

    expect(screen.getByText("Purchase Requisition PR-000059")).toBeInTheDocument();
  });

  it("distinguishes unread from read", () => {
    renderPage();

    const unread = screen.getByRole("article", { name: UNREAD_PR.title });
    const read = screen.getByRole("article", { name: READ_INVOICE.title });

    expect(within(unread).getByRole("img", { name: "Unread" })).toBeInTheDocument();
    expect(within(read).queryByRole("img", { name: "Unread" })).not.toBeInTheDocument();
  });

  it("keeps read notifications in the list as history", () => {
    renderPage();

    expect(screen.getByText(READ_INVOICE.title)).toBeInTheDocument();
  });

  it("flags an overdue notification from its backend deadline", () => {
    renderPage();

    const overdue = screen.getByRole("article", { name: OVERDUE_INVOICE.title });
    expect(within(overdue).getByText("Overdue")).toBeInTheDocument();
  });

  it("renders an unknown notification type safely, without an action button", () => {
    renderPage();

    const card = screen.getByRole("article", { name: UNKNOWN_TYPE.title });

    expect(within(card).getByText(UNKNOWN_TYPE.message)).toBeInTheDocument();
    expect(within(card).getByText("Low")).toBeInTheDocument();
    // No route exists for it, so no action is offered rather than a dead link.
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("NotificationCenterPage — unread count", () => {
  it("shows the backend unread count on the Unread tab", () => {
    renderPage();

    const unreadTab = screen.getByRole("button", { name: /^unread/i });
    expect(unreadTab).toHaveTextContent("3");
  });

  it("asks the API for unread only when the Unread tab is selected", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^unread/i }));

    // Unread is a real backend filter, not a client-side guess.
    expect(useNotifications).toHaveBeenLastCalledWith(
      expect.objectContaining({ isRead: false }),
    );
  });
});

describe("NotificationCenterPage — filters and search", () => {
  it("filters to action-required types on that tab", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^action required$/i }));

    expect(screen.getByText(UNREAD_PR.title)).toBeInTheDocument();
    expect(screen.getByText(OVERDUE_INVOICE.title)).toBeInTheDocument();
    // Read but unresolved: "Continue procurement" is still outstanding work.
    expect(screen.getByText(READ_INVOICE.title)).toBeInTheDocument();
  });

  it("filters to overdue items on the Overdue tab", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^overdue$/i }));

    expect(screen.getByText(OVERDUE_INVOICE.title)).toBeInTheDocument();
    expect(screen.queryByText(UNREAD_PR.title)).not.toBeInTheDocument();
  });

  it("searches across title, message and entity reference", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Search notifications"), "INV-1052");

    expect(screen.getByText(OVERDUE_INVOICE.title)).toBeInTheDocument();
    expect(screen.queryByText(UNREAD_PR.title)).not.toBeInTheDocument();
  });

  it("passes the chosen priority to the API rather than filtering locally", async () => {
    const user = userEvent.setup();
    renderPage();

    const trigger = screen.getByRole("button", { name: /all priorities/i });
    await user.click(trigger);

    const options = await screen.findByRole("listbox");
    await user.click(within(options).getByText("Critical"));

    await waitFor(() =>
      expect(useNotifications).toHaveBeenLastCalledWith(
        expect.objectContaining({ priority: "CRITICAL" }),
      ),
    );
  });

  it("explains an empty result from filters differently from a truly empty inbox", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Search notifications"), "zzzz-no-match");

    expect(screen.getByText("No notifications match these filters.")).toBeInTheDocument();
  });
});

describe("NotificationCenterPage — read actions", () => {
  it("marks an unread notification read and navigates to the mapped route", async () => {
    const user = userEvent.setup();
    renderPage();

    const card = screen.getByRole("article", { name: UNREAD_PR.title });
    await user.click(within(card).getByRole("button", { name: /start rfq/i }));

    await waitFor(() => expect(markRead).toHaveBeenCalledWith(1));
    expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.PROCUREMENT_PR_DETAIL("59"));
  });

  it("does not re-mark a notification that is already read", async () => {
    const user = userEvent.setup();
    renderPage();

    const card = screen.getByRole("article", { name: READ_INVOICE.title });
    await user.click(within(card).getByRole("button", { name: /continue procurement/i }));

    expect(markRead).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.VENDOR_LIST);
  });

  it("does not fire a duplicate read while one is still in flight", async () => {
    const user = userEvent.setup();
    let release;
    markRead = vi.fn(() => new Promise((resolve) => {
      release = resolve;
    }));
    useMarkNotificationRead.mockReturnValue({ mutateAsync: markRead, isPending: false });

    renderPage();

    const card = screen.getByRole("article", { name: UNREAD_PR.title });
    const action = within(card).getByRole("button", { name: /start rfq/i });

    await user.click(action);
    await user.click(action);
    await user.click(action);

    expect(markRead).toHaveBeenCalledTimes(1);

    release({ ...UNREAD_PR, is_read: true });
  });

  it("still navigates when the read call fails", async () => {
    const user = userEvent.setup();
    markRead = vi.fn(() => Promise.reject({ response: { status: 500, data: {} } }));
    useMarkNotificationRead.mockReturnValue({ mutateAsync: markRead, isPending: false });

    renderPage();

    const card = screen.getByRole("article", { name: UNREAD_PR.title });
    await user.click(within(card).getByRole("button", { name: /start rfq/i }));

    // Bookkeeping failed, but the user asked to go somewhere — the page does not trap them.
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.PROCUREMENT_PR_DETAIL("59")),
    );
  });

  it("marks everything read through the dedicated endpoint", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /mark all as read/i }));

    await waitFor(() => expect(markAllRead).toHaveBeenCalledTimes(1));
  });

  it("disables Mark all as read when nothing is unread", () => {
    useNotifications.mockReturnValue(listState({ unreadCount: 0 }));

    renderPage();

    expect(screen.getByRole("button", { name: /mark all as read/i })).toBeDisabled();
  });
});

describe("NotificationCenterPage — states", () => {
  it("shows a skeleton while loading", () => {
    useNotifications.mockReturnValue(listState({ isLoading: true, notifications: [] }));

    renderPage();

    expect(screen.getByRole("status", { name: /loading notifications/i })).toBeInTheDocument();
  });

  it("shows the caught-up message for an empty inbox", () => {
    useNotifications.mockReturnValue(
      listState({ notifications: [], total: 0, unreadCount: 0 }),
    );

    renderPage();

    expect(
      screen.getByText("You're all caught up. No notifications to show."),
    ).toBeInTheDocument();
  });

  it("offers a retry on failure without exposing a raw backend error", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    useNotifications.mockReturnValue(
      listState({
        isError: true,
        error: { response: { status: 500, data: {} } },
        notifications: [],
        refetch,
      }),
    );

    renderPage();

    expect(screen.getByText("Unable to load notifications right now.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("says plainly when only part of the history is on screen", () => {
    useNotifications.mockReturnValue(listState({ total: 240 }));

    renderPage();

    expect(
      screen.getByText("Showing the 7 most recent of 240 notifications."),
    ).toBeInTheDocument();
  });
});

describe("NotificationCenterPage — load more", () => {
  it("offers Load more while the backend reports another page", () => {
    useNotifications.mockReturnValue(listState({ total: 240, hasNextPage: true }));

    renderPage();

    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("fetches the next page when Load more is clicked", async () => {
    const user = userEvent.setup();
    const fetchNextPage = vi.fn();
    useNotifications.mockReturnValue(
      listState({ total: 240, hasNextPage: true, fetchNextPage }),
    );

    renderPage();
    await user.click(screen.getByRole("button", { name: /load more/i }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("hides Load more once everything is loaded", () => {
    useNotifications.mockReturnValue(listState({ total: ALL.length, hasNextPage: false }));

    renderPage();

    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
    // Nothing is withheld, so there is no "showing N of M" line either.
    expect(screen.queryByText(/most recent of/)).not.toBeInTheDocument();
  });

  it("hides Load more when more exist but the backend reported no next page", () => {
    // total can exceed what is loaded while getNextPageParam still says "done" — the button
    // follows the query, never a count comparison of its own.
    useNotifications.mockReturnValue(listState({ total: 240, hasNextPage: false }));

    renderPage();

    expect(screen.getByText(/most recent of 240/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("keeps the active filters in the request while paging", async () => {
    const user = userEvent.setup();
    useNotifications.mockReturnValue(listState({ total: 240, hasNextPage: true }));

    renderPage();
    await user.click(screen.getByRole("button", { name: /^unread/i }));

    // The filters travel in the query key, so the next page can never widen the filter.
    expect(useNotifications).toHaveBeenLastCalledWith(
      expect.objectContaining({ isRead: false, pageSize: 25 }),
    );
  });

  it("shows a loading state on the button while the next page is in flight", () => {
    useNotifications.mockReturnValue(
      listState({ total: 240, hasNextPage: true, isFetchingNextPage: true }),
    );

    renderPage();

    expect(screen.getByRole("button", { name: /loading/i })).toBeInTheDocument();
  });
});

/** The module chip rendered inside a card. */
const moduleOf = (card) => within(card).getByTestId("notification-module");

/** Picks an option from one of the page's FormSelect dropdowns. */
const choose = async (user, triggerName, optionText) => {
  await user.click(screen.getByRole("button", { name: triggerName }));
  const options = await screen.findByRole("listbox");
  await user.click(within(options).getByText(optionText));
};

describe("NotificationCenterPage — unified cross-module stream", () => {
  it("lists one user's Procurement, Vendor, Invoice, Payment and System Configuration notifications together", () => {
    renderPage();

    [UNREAD_PR, READ_INVOICE, OVERDUE_INVOICE, READ_PAYMENT_READY, SYSTEM_CONFIG_EXCEPTION].forEach(
      (notification) => {
        expect(screen.getByRole("article", { name: notification.title })).toBeInTheDocument();
      },
    );
  });

  it("shows the backend's module on every card", () => {
    renderPage();

    const expected = [
      [UNREAD_PR, "PROCUREMENT", "Procurement"],
      [READ_INVOICE, "VENDOR_MANAGEMENT", "Vendor Management"],
      [OVERDUE_INVOICE, "INVOICE_MANAGEMENT", "Invoice Management"],
      [READ_PAYMENT_READY, "PAYMENTS", "Payments"],
      [SYSTEM_CONFIG_EXCEPTION, "SYSTEM_CONFIGURATION", "System Configuration"],
    ];

    expected.forEach(([notification, module, label]) => {
      const chip = moduleOf(screen.getByRole("article", { name: notification.title }));
      expect(chip).toHaveAttribute("data-module", module);
      // Screen readers hear "Module: …", not a bare word.
      expect(chip).toHaveTextContent(`Module: ${label}`);
    });
  });

  it("takes the module from the backend, never from the entity type", () => {
    // PAYMENT_READY is raised on an INVOICE entity but belongs to Payments.
    renderPage();

    const chip = moduleOf(screen.getByRole("article", { name: READ_PAYMENT_READY.title }));
    expect(chip).toHaveAttribute("data-module", "PAYMENTS");
  });

  it("renders an unknown module from its raw value without crashing", () => {
    renderPage();

    const chip = moduleOf(screen.getByRole("article", { name: UNKNOWN_TYPE.title }));
    expect(chip).toHaveTextContent("Some Future Module");
  });

  it("renders a notification with no module as Other", () => {
    useNotifications.mockReturnValue(
      listState({ notifications: [{ ...UNREAD_PR, module: null }], total: 1 }),
    );

    renderPage();

    expect(moduleOf(screen.getByRole("article", { name: UNREAD_PR.title }))).toHaveTextContent("Other");
  });

  it("finds notifications by module name in search", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Search notifications"), "system configuration");

    expect(screen.getByText(SYSTEM_CONFIG_EXCEPTION.title)).toBeInTheDocument();
    expect(screen.queryByText(UNREAD_PR.title)).not.toBeInTheDocument();
  });
});

describe("NotificationCenterPage — module filter", () => {
  it("defaults to All Modules and sends no module to the API", () => {
    renderPage();

    expect(screen.getByRole("button", { name: /all modules/i })).toBeInTheDocument();
    const [filters] = useNotifications.mock.calls.at(-1);
    expect(filters).not.toHaveProperty("module");
    // The default view is the exact query the header bell and dashboard share.
    expect(filters).toEqual({ pageSize: 25 });
  });

  it("narrows the same stream through the backend module filter", async () => {
    const user = userEvent.setup();
    renderPage();

    await choose(user, /all modules/i, "Payments");

    await waitFor(() =>
      expect(useNotifications).toHaveBeenLastCalledWith(
        expect.objectContaining({ module: "PAYMENTS", pageSize: 25 }),
      ),
    );
  });

  it("composes the module filter with priority and the Unread tab", async () => {
    const user = userEvent.setup();
    renderPage();

    await choose(user, /all modules/i, "Procurement");
    await choose(user, /all priorities/i, "High");
    await user.click(screen.getByRole("button", { name: /^unread/i }));

    await waitFor(() =>
      expect(useNotifications).toHaveBeenLastCalledWith({
        pageSize: 25,
        module: "PROCUREMENT",
        priority: "HIGH",
        isRead: false,
      }),
    );
  });

  it("keeps the unread count global while a module filter is active", async () => {
    const user = userEvent.setup();
    // The module-filtered page holds a single unread row, but the backend reports the
    // user's unread count across every module.
    useNotifications.mockImplementation((filters) =>
      filters.module
        ? listState({ notifications: [RESOLVED_PAYMENT_FAILED], total: 1, unreadCount: 9 })
        : listState({ unreadCount: 9 }),
    );

    renderPage();
    await choose(user, /all modules/i, "Payments");

    await waitFor(() => expect(screen.queryByText(UNREAD_PR.title)).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^unread/i })).toHaveTextContent("9");
    expect(screen.getByRole("button", { name: /mark all as read/i })).toBeEnabled();
  });

  it("shows a module-specific empty state", async () => {
    const user = userEvent.setup();
    useNotifications.mockImplementation((filters) =>
      filters.module ? listState({ notifications: [], total: 0 }) : listState(),
    );

    renderPage();
    await choose(user, /all modules/i, "System Configuration");

    expect(await screen.findByText("No System Configuration notifications.")).toBeInTheDocument();
  });
});

describe("NotificationCenterPage — resolved and action required", () => {
  it("never lists a resolved notification under Action Required", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^action required$/i }));

    expect(screen.queryByText(RESOLVED_PAYMENT_FAILED.title)).not.toBeInTheDocument();
  });

  it("keeps a read but unresolved notification under Action Required", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^action required$/i }));

    expect(screen.getByText(READ_PAYMENT_READY.title)).toBeInTheDocument();
    expect(screen.getByText(SYSTEM_CONFIG_EXCEPTION.title)).toBeInTheDocument();
  });

  it("does not treat an unread informational notification as Action Required", async () => {
    const user = userEvent.setup();
    useNotifications.mockReturnValue(
      listState({ notifications: [INFO_NOTICE, UNREAD_PR], total: 2 }),
    );

    renderPage();
    await user.click(screen.getByRole("button", { name: /^action required$/i }));

    expect(screen.getByText(UNREAD_PR.title)).toBeInTheDocument();
    expect(screen.queryByText(INFO_NOTICE.title)).not.toBeInTheDocument();
  });

  it("keeps resolved notifications in the All view as history", () => {
    renderPage();

    const card = screen.getByRole("article", { name: RESOLVED_PAYMENT_FAILED.title });
    expect(within(card).getByText("Resolved")).toBeInTheDocument();
    expect(card).toHaveAttribute("data-resolved", "true");
  });

  it("does not present a resolved notification as pending work", () => {
    renderPage();

    const card = screen.getByRole("article", { name: RESOLVED_PAYMENT_FAILED.title });

    // No call to action and no overdue flag, even with a passed deadline.
    expect(
      within(card).queryByRole("button", { name: /resolve payment failure/i }),
    ).not.toBeInTheDocument();
    expect(within(card).queryByText("Overdue")).not.toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /^view/i })).toBeInTheDocument();
  });

  it("keeps a resolved notification out of the Overdue tab", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^overdue$/i }));

    expect(screen.getByText(OVERDUE_INVOICE.title)).toBeInTheDocument();
    expect(screen.queryByText(RESOLVED_PAYMENT_FAILED.title)).not.toBeInTheDocument();
  });

  it("renders the backend title and action label unchanged", () => {
    renderPage();

    const card = screen.getByRole("article", { name: UNREAD_PR.title });
    expect(within(card).getByRole("heading")).toHaveTextContent(
      "PR-000059 — Procurement action required",
    );
    expect(within(card).getByRole("button", { name: /start rfq/i })).toBeInTheDocument();
  });
});

describe("NotificationCenterPage — cross-module deep links", () => {
  it("opens a Payments notification on its invoice", async () => {
    const user = userEvent.setup();
    renderPage();

    const card = screen.getByRole("article", { name: READ_PAYMENT_READY.title });
    await user.click(within(card).getByRole("button", { name: /process payment/i }));

    expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.INVOICE_DETAIL("2001"));
  });

  it("opens a System Configuration exception on System Configuration", async () => {
    const user = userEvent.setup();
    renderPage();

    const card = screen.getByRole("article", { name: SYSTEM_CONFIG_EXCEPTION.title });
    await user.click(within(card).getByRole("button", { name: /resolve system exception/i }));

    await waitFor(() => expect(markRead).toHaveBeenCalledWith(7));
    expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.SYSTEM_CONFIG);
  });

  it("opens an Invoice Management notification on the invoice", async () => {
    const user = userEvent.setup();
    renderPage();

    const card = screen.getByRole("article", { name: OVERDUE_INVOICE.title });
    await user.click(within(card).getByRole("button", { name: /resolve overdue invoice/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.INVOICE_DETAIL("1052")),
    );
  });
});

describe("NotificationCenterPage — PR workflow notifications", () => {
  const PR_RETURNED = {
    ...UNREAD_PR,
    id: 70,
    notification_type: "PR_RETURNED",
    module: "PROCUREMENT",
    title: "PR-000061 — PR returned for clarification",
    message: "PR-000061 was returned for clarification: add a quote reference.",
    entity_id: "61",
    entity_display_id: "PR-000061",
    action_label: "Update and resubmit",
    is_read: false,
    is_resolved: false,
  };

  it("shows a returned PR as Procurement work and opens the PR to resubmit it", async () => {
    const user = userEvent.setup();
    useNotifications.mockReturnValue(listState({ notifications: [PR_RETURNED], total: 1 }));
    renderPage();

    await user.click(screen.getByRole("button", { name: /^action required$/i }));
    const card = screen.getByRole("article", { name: PR_RETURNED.title });
    expect(within(card).getByTestId("notification-module")).toHaveAttribute("data-module", "PROCUREMENT");

    await user.click(within(card).getByRole("button", { name: /update and resubmit/i }));
    expect(markRead).toHaveBeenCalledWith(70);
    expect(mockNavigate).toHaveBeenCalledWith(AP_ROUTES.PROCUREMENT_PR_DETAIL("61"));
  });

  it("drops a resolved PR approval item out of Action Required", async () => {
    const user = userEvent.setup();
    const resolvedApproval = {
      ...PR_RETURNED,
      id: 71,
      notification_type: "PR_APPROVAL_REQUIRED",
      title: "PR-000061 — PR approval required",
      is_resolved: true,
    };
    useNotifications.mockReturnValue(listState({ notifications: [resolvedApproval], total: 1 }));
    renderPage();

    await user.click(screen.getByRole("button", { name: /^action required$/i }));
    expect(screen.queryByText(resolvedApproval.title)).not.toBeInTheDocument();
  });
});
