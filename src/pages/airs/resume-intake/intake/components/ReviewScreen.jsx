import React, { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Edit2, Check, X } from "lucide-react";
import ReviewHeader from "./review/ReviewHeader";
import ExperienceSection from "./review/ExperienceSection";
import EducationSection from "./review/EducationSection";
import SkillsSection from "./review/SkillsSection";
import SummarySection from "./review/SummarySection";
import { STAGE_LABELS, STAGE_FAILURE_COPY } from "../constants/intakeConstants";
import { updateParsedJson, updateCandidateSkills, updateResumeDetails } from "../mock/intakeMockData";
import { toast } from "react-toastify";
import Button from "../../../../../components/Button/Button";

export default function ReviewScreen({ resume, parsedJson, candidateSkills, processingStatus }) {
  const [isEditing, setIsEditing] = useState(false);
  const [resumeState, setResumeState] = useState(resume);
  const [parsedJsonState, setParsedJsonState] = useState(parsedJson);
  const [skillsState, setSkillsState] = useState(candidateSkills);

  useEffect(() => {
    setResumeState(resume);
    setParsedJsonState(parsedJson);
    setSkillsState(candidateSkills);
    setIsEditing(false);
  }, [resume, parsedJson, candidateSkills]);

  if (!resume) {
    return (
      <div className="max-w-5xl">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-10 flex items-center justify-center gap-2 text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Loading resume...
        </div>
      </div>
    );
  }

  const isFailed = resumeState?.parse_status === "FAILED";
  const isStillProcessing = resumeState?.parse_status === "PENDING" || resumeState?.parse_status === "PARSING";

  const handleSave = () => {
    try {
      updateResumeDetails(resume.resume_id, resumeState);
      updateParsedJson(resume.resume_id, parsedJsonState);
      updateCandidateSkills(resume.resume_id, skillsState);
      setIsEditing(false);
      toast.success("Changes saved successfully.");
    } catch (err) {
      toast.error("Failed to save changes.");
    }
  };

  const handleCancel = () => {
    setResumeState(resume);
    setParsedJsonState(parsedJson);
    setSkillsState(candidateSkills);
    setIsEditing(false);
  };

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-[12.5px] text-slate-500 font-medium">
          {isEditing ? (
            <span className="text-blue-700 font-semibold">Edit Mode Active: modify parsed details and hit save.</span>
          ) : (
            <span>You can edit this parsed profile to correct any errors.</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {!isStillProcessing && !isFailed && (
            <>
              {!isEditing ? (
                <Button variant="outline" size="small" onClick={() => setIsEditing(true)}>
                  <Edit2 size={12} className="mr-1.5" /> Edit Profile
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="small" onClick={handleCancel}>
                    <X size={12} className="mr-1.5" /> Cancel
                  </Button>
                  <Button variant="success" size="small" onClick={handleSave}>
                    <Check size={12} className="mr-1.5" /> Save Changes
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <ReviewHeader
        resume={resumeState}
        onChange={(updated) => setResumeState((prev) => ({ ...prev, ...updated }))}
        isEditing={isEditing}
      />

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
          <ExperienceSection
            workExperience={parsedJsonState?.work_experience}
            totalExperienceYears={parsedJsonState?.total_experience_years}
            isEditing={isEditing}
            onChange={(updatedExp) =>
              setParsedJsonState((prev) => ({ ...prev, work_experience: updatedExp }))
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <EducationSection
              education={parsedJsonState?.education}
              certifications={parsedJsonState?.certifications}
              isEditing={isEditing}
              onChange={(updatedEdu) =>
                setParsedJsonState((prev) => ({ ...prev, ...updatedEdu }))
              }
            />
            <SummarySection
              summary={parsedJsonState?.summary}
              isEditing={isEditing}
              onChange={(val) => setParsedJsonState((prev) => ({ ...prev, summary: val }))}
            />
          </div>
          <SkillsSection
            skills={parsedJsonState?.skills}
            candidateSkills={skillsState}
            isEditing={isEditing}
            onSkillsChange={(updatedSkills) => {
              setSkillsState(updatedSkills);
              // sync the raw list of strings in parsedJsonState.skills with the canonical names
              const rawNames = updatedSkills
                .map((s) => s.canonical_name || s.raw_extracted_text)
                .filter(Boolean);
              setParsedJsonState((prev) => ({ ...prev, skills: rawNames }));
            }}
          />
        </>
      )}
    </div>
  );
}
