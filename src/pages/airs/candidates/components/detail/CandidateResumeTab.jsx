import React from "react";
import { Loader2, XCircle, Inbox } from "lucide-react";
import ExperienceSection from "../../../resume-intake/intake/components/review/ExperienceSection";
import EducationSection from "../../../resume-intake/intake/components/review/EducationSection";
import SkillsSection from "../../../resume-intake/intake/components/review/SkillsSection";
import SummarySection from "../../../resume-intake/intake/components/review/SummarySection";

export default function CandidateResumeTab({ parsedJson, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 size={16} className="animate-spin" /> Loading extracted resume data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 flex items-start gap-3">
        <XCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />
        <div className="text-[12.5px] text-rose-700">{error}</div>
      </div>
    );
  }

  if (!parsedJson) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Inbox size={20} />
        <div className="text-[12.5px]">No parsed resume data is available for this candidate.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ExperienceSection
        workExperience={parsedJson.work_experience}
        totalExperienceYears={parsedJson.total_experience_years}
        isEditing={false}
        onChange={() => {}}
      />
      <div className="grid grid-cols-2 gap-4">
        <EducationSection
          education={parsedJson.education}
          certifications={parsedJson.certifications}
          isEditing={false}
          onChange={() => {}}
        />
        <SummarySection summary={parsedJson.summary} isEditing={false} onChange={() => {}} />
      </div>
      <SkillsSection skills={parsedJson.skills} candidateSkills={[]} isEditing={false} onSkillsChange={() => {}} />
    </div>
  );
}
