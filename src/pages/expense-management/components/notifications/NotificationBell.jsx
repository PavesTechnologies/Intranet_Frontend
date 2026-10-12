import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import NotificationItem from "./NotificationItem";
import { useMarkAllRead, useMarkRead, useNotificationList, useNotificationLiveSync, useUnreadCount } from "./useNotifications";

export const NOTIFICATION_CENTER_PATH = "/expense-management/activity/notifications";

/**
 * Global header bell: unread badge, a dropdown of the latest notifications, mark-all-read, and a
 * link to the full Notification Center. Also hosts the live WebSocket sync (mounted once, app-wide).
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useNotificationLiveSync();
  const { data: unread = 0 } = useUnreadCount();
  const { data, isLoading } = useNotificationList({ status: "all", page: 0, size: 8 }, { enabled: open });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openNotification = (n) => {
    if (!n.read) markRead.mutate(n.notificationId);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const items = data?.content || [];
  const badge = unread > 99 ? "99+" : unread;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff3d72] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-[11px] text-slate-500">{unread ? `${unread} unread` : "You're all caught up"}</p>
            </div>
            <button
              type="button"
              disabled={!unread || markAll.isPending}
              onClick={() => markAll.mutate()}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>

          <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-10 text-center text-xs text-slate-400">Loading…</p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
                <Inbox className="h-6 w-6 text-slate-300" />
                <p className="text-xs text-slate-400">No notifications yet.</p>
              </div>
            ) : (
              items.map((n) => <NotificationItem key={n.notificationId} notification={n} onOpen={openNotification} compact />)
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate(NOTIFICATION_CENTER_PATH);
            }}
            className="block w-full border-t border-slate-100 px-4 py-2.5 text-center text-xs font-semibold text-indigo-700 hover:bg-slate-50"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
