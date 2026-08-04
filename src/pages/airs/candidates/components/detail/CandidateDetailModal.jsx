import React, { useState } from "react";
import { MapPin, Briefcase, Mail } from "lucide-react";
import Modal from "../../../../../components/ui/Modal";
import ScoreRing from "../ScoreRing";
import { renderStageBadge } from "../../utils/candidateUtils.jsx";
import { CANDIDATE_DETAIL_TABS } from "../../constants/candidateConstants";
import CandidateSummaryTab from "./CandidateSummaryTab";
import CandidateResumeTab from "./CandidateResumeTab";
import CandidateEvaluationTab from "./CandidateEvaluationTab";
import CandidateTimelineTab from "./CandidateTimelineTab";
import CandidateCommentsTab from "./CandidateCommentsTab";

// Centered global Modal, same as Skill Ontology's EditSkillModal, instead of
// a sliding Sheet/Drawer — the header row (avatar, contact info, score
// rings) and tab bar now live in the modal body since Modal's own title slot
// is a simple string/node, not a rich layout area.
export default function CandidateDetailModal({ candidate, onClose, onAddComment, onAddManualSkill }) {
  const [tab, setTab] = useState("Summary");

  return (
    <Modal
      isOpen={!!candidate}
      onClose={onClose}
      width="680px"
      height="85vh"
      title={
        candidate && (
          <span className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-slate-900">{candidate.name}</span>
            {renderStageBadge(candidate.stage)}
          </span>
        )
      }
    >
      {candidate && (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200 shrink-0">
            <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
              {candidate.initials}
            </div>
            <div className="flex-1 min-w-0 text-[12px] flex items-center gap-3 flex-wrap text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {candidate.location}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase size={11} />
                {candidate.experience} yrs
              </span>
              <span className="flex items-center gap-1">
                <Mail size={11} />
                {candidate.email}
              </span>
            </div>
            <div className="flex gap-3 shrink-0">
              <ScoreRing value={candidate.deterministic} size={40} color="#DC2626" />
              <ScoreRing value={candidate.semantic} size={40} color="#7C3AED" />
              <ScoreRing value={candidate.ats} size={40} color="#2563EB" />
              <ScoreRing value={candidate.composite} size={40} color="#16A34A" />
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-slate-200 shrink-0">
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

          <div className="pt-4 space-y-4 overflow-y-auto flex-1">
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
        </div>
      )}
    </Modal>
  );
}
