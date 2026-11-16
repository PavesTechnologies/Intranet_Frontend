import React from "react";
import { GripVertical } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";

// What happens next for this candidate. "active" = an automated step the
// system is running now (pulses); "waiting" = the next step needs a person;
// "error" = the pipeline stopped. Derived only from fields the board row
// already carries - the card refreshes on every board.candidate_updated event.
function nextStep(card) {
  const parse = String(card.parseStatus || "").toUpperCase();
  switch (card.stage) {
    case "UPLOADED":
      if (parse === "FAILED") return { label: "Resume parsing failed", tone: "error" };
      if (parse === "PARSED") return { label: "Queued for screening", tone: "active" };
      return { label: parse === "PARSING" ? "Parsing resume" : "Queued for parsing", tone: "active" };
    case "SCREENING":
      if (card.requirementsScore == null) return { label: "Requirements check", tone: "active" };
      if (card.relevanceScore == null) return { label: "Relevance check", tone: "active" };
      if (card.aiScore == null) return { label: "AI evaluation", tone: "active" };
      if (card.composite == null) return { label: "Final scoring", tone: "active" };
      return { label: "Awaiting shortlist decision", tone: "waiting" };
    case "SHORTLISTED":
      return { label: "Next: Hiring manager review", tone: "waiting" };
    case "HM_REVIEW":
      return { label: "Next: Interview", tone: "waiting" };
    case "INTERVIEW":
      return { label: "Next: Final decision", tone: "waiting" };
    default:
      return null;
  }
}

const STEP_TONES = {
  active: { text: "text-blue-700", dot: "bg-blue-500", pulse: true },
  waiting: { text: "text-amber-700", dot: "bg-amber-500", pulse: false },
  error: { text: "text-rose-700", dot: "bg-rose-500", pulse: false },
};

function NextStepIndicator({ card }) {
  const step = nextStep(card);
  if (!step) return null;
  const tone = STEP_TONES[step.tone];
  return (
    <div className={`flex items-center gap-1.5 mt-2 text-[10.5px] font-medium ${tone.text}`} title={step.label}>
      <span className="relative flex h-2 w-2 shrink-0">
        {tone.pulse && <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${tone.dot}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${tone.dot}`} />
      </span>
      <span className="truncate">{step.label}</span>
    </div>
  );
}

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
      className="bg-white p-3 cursor-grab active:cursor-grabbing hover:bg-slate-50 transition-colors"
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
      <NextStepIndicator card={card} />
    </div>
  );
}
