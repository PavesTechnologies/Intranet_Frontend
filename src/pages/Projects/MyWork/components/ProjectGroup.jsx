// src/pages/Projects/MyWork/components/ProjectGroup.jsx
import React, { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, Calendar } from "lucide-react";
import { useMyWorkStore } from "../hooks/myWorkStore";
import WorkItemCard from "./WorkItemCard";

const SHOW_BY_DEFAULT = 5;

export default function ProjectGroup({ group, onStatusChange, onMarkDone, onCardClick }) {
  const { collapsedGroups, toggleGroup } = useMyWorkStore();
  const [expanded, setExpanded] = useState(false);

  const isCollapsed = collapsedGroups.has(group.projectId);
  const items       = group.items || [];
  const visible     = expanded ? items : items.slice(0, SHOW_BY_DEFAULT);
  const hidden      = items.length - SHOW_BY_DEFAULT;

  const urgencyBadge = () => {
    if (group.urgencyFlag === "OVERDUE") return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700
        text-xs font-semibold rounded-full">
        <AlertCircle className="w-3 h-3" />
        {group.overdueCount} overdue
      </span>
    );
    if (group.urgencyFlag === "DUE_TODAY") return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700
        text-xs font-semibold rounded-full">
        <Calendar className="w-3 h-3" />
        {group.dueTodayCount} due today
      </span>
    );
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3
      shadow-sm transition-shadow hover:shadow-md">

      {/* ── Group header ────────────────────────────────────────────────────── */}
      <button
        onClick={() => toggleGroup(group.projectId)}
        className="w-full flex items-center justify-between px-4 py-3
          bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
      >
        <div className="flex items-center gap-2.5">
          {isCollapsed
            ? <ChevronRight className="w-4 h-4 text-slate-400" />
            : <ChevronDown  className="w-4 h-4 text-slate-400" />
          }
          <span className="text-sm font-semibold text-slate-800">
            {group.projectName}
          </span>
          {urgencyBadge()}
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </button>

      {/* ── Items ───────────────────────────────────────────────────────────── */}
      {!isCollapsed && (
        <>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <div className="text-2xl mb-1">✓</div>
              <p className="text-sm text-slate-400">All caught up in this project</p>
            </div>
          ) : (
            <>
              {visible.map((item) => (
                <WorkItemCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onStatusChange={onStatusChange}
                  onMarkDone={onMarkDone}
                  onClick={onCardClick}
                />
              ))}

              {/* Show more / less toggle */}
              {items.length > SHOW_BY_DEFAULT && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
                  className="w-full px-4 py-2.5 text-xs font-medium text-indigo-600
                    hover:bg-indigo-50 transition-colors border-t border-slate-100 text-left"
                >
                  {expanded
                    ? "Show less"
                    : `Show ${hidden} more item${hidden !== 1 ? "s" : ""}`
                  }
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}