import { useCallback, useEffect, useRef, useState } from "react";
import { showStatusToast } from "../../../components/toastfy/toast";
import { notifyRecordLockAvailable, notifyRecordLockConflict } from "../components/common/RecordLockNotice";
import {
  acquireRecordLock,
  getRecordLockConflictMessage,
  getRecordLockErrorMessage,
  getRecordLockStatus,
  heartbeatRecordLock,
  normalizeRecordLock,
  releaseRecordLock,
  releaseRecordLockOnUnload,
} from "../services/recordLockService";

// Comfortably below the backend lock expiry.
const HEARTBEAT_INTERVAL_MS = 30_000;
// Read-only screens periodically check status every 12 seconds (10-15s interval)
// while active and on window focus/tab visibility change.
const STATUS_REFRESH_INTERVAL_MS = 12_000;

const NO_LOCK = normalizeRecordLock(null);

const buildConflict = (resourceType, resourceId, data) => ({
  ...normalizeRecordLock(data),
  resourceType,
  resourceId: String(resourceId),
  message: getRecordLockConflictMessage(data, resourceType),
});

export const getLogicalLockKey = (resourceType, resourceId, lockData) => {
  if (!lockData || !lockData.isLocked || lockData.isCurrentUser) {
    return `unlocked:${resourceType}:${resourceId}`;
  }
  const owner = lockData.lockedByDisplayName || lockData.lockedByUsername || "other";
  const action = lockData.actionType || "LOCKED";
  return `locked:${resourceType}:${resourceId}:${action}:${owner}`;
};

