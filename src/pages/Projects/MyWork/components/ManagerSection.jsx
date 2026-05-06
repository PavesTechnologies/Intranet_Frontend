// src/pages/Projects/MyWork/components/ManagerSection.jsx
import React from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { useMyWorkStore } from "../hooks/myWorkStore";
import WorkItemCard from "./WorkItemCard";

export default function ManagerSection({ items, onCardClick }) {
  const { managerSectionOpen, toggleManagerSection } = useMyWorkStore();

  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3 shadow-sm">

      <button
        onClick={toggleManagerSection}
        className="w-full flex items-center justify-between px-4 py-3
          bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
      >
        <div className="flex items-center gap-2.5">
          {managerSectionOpen
            ? <ChevronDown  className="w-4 h-4 text-slate-400" />
            : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <Users className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">
            Items I'm Accountable For
          </span>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </button>

      {managerSectionOpen && items.map((item) => (
        <WorkItemCard
          key={`${item.type}-${item.id}`}
          item={item}
          readOnly
          onClick={onCardClick}
        />
      ))}
    </div>
  );
}