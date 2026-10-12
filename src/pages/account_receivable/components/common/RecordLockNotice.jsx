import { Lock } from "lucide-react";
import { toast } from "react-toastify";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { RECORD_LOCK_ACTION, RECORD_LOCK_RESOURCE } from "../../services/recordLockService";

// Module-level deduplication tracking: prevents any race conditions from triggering duplicate toasts
const activeNotificationKeys = new Map();

export const resetRecordLockNotificationCache = () => {
  activeNotificationKeys.clear();
};

export const getConflictCopy = (conflict) => {
  const isReview = conflict?.actionType === RECORD_LOCK_ACTION.APPROVAL;
  const isInvoice = conflict?.resourceType === RECORD_LOCK_RESOURCE.INVOICE;
  const rawOwner = conflict?.lockedByDisplayName || conflict?.lockedByUsername;
  const resourceLabel = isInvoice ? "invoice" : "billing configuration";

  if (isReview) {
    let owner = "Finance Manager";
    if (rawOwner && typeof rawOwner === "string" && rawOwner.trim()) {
      const trimmed = rawOwner.trim();
      if (/^finance\s*manager/i.test(trimmed)) {
        owner = trimmed;
      } else {
        owner = `Finance Manager ${trimmed}`;
      }
    }
    return {
      title: "Currently Under Review",
      message: `${owner} is currently reviewing this ${resourceLabel}.`,
      owner,
      action: "Currently Under Review",
    };
  }

  let owner = "Finance Executive";
  if (rawOwner && typeof rawOwner === "string" && rawOwner.trim()) {
    const trimmed = rawOwner.trim();
    if (/^finance\s*executive/i.test(trimmed)) {
      owner = trimmed;
    } else {
      owner = `Finance Executive ${trimmed}`;
    }
  }

  return {
    title: "Currently Being Edited",
    message: `${owner} is currently editing this ${resourceLabel}.`,
    owner,
    action: "Currently Being Edited",
  };
};

export const notifyRecordLockConflict = (conflict) => {
  if (!conflict) return;
  const { title, message } = getConflictCopy(conflict);
  const resourceType = conflict.resourceType || RECORD_LOCK_RESOURCE.BILLING_CONFIGURATION;
  const resourceId = conflict.resourceId || "global";
  const actionType = conflict.actionType || "LOCKED";
  const owner = conflict.lockedByDisplayName || conflict.lockedByUsername || "user";
  const logicalKey = `${resourceType}:${resourceId}:${actionType}:${owner}`;

  const now = Date.now();
  const lastNotifiedTime = activeNotificationKeys.get(logicalKey);
  if (lastNotifiedTime && now - lastNotifiedTime < 8000) {
    return;
  }
  activeNotificationKeys.set(logicalKey, now);

  const toastKey = `record-lock-${resourceType}-${resourceId}`;
  if (toast.isActive && toast.isActive(toastKey)) {
    return;
  }

  showStatusToast(
    <div className="flex flex-col gap-0.5 pr-1">
      <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs">
        <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span>{title}</span>
      </div>
      <p className="text-slate-600 text-[11px] leading-snug">{message}</p>
    </div>,
    "warning",
    {
      toastId: toastKey,
      autoClose: 4000,
      hideProgressBar: true,
    }
  );
};

export const notifyRecordLockAvailable = (resourceType = RECORD_LOCK_RESOURCE.BILLING_CONFIGURATION, resourceId = "") => {
  const toastKey = `record-lock-available-${resourceType}-${resourceId}`;
  if (toast.isActive && toast.isActive(toastKey)) return;
  showStatusToast("Record is available again.", "info", {
    toastId: toastKey,
    autoClose: 3000,
    hideProgressBar: true,
  });
};

// Subtle indicator for the current user's own lock — never shown as blocked.
export function RecordLockOwnIndicator({ actionType, resourceLabel = "billing configuration", className = "" }) {
  if (!actionType) return null;
  const isReview = actionType === RECORD_LOCK_ACTION.APPROVAL;
  const message = `You are currently ${isReview ? "reviewing" : "editing"} this ${resourceLabel}.`;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-xs font-medium text-[#0A0082] shadow-2xs ${className}`}
      role="status"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[#0A0082]">
        <Lock className="h-2.5 w-2.5" />
      </span>
      <span>{message}</span>
    </div>
  );
}

// Compact chip format for embedding right next to header statuses if needed
export function RecordLockChip({ conflict, className = "" }) {
  if (!conflict) return null;
  const { title } = getConflictCopy(conflict);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 shadow-2xs ${className}`}
      title={conflict.message}
    >
      <Lock className="h-3 w-3 text-amber-600 shrink-0" />
      {title}
    </span>
  );
}



