import React from "react";
import { ArrowLeft, MapPin, Briefcase, Mail } from "lucide-react";
import { renderStageBadge } from "../../utils/candidateUtils.jsx";
import { DECISION_SOURCE_LABEL } from "../../constants/candidateConstants";
import { formatDateTime } from "../../utils/candidateDataUtils";

export default function CandidateHeader({ candidate, onBack, actions }) {
  const isRejected = String(candidate.stage).toUpperCase() === "REJECTED";

  // Rejection detail moves to a hover tooltip on the stage badge instead of
  // spilling long "Missing required skills: ..." text inline into the
  // header row — that could run to a hundred+ characters and broke the
  // row's alignment with everything after it.
  const rejectionTooltip = isRejected
    ? [
        candidate.decisionSource && `Source: ${DECISION_SOURCE_LABEL[candidate.decisionSource] || candidate.decisionSource}`,
        candidate.decisionReason && `Reason: ${candidate.decisionReason}`,
        candidate.decisionAt && `At: ${formatDateTime(candidate.decisionAt)}`,
      ]
        .filter(Boolean)
        .join("\n")
    : undefined;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition shadow-sm shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
            {candidate.initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[15px] font-bold text-slate-900">{candidate.name}</span>
              <span title={rejectionTooltip}>{renderStageBadge(candidate.stage)}</span>
            </div>
            <div className="text-[12px] flex items-center gap-3 flex-wrap text-slate-400">
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
          </div>
        </div>

        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
