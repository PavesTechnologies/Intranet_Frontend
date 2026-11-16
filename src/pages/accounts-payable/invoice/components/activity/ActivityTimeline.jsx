import { useState } from "react";
import { Bot, ChevronDown, User } from "lucide-react";
import { formatTime } from "../../../utils/formatters";
import { ACTIVITY_CATEGORY_LABEL } from "../../utils/invoiceActivityEvents";
import { BADGE_BASE, CATEGORY_ICON, TONE_STYLES } from "./activityStyles";

/**
 * Reusable, presentational activity timeline: date-grouped, chronological, with per-item
 * expand/collapse. Data shaping (labels, grouping, filtering) happens in the caller.
 *
 * @param {{
 *   groups: Array<{key: string, label: string, items: Array<object>}>,
 *   renderDetails?: (item: object) => import("react").ReactNode,
 * }} props
 */
export default function ActivityTimeline({ groups, renderDetails }) {
  const [expanded, setExpanded] = useState(() => new Set());

  const toggle = (id) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{group.label}</h4>
          <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-gray-200">
            {group.items.map((item) => (
              <ActivityTimelineItem
                key={item.id}
                item={item}
                isExpanded={expanded.has(item.id)}
                onToggle={renderDetails ? () => toggle(item.id) : undefined}
                details={renderDetails && expanded.has(item.id) ? renderDetails(item) : null}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function ActivityTimelineItem({ item, isExpanded, onToggle, details }) {
  const tone = TONE_STYLES[item.tone] || TONE_STYLES.neutral;
  const CategoryIcon = CATEGORY_ICON[item.category] || CATEGORY_ICON.other;
  const ActorIcon = item.actor.isSystem ? Bot : User;
  const detailsId = `${item.id}-details`;
  const count = item.occurrences?.length || 1;

  return (
    <li className="relative flex gap-3 rounded-lg py-2 pr-1">
      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${tone.dot}`}>
        <CategoryIcon className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
            <span className={`${BADGE_BASE} ${tone.badge}`}>{item.statusLabel}</span>
            {count > 1 && <span className={`${BADGE_BASE} bg-gray-50 text-gray-600 ring-gray-200`}>×{count}</span>}
          </div>
          <time className="shrink-0 text-xs tabular-nums text-gray-500" dateTime={item.timestamp || undefined}>
            {formatTime(item.timestamp)}
          </time>
        </div>

        {item.description && <p className="mt-0.5 text-sm text-gray-600">{item.description}</p>}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <ActorIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-gray-700">{item.actor.name}</span>
            {item.actor.isSystem && <span className="text-gray-400">· Automated</span>}
          </span>
          <span className="text-gray-400">{ACTIVITY_CATEGORY_LABEL[item.category] || ACTIVITY_CATEGORY_LABEL.other}</span>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isExpanded}
              aria-controls={detailsId}
              className="ml-auto inline-flex items-center gap-0.5 rounded px-1 font-medium text-[#0A0082] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40"
            >
              {isExpanded ? "Hide details" : "View details"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          )}
        </div>

        {isExpanded && details && (
          <div id={detailsId} className="mt-2">
            {details}
          </div>
        )}
      </div>
    </li>
  );
}
