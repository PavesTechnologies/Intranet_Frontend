import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  MOCK_RESUMES,
  getResumeById,
  getProcessingStatusByResumeId,
  getParsedJsonByResumeId,
  getCandidateSkillsByResumeId,
} from "./mock/intakeMockData";
import ReviewScreen from "./components/ReviewScreen";
import { renderParseStatusBadge } from "./utils/intakeUtils.jsx";

export default function ReviewPage() {
  const { resumeId } = useParams();
  const navigate = useNavigate();
  const resume = getResumeById(resumeId);
  const status = resume ? getProcessingStatusByResumeId(resume.resume_id) : null;
  const parsedJson = resume ? getParsedJsonByResumeId(resume.resume_id) : null;
  const candidateSkills = resume ? getCandidateSkillsByResumeId(resume.resume_id) : [];

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate("/airs/resume-intake")}
          className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition shadow-sm shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Candidate Resume Review</h1>
          <p className="text-xs text-slate-500 mt-1">Parsed data extracted from the candidate's uploaded resume.</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-56 shrink-0">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">Mock candidates</div>
          <div className="space-y-1.5">
            {MOCK_RESUMES.map((r) => (
              <button
                key={r.resume_id}
                onClick={() => navigate(`/airs/resume-intake/review/${r.resume_id}`)}
                className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                  r.resume_id === resumeId ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="text-[12.5px] font-semibold text-slate-900 truncate">{r.candidate_name}</div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {renderParseStatusBadge(r.parse_status)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {resume ? (
            <ReviewScreen resume={resume} parsedJson={parsedJson} candidateSkills={candidateSkills} processingStatus={status} />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-10 text-center text-[13px] text-slate-500">
              No resume found for id "{resumeId}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
