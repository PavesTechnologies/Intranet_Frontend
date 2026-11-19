// src/pages/accounts-payable/notifications/services/notificationService.js
import api from "../../../../api/axiosInstance";

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/notifications`;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Notification Center API. Matches Backend/API_Layer/routes/notification_route.py
 * (mounted at /apm/notifications).
 *
 * Every endpoint is scoped to the AUTHENTICATED user server-side: the recipient is derived
 * from the JWT and resolved to a UMS user_uuid in the backend. No call here sends a
 * recipient_user_uuid, and none accepts one — reading or marking someone else's notification
 * is not something the client can express.
 */
export const notificationService = {
  /**
   * GET /apm/notifications
   * @param {{isRead?: boolean, priority?: string, notificationType?: string, module?: string,
   *   page?: number, pageSize?: number}} filters
   *   `isRead` false = unread only, true = read only, omitted = both.
   *   `module` narrows the one unified stream to a single AP module; omitted = All Modules.
   *   It never changes `unread_count`, which the backend always reports across every module.
   * @returns {Promise<{items:object[], total:number, unread_count:number,
   *   page:number, page_size:number}>}
   */
  getNotifications: async ({
    isRead,
    priority,
    notificationType,
    module,
    page = 1,
    pageSize = 20,
  } = {}) => {
    const res = await api.get(BASE, {
      params: {
        // Only sent when the caller actually set it — `undefined` params are dropped by
        // axios, which is what keeps "all" different from "read only".
        is_read: typeof isRead === "boolean" ? isRead : undefined,
        priority: priority || undefined,
        notification_type: notificationType || undefined,
        module: module || undefined,
        page,
        page_size: pageSize,
      },
      headers: authHeaders(),
    });
    return res.data;
  },

  /** GET /apm/notifications/unread-count — backs the header bell's badge. */
  getUnreadCount: async () => {
    const res = await api.get(`${BASE}/unread-count`, { headers: authHeaders() });
    return res.data;
  },

  /**
   * PATCH /apm/notifications/{id}/read — returns the updated NotificationDTO.
   * A 404 means the id is not this user's (or does not exist); the backend never
   * distinguishes the two, so neither does the UI.
   */
  markRead: async (notificationId) => {
    const res = await api.patch(
      `${BASE}/${notificationId}/read`,
      {},
      { headers: authHeaders() },
    );
    return res.data;
  },

  /** PATCH /apm/notifications/read-all — @returns {Promise<{updated:number, message:string}>} */
  markAllRead: async () => {
    const res = await api.patch(`${BASE}/read-all`, {}, { headers: authHeaders() });
    return res.data;
  },
};

export default notificationService;
