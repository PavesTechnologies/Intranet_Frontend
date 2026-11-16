import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Bell, BellOff, CheckCircle2 } from "lucide-react";

import { AP_ROUTES } from "../../constants/routes";
import { formatDateTime } from "../../utils/formatters";
import {
  DEFAULT_NOTIFICATION_FILTERS,
  useNotifications,
  useUnreadNotificationCount,
} from "../hooks/useNotifications";
import useOpenNotification from "../hooks/useOpenNotification";
import { PRIORITY_ACCENT, PRIORITY_LABEL, isActionRequired } from "../constants/notifications";
import ModuleBadge from "./ModuleBadge";

/** 100+ rather than a number that would overflow the badge. */
const formatBadge = (count) => (count > 99 ? "99+" : String(count));

/** How many of the latest notifications the compact dropdown shows before "View all". */
export const DROPDOWN_LIMIT = 6;

/** One compact row in the dropdown. The whole row is the button that opens the notification. */
function DropdownItem({ notification, onOpen, isOpening }) {
  const {
    title,
    message,
    module,
    priority,
    created_at: createdAt,
    is_read: isRead,
    is_resolved: isResolved,
    action_label: actionLabel,
  } = notification;

  const actionRequired = isActionRequired(notification);
  const priorityLabel = PRIORITY_LABEL[priority] || priority;

  const status = [
    isRead ? null : "Unread",
    isResolved ? "Resolved" : null,
    priorityLabel ? `${priorityLabel} priority` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        disabled={isOpening}
        aria-label={`${title}${status ? ` (${status})` : ""}`}
        className={`relative flex w-full gap-2.5 px-4 py-3 text-left transition hover:bg-gray-50 focus:bg-gray-50 focus:outline-none disabled:opacity-60 ${
          isRead ? "" : "bg-[#0A0082]/[0.03]"
        }`}
      >
        <span
          className={`absolute bottom-2 left-0 top-2 w-0.5 rounded-r ${
            isResolved ? "bg-gray-200" : PRIORITY_ACCENT[priority] || PRIORITY_ACCENT.LOW
          }`}
          aria-hidden="true"
        />

        {/* Unread dot — paired with the bold title and the accessible label, never colour alone. */}
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isRead ? "bg-transparent" : "bg-[#0A0082]"}`}
          aria-hidden="true"
        />

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-xs ${
              isRead ? "font-medium text-gray-700" : "font-semibold text-gray-900"
            }`}
          >
            {title}
          </span>

          <span className="mt-0.5 line-clamp-2 block text-[11px] text-gray-500">{message}</span>

          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-gray-400">
            <ModuleBadge module={module} />
            {priorityLabel ? <span aria-hidden="true">{priorityLabel}</span> : null}
            <span>{formatDateTime(createdAt)}</span>
          </span>

          {isResolved ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Resolved
            </span>
          ) : actionRequired && actionLabel ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#0A0082]">
              {actionLabel} <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

/**
 * The one global AP notification bell, in the shared app header.
 *
 * The header is global, but these notifications are an Accounts Payable feature, so the bell
 * only renders — and its queries only run — inside /accounts-payable. That keeps the app from
 * calling an AP endpoint on behalf of users who are not in AP at all; it is scoping, not an
 * authorization check, which stays with the backend.
 *
 * The badge shows the backend's `unread_count` verbatim — the count across EVERY AP module,
 * never scoped to the page the user is on — and is hidden entirely at zero.
 *
 * Clicking it opens a compact dropdown of the latest notifications from the same unified
 * stream (and the same cache entry) the dashboard and the Notification Center read. The
 * dropdown only navigates: opening an item marks it read and goes to its business page; no
 * business action is performed from here.
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  const isAccountsPayable = location.pathname.startsWith("/accounts-payable");

  const { unreadCount } = useUnreadNotificationCount({ enabled: isAccountsPayable });

  // Held back until the dropdown is opened, so the header costs one small count request.
  const { notifications, isLoading, isError, refetch } = useNotifications(
    DEFAULT_NOTIFICATION_FILTERS,
    { enabled: isAccountsPayable && isOpen },
  );

  const close = useCallback(() => setIsOpen(false), []);

  const { openNotification, openingId } = useOpenNotification({
    onNavigate: close,
    // A notification with no business page still leads somewhere useful from the bell.
    fallbackRoute: AP_ROUTES.NOTIFICATIONS,
  });

  // Close on navigation, on Escape (returning focus to the bell) and on an outside click.
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [isOpen]);

  if (!isAccountsPayable) return null;

  const hasUnread = unreadCount > 0;
  const latest = notifications.slice(0, DROPDOWN_LIMIT);

  const viewAll = () => {
    setIsOpen(false);
    navigate(AP_ROUTES.NOTIFICATIONS);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 rounded-lg"
        title="Notifications"
        aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
      >
        <Bell className="h-5 w-5" />

        {hasUnread ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#ff3d72] px-1 text-[10px] font-bold leading-none text-white">
            {formatBadge(unreadCount)}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            <p className="text-[11px] text-gray-500">
              {hasUnread ? `${unreadCount} unread across AP` : "No unread notifications"}
            </p>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {isError ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-gray-500">Unable to load notifications right now.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-2 text-xs font-semibold text-[#0A0082] hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="space-y-2 p-4" role="status" aria-label="Loading notifications">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : latest.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <BellOff className="mx-auto h-6 w-6 text-gray-300" aria-hidden="true" />
                <p className="mt-2 text-xs text-gray-500">No notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100" aria-label="Latest notifications">
                {latest.map((notification) => (
                  <DropdownItem
                    key={notification.id}
                    notification={notification}
                    onOpen={openNotification}
                    isOpening={openingId === notification.id}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2.5 text-center">
            <button
              type="button"
              onClick={viewAll}
              className="text-xs font-semibold text-[#0A0082] hover:underline"
            >
              View all notifications
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
