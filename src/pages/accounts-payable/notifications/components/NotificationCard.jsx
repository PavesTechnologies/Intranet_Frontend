import { ArrowRight, CheckCircle2, Clock } from "lucide-react";

import Button from "../../../../components/Button/Button";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";
import { formatDate, formatDateTime } from "../../utils/formatters";
import {
  PRIORITY_ACCENT,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  entityReference,
  isActionRequired,
  isOverdue,
} from "../constants/notifications";
import ModuleBadge from "./ModuleBadge";

/**
 * One notification row.
 *
 * Renders whatever the API returned, including a notification_type or module this build has
 * never heard of: title, message, module, priority and timestamp always show, and only the
 * extras (entity reference, action button) depend on the mapping finding something. Nothing is
 * fabricated — a missing field is simply not rendered.
 *
 * A resolved notification (`is_resolved`) is history: it keeps its place in the list but is
 * styled as done, carries a "Resolved" marker, is never flagged overdue, and offers a plain
 * "View" link instead of the backend's call to action — it never reads as pending work.
 *
 * @param {{ notification: object, actionRoute: string|null, onOpen: (n:object)=>void,
 *   isOpening?: boolean }} props
 */
export default function NotificationCard({ notification, actionRoute, onOpen, isOpening }) {
  const {
    title,
    message,
    module,
    priority,
    created_at: createdAt,
    is_read: isRead,
    is_resolved: isResolved,
    action_label: actionLabel,
    deadline,
  } = notification;

  const reference = entityReference(notification);
  const overdue = isOverdue(notification);
  const actionRequired = isActionRequired(notification);
  const buttonLabel = isResolved ? "View" : actionLabel || "Open";

  const surface = isResolved
    ? "border-gray-200 bg-gray-50/70"
    : isRead
      ? "border-gray-200 bg-white"
      : "border-[#0A0082]/20 bg-[#0A0082]/[0.03] shadow-sm";

  return (
    <article
      className={`relative overflow-hidden rounded-lg border transition ${surface}`}
      aria-label={title}
      data-resolved={isResolved ? "true" : "false"}
    >
      {/* Priority accent — the backend's priority, never re-derived from the type. A resolved
          notification's priority no longer asks for anything, so its accent is muted. */}
      <span
        className={`absolute bottom-0 left-0 top-0 w-1 ${
          isResolved ? "bg-gray-200" : PRIORITY_ACCENT[priority] || PRIORITY_ACCENT.LOW
        }`}
        aria-hidden="true"
      />

      <div className="flex flex-col gap-3 py-3 pl-4 pr-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {!isRead ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[#0A0082]"
                aria-label="Unread"
                role="img"
              />
            ) : null}

            <h3
              className={`min-w-0 break-words text-sm ${
                isRead || isResolved ? "font-medium text-gray-700" : "font-semibold text-gray-900"
              }`}
            >
              {title}
            </h3>

            {priority ? (
              <StatusPill
                label={PRIORITY_LABEL[priority] || priority}
                tone={isResolved ? "neutral" : PRIORITY_TONE[priority] || "neutral"}
              />
            ) : null}

            {isResolved ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Resolved
              </span>
            ) : null}

            {overdue ? <StatusPill label="Overdue" tone="danger" /> : null}
          </div>

          <p className="mt-1 break-words text-xs text-gray-600">{message}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
            <ModuleBadge module={module} />

            <span title={createdAt || undefined}>{formatDateTime(createdAt)}</span>

            {reference ? (
              <>
                <span aria-hidden="true">•</span>
                <span className="font-medium text-gray-500">{reference}</span>
              </>
            ) : null}

            {deadline && !isResolved ? (
              <>
                <span aria-hidden="true">•</span>
                <span
                  className={`inline-flex items-center gap-1 ${
                    overdue ? "font-semibold text-rose-600" : ""
                  }`}
                >
                  <Clock className="h-3 w-3" /> Due {formatDate(deadline)}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Only offered when the mapping found a page that exists in this app. */}
        {actionRoute ? (
          <Button
            size="small"
            variant={actionRequired && !isRead ? "primary" : "outline"}
            onClick={() => onOpen(notification)}
            loading={isOpening}
            className="shrink-0 self-start"
            aria-label={`${buttonLabel}: ${title}`}
          >
            {buttonLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </article>
  );
}
