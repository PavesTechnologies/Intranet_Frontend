import React, { useState } from "react";
import { MapPin, Briefcase, Mail } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../../../components/ui/sheet";
import ScoreRing from "../ScoreRing";
import { renderStageBadge } from "../../utils/candidateUtils.jsx";
import { CANDIDATE_DETAIL_TABS } from "../../constants/candidateConstants";
import CandidateSummaryTab from "./CandidateSummaryTab";
import CandidateResumeTab from "./CandidateResumeTab";
import CandidateEvaluationTab from "./CandidateEvaluationTab";
import CandidateTimelineTab from "./CandidateTimelineTab";
import CandidateCommentsTab from "./CandidateCommentsTab";

export default function CandidateDetailDrawer({ candidate, onClose, onAddComment, onAddManualSkill }) {
  const [tab, setTab] = useState("Summary");

  return (
    <Sheet open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      {candidate && (
        <SheetContent className="bg-white text-slate-900 w-full sm:max-w-xl p-0 overflow-hidden flex flex-col">
          <SheetHeader className="p-5 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
                {candidate.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-[15px] font-bold text-slate-900">{candidate.name}</SheetTitle>
                  {renderStageBadge(candidate.stage)}
                </div>
                <SheetDescription className="text-[12px] mt-1 flex items-center gap-3 flex-wrap text-slate-400">
                  <span className="flex items-center gap-1"><MapPin size={11} />{candidate.location}</span>
                  <span className="flex items-center gap-1"><Briefcase size={11} />{candidate.experience} yrs</span>
                  <span className="flex items-center gap-1"><Mail size={11} />{candidate.email}</span>
                </SheetDescription>
              </div>
              <div className="flex gap-3 shrink-0">
                <ScoreRing value={candidate.deterministic} size={40} color="#DC2626" />
                <ScoreRing value={candidate.semantic} size={40} color="#7C3AED" />
                <ScoreRing value={candidate.ats} size={40} color="#2563EB" />
                <ScoreRing value={candidate.composite} size={40} color="#16A34A" />
              </div>
            </div>
          </SheetHeader>

          <div className="flex items-center gap-1 px-5 border-b border-slate-200 shrink-0">
            {CANDIDATE_DETAIL_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-2.5 text-[13px] font-semibold relative"
                style={{ color: tab === t ? "#2563EB" : "#98A1AF" }}
              >
                {t}
                {tab === t && <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-blue-600" />}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {tab === "Summary" && <CandidateSummaryTab candidate={candidate} />}
            {tab === "Resume" && <CandidateResumeTab candidate={candidate} />}
            {tab === "Evaluation" && (
              <CandidateEvaluationTab candidate={candidate} onAddManualSkill={onAddManualSkill} />
            )}
            {tab === "Timeline" && <CandidateTimelineTab candidate={candidate} />}
            {tab === "Comments" && (
              <CandidateCommentsTab candidate={candidate} onAddComment={(text) => onAddComment(candidate.id, text)} />
            )}
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
