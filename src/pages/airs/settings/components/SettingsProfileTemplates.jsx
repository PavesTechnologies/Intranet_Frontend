import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { LayoutTemplate } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { useAuth } from "../../../../contexts/AuthContext";
import { getProfileTemplates, updateProfileTemplate } from "../services/profileTemplateService";
import { apiErrorMessage } from "../services/aiProviderService";

const SECTION_LABELS = { SUMMARY: "Summary", EXPERIENCE: "Experience", SKILLS: "Skills", PROJECTS: "Projects" };
const selectClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white";
const inputClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs";

function draftOf(template) {
  return {
    label: template.label,
    description: template.description || "",
    internship_credit_pct: String(template.internship_credit_pct),
    // "" = the system default, max(1 year, 10% of the minimum).
    experience_tolerance_years: template.experience_tolerance_years ?? "",
    education_requirement: template.education_requirement,
    evidence_sections: template.evidence_sections,
  };
}

// Phase 3 Step 7: the Fresher / Experienced / Domain templates chosen in JD
// calibration - defaults for settings a JD leaves unset, and the resume
// sections that count as evidence.
export default function SettingsProfileTemplates() {
  const { hasRole } = useAuth();
  const isHrAdmin = hasRole(["HR_ADMIN"]);
  const [data, setData] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const loaded = await getProfileTemplates();
      setData(loaded);
      setDrafts(Object.fromEntries((loaded.templates || []).map((t) => [t.key, draftOf(t)])));
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't load the profile templates."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHrAdmin) load();
  }, [isHrAdmin]);

  if (!isHrAdmin) return null;

  const options = data?.evidence_section_options || Object.keys(SECTION_LABELS);
  const required = new Set(data?.required_evidence_sections || ["EXPERIENCE"]);
  const setDraft = (key, patch) => setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  const toggleSection = (key, section) => {
    const sections = drafts[key].evidence_sections;
    setDraft(key, {
      evidence_sections: sections.includes(section) ? sections.filter((s) => s !== section) : [...sections, section],
    });
  };

  const save = async (template) => {
    const draft = drafts[template.key];
    setBusyKey(template.key);
    try {
      const saved = await updateProfileTemplate(template.key, {
        label: draft.label.trim(),
        description: draft.description.trim() || null,
        internship_credit_pct: Number(draft.internship_credit_pct),
        experience_tolerance_years: draft.experience_tolerance_years === "" ? null : Number(draft.experience_tolerance_years),
        education_requirement: draft.education_requirement,
        evidence_sections: draft.evidence_sections,
      });
      toast.success(saved.changed
        ? `Template saved.${saved.candidates_marked_out_of_date
          ? ` ${saved.candidates_marked_out_of_date} scored candidate(s) marked "score out of date".` : ""}`
        : "No changes.");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save the template."));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mt-5">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <LayoutTemplate className="h-4 w-4 text-slate-500" /> JD profile templates
      </h2>
      <p className="text-[11px] text-slate-500 mt-1 max-w-3xl">
        Chosen per JD in its Calibration tab. A JD's own settings always win; a setting it leaves on default follows
        its template. Education here only prefills a JD that hasn't been calibrated yet. Changing internship credit,
        tolerance or evidence sections marks scored candidates of live campaigns using the template "score out of date".
      </p>

      {loading ? <LoadingSpinner text="Loading..." /> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3">
          {(data?.templates || []).map((template) => {
            const draft = drafts[template.key];
            if (!draft) return null;
            const busy = busyKey === template.key;
            return (
              <div key={template.key} className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2 text-xs text-slate-700">
                <input className={`${inputClass} font-bold`} maxLength={60} value={draft.label} disabled={busy}
                  aria-label="Template name" onChange={(e) => setDraft(template.key, { label: e.target.value })} />
                <textarea className={`${inputClass} resize-y`} rows={2} maxLength={500} value={draft.description}
                  placeholder="What this template is for" disabled={busy}
                  onChange={(e) => setDraft(template.key, { description: e.target.value })} />
                <label className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Internships count</span>
                  <select className={selectClass} value={draft.internship_credit_pct} disabled={busy}
                    onChange={(e) => setDraft(template.key, { internship_credit_pct: e.target.value })}>
                    <option value="100">100% (in full)</option>
                    <option value="50">50% (half)</option>
                    <option value="0">Not at all</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Tolerance (years)</span>
                  <input type="number" min="0" max="20" step="0.5" className={`${inputClass} w-24`}
                    placeholder="default" value={draft.experience_tolerance_years} disabled={busy}
                    onChange={(e) => setDraft(template.key, { experience_tolerance_years: e.target.value })} />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Education</span>
                  <select className={selectClass} value={draft.education_requirement} disabled={busy}
                    onChange={(e) => setDraft(template.key, { education_requirement: e.target.value })}>
                    <option value="MANDATORY">Mandatory</option>
                    <option value="PREFERRED">Preferred</option>
                  </select>
                </label>
                <div>
                  <span className="font-semibold">Evidence sections</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    {options.map((section) => (
                      <label key={section} className="inline-flex items-center gap-1">
                        <input type="checkbox" checked={draft.evidence_sections.includes(section)}
                          disabled={busy || required.has(section)} onChange={() => toggleSection(template.key, section)} />
                        {SECTION_LABELS[section] || section}
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    On Experience (and Projects, when ticked) an exact match on a line where the candidate does
                    the work confirms without a vote; Summary and Skills matches always go to the vote. Paraphrase
                    searches Experience and Projects.
                  </p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-slate-400">
                    {template.updated_at ? `Edited ${template.updated_at.split("T")[0]}` : "As seeded"}
                  </span>
                  <Button variant="outline" size="small" disabled={busy || !draft.label.trim()}
                    onClick={() => save(template)}>Save</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
