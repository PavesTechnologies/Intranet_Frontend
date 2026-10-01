import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import notificationService from "../services/notificationService";

/**
 * Notification Center data layer.
 *
 * Follows the AP React Query convention: an ["accountsPayable", ...] key namespace, a service
 * module for the calls, and invalidation (never hand-rolled refetching) after a write.
 *
 * Deliberately NO polling interval. The list and the badge share one namespace, so a read
 * action refreshes both from a single invalidation, and React Query's refetch-on-focus is
 * enough to keep the badge current without a timer hitting the API in the background.
 */

export const NOTIFICATIONS_KEY = ["accountsPayable", "notifications"];

/**
 * The unified stream as every surface first sees it: all modules, read and unread, newest
 * first. The header dropdown, the dashboard's Requires Attention and the Notification Center's
 * default view all ask for exactly this, so they share ONE cache entry and one request instead
 * of each fetching its own copy.
 */
export const DEFAULT_NOTIFICATION_FILTERS = Object.freeze({ pageSize: 25 });

/**
 * Drops unset filters, so "All Modules" ({ module: undefined }) and no module at all are the
 * same cache entry — and the same request — rather than two copies of one stream.
 */
const cleanFilters = (filters = {}) =>
  Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

/**
 * One key per filter combination — switching a tab/filter is its own cache entry, so a
 * module-filtered page can never be mistaken for (or overwrite) the All Modules one.
 */
export const NOTIFICATION_LIST_KEY = (filters = {}) => [
  ...NOTIFICATIONS_KEY,
  "list",
  cleanFilters(filters),
];

const NOTIFICATION_LISTS_KEY = [...NOTIFICATIONS_KEY, "list"];

export const NOTIFICATION_UNREAD_COUNT_KEY = [...NOTIFICATIONS_KEY, "unreadCount"];

/**
 * The authenticated user's notifications, one page at a time.
 *
 * GET /apm/notifications is a page/page_size endpoint that reports `total`, so this is an
 * infinite query: "Load more" appends the next page instead of replacing the list, and
 * `total` is what says whether another page exists. The filters live in the query key, so
 * loading more can never silently widen or drop the active filter - each filter combination
 * accumulates its own pages.
 *
 * `enabled` lets a caller (the header bell, which renders outside AP pages) hold the query
 * back rather than firing it for a user who is not in Accounts Payable at all.
 *
 * `module` narrows the same stream to one AP module (backend filter). The unread count that
 * comes back is still the global one — the backend never scopes it to the filter.
 *
 * @param {{isRead?: boolean, priority?: string, notificationType?: string, module?: string,
 *   pageSize?: number}} filters
 * @param {{enabled?: boolean}} options
 */
export const useNotifications = (filters = {}, { enabled = true } = {}) => {
  const activeFilters = cleanFilters(filters);

  const query = useInfiniteQuery({
    queryKey: NOTIFICATION_LIST_KEY(activeFilters),
    queryFn: ({ pageParam = 1 }) =>
      notificationService.getNotifications({ ...activeFilters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      const loaded = (lastPage.page ?? 1) * (lastPage.page_size ?? 0);
      // The backend's own `total` decides this - never the length of what happens to be
      // on screen after client-side tab/search narrowing.
      return loaded < (lastPage.total ?? 0) ? (lastPage.page ?? 1) + 1 : undefined;
    },
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const pages = query.data?.pages || [];
  // The most recently fetched page carries the freshest total/unread_count.
  const latestPage = pages[pages.length - 1];

  return {
    notifications: pages.flatMap((page) => page?.items || []),
    total: latestPage?.total ?? 0,
    // The list response carries the unread count too, so a page that already has the list
    // does not need a second request to show it.
    unreadCount: latestPage?.unread_count ?? 0,
    page: latestPage?.page ?? 1,
    pageSize: latestPage?.page_size ?? filters.pageSize ?? 20,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    // "Load more" wiring.
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};

/** Unread badge count. Same `enabled` escape hatch as above. */
export const useUnreadNotificationCount = ({ enabled = true } = {}) => {
  const query = useQuery({
    queryKey: NOTIFICATION_UNREAD_COUNT_KEY,
    queryFn: notificationService.getUnreadCount,
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  return {
    unreadCount: query.data?.unread_count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Invalidates every notification query — the lists (all filter combinations) and the badge —
 * so a read action can never leave the badge disagreeing with the list.
 */
const invalidateNotifications = (qc) => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });

/** Applies `updatePage` to every loaded page of every cached list (all filters, all modules). */
const updateCachedPages = (qc, updatePage) =>
  qc.setQueriesData({ queryKey: NOTIFICATION_LISTS_KEY }, (previous) => {
    if (!previous?.pages) return previous;
    return { ...previous, pages: previous.pages.map((page) => (page ? updatePage(page) : page)) };
  });

/** Whether any cached list currently holds this notification as unread. */
const wasCachedAsUnread = (qc, notificationId) =>
  qc
    .getQueriesData({ queryKey: NOTIFICATION_LISTS_KEY })
    .some(([, data]) =>
      data?.pages?.some((page) =>
        page?.items?.some((item) => item.id === notificationId && !item.is_read),
      ),
    );

/**
 * Sets the global unread count everywhere it is cached — the badge query and the
 * `unread_count` each list page carries — so the bell and the lists move together.
 */
const setCachedUnreadCount = (qc, nextCount) => {
  qc.setQueryData(NOTIFICATION_UNREAD_COUNT_KEY, (previous) =>
    previous ? { ...previous, unread_count: nextCount(previous.unread_count ?? 0) } : previous,
  );
  updateCachedPages(qc, (page) => ({
    ...page,
    unread_count: nextCount(page.unread_count ?? 0),
  }));
};

/**
 * PATCH /apm/notifications/{id}/read.
 *
 * The updated row is written straight into every cached list (All Modules and any module
 * filter alike) before the refetch lands, so the card flips to "read" immediately. When the
 * row really went from unread to read, the cached global count drops by one too, so the bell
 * never lags the list. All of it is keyed off the server's response, not a guess, and the
 * invalidation that follows is what makes the counts authoritative again.
 */
export const useMarkNotificationRead = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (notificationId) => notificationService.markRead(notificationId),
    onSuccess: (updated) => {
      if (updated?.id != null) {
        const becameRead = updated.is_read && wasCachedAsUnread(qc, updated.id);

        // The lists are infinite queries, so the cached shape is { pages, pageParams } -
        // the updated row is written into whichever loaded page holds it.
        updateCachedPages(qc, (page) =>
          page.items
            ? {
                ...page,
                items: page.items.map((item) => (item.id === updated.id ? updated : item)),
              }
            : page,
        );

        if (becameRead) setCachedUnreadCount(qc, (count) => Math.max(0, count - 1));
      }
      invalidateNotifications(qc);
    },
    // A failed read must not leave a card looking read: nothing is written optimistically,
    // so there is nothing to roll back and the cache still reflects the server.
  });
};

/**
 * PATCH /apm/notifications/read-all — marks every module's notifications read, so on success
 * the global count is zero and every cached row is read, immediately, before the refetch.
 * Resolution is untouched: reading is not doing the work.
 */
export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      updateCachedPages(qc, (page) =>
        page.items
          ? {
              ...page,
              items: page.items.map((item) => (item.is_read ? item : { ...item, is_read: true })),
            }
          : page,
      );
      setCachedUnreadCount(qc, () => 0);
      invalidateNotifications(qc);
    },
  });
};

export default useNotifications;
