import { describe, it, expect, vi, beforeEach } from "vitest";

import api from "../../../../api/axiosInstance";
import notificationService from "./notificationService";

vi.mock("../../../../api/axiosInstance", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const BASE = `${window.__APP_CONFIG__.AP_BASE_URL}/notifications`;

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { items: [], total: 0, unread_count: 0, page: 1, page_size: 20 } });
  api.patch.mockResolvedValue({ data: {} });
});

describe("notificationService.getNotifications", () => {
  it("omits module for All Modules", async () => {
    await notificationService.getNotifications({ pageSize: 25 });

    const [url, config] = api.get.mock.calls[0];
    expect(url).toBe(BASE);
    expect(config.params.module).toBeUndefined();
  });

  it("sends the backend module filter when one module is selected", async () => {
    await notificationService.getNotifications({ module: "SYSTEM_CONFIGURATION", pageSize: 25 });

    expect(api.get.mock.calls[0][1].params).toMatchObject({
      module: "SYSTEM_CONFIGURATION",
      page: 1,
      page_size: 25,
    });
  });

  it("composes module with the other backend filters", async () => {
    await notificationService.getNotifications({
      module: "PAYMENTS",
      isRead: false,
      priority: "CRITICAL",
      page: 2,
      pageSize: 25,
    });

    expect(api.get.mock.calls[0][1].params).toEqual({
      is_read: false,
      priority: "CRITICAL",
      notification_type: undefined,
      module: "PAYMENTS",
      page: 2,
      page_size: 25,
    });
  });

  it("never sends a recipient or user identity - the backend takes it from the JWT", async () => {
    await notificationService.getNotifications({
      module: "PROCUREMENT",
      recipient_user_uuid: "someone-else",
      userId: "someone-else",
    });

    const { params } = api.get.mock.calls[0][1];
    expect(Object.keys(params)).not.toEqual(
      expect.arrayContaining(["recipient_user_uuid", "user_id", "userId"]),
    );
  });
});

describe("notificationService — read-only contract", () => {
  it("uses the authenticated API client for the count and read endpoints", async () => {
    await notificationService.getUnreadCount();
    await notificationService.markRead(12);
    await notificationService.markAllRead();

    expect(api.get).toHaveBeenCalledWith(`${BASE}/unread-count`, expect.any(Object));
    expect(api.patch).toHaveBeenCalledWith(`${BASE}/12/read`, {}, expect.any(Object));
    expect(api.patch).toHaveBeenCalledWith(`${BASE}/read-all`, {}, expect.any(Object));
  });

  it("exposes no way for the frontend to create a notification", async () => {
    expect(Object.keys(notificationService).sort()).toEqual(
      ["getNotifications", "getUnreadCount", "markAllRead", "markRead"].sort(),
    );

    await notificationService.getNotifications();
    await notificationService.getUnreadCount();
    await notificationService.markRead(1);
    await notificationService.markAllRead();

    // Notifications are only ever created by the backend.
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});
