import React from "react";
import PipelineCandidateCard from "./PipelineCandidateCard";
import { PIPELINE_STAGE_COLOR } from "../constants/pipelineConstants";

export default function PipelineColumn({ stage, cards, onDragStart, onDrop, onCardClick }) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="rounded-2xl p-2.5 shrink-0 bg-slate-100"
      style={{ width: 250 }}
    >
      <div className="flex items-center justify-between px-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: PIPELINE_STAGE_COLOR[stage] }} />
          <span className="text-[12.5px] font-bold text-slate-900">{stage}</span>
        </div>
        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-white text-slate-400">{cards.length}</span>
      </div>
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
        {cards.map((card) => (
          <PipelineCandidateCard
            key={card.id}
            card={card}
            onDragStart={() => onDragStart(card.id)}
            onClick={() => onCardClick(card)}
          />
        ))}
        {cards.length === 0 && <div className="text-center text-[11px] py-6 text-slate-400">Drop candidates here</div>}
      </div>
    </div>
  );
}
