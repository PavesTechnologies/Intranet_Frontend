import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/pages/expense-management/api/expenseReportsApi";
import { useApprovalWebSocket } from "@/pages/expense-management/approval-engine/websocket/ApprovalWebSocketProvider";
import { showStatusToast } from "@/components/toastfy/toast";

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const NOTIFICATIONS_KEY = "xmsNotifications";
export const UNREAD_KEY = ["xmsNotificationsUnread"];

const hasToken = () => {
  try {
    return !!localStorage.getItem("token");
  } catch {
    return false;
  }
};

/** Unread badge count. Polls slowly as a fallback; live pushes refresh it instantly. */
export const useUnreadCount = () =>
  useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => notificationService.unreadCount().then(unwrap).then((d) => d?.count ?? 0),
    enabled: hasToken(),
    refetchInterval: 120_000,
    staleTime: 30_000,
  });

/** PageResponse<NotificationResponse> for the given filters (see notificationService.search). */
export const useNotificationList = (params, { enabled = true } = {}) =>
  useQuery({
    queryKey: [NOTIFICATIONS_KEY, params],
    queryFn: () => notificationService.search(params).then(unwrap),
    enabled: enabled && hasToken(),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });

const invalidateAll = (qc) => {
  qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
  qc.invalidateQueries({ queryKey: UNREAD_KEY });
};

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onSettled: () => invalidateAll(qc),
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead().then(unwrap),
    onSettled: () => invalidateAll(qc),
  });
};

/**
 * Live updates: every pushed notification refreshes the badge and lists; action-required ones also
 * pop a toast. Mount once (the header bell does).
 */
export const useNotificationLiveSync = () => {
  const qc = useQueryClient();
  const ws = useApprovalWebSocket();
  useEffect(() => {
    if (!ws?.subscribe) return undefined;
    return ws.subscribe("notification", (n) => {
      invalidateAll(qc);
      if (n?.category === "ACTION_REQUIRED" && n?.title) showStatusToast(n.title, "info");
    });
  }, [ws, qc]);
};
