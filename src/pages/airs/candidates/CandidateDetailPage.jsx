import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin, Briefcase, Mail } from "lucide-react";
import ScoreRing from "./components/ScoreRing";
import useCandidateDetail from "./hooks/useCandidateDetail";
import { renderStageBadge } from "./utils/candidateUtils.jsx";
import { CANDIDATE_DETAIL_TABS } from "./constants/candidateConstants";
import CandidateSummaryTab from "./components/detail/CandidateSummaryTab";
import CandidateResumeTab from "./components/detail/CandidateResumeTab";
import CandidateEvaluationTab from "./components/detail/CandidateEvaluationTab";
import CandidateTimelineTab from "./components/detail/CandidateTimelineTab";
import CandidateCommentsTab from "./components/detail/CandidateCommentsTab";
import ErrorState from "../skill-ontology/components/ErrorState";
import { candidateJson } from "../service/resumeIntake";
import { extractErrorMessage } from "../resume-intake/intake/utils/intakeUtils.jsx";

export default function CandidateDetailPage() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const resumeRow = location.state?.resume || null;
  const { candidate: mockCandidate, addComment, addManualSkill } = useCandidateDetail(candidateId);
  const [tab, setTab] = useState("Summary");

  const [parsedJson, setParsedJson] = useState(null);
  const [isResumeLoading, setIsResumeLoading] = useState(true);
  const [resumeError, setResumeError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchParsedJson = async () => {
      setIsResumeLoading(true);
      setResumeError("");
      try {
        const res = await candidateJson(candidateId);
        if (cancelled) return;
        setParsedJson(res?.data?.parsed_json || null);
      } catch (err) {
        if (cancelled) return;
        setResumeError(extractErrorMessage(err, "Failed to load the extracted resume data."));
        setParsedJson(null);
      } finally {
        if (!cancelled) setIsResumeLoading(false);
      }
    };

    fetchParsedJson();
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  // The Candidates & Ranking module (scores, stage, risk, comments, etc.) is
  // mock-only with no backing endpoint yet — overlay whatever real data we do
  // have (from the resume list row and the parsed resume JSON) on top of a
  // mock candidate so the rest of the page still renders meaningfully.
  const candidate = mockCandidate && {
    ...mockCandidate,
    name: parsedJson?.full_name || resumeRow?.candidate_full_name || mockCandidate.name,
    email: parsedJson?.email || resumeRow?.candidate_email || mockCandidate.email,
    experience: parsedJson?.total_experience_years ?? mockCandidate.experience,
    company: parsedJson?.work_experience?.[0]?.company || mockCandidate.company,
    summary: parsedJson?.summary || mockCandidate.summary,
    education: parsedJson?.education?.[0]
      ? [parsedJson.education[0].degree, parsedJson.education[0].field].filter(Boolean).join(" in ") +
        (parsedJson.education[0].institution ? `, ${parsedJson.education[0].institution}` : "")
      : mockCandidate.education,
  };

  if (candidate) {
    candidate.initials = (candidate.name || "??")
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  if (!candidate) {
    return (
      <div className="p-8 bg-[#F8FAFC] min-h-screen">
        <ErrorState
          title="Candidate not found"
          message="We couldn't find this candidate. They may have been removed."
          onRetry={() => navigate("/airs/candidates")}
        />
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(resumeRow ? "/airs/resume-intake" : "/airs/candidates")}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition shadow-sm shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
            {candidate.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[15px] font-bold text-slate-900">{candidate.name}</span>
              {renderStageBadge(candidate.stage)}
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
          <div className="flex gap-3 shrink-0">
            <ScoreRing value={candidate.deterministic} size={40} color="#DC2626" />
            <ScoreRing value={candidate.semantic} size={40} color="#7C3AED" />
            <ScoreRing value={candidate.ats} size={40} color="#2563EB" />
            <ScoreRing value={candidate.composite} size={40} color="#16A34A" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-1 px-5 border-b border-slate-200">
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

        <div className="p-5">
          {tab === "Summary" && <CandidateSummaryTab candidate={candidate} />}
          {tab === "Resume" && (
            <CandidateResumeTab parsedJson={parsedJson} isLoading={isResumeLoading} error={resumeError} />
          )}
          {tab === "Evaluation" && (
            <CandidateEvaluationTab candidate={candidate} onAddManualSkill={addManualSkill} />
          )}
          {tab === "Timeline" && <CandidateTimelineTab candidate={candidate} />}
          {tab === "Comments" && (
            <CandidateCommentsTab candidate={candidate} onAddComment={(text) => addComment(candidate.id, text)} />
          )}
        </div>
      </div>
    </div>
  );
}
