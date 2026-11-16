import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  DEFAULT_NOTIFICATION_FILTERS,
  NOTIFICATION_LIST_KEY,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "./useNotifications";
import notificationService from "../services/notificationService";

vi.mock("../services/notificationService", () => ({
  default: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

const wrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

/** One page of the GET /apm/notifications response. */
const page = (pageNumber, ids, { total = 5, pageSize = 2, unread = 3 } = {}) => ({
  items: ids.map((id) => ({ id, title: `N${id}`, is_read: false })),
  total,
  unread_count: unread,
  page: pageNumber,
  page_size: pageSize,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useNotifications — paging", () => {
  it("requests page 1 first and reports the backend's totals", async () => {
    notificationService.getNotifications.mockResolvedValue(page(1, [1, 2]));

    const { result } = renderHook(() => useNotifications({ pageSize: 2 }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(notificationService.getNotifications).toHaveBeenCalledWith({
      pageSize: 2,
      page: 1,
    });
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.total).toBe(5);
    expect(result.current.unreadCount).toBe(3);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("appends the next page instead of replacing the list", async () => {
    notificationService.getNotifications
      .mockResolvedValueOnce(page(1, [1, 2]))
      .mockResolvedValueOnce(page(2, [3, 4]));

    const { result } = renderHook(() => useNotifications({ pageSize: 2 }), { wrapper });

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(4));
    expect(result.current.notifications.map((n) => n.id)).toEqual([1, 2, 3, 4]);
    expect(notificationService.getNotifications).toHaveBeenLastCalledWith({
      pageSize: 2,
      page: 2,
    });
  });

  it("carries the active filters into every page request", async () => {
    notificationService.getNotifications
      .mockResolvedValueOnce(page(1, [1, 2]))
      .mockResolvedValueOnce(page(2, [3, 4]));

    const { result } = renderHook(
      () => useNotifications({ isRead: false, priority: "HIGH", pageSize: 2 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    // Loading more must never widen or drop the filter the user is looking at.
    await waitFor(() =>
      expect(notificationService.getNotifications).toHaveBeenLastCalledWith({
        isRead: false,
        priority: "HIGH",
        pageSize: 2,
        page: 2,
      }),
    );
  });

  it("stops offering a next page once the total is reached", async () => {
    notificationService.getNotifications.mockResolvedValue(
      page(1, [1, 2], { total: 2, pageSize: 2 }),
    );

    const { result } = renderHook(() => useNotifications({ pageSize: 2 }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasNextPage).toBe(false);
  });

  it("reports an empty inbox without claiming another page exists", async () => {
    notificationService.getNotifications.mockResolvedValue(
      page(1, [], { total: 0, pageSize: 25, unread: 0 }),
    );

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("surfaces a failure rather than an empty list", async () => {
    notificationService.getNotifications.mockRejectedValue(
      new Error("network down"),
    );

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.notifications).toEqual([]);
  });

  it("does not call the API at all when disabled", async () => {
    renderHook(() => useNotifications({}, { enabled: false }), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(notificationService.getNotifications).not.toHaveBeenCalled();
  });
});

describe("useUnreadNotificationCount", () => {
  it("returns the backend's count", async () => {
    notificationService.getUnreadCount.mockResolvedValue({ unread_count: 12 });

    const { result } = renderHook(() => useUnreadNotificationCount(), { wrapper });

    await waitFor(() => expect(result.current.unreadCount).toBe(12));
  });

  it("falls back to zero — never a guess — before the response lands", () => {
    notificationService.getUnreadCount.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useUnreadNotificationCount(), { wrapper });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it("does not call the API when disabled", async () => {
    renderHook(() => useUnreadNotificationCount({ enabled: false }), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(notificationService.getUnreadCount).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/* Unified stream, module filter and cache consistency                         */
/* -------------------------------------------------------------------------- */

const sharedWrapper = (queryClient) =>
  function SharedWrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const row = (id, module, overrides = {}) => ({
  id,
  module,
  notification_type: "PR_APPROVED_SOURCING",
  title: `N${id}`,
  is_read: false,
  is_resolved: false,
  ...overrides,
});

const listPage = (items, unread) => ({
  items,
  total: items.length,
  unread_count: unread,
  page: 1,
  page_size: 25,
});

describe("useNotifications — module filter", () => {
  it("sends module only when a specific module is selected", async () => {
    notificationService.getNotifications.mockResolvedValue(listPage([], 0));

    const { result } = renderHook(
      () => useNotifications({ module: "PAYMENTS", pageSize: 25 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(notificationService.getNotifications).toHaveBeenCalledWith({
      module: "PAYMENTS",
      pageSize: 25,
      page: 1,
    });
  });

  it("omits module entirely for All Modules", async () => {
    notificationService.getNotifications.mockResolvedValue(listPage([], 0));

    const { result } = renderHook(
      () => useNotifications({ module: "", pageSize: 25 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const [params] = notificationService.getNotifications.mock.calls[0];
    expect(params).not.toHaveProperty("module");
  });

  it("keeps All Modules and module-filtered results in separate cache entries", async () => {
    const queryClient = newClient();
    notificationService.getNotifications.mockImplementation(({ module }) =>
      Promise.resolve(
        module
          ? listPage([row(3, "PAYMENTS")], 4)
          : listPage([row(1, "PROCUREMENT"), row(2, "VENDOR_MANAGEMENT"), row(3, "PAYMENTS")], 4),
      ),
    );

    const { result } = renderHook(
      () => ({
        all: useNotifications(DEFAULT_NOTIFICATION_FILTERS),
        payments: useNotifications({ ...DEFAULT_NOTIFICATION_FILTERS, module: "PAYMENTS" }),
      }),
      { wrapper: sharedWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.payments.notifications).toHaveLength(1));
    await waitFor(() => expect(result.current.all.notifications).toHaveLength(3));

    expect(
      queryClient.getQueryData(NOTIFICATION_LIST_KEY(DEFAULT_NOTIFICATION_FILTERS)).pages[0].items,
    ).toHaveLength(3);
    expect(
      queryClient.getQueryData(
        NOTIFICATION_LIST_KEY({ ...DEFAULT_NOTIFICATION_FILTERS, module: "PAYMENTS" }),
      ).pages[0].items,
    ).toHaveLength(1);
    // The unread count stays the global one under the module filter.
    expect(result.current.payments.unreadCount).toBe(4);
  });

  it("gives Header, Dashboard and Notification Center one request for the default stream", async () => {
    const queryClient = newClient();
    notificationService.getNotifications.mockResolvedValue(
      listPage([row(1, "PROCUREMENT"), row(2, "INVOICE_MANAGEMENT")], 2),
    );

    // Bell dropdown, dashboard Requires Attention and the Center's default view.
    const { result } = renderHook(
      () => [
        useNotifications(DEFAULT_NOTIFICATION_FILTERS),
        useNotifications(DEFAULT_NOTIFICATION_FILTERS),
        useNotifications({ ...DEFAULT_NOTIFICATION_FILTERS, module: undefined }),
      ],
      { wrapper: sharedWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current[2].notifications).toHaveLength(2));
    expect(notificationService.getNotifications).toHaveBeenCalledTimes(1);
  });
});

describe("read mutations — cache consistency across modules", () => {
  /**
   * Loads the All Modules list, a Procurement-filtered list and the badge into one client.
   * Later refetches never settle, so what the tests see is exactly what the mutation wrote
   * into the cache, not a refetch that happened to land.
   */
  const loadCaches = async () => {
    const queryClient = newClient();
    const all = [
      row(1, "PROCUREMENT"),
      row(2, "PAYMENTS"),
      row(3, "INVOICE_MANAGEMENT", { is_read: true }),
    ];

    notificationService.getNotifications.mockImplementation(({ module }) =>
      Promise.resolve(module ? listPage([all[0]], 2) : listPage(all, 2)),
    );
    notificationService.getUnreadCount.mockResolvedValue({ unread_count: 2 });

    const hook = renderHook(
      () => ({
        all: useNotifications(DEFAULT_NOTIFICATION_FILTERS),
        procurement: useNotifications({ ...DEFAULT_NOTIFICATION_FILTERS, module: "PROCUREMENT" }),
        badge: useUnreadNotificationCount(),
        markRead: useMarkNotificationRead(),
        markAllRead: useMarkAllNotificationsRead(),
      }),
      { wrapper: sharedWrapper(queryClient) },
    );

    await waitFor(() => expect(hook.result.current.all.notifications).toHaveLength(3));
    await waitFor(() => expect(hook.result.current.procurement.notifications).toHaveLength(1));
    await waitFor(() => expect(hook.result.current.badge.unreadCount).toBe(2));

    notificationService.getNotifications.mockReturnValue(new Promise(() => {}));
    notificationService.getUnreadCount.mockReturnValue(new Promise(() => {}));

    return hook;
  };

  it("mark-read updates the row in every cached list and the global badge immediately", async () => {
    const { result } = await loadCaches();
    notificationService.markRead.mockResolvedValue(row(1, "PROCUREMENT", { is_read: true }));

    await act(async () => {
      await result.current.markRead.mutateAsync(1);
    });

    await waitFor(() => expect(result.current.badge.unreadCount).toBe(1));
    expect(result.current.all.notifications.find((n) => n.id === 1).is_read).toBe(true);
    expect(result.current.procurement.notifications[0].is_read).toBe(true);
    expect(result.current.all.unreadCount).toBe(1);
    expect(result.current.procurement.unreadCount).toBe(1);
  });

  it("mark-read on an already-read row leaves the count alone", async () => {
    const { result } = await loadCaches();
    notificationService.markRead.mockResolvedValue(
      row(3, "INVOICE_MANAGEMENT", { is_read: true }),
    );

    await act(async () => {
      await result.current.markRead.mutateAsync(3);
    });

    expect(result.current.badge.unreadCount).toBe(2);
  });

  it("mark-read never touches resolution: a read, unresolved row stays unresolved", async () => {
    const { result } = await loadCaches();
    notificationService.markRead.mockResolvedValue(row(1, "PROCUREMENT", { is_read: true }));

    await act(async () => {
      await result.current.markRead.mutateAsync(1);
    });

    await waitFor(() => expect(result.current.all.notifications[0].is_read).toBe(true));
    expect(result.current.all.notifications[0].is_resolved).toBe(false);
  });

  it("mark-all-read zeroes the global count and marks every cached list read", async () => {
    const { result } = await loadCaches();
    notificationService.markAllRead.mockResolvedValue({ updated: 2, message: "2 marked" });

    await act(async () => {
      await result.current.markAllRead.mutateAsync();
    });

    await waitFor(() => expect(result.current.badge.unreadCount).toBe(0));
    expect(result.current.all.notifications.every((n) => n.is_read)).toBe(true);
    expect(result.current.procurement.notifications.every((n) => n.is_read)).toBe(true);
    expect(result.current.all.unreadCount).toBe(0);
  });

  it("a failed mark-read changes nothing in the cache", async () => {
    const { result } = await loadCaches();
    notificationService.markRead.mockRejectedValue(new Error("404"));

    await act(async () => {
      await expect(result.current.markRead.mutateAsync(1)).rejects.toThrow();
    });

    expect(result.current.all.notifications[0].is_read).toBe(false);
    expect(result.current.badge.unreadCount).toBe(2);
  });
});
