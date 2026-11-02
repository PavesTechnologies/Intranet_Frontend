import React from "react";
import { Ban } from "lucide-react";
import PipelineCandidateCard from "./PipelineCandidateCard";
import { PIPELINE_STAGE_COLOR, PIPELINE_STAGE_LABEL } from "../constants/pipelineConstants";

// blockedReason: while a card is dragged, why it can't be dropped here (null when it can).
// A blocked column doesn't accept the drop (no preventDefault on dragover) and says why.
export default function PipelineColumn({
  stage, cards, onDragStart, onDragEnd, onDrop, onCardClick, canDrag, blockedReason,
}) {
  return (
    <div
      onDragOver={(e) => {
        if (!blockedReason) e.preventDefault();
      }}
      onDrop={onDrop}
      className={`flex-1 min-w-[240px] shrink-0 flex flex-col bg-white ${blockedReason ? "opacity-60" : ""}`}
    >
      <div
        className="flex items-center justify-center gap-1.5 px-3 py-2 sticky top-0 z-10 border-b-2"
        style={{ backgroundColor: `${PIPELINE_STAGE_COLOR[stage]}14`, borderBottomColor: PIPELINE_STAGE_COLOR[stage] }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIPELINE_STAGE_COLOR[stage] }} />
        <span className="text-[12.5px] font-bold truncate" style={{ color: PIPELINE_STAGE_COLOR[stage] }}>
          {PIPELINE_STAGE_LABEL[stage] || stage}
        </span>
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white/70 shrink-0"
          style={{ color: PIPELINE_STAGE_COLOR[stage] }}
        >
          {cards.length}
        </span>
      </div>
      {blockedReason && (
        <div className="flex items-start gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10.5px] text-slate-600">
          <Ban size={12} className="mt-0.5 shrink-0 text-slate-400" />
          <span>{blockedReason}</span>
        </div>
      )}
      <div className="divide-y divide-slate-200 max-h-[520px] overflow-y-auto">
        {cards.map((card) => (
          <PipelineCandidateCard
            key={card.id}
            card={card}
            draggable={canDrag}
            onDragStart={() => onDragStart(card)}
            onDragEnd={onDragEnd}
            onClick={() => onCardClick(card)}
            onViewDetails={() => onCardClick(card)}
          />
        ))}
        {cards.length === 0 && (
          <div className="text-center text-[11px] py-6 text-slate-400">
            {canDrag ? "Drop candidates here" : "No candidates"}
          </div>
        )}
      </div>
    </div>
  );
}
