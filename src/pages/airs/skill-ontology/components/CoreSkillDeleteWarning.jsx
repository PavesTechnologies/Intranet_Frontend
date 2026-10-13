import React from "react";
import { AlertTriangle } from "lucide-react";

// Shown in an unknown-skill delete dialog when any selected skill is a CORE
// skill on an active JD. The caller keeps Delete disabled until `acknowledged`.
// `skillNames` maps unknownSkillId -> raw skill text (for the bulk dialog).
export default function CoreSkillDeleteWarning({ loading, error, usages, skillNames = {}, acknowledged, onAcknowledge }) {
  if (loading) {
    return <p className="text-[12px] text-slate-500">Checking which job descriptions use this skill...</p>;
  }
  if (error) {
    return (
      <p className="text-[12px] text-slate-500">
        Couldn't check whether this skill is a core skill on any job description. Check the job description before deleting.
      </p>
    );
  }
  if (!usages.length) return null;

  return (
    <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-2" role="alert">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
        <div className="text-[12px] text-rose-700 space-y-1">
          <p className="font-semibold">
            {usages.length === 1 && !skillNames[usages[0].unknownSkillId]
              ? "This is a core skill on a job description."
              : "Some selected skills are core skills on a job description."}
          </p>
          <p>
            Deleting removes it from these job descriptions, which then become verified without it - candidates will
            no longer be checked against it.
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {usages.map((usage) =>
              usage.coreJds.map((jd) => (
                <li key={`${usage.unknownSkillId}-${jd.jd_id}`}>
                  {skillNames[usage.unknownSkillId] && (
                    <span className="font-semibold">{skillNames[usage.unknownSkillId]} — </span>
                  )}
                  {jd.title} <span className="text-rose-500">(v{jd.version_number}, {jd.job_id})</span>
                </li>
              )),
            )}
          </ul>
          <p>To keep it as a requirement, map or approve the skill instead of deleting it.</p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-[12px] font-semibold text-rose-800 cursor-pointer">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onAcknowledge(e.target.checked)}
          className="accent-rose-600"
        />
        I understand - remove this core requirement
      </label>
    </div>
  );
}
