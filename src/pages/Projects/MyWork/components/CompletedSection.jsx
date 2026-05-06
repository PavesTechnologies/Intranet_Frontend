// src/pages/Projects/MyWork/components/CompletedSection.jsx
import React from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useMyWorkStore } from "../hooks/myWorkStore";
import { useMyWorkCompleted } from "../hooks/useMyWork";
import WorkItemCard from "./WorkItemCard";

export default function CompletedSection({ userId }) {
  const { completedOpen, toggleCompleted } = useMyWorkStore();
  const { data, isLoading } = useMyWorkCompleted(userId, completedOpen);

  const allCompleted = data?.projects?.flatMap((g) => g.items) || [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

      <button
        onClick={toggleCompleted}
        className="w-full flex items-center justify-between px-4 py-3
          bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {completedOpen
            ? <ChevronDown  className="w-4 h-4 text-slate-400" />
            : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-slate-600">Completed</span>
          <span className="text-xs text-slate-400">(last 30 days)</span>
        </div>
        {completedOpen && allCompleted.length > 0 && (
          <span className="text-xs text-slate-400 font-medium">
            {allCompleted.length} item{allCompleted.length !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {completedOpen && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading completed items…</span>
            </div>
          ) : allCompleted.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No completed items in the last 30 days
            </div>
          ) : (
            allCompleted.map((item) => (
              <WorkItemCard
                key={`${item.type}-${item.id}`}
                item={item}
                readOnly
              />
            ))
          )}
        </>
      )}
    </div>
  );
}