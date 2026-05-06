// src/pages/Projects/MyWork/components/SnapshotBar.jsx
import React from "react";
import {
  AlertCircle, Calendar, CalendarClock, LayoutList, Ban
} from "lucide-react";
import { useMyWorkStore } from "../hooks/myWorkStore";

const CHIPS = [
  {
    key:   "overdue",
    label: "Overdue",
    icon:  AlertCircle,
    activeColor: "bg-red-600 text-white border-red-600",
    countColor:  "text-red-600",
    hoverColor:  "hover:border-red-300 hover:bg-red-50",
    iconColor:   "text-red-500",
  },
  {
    key:   "dueToday",
    label: "Due Today",
    icon:  Calendar,
    activeColor: "bg-orange-500 text-white border-orange-500",
    countColor:  "text-orange-600",
    hoverColor:  "hover:border-orange-300 hover:bg-orange-50",
    iconColor:   "text-orange-500",
  },
  {
    key:   "dueThisWeek",
    label: "This Week",
    icon:  CalendarClock,
    activeColor: "bg-amber-500 text-white border-amber-500",
    countColor:  "text-amber-600",
    hoverColor:  "hover:border-amber-300 hover:bg-amber-50",
    iconColor:   "text-amber-500",
  },
  {
    key:   "allActive",
    label: "All Active",
    icon:  LayoutList,
    activeColor: "bg-indigo-600 text-white border-indigo-600",
    countColor:  "text-indigo-600",
    hoverColor:  "hover:border-indigo-300 hover:bg-indigo-50",
    iconColor:   "text-indigo-500",
  },
  {
    key:   "blocked",
    label: "Blocked",
    icon:  Ban,
    activeColor: "bg-slate-700 text-white border-slate-700",
    countColor:  "text-slate-700",
    hoverColor:  "hover:border-slate-300 hover:bg-slate-50",
    iconColor:   "text-slate-500",
  },
];

const countMap = (snapshot) => ({
  overdue:     snapshot?.overdueCount    ?? 0,
  dueToday:    snapshot?.dueTodayCount   ?? 0,
  dueThisWeek: snapshot?.dueThisWeekCount?? 0,
  allActive:   snapshot?.allActiveCount  ?? 0,
  blocked:     snapshot?.blockedCount    ?? 0,
});

export default function SnapshotBar({ snapshot }) {
  const { activeChip, setActiveChip } = useMyWorkStore();
  const counts = countMap(snapshot);

  return (
    <div className="flex gap-3 mb-6">
      {CHIPS.map(({ key, label, icon: Icon, activeColor, countColor, hoverColor, iconColor }) => {
        const isActive = activeChip === key;
        const count    = counts[key];
        const isClickable = key !== "allActive"; // "All Active" just clears filters

        return (
          <button
            key={key}
            onClick={() =>
              key === "allActive"
                ? setActiveChip(null)
                : setActiveChip(key)
            }
            className={`
              flex-1 flex flex-col items-start px-4 py-3 rounded-xl border
              transition-all duration-150 cursor-pointer text-left
              ${isActive
                ? activeColor
                : `bg-white border-slate-200 ${hoverColor}`}
            `}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <Icon
                className={`w-4 h-4 ${isActive ? "text-white opacity-80" : iconColor}`}
              />
              {isActive && (
                <span className="text-xs opacity-70 font-medium">Active</span>
              )}
            </div>
            <span
              className={`text-2xl font-bold leading-none mb-1
                ${isActive ? "text-white" : countColor}
                ${count === 0 && !isActive ? "opacity-40" : ""}
              `}
            >
              {count}
            </span>
            <span
              className={`text-xs font-medium
                ${isActive ? "text-white opacity-80" : "text-slate-500"}
              `}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}