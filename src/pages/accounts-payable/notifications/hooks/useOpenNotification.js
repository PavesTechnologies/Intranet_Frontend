import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { getApiErrorMessage } from "../../utils/apiError";
import { resolveNotificationRoute } from "../constants/notifications";
import { useMarkNotificationRead } from "./useNotifications";

/**
 * Opening a notification — the one behaviour the header dropdown and the Notification Center
 * share: mark it read if it is unread, then go to its business page.
 *
 * The navigation is not conditional on the read succeeding — the user asked to go somewhere,
 * so a bookkeeping failure is surfaced but never blocks them. `openingId` is the row being
 * opened, which is also what stops a second click firing a duplicate read for it.
 *
 * @param {{ onNavigate?: () => void, fallbackRoute?: string }} options
 *   `onNavigate` runs just before navigating (e.g. to close the dropdown); `fallbackRoute` is
 *   where to go when the notification has no business page of its own.
 */
export default function useOpenNotification({ onNavigate, fallbackRoute } = {}) {
  const navigate = useNavigate();
  const markReadMutation = useMarkNotificationRead();

  const [openingId, setOpeningId] = useState(null);
  // State updates are async, so a synchronous guard is what really blocks a double click.
  const inFlight = useRef(false);

  const openNotification = useCallback(
    async (notification) => {
      if (inFlight.current) return;

      const route = resolveNotificationRoute(notification) || fallbackRoute || null;

      if (!notification.is_read) {
        inFlight.current = true;
        setOpeningId(notification.id);
        try {
          await markReadMutation.mutateAsync(notification.id);
        } catch (err) {
          toast.error(getApiErrorMessage(err, "Could not mark this notification as read."));
        } finally {
          inFlight.current = false;
          setOpeningId(null);
        }
      }

      if (route) {
        onNavigate?.();
        navigate(route);
      }
    },
    [fallbackRoute, markReadMutation, navigate, onNavigate],
  );

  return { openNotification, openingId };
}
