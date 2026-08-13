import React from "react";
import { GripVertical } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";

const matchTone = (composite) => {
  if (composite == null) return "bg-slate-100 text-slate-500 border-slate-200";
  if (composite >= 70) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (composite >= 50) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-rose-50 text-rose-700 border-rose-100";
};

export default function PipelineCandidateCard({ card, onDragStart, onClick, onViewDetails }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border border-slate-200"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
          {card.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold truncate text-slate-900">{card.name}</div>
          <div className="text-[10.5px] truncate text-slate-400">{card.role}</div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.();
          }}
          title="View full candidate details"
          className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
        >
          <GripVertical size={13} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <Badge className={`${matchTone(card.composite)} font-semibold px-2 py-0.5 text-[11px]`}>
          {card.composite != null ? `${card.composite}% match` : "Not scored"}
        </Badge>
      </div>
    </div>
  );
}