// Wraps the backend record-lock API for one screen. The backend is the source
// of truth: acquire() (POST) is the only thing that grants exclusivity, and a
// 409 from it is the authoritative conflict. checkStatus()/watchResourceId (GET)
// are informational only and never take a lock. Each hook instance holds at most one lock and runs at
// most one heartbeat timer; the lock is released on release(), on unmount, and
// (best effort) on page unload. Nothing is persisted across page loads.
export default function useRecordLock(resourceType, { watchResourceId = null } = {}) {
  const [lock, setLock] = useState(NO_LOCK);
  const [conflict, setConflict] = useState(null);
  const [status, setStatus] = useState(null); // last GET result, for the own-lock indicator
  const [acquiring, setAcquiring] = useState(false);
  const [lockLost, setLockLost] = useState(false);

  const heldRef = useRef(null); // { resourceId, actionType } owned by this screen
  const inFlightRef = useRef(null); // pending acquire, shared by double-clicks
  const generationRef = useRef(0); // bumped by release/unmount to void a pending acquire
  const heartbeatRef = useRef(null);
  const mountedRef = useRef(true);
  const acquireRef = useRef(null);

  // Tracks the logical key of the lock we last notified the user about in this session (prevents duplicate toasts)
  const lastNotifiedLockKeyRef = useRef(null);
  // Tracks the logical key of the last observed lock status (to detect release transitions on polling)
  const lastObservedKeyRef = useRef(null);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const dropHeldLock = useCallback(() => {
    heldRef.current = null;
    stopHeartbeat();
    if (mountedRef.current) setLock(NO_LOCK);
  }, [stopHeartbeat]);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(async () => {
      const held = heldRef.current;
      if (!held) {
        stopHeartbeat();
        return;
      }
      try {
        const refreshed = await heartbeatRecordLock(resourceType, held.resourceId);
        if (mountedRef.current && heldRef.current === held && refreshed.expiresAt) {
          setLock((prev) => ({ ...prev, expiresAt: refreshed.expiresAt }));
        }
      } catch (error) {
        if (heldRef.current !== held || !mountedRef.current) return;
        const status = error?.response?.status;

        if (status === 409) {
          // Our lock expired and another user has taken it.
          dropHeldLock();
          const lostTo = buildConflict(resourceType, held.resourceId, error.response.data);
          setConflict(lostTo);
          setLockLost(true);
          const logicalKey = getLogicalLockKey(resourceType, held.resourceId, lostTo);
          lastObservedKeyRef.current = logicalKey;
          if (lastNotifiedLockKeyRef.current !== logicalKey) {
            lastNotifiedLockKeyRef.current = logicalKey;
            notifyRecordLockConflict(lostTo);
          }
        } else if (status === 404 || status === 410) {
          // Our lock expired and nobody else holds it — take a fresh one.
          dropHeldLock();
          const result = await acquireRef.current(held.resourceId, held.actionType, { notify: false });
          if (!result.acquired && !result.cancelled && mountedRef.current) {
            setLockLost(true);
            if (result.conflict) {
              const logicalKey = getLogicalLockKey(resourceType, held.resourceId, result.conflict);
              if (lastNotifiedLockKeyRef.current !== logicalKey) {
                lastNotifiedLockKeyRef.current = logicalKey;
                notifyRecordLockConflict(result.conflict);
              }
            } else {
              showStatusToast(result.message, "error");
            }
          }
        }
        // Anything else (network blip, 5xx) is retried on the next tick; the
        // backend expiry is the safety net if this tab is gone for good.
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [resourceType, stopHeartbeat, dropHeldLock]);

  const release = useCallback(async () => {
    generationRef.current += 1;
    const held = heldRef.current;
    dropHeldLock();
    if (mountedRef.current) setLockLost(false);
    lastNotifiedLockKeyRef.current = null;
    lastObservedKeyRef.current = null;
    if (!held) return;
    try {
      await releaseRecordLock(resourceType, held.resourceId);
    } catch (error) {
      // Not user-actionable: the backend expires the lock on its own.
      console.warn("[useRecordLock] Failed to release record lock:", error);
    }
  }, [resourceType, dropHeldLock]);

  const acquire = useCallback(
    async (resourceId, actionType, { notify = true } = {}) => {
      if (!resourceId) return { acquired: false };
      const id = String(resourceId);
      const held = heldRef.current;

      // Already ours for this action — keep it and its heartbeat.
      if (held && held.resourceId === id && held.actionType === actionType) return { acquired: true };
      if (inFlightRef.current) return inFlightRef.current;

      const promise = (async () => {
        if (held && held.resourceId !== id) await release();
        const generation = generationRef.current;
        setAcquiring(true);
        try {
          const acquired = await acquireRecordLock(resourceType, id, actionType);
          if (!mountedRef.current || generationRef.current !== generation) {
            // Released or unmounted while the request was in flight — don't leak it.
            releaseRecordLock(resourceType, id).catch(() => {});
            return { acquired: false, cancelled: true };
          }
          heldRef.current = { resourceId: id, actionType };
          setLock({
            ...acquired,
            isLocked: true,
            isCurrentUser: true,
            resourceType,
            resourceId: id,
            actionType: acquired.actionType || actionType,
          });
          setConflict(null);
          setLockLost(false);
          lastObservedKeyRef.current = getLogicalLockKey(resourceType, id, { isLocked: true, isCurrentUser: true });
          lastNotifiedLockKeyRef.current = null;
          startHeartbeat();
          return { acquired: true };
        } catch (error) {
          if (!mountedRef.current) return { acquired: false, cancelled: true };
          if (error?.response?.status === 409) {
            const lockedByOther = buildConflict(resourceType, id, error.response.data);
            setConflict(lockedByOther);
            const logicalKey = getLogicalLockKey(resourceType, id, lockedByOther);
            lastObservedKeyRef.current = logicalKey;
            if (notify && lastNotifiedLockKeyRef.current !== logicalKey) {
              lastNotifiedLockKeyRef.current = logicalKey;
              notifyRecordLockConflict(lockedByOther);
            }
            return { acquired: false, conflict: lockedByOther, message: lockedByOther.message };
          }
          const message = getRecordLockErrorMessage(error, resourceType);
          // A dead session is already handled globally by axiosInstance.
          if (notify && !error?.isSessionExpired) showStatusToast(message, "error");
          return { acquired: false, error, message };
        } finally {
          inFlightRef.current = null;
          if (mountedRef.current) setAcquiring(false);
        }
      })();

      inFlightRef.current = promise;
      return promise;
    },
    [resourceType, release, startHeartbeat]
  );
  acquireRef.current = acquire;

  const checkStatus = useCallback(
    async (resourceId, { notify = true } = {}) => {
      if (!resourceId) return null;
      const id = String(resourceId);
      try {
        const current = await getRecordLockStatus(resourceType, id);
        if (!mountedRef.current) return current;
        setStatus({ ...current, resourceId: id });

        const isLockedByOther = Boolean(current.isLocked && !current.isCurrentUser);
        const logicalKey = getLogicalLockKey(resourceType, id, current);
        const prevLogicalKey = lastObservedKeyRef.current;
        lastObservedKeyRef.current = logicalKey;

        if (isLockedByOther) {
          const conflictData = buildConflict(resourceType, id, current);
          setConflict(conflictData);

          if (lastNotifiedLockKeyRef.current !== logicalKey) {
            lastNotifiedLockKeyRef.current = logicalKey;
            if (notify) {
              notifyRecordLockConflict(conflictData);
            }
          }
        } else {
          // Unlocked, expired, or our own lock: nothing is blocked.
          setConflict(null);
          if (prevLogicalKey && prevLogicalKey.startsWith("locked:")) {
            lastNotifiedLockKeyRef.current = logicalKey;
            if (notify) {
              notifyRecordLockAvailable(resourceType, id);
            }
          } else {
            lastNotifiedLockKeyRef.current = logicalKey;
          }
        }
        return current;
      } catch (error) {
        console.warn("[useRecordLock] Lock status check failed:", error);
        return null;
      }
    },
    [resourceType]
  );

  // A protected mutation answered 409. The lock status is re-read so the
  // banner and disabled actions catch up without duplicate toasts.
  const handleMutationConflict = useCallback(
    async (resourceId) => {
      const current = await checkStatus(resourceId, { notify: true });
      const held = heldRef.current;
      if (current?.isLocked && !current.isCurrentUser && held?.resourceId === String(resourceId)) {
        dropHeldLock();
        if (mountedRef.current) setLockLost(true);
      }
      return current;
    },
    [checkStatus, dropHeldLock]
  );

  // Informational status for read-only screens: on open, when the user comes
  // back to the tab, and periodically every 12 seconds. Skipped while we hold a lock.
  useEffect(() => {
    if (!watchResourceId) return undefined;
    const refresh = () => {
      if (!heldRef.current && document.visibilityState !== "hidden") {
        checkStatus(watchResourceId);
      }
    };
    refresh();
    const timer = setInterval(refresh, STATUS_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [watchResourceId, checkStatus]);

  useEffect(() => {
    mountedRef.current = true;

    const handlePageHide = () => {
      const held = heldRef.current;
      if (!held) return;
      releaseRecordLockOnUnload(resourceType, held.resourceId);
      dropHeldLock();
      // If the page comes back from the back/forward cache, the lock is gone.
      setLockLost(true);
    };
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      mountedRef.current = false;
      generationRef.current += 1;
      stopHeartbeat();
      const held = heldRef.current;
      heldRef.current = null;
      if (held) {
        releaseRecordLock(resourceType, held.resourceId).catch((error) =>
          console.warn("[useRecordLock] Failed to release record lock on unmount:", error)
        );
      }
    };
  }, [resourceType, stopHeartbeat, dropHeldLock]);

  const holds = useCallback(
    (resourceId) => Boolean(resourceId) && lock.isLocked && lock.isCurrentUser && lock.resourceId === String(resourceId),
    [lock]
  );

  const isLockedByOther = useCallback(
    (resourceId) => Boolean(conflict) && (!resourceId || conflict.resourceId === String(resourceId)),
    [conflict]
  );

  // The current user's lock on a record, whether held by this screen or
  // reported by GET status (e.g. another tab) — shown as a subtle indicator.
  const ownLockAction = useCallback(
    (resourceId) => {
      if (!resourceId) return null;
      const id = String(resourceId);
      if (lock.isLocked && lock.isCurrentUser && lock.resourceId === id) return lock.actionType;
      if (status?.resourceId === id && status.isLocked && status.isCurrentUser) return status.actionType;
      return null;
    },
    [lock, status]
  );

  return {
    lock,
    status,
    conflict,
    acquiring,
    lockLost,
    holds,
    isLockedByOther,
    ownLockAction,
    acquire,
    release,
    checkStatus,
    handleMutationConflict,
  };
}
