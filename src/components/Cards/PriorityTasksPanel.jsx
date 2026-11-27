import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Flame } from "lucide-react";
import AppCard from "./AppCard";
import { useMyWorkData } from "../../pages/Projects/MyWork/hooks/useMyWork";
import {
  TYPE_CONFIG,
  PRIORITY_CONFIG,
  isDoneStatus,
  formatDueDate,
} from "../../pages/Projects/MyWork/utils/myWorkUtils";

const URGENCY_RANK = { OVERDUE: 0, DUE_TODAY: 1, DUE_THIS_WEEK: 3 };
const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const MAX_ROWS = 5;

// Left accent + due-label colour per urgency; priority decides it when not time-critical.
const accentFor = (item) => {
  if (item.urgency === "OVERDUE") return { bar: "bg-red-500", due: "text-red-600 font-semibold" };
  if (item.urgency === "DUE_TODAY") return { bar: "bg-orange-500", due: "text-orange-600 font-semibold" };
  if (item.priority === "CRITICAL") return { bar: "bg-red-400", due: "text-[#78716C]" };
  if (item.priority === "HIGH") return { bar: "bg-orange-400", due: "text-[#78716C]" };
  return { bar: "bg-amber-400", due: "text-amber-600" };
};

/** Open items that need attention: overdue, due soon, or critical/high priority. */
function pickPriorityItems(data) {
  const all = (data?.projects || []).flatMap((g) =>
    (g.items || []).map((i) => ({ ...i, projectName: i.projectName || g.projectName })),
  );
  return all
    .filter((i) => !isDoneStatus(i.statusName))
    .filter((i) => i.urgency in URGENCY_RANK || i.priority === "CRITICAL" || i.priority === "HIGH")
    .sort((a, b) => {
      // time pressure first (overdue, today), then priority, then this-week, then due date
      const ua = URGENCY_RANK[a.urgency] ?? 2;
      const ub = URGENCY_RANK[b.urgency] ?? 2;
      if (ua !== ub) return ua - ub;
      const pa = PRIORITY_RANK[a.priority] ?? 9;
      const pb = PRIORITY_RANK[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return new Date(a.dueDate || 8.64e15) - new Date(b.dueDate || 8.64e15);
    });
}

function TaskRow({ item, onOpen }) {
  const type = TYPE_CONFIG[item.type];
  const prio = PRIORITY_CONFIG[item.priority];
  const accent = accentFor(item);
  const due = formatDueDate(item.dueDate);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-[#EEF0F7] bg-white py-2.5 pl-4 pr-3 text-left transition hover:-translate-y-0.5 hover:border-[#D9DCEC] hover:shadow-[0_8px_18px_-12px_rgba(10,23,78,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]"
      >
        <span className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {type && (
              <span className={`shrink-0 rounded px-1.5 py-px text-[10px] font-semibold ${type.bg} ${type.color}`}>
                {type.label}
              </span>
            )}
            <p className="truncate text-[13px] font-semibold text-[#0A174E]">{item.title || "Untitled"}</p>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-[#78716C]">
            {item.projectName}
            {item.statusName ? ` · ${item.statusName}` : ""}
            {due ? <span className={`ml-1 ${accent.due}`}>· {due}</span> : null}
          </p>
        </div>
        {prio && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${prio.bg} ${prio.color}`}>
            {prio.label}
          </span>
        )}
        <ArrowRight size={13} className="shrink-0 text-[#C4C0BC] transition group-hover:translate-x-0.5 group-hover:text-[#FF3D72]" />
      </button>
    </li>
  );
}

function Skeleton() {
  return (
    <ul className="space-y-2 animate-pulse">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 rounded-xl border border-[#EEF0F7] p-3">
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/3 rounded bg-[#EEF0F7]" />
            <div className="h-2.5 w-1/3 rounded bg-[#EEF0F7]" />
          </div>
          <div className="h-5 w-14 rounded-full bg-[#EEF0F7]" />
        </li>
      ))}
    </ul>
  );
}

export default function PriorityTasksPanel({ userId }) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMyWorkData(userId);
  const items = pickPriorityItems(data);
  const overdue = items.filter((i) => i.urgency === "OVERDUE").length;
  const dueToday = items.filter((i) => i.urgency === "DUE_TODAY").length;
  const openMyWork = () => navigate("/my-work");

  return (
    <AppCard
      density="comfortable"
      renderHeader={() => (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="h-1 w-6 shrink-0 rounded bg-gradient-to-r from-[#0A0082] to-[#FF3D72]" />
            <span className="font-heading text-sm font-semibold text-[#0A174E]">Priority Tasks</span>
            {!isLoading && overdue > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                <AlertTriangle size={11} /> {overdue} overdue
              </span>
            )}
            {!isLoading && dueToday > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
                <Flame size={11} /> {dueToday} due today
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={openMyWork}
            className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#0A0082] transition-colors hover:text-[#FF3D72]"
          >
            {items.length > MAX_ROWS ? `View all ${items.length}` : "My Work"} <ArrowRight size={12} strokeWidth={2.5} />
          </button>
        </div>
      )}
    >
      {isLoading ? (
        <Skeleton />
      ) : isError ? (
        <p className="py-2 text-xs text-[#A8A29E]">Couldn&apos;t load your tasks right now.</p>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50/70 px-3 py-2.5">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <p className="text-xs text-emerald-800">
            <span className="font-semibold">All caught up.</span> Nothing overdue, due soon or high priority.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, MAX_ROWS).map((item) => (
            <TaskRow key={`${item.type}-${item.id}`} item={item} onOpen={openMyWork} />
          ))}
        </ul>
      )}
    </AppCard>
  );
}
