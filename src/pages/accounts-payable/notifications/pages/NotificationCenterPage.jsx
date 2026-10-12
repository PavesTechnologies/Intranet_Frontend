import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { BellOff, CheckCheck, RefreshCw, Search } from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import FormSelect from "../../../../components/forms/FormSelect";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";

import { getApiErrorMessage } from "../../utils/apiError";
import {
  DEFAULT_NOTIFICATION_FILTERS,
  useNotifications,
  useMarkAllNotificationsRead,
} from "../hooks/useNotifications";
import useOpenNotification from "../hooks/useOpenNotification";
import {
  MODULE_LABEL,
  MODULE_ORDER,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  isActionRequired,
  isOverdue,
  moduleLabel,
  resolveNotificationRoute,
} from "../constants/notifications";
import NotificationCard from "../components/NotificationCard";

const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "action", label: "Action Required" },
  { id: "overdue", label: "Overdue" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All priorities" },
  ...PRIORITY_ORDER.map((priority) => ({ value: priority, label: PRIORITY_LABEL[priority] })),
];

// "All modules" is the default and sends no module at all: one unified stream. Only the
// modules the backend accepts as a filter are offered — anything else would be a 422.
const MODULE_OPTIONS = [
  { value: "", label: "All modules" },
  ...MODULE_ORDER.map((module) => ({ value: module, label: MODULE_LABEL[module] })),
];

const ListSkeleton = () => (
  <div className="space-y-2" role="status" aria-label="Loading notifications">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="h-24 animate-pulse rounded-lg bg-gray-100" />
    ))}
  </div>
);

/**
 * Route: /accounts-payable/notifications
 *
 * The authenticated user's own notifications — ONE stream across every AP module
 * (Procurement, Vendor Management, Invoice Management, Payments, System Configuration, …).
 * Which notifications exist, and who may see them, is decided entirely by the backend (the
 * recipient comes from the JWT) — this page never filters by role, never by the AP page the
 * user came from, and never asks for another user's rows.
 */
export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [module, setModule] = useState("");

  const { openNotification, openingId } = useOpenNotification();

  // Unread, priority and module are real backend filters; Action Required and Overdue are
  // not, so those two tabs read the same page and narrow it here — never the whole history,
  // so the footer always says how much of the total is on screen. With nothing selected this
  // is exactly DEFAULT_NOTIFICATION_FILTERS, the cache entry the header bell and the
  // dashboard share.
  const filters = useMemo(
    () => ({
      ...DEFAULT_NOTIFICATION_FILTERS,
      ...(activeTab === "unread" ? { isRead: false } : {}),
      ...(priority ? { priority } : {}),
      ...(module ? { module } : {}),
    }),
    [activeTab, priority, module],
  );

  const {
    notifications,
    total,
    unreadCount,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications(filters);

  // `unreadCount` is the backend's global count: the list endpoint never scopes it to the
  // module/priority filter, so the Unread badge and Mark all stay global under any filter.
  const markAllReadMutation = useMarkAllNotificationsRead();

  const visibleNotifications = useMemo(() => {
    const term = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      // Backend state, not read state: unresolved, action-oriented types only.
      if (activeTab === "action" && !isActionRequired(notification)) return false;
      if (activeTab === "overdue" && !isOverdue(notification)) return false;

      if (!term) return true;

      return [
        notification.title,
        notification.message,
        notification.entity_display_id,
        notification.notification_type,
        moduleLabel(notification.module),
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });
  }, [notifications, activeTab, search]);

  const handleMarkAllRead = async () => {
    try {
      const result = await markAllReadMutation.mutateAsync();
      toast.success(
        result?.updated > 0
          ? `${result.updated} notification(s) marked as read.`
          : "No unread notifications to mark.",
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not mark all notifications as read."));
    }
  };

  const narrowed = Boolean(search.trim()) || activeTab !== "all" || Boolean(priority);
  const emptyMessage = narrowed
    ? "No notifications match these filters."
    : module
      ? `No ${moduleLabel(module)} notifications.`
      : "You're all caught up. No notifications to show.";

  return (
    <div className="p-6">
      <PageHeader
        title="Notifications"
        subtitle="Actions and updates raised for you across Accounts Payable."
        actions={
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            loading={markAllReadMutation.isPending}
            loadingText="Marking..."
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        }
      />

      <PageCard>
        <PageCardContent className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-4 overflow-x-auto border-b border-gray-200">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap pb-3 text-sm transition ${
                  activeTab === tab.id
                    ? "border-b-2 border-[#0A0082] font-semibold text-[#0A0082]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.id === "unread" && unreadCount > 0 ? (
                  <span className="ml-1.5 rounded-full bg-[#0A0082] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Search + module + priority */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications"
                aria-label="Search notifications"
                className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-4 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
              />
            </div>

            <FormSelect
              name="module"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              options={MODULE_OPTIONS}
              placeholder="All modules"
              className="sm:w-56"
            />

            <FormSelect
              name="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={PRIORITY_OPTIONS}
              placeholder="All priorities"
              className="sm:w-52"
            />
          </div>

          {/* List */}
          {isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
              <p className="text-sm text-red-700">
                {getApiErrorMessage(error, "Unable to load notifications right now.")}
              </p>
              <Button variant="outline" size="small" className="mt-3" onClick={refetch}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : isLoading ? (
            <ListSkeleton />
          ) : visibleNotifications.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
              <BellOff className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">{emptyMessage}</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {visibleNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    actionRoute={resolveNotificationRoute(notification)}
                    onOpen={openNotification}
                    isOpening={openingId === notification.id}
                  />
                ))}
              </div>

              {/* Says plainly what was loaded, so a narrowed list is never mistaken for the
                  whole history, and offers the next page when the backend says there is one. */}
              {total > notifications.length ? (
                <div className="flex flex-col items-center gap-2 pt-1">
                  <p className="text-center text-xs text-gray-400">
                    Showing the {notifications.length} most recent of {total}
                    {module ? ` ${moduleLabel(module)}` : ""} notifications.
                  </p>

                  {hasNextPage ? (
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => fetchNextPage()}
                      loading={isFetchingNextPage}
                      loadingText="Loading..."
                    >
                      Load more
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
}
