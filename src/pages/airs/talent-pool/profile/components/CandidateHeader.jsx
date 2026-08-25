import React from "react";
import { ArrowLeft, MapPin, Briefcase, Mail, Fingerprint, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatResumeDate } from "../../../resume-intake/utils/resumeIntakeUtils.jsx";
import ActionButtons from "./ActionButtons";

function initialsOf(name) {
  return (name || "??")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

// Talent Pool candidate profile header — sourced from the real
// GET /talent-pool/candidates/{candidate_id} response. Eligibility and
// consent badges are real here (unlike the earlier resume-parsed-json-only
// workaround this page used before the dedicated Talent Pool endpoints were
// found) — is_talent_pool_eligible is the SAME effective-eligibility check
// (PARSED + embedding + freshness) ResumeSelectionService itself runs.
export default function CandidateHeader({ profile, onBack, onAdded }) {
  const { candidate, consent, talent_pool: talentPool, resume } = profile;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition shadow-sm shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
            {initialsOf(candidate.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[15px] font-bold text-slate-900">{candidate.full_name || "Unknown Candidate"}</span>
              <Badge
                className={`${
                  talentPool.is_talent_pool_eligible
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                } font-bold px-2.5 py-0.5 text-[10px]`}
              >
                {talentPool.is_talent_pool_eligible ? "Talent Pool Eligible" : "Not Eligible"}
              </Badge>
              <Badge
                className={`${
                  consent.consent_given
                    ? "bg-blue-50 text-blue-700 border-blue-100"
                    : "bg-rose-50 text-rose-700 border-rose-100"
                } font-bold px-2.5 py-0.5 text-[10px]`}
              >
                {consent.consent_given ? "Consent Given" : "Consent Missing"}
              </Badge>
            </div>
            <div className="text-[12.5px] text-slate-500 font-medium mb-1">{candidate.designation || "—"}</div>
            <div className="text-[12px] flex items-center gap-3 flex-wrap text-slate-400">
              {/* <span className="flex items-center gap-1">
                <Fingerprint size={11} />
                {candidate.candidate_id}
              </span> */}
              {candidate.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {candidate.location}
                </span>
              )}
              {candidate.experience != null && (
                <span className="flex items-center gap-1">
                  <Briefcase size={11} />
                  {candidate.experience} yrs
                </span>
              )}
              {candidate.email && (
                <span className="flex items-center gap-1">
                  <Mail size={11} />
                  {candidate.email}
                </span>
              )}
              {resume.uploaded_at && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Resume v{resume.active_resume_version} uploaded {formatResumeDate(resume.uploaded_at)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
          <ActionButtons
            candidateId={candidate.candidate_id}
            candidateName={candidate.full_name}
            resumeId={resume.resume_id}
            onAdded={onAdded}
          />
        </div>
      </div>
    </div>
  );
}
