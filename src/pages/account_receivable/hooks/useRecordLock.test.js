import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import api from "../../../api/axiosInstance";
import useRecordLock from "./useRecordLock";
import { RECORD_LOCK_ACTION, RECORD_LOCK_RESOURCE } from "../services/recordLockService";
import { resetRecordLockNotificationCache } from "../components/common/RecordLockNotice";

vi.mock("../../../components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

const CONFIG_ID = "cfg-1";
const LOCK_URL = `${window.__APP_CONFIG__.AR_BASE_URL}/api/record-locks/BILLING_CONFIGURATION/${CONFIG_ID}`;

const ownLock = {
  success: true,
  message: "Lock acquired.",
  data: {
    locked: true,
    resourceId: CONFIG_ID,
    resourceType: "BILLING_CONFIGURATION",
    actionType: "EDIT",
    lockedByUserId: "u-1",
    lockedByUsername: "me@example.com",
    lockedByDisplayName: "Me",
    acquiredAt: "2026-10-09T10:00:00Z",
    expiresAt: "2026-10-09T10:05:00Z",
    currentUser: true,
  },
};

const conflictError = () => {
  const error = new Error("Request failed with status code 409");
  error.response = {
    status: 409,
    data: {
      success: false,
      message: "This billing configuration is currently being edited by John Doe.",
      data: {
        locked: true,
        resourceId: CONFIG_ID,
        actionType: "EDIT",
        lockedByUserId: "u-2",
        lockedByUsername: "john@example.com",
        lockedByDisplayName: "John Doe",
        currentUser: false,
      },
    },
  };
  return error;
};

const flush = () => act(async () => {});

describe("useRecordLock", () => {
  beforeEach(() => {
    resetRecordLockNotificationCache();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(api, "post").mockResolvedValue({ data: ownLock });
    vi.spyOn(api, "put").mockResolvedValue({ data: ownLock });
    vi.spyOn(api, "delete").mockResolvedValue({ data: { success: true } });
    vi.spyOn(api, "get").mockResolvedValue({ data: { data: { locked: false } } });
  });

  afterEach(async () => {
    // Unmount (and so release) while the api mocks are still installed; the
    // serialized release runs a tick later, so let it drain first.
    cleanup();
    vi.useRealTimers();
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.restoreAllMocks();
  });

  const render = (options) => renderHook(() => useRecordLock(RECORD_LOCK_RESOURCE.BILLING_CONFIGURATION, options));

  it("acquires with only the action type in the body and exposes the held lock", async () => {
    const { result } = render();
    let outcome;
    await act(async () => {
      outcome = await result.current.acquire(CONFIG_ID, RECORD_LOCK_ACTION.EDIT);
    });

    expect(outcome).toEqual({ acquired: true });
    expect(api.post).toHaveBeenCalledWith(LOCK_URL, { actionType: "EDIT" });
    expect(result.current.holds(CONFIG_ID)).toBe(true);
    expect(result.current.lock).toMatchObject({
      isLocked: true,
      isCurrentUser: true,
      lockedByDisplayName: "Me",
      actionType: "EDIT",
      expiresAt: "2026-10-09T10:05:00Z",
    });
    expect(result.current.lock).not.toHaveProperty("lockedByUserId");
  });

  it("sends a single acquire request for a double click", async () => {
    const { result } = render();
    await act(async () => {
      await Promise.all([
        result.current.acquire(CONFIG_ID, RECORD_LOCK_ACTION.EDIT),
        result.current.acquire(CONFIG_ID, RECORD_LOCK_ACTION.EDIT),
      ]);
    });
    await act(async () => {
      await result.current.acquire(CONFIG_ID, RECORD_LOCK_ACTION.EDIT);
    });
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it("treats 409 as a conflict carrying the backend message and owner", async () => {
    api.post.mockRejectedValueOnce(conflictError());
    const { result } = render();
    let outcome;
    await act(async () => {
      outcome = await result.current.acquire(CONFIG_ID, RECORD_LOCK_ACTION.EDIT);
    });

    expect(outcome.acquired).toBe(false);
    expect(outcome.message).toBe("This billing configuration is currently being edited by John Doe.");
    expect(result.current.holds(CONFIG_ID)).toBe(false);
    expect(result.current.isLockedByOther(CONFIG_ID)).toBe(true);
    expect(result.current.conflict).toMatchObject({ lockedByDisplayName: "John Doe", isCurrentUser: false });

    vi.advanceTimersByTime(60_000);
    await flush();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("heartbeats while held and stops after release", async () => {
    const { result } = render();
    await act(async () => {
      await result.current.acquire(CONFIG_ID, RECORD_LOCK_ACTION.EDIT);
    });

    vi.advanceTimersByTime(30_000);
    await flush();
    expect(api.put).toHaveBeenCalledWith(`${LOCK_URL}/heartbeat`);
    vi.advanceTimersByTime(30_000);
    await flush();
    expect(api.put).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.release();
    });
    expect(api.delete).toHaveBeenCalledWith(LOCK_URL);

    vi.advanceTimersByTime(90_000);
    await flush();
    expect(api.put).toHaveBeenCalledTimes(2);
  });

  it("releases the held lock on unmount", async () => {
    const { result, unmount } = render();
    await act(async () => {
      await result.current.acquire(CONFIG_ID, RECORD_LOCK_ACTION.APPROVAL);
    });
    unmount();
    await flush();
    expect(api.delete).toHaveBeenCalledWith(LOCK_URL);
  });

  it("does not call release when no lock is held", async () => {
    const { result, unmount } = render();
    await act(async () => {
      await result.current.release();
    });
    unmount();
    await flush();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("re-acquires when the heartbeat reports the lock expired", async () => {
    const expired = new Error("Not found");
    expired.response = { status: 404, data: {} };
    api.put.mockRejectedValueOnce(expired);

    const { result } = render();
    await act(async () => {
      await result.current.acquire(CONFIG_ID, RECORD_LOCK_ACTION.EDIT);
    });
    vi.advanceTimersByTime(30_000);
    await flush();
    await flush();

    expect(api.post).toHaveBeenCalledTimes(2);
    expect(result.current.holds(CONFIG_ID)).toBe(true);
    expect(result.current.lockLost).toBe(false);
  });

  it("watches lock status for read-only screens every 12s and clears the conflict once unlocked", async () => {
    api.get.mockResolvedValueOnce({ data: conflictError().response.data });
    const { result } = render({ watchResourceId: CONFIG_ID });
    await flush();
    expect(result.current.isLockedByOther(CONFIG_ID)).toBe(true);

    expect(api.post).not.toHaveBeenCalled();
    expect(result.current.conflict.message).toBe("This billing configuration is currently being edited by John Doe.");

    vi.advanceTimersByTime(12_000);
    await flush();
    expect(result.current.isLockedByOther(CONFIG_ID)).toBe(false);
  });

  it("re-reads status when the user returns to the tab", async () => {
    render({ watchResourceId: CONFIG_ID });
    await flush();
    expect(api.get).toHaveBeenCalledTimes(1);
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("reports the current user's own lock from GET status without blocking", async () => {
    api.get.mockResolvedValueOnce({ data: ownLock });
    const { result } = render({ watchResourceId: CONFIG_ID });
    await flush();
    expect(result.current.isLockedByOther(CONFIG_ID)).toBe(false);
    expect(result.current.ownLockAction(CONFIG_ID)).toBe("EDIT");
  });

  it("drops a held lock when a mutation 409 shows another owner", async () => {
    const { result } = render();
    await act(async () => {
      await result.current.acquire(CONFIG_ID, RECORD_LOCK_ACTION.EDIT);
    });
    expect(result.current.ownLockAction(CONFIG_ID)).toBe("EDIT");

    api.get.mockResolvedValueOnce({ data: conflictError().response.data });
    await act(async () => {
      await result.current.handleMutationConflict(CONFIG_ID);
    });

    expect(result.current.holds(CONFIG_ID)).toBe(false);
    expect(result.current.lockLost).toBe(true);
    expect(result.current.isLockedByOther(CONFIG_ID)).toBe(true);
    vi.advanceTimersByTime(12_000);
    await flush();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("deduplicates notifications across acquire 409 and subsequent checkStatus calls", async () => {
    const { showStatusToast } = await import("../../../components/toastfy/toast");
    api.post.mockRejectedValueOnce(conflictError());
    api.get.mockResolvedValue({ data: conflictError().response.data });

    const { result, rerender } = render();
    await act(async () => {
      await result.current.acquire(CONFIG_ID, RECORD_LOCK_ACTION.EDIT);
    });
    expect(showStatusToast).toHaveBeenCalledTimes(1);

    // Subsequent checkStatus calls (e.g. when viewOnly becomes true and watchResourceId activates)
    await act(async () => {
      await result.current.checkStatus(CONFIG_ID);
    });
    expect(showStatusToast).toHaveBeenCalledTimes(1);

    // Polling passes another 12s with same lock status
    vi.advanceTimersByTime(12_000);
    await flush();
    expect(showStatusToast).toHaveBeenCalledTimes(1);
  });

  it("notifies once when record transitions to unlocked and not on repeated polling", async () => {
    const { showStatusToast } = await import("../../../components/toastfy/toast");
    api.get.mockResolvedValueOnce({ data: conflictError().response.data });

    const { result } = render({ watchResourceId: CONFIG_ID });
    await flush();
    expect(showStatusToast).toHaveBeenCalledTimes(1);

    // Lock is released
    api.get.mockResolvedValue({ data: { data: { locked: false } } });
    vi.advanceTimersByTime(12_000);
    await flush();
    expect(showStatusToast).toHaveBeenCalledTimes(2); // 1 conflict + 1 available

    // Polling continues in unlocked state
    vi.advanceTimersByTime(12_000);
    await flush();
    expect(showStatusToast).toHaveBeenCalledTimes(2); // no extra notification
  });
});

