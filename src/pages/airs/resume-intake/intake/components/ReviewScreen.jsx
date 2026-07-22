import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import ReviewHeader from "./review/ReviewHeader";
import ExperienceSection from "./review/ExperienceSection";
import EducationSection from "./review/EducationSection";
import SkillsSection from "./review/SkillsSection";
import SummarySection from "./review/SummarySection";
import { STAGE_LABELS, STAGE_FAILURE_COPY } from "../constants/intakeConstants";

export default function ReviewScreen({ resume, parsedJson, candidateSkills, processingStatus }) {
  if (!resume) {
    return (
      <div className="max-w-5xl">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-10 flex items-center justify-center gap-2 text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Loading resume...
        </div>
      </div>
    );
  }

  const isFailed = resume.parse_status === "FAILED";
  const isStillProcessing = resume.parse_status === "PENDING" || resume.parse_status === "PARSING";

  return (
    <div className="max-w-5xl space-y-4">
      <ReviewHeader resume={resume} />

      {isFailed && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-[13.5px] font-bold text-rose-800">This resume could not be fully parsed</div>
            <p className="text-[12.5px] text-rose-700 mt-1">
              {processingStatus?.current_stage
                ? `Processing stopped during ${STAGE_LABELS[processingStatus.current_stage]}. ${STAGE_FAILURE_COPY[processingStatus.current_stage] || ""}`
                : "The parsing pipeline was unable to complete for this file."}{" "}
              None of the sections below could be extracted. Re-upload the resume, ideally as a text-based PDF or DOCX, to try again.
            </p>
          </div>
        </div>
      )}

      {isStillProcessing && !isFailed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <Loader2 size={18} className="text-amber-600 mt-0.5 shrink-0 animate-spin" />
          <div>
            <div className="text-[13.5px] font-bold text-amber-800">This resume is still processing</div>
            <p className="text-[12.5px] text-amber-700 mt-1">
              Extracted data will appear here as soon as parsing completes. This screen is safe to revisit — it reflects the latest status.
            </p>
          </div>
        </div>
      )}

      {!isFailed && (
        <>
          <ExperienceSection workExperience={parsedJson?.work_experience} totalExperienceYears={parsedJson?.total_experience_years} />
          <div className="grid grid-cols-2 gap-4">
            <EducationSection education={parsedJson?.education} certifications={parsedJson?.certifications} />
            <SummarySection summary={parsedJson?.summary} />
          </div>
          <SkillsSection skills={parsedJson?.skills} candidateSkills={candidateSkills} />
        </>
      )}
    </div>
  );
}
