// src/pages/Projects/MyWork/components/WorkItemCard.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Check, ChevronDown, MoreHorizontal, Clock, AlertTriangle, Flame
} from "lucide-react";
import { useProjectStatuses } from "../hooks/useMyWork";
import {
  TYPE_CONFIG, PRIORITY_CONFIG, BUG_STATUSES,
  formatDueDate, dueDateColor, isStale, isDoneStatus
} from "../utils/myWorkUtils";

// ── Status dropdown ────────────────────────────────────────────────────────────
const StatusDropdown = ({ item, onStatusChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Only fetch project statuses for non-bug items
  const { data: projectStatuses } = useProjectStatuses(
    item.type !== "BUG" ? item.projectId : null
  );

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const statuses = item.type === "BUG" ? BUG_STATUSES : (projectStatuses || []);

  const handleSelect = (status) => {
    setOpen(false);
    if (item.type === "BUG") {
      onStatusChange({ type: "BUG", id: item.id, status: status.name, statusName: status.label });
    } else {
      onStatusChange({
        type:       item.type,
        id:         item.id,
        statusId:   status.id,
        statusName: status.name,
      });
    }
  };

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200
          bg-white text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50
          transition-colors max-w-[130px] truncate"
      >
        <span className="truncate">{item.statusName}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {open && statuses.length > 0 && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200
          rounded-xl shadow-xl z-50 min-w-[160px] max-h-56 overflow-y-auto py-1">
          {statuses.map((s) => {
            const name  = item.type === "BUG" ? s.label : s.name;
            const isCurrent = item.type === "BUG"
              ? item.bugStatus === s.name
              : item.statusId === s.id;
            return (
              <button
                key={item.type === "BUG" ? s.name : s.id}
                onClick={(e) => { e.stopPropagation(); handleSelect(s); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left
                  hover:bg-slate-50 transition-colors
                  ${isCurrent ? "text-indigo-600 font-semibold bg-indigo-50" : "text-slate-700"}`}
              >
                {isCurrent && <Check className="w-3 h-3" />}
                {!isCurrent && <span className="w-3" />}
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Overflow menu ──────────────────────────────────────────────────────────────
const OverflowMenu = ({ item, onPriorityChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600
          hover:bg-slate-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200
          rounded-xl shadow-xl z-50 min-w-[160px] py-1">
          <div className="px-3 py-1.5 text-xs text-slate-400 font-medium uppercase tracking-wide">
            Change Priority
          </div>
          {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onPriorityChange?.(key);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left
                hover:bg-slate-50 transition-colors
                ${item.priority === key ? "font-semibold" : "text-slate-700"}`}
            >
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
              {item.priority === key && <Check className="w-3 h-3 text-indigo-600 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main card ─────────────────────────────────────────────────────────────────
export default function WorkItemCard({ item, onStatusChange, onMarkDone, onClick, readOnly }) {
  const typeConfig     = TYPE_CONFIG[item.type]     || TYPE_CONFIG.TASK;
  const priorityConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.MEDIUM;
  const dueDateLabel   = formatDueDate(item.dueDate);
  const dueDateClass   = dueDateColor(item.urgency);
  const stale          = isStale(item);
  const done           = isDoneStatus(item.statusName);

  return (
    <div
      onClick={() => onClick?.(item)}
      className={`
        group flex items-center gap-3 px-4 py-3
        border-b border-slate-100 last:border-0
        cursor-pointer transition-colors duration-100
        hover:bg-slate-50/70
        ${done ? "opacity-50" : ""}
      `}
    >
      {/* Type badge */}
      <span className={`
        flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-semibold
        ${typeConfig.bg} ${typeConfig.color} border ${typeConfig.border}
      `}>
        {typeConfig.label}
      </span>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-sm font-medium text-slate-800 truncate ${done ? "line-through" : ""}`}>
            {item.title}
          </span>
          {stale && (
            <span title="No update in 5+ days" className="flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </span>
          )}
          {item.urgency === "BLOCKED" && (
            <span title="Blocked" className="flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            </span>
          )}
          {item.priority === "CRITICAL" && (
            <span title="Critical priority" className="flex-shrink-0">
              <Flame className="w-3.5 h-3.5 text-red-500" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
          <span className="truncate">{item.projectName}</span>
          {item.sprintName && (
            <>
              <span>·</span>
              <span className="truncate">{item.sprintName}</span>
            </>
          )}
          {dueDateLabel && (
            <>
              <span>·</span>
              <span className={dueDateClass}>{dueDateLabel}</span>
            </>
          )}
          {item.daysOverdue > 0 && (
            <span className="text-red-500 font-medium">
              {item.daysOverdue}d overdue
            </span>
          )}
        </div>
      </div>

      {/* Priority badge */}
      <span className={`
        flex-shrink-0 hidden sm:inline-flex items-center px-2 py-0.5 rounded-md
        text-xs font-semibold ${priorityConfig.bg} ${priorityConfig.color}
      `}>
        {priorityConfig.label}
      </span>

      {/* Quick actions — visible on hover and always for touch */}
      {!readOnly && (
        <div className="flex items-center gap-1.5 flex-shrink-0
          opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <StatusDropdown item={item} onStatusChange={onStatusChange} />

          <button
            onClick={(e) => { e.stopPropagation(); onMarkDone?.(item); }}
            title="Mark as done"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
              text-emerald-700 bg-emerald-50 border border-emerald-200
              hover:bg-emerald-100 transition-colors"
          >
            <Check className="w-3 h-3" />
            Done
          </button>

          <OverflowMenu item={item} />
        </div>
      )}

      {/* Readonly assignee info (for manager section) */}
      {readOnly && item.assigneeName && (
        <span className="flex-shrink-0 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
          → {item.assigneeName}
        </span>
      )}
    </div>
  );
}