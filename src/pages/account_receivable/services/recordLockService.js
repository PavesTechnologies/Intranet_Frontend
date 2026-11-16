import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AR_BASE_URL;

const RECORD_LOCKS_URL = `${BASE_URL}/api/record-locks`;

export const RECORD_LOCK_RESOURCE = {
  BILLING_CONFIGURATION: "BILLING_CONFIGURATION",
  INVOICE: "INVOICE",
};

export const RECORD_LOCK_ACTION = {
  EDIT: "EDIT",
  APPROVAL: "APPROVAL",
};

const RESOURCE_LABELS = {
  [RECORD_LOCK_RESOURCE.BILLING_CONFIGURATION]: "billing configuration",
  [RECORD_LOCK_RESOURCE.INVOICE]: "invoice",
};

export const getRecordLockResourceLabel = (resourceType) => RESOURCE_LABELS[resourceType] || "record";

const recordLockUrl = (resourceType, resourceId) =>
  `${RECORD_LOCKS_URL}/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}`;

// The backend identifies the lock owner from the UMS JWT that axiosInstance
// attaches — no user id / username / display name is ever sent from here.

// Lock payloads may arrive bare, wrapped in { data }, or (on a 409) nested
// under { lock } / { details } next to a { message }. Pick the object that
// actually carries the lock fields.
const LOCK_FIELDS = ["locked", "lockedByUsername", "lockedByDisplayName", "currentUser", "expiresAt"];

const findLockPayload = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  const candidates = [payload.data, payload.lock, payload.details, payload.data?.data, payload];
  return candidates.find((c) => c && typeof c === "object" && LOCK_FIELDS.some((f) => f in c)) || {};
};

// lockedByUserId is deliberately dropped — the UI never needs it.
export const normalizeRecordLock = (payload) => {
  const raw = findLockPayload(payload);
  return {
    isLocked: Boolean(raw.locked ?? raw.isLocked),
    isCurrentUser: Boolean(raw.currentUser ?? raw.isCurrentUser),
    resourceId: raw.resourceId ? String(raw.resourceId) : null,
    resourceType: raw.resourceType || null,
    lockedByUsername: raw.lockedByUsername || null,
    lockedByDisplayName: raw.lockedByDisplayName || null,
    actionType: raw.actionType || null,
    acquiredAt: raw.acquiredAt || null,
    expiresAt: raw.expiresAt || null,
  };
};

export const getRecordLockOwnerName = (lock) => lock?.lockedByDisplayName || lock?.lockedByUsername || null;

const getBackendMessage = (data) => {
  if (!data) return null;
  if (typeof data === "string") return data.trim() || null;
  const message = data.message || data.detail || data.error || data.data?.message;
  return typeof message === "string" && message.trim() ? message.trim() : null;
};

// The backend's 409 message is preferred verbatim. Only when it sends none is
// a sentence built — still from the backend-reported owner and action.
export const getRecordLockConflictMessage = (data, resourceType) => {
  const backendMessage = getBackendMessage(data);
  if (backendMessage) return backendMessage;

  const lock = normalizeRecordLock(data);
  const owner = getRecordLockOwnerName(lock) || "another user";
  const verb = lock.actionType === RECORD_LOCK_ACTION.APPROVAL ? "reviewed" : "edited";
  return `This ${getRecordLockResourceLabel(resourceType)} is currently being ${verb} by ${owner}.`;
};

export const getRecordLockErrorMessage = (error, resourceType) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const label = getRecordLockResourceLabel(resourceType);

  if (status === 409) return getRecordLockConflictMessage(data, resourceType);
  if (status === 401 || error?.isSessionExpired) return "Your session has expired. Please log in again.";
  if (status === 403) return getBackendMessage(data) || `You are not authorized to perform this action on this ${label}.`;
  if (status === 404) return getBackendMessage(data) || `This ${label} no longer exists.`;
  return getBackendMessage(data) || error?.message || `Unable to lock this ${label} right now. Please try again.`;
};

// Acquire and release for the same record are chained so a release from one
// screen can never land after (and so cancel) the next screen's acquire.
const lockQueues = new Map();

const runSerialized = (key, task) => {
  const previous = lockQueues.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  lockQueues.set(key, next);
  next
    .finally(() => {
      if (lockQueues.get(key) === next) lockQueues.delete(key);
    })
    .catch(() => {});
  return next;
};

export const acquireRecordLock = (resourceType, resourceId, actionType) =>
  runSerialized(`${resourceType}:${resourceId}`, async () => {
    const response = await api.post(recordLockUrl(resourceType, resourceId), { actionType });
    return normalizeRecordLock(response?.data);
  });

export const getRecordLockStatus = async (resourceType, resourceId) => {
  const response = await api.get(recordLockUrl(resourceType, resourceId));
  return normalizeRecordLock(response?.data);
};

export const heartbeatRecordLock = async (resourceType, resourceId) => {
  const response = await api.put(`${recordLockUrl(resourceType, resourceId)}/heartbeat`);
  return normalizeRecordLock(response?.data);
};

export const releaseRecordLock = (resourceType, resourceId) =>
  runSerialized(`${resourceType}:${resourceId}`, () => api.delete(recordLockUrl(resourceType, resourceId)));

// Page unload (refresh / tab close) can cancel an in-flight XHR, so the
// release goes out as a keepalive fetch instead. It carries the same bearer
// token the axios request interceptor reads. Best effort only — the backend's
// lock expiry is the final safety net.
export const releaseRecordLockOnUnload = (resourceType, resourceId) => {
  try {
    const token = localStorage.getItem("token");
    fetch(recordLockUrl(resourceType, resourceId), {
      method: "DELETE",
      keepalive: true,
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  } catch {
    // Nothing more can be done while the page is unloading.
  }
};
