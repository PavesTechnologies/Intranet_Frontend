import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, History, Plus, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import JdCalibrationBadge from "../../components/JdCalibrationBadge";
import JdUnknownSkillResolver, { SkillSearch } from "./JdUnknownSkillResolver";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  addJDCalibrationSkill, getJDCalibration, getJDCalibrationVersions, removeJDCalibrationSkill, saveJDCalibration,
} from "../../service/jdservice";

// JD calibration: HR_ADMIN confirms or edits the JD's scoring inputs - skill tiers,
// the meaning of ambiguous skills, minimum experience + its tolerance, education.
// Everyone else sees the same screen read-only.
const TIERS = [
  { value: "CORE", label: "Core" },
  { value: "SUPPORTING", label: "Supporting" },
  { value: "PREFERRED", label: "Preferred" },
];
const CORE_WARNING_THRESHOLD = 5;
const BASIS_LABEL = { cue: "from the JD text", title: "from the role title", assumed: "assumed (default)", hr: "confirmed" };
// A meaning suggested by the JD itself (its text or role title) - choosing a
// different one needs a confirmation. "assumed" (the skill's default) isn't one.
const JD_SUGGESTION_BASES = new Set(["cue", "title"]);

const ROLE_DOMAINS = [
  { value: "SOFTWARE", label: "Software" },
  { value: "IT_OPERATIONS", label: "IT operations" },
  { value: "DATA", label: "Data" },
  { value: "BUSINESS", label: "Business" },
  { value: "OTHER", label: "Other" },
];
const DOMAIN_BASIS_LABEL = { title: "from the role title", skills: "from the core skills" };
const domainLabel = (value) => ROLE_DOMAINS.find((d) => d.value === value)?.label || value;

function senseLabel(skill, key) {
  return skill.sense_options.find((o) => o.sense_key === key)?.label || key;
}

const selectClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white disabled:bg-slate-50 disabled:text-slate-500";
const inputClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs w-24 disabled:bg-slate-50";

function formFromView(view) {
  return {
    skills: Object.fromEntries(view.skills.map((s) => [s.jd_skill_id, {
      tier: s.tier || "SUPPORTING",
      sense_key: s.ambiguous ? (s.sense_key || s.suggested_sense_key || "") : null,
    }])),
    min: view.min_experience_years ?? "",
    tolerance: view.experience_tolerance_years ?? "",
    education: view.education_requirement || "MANDATORY",
    // "" = the default (100% on a fresher JD, else 0%).
    internships: view.internship_credit_pct ?? "",
    // "" = not set (no related education fields apply).
    domain: view.role_domain ?? "",
  };
}

// Fresh server state with the user's unsaved edits kept: edited skills keep
// their tier/meaning, skills added meanwhile (an unknown skill resolved in
// another tab) arrive with the server's values, removed ones drop out.
function mergeForm(edited, fresh) {
  if (!edited) return fresh;
  return {
    ...fresh,
    skills: Object.fromEntries(Object.entries(fresh.skills).map(([id, v]) => [id, edited.skills[id] || v])),
    min: edited.min, tolerance: edited.tolerance, education: edited.education, internships: edited.internships,
    domain: edited.domain,
  };
}

function sameForm(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function JdCalibrationPanel({ jdId, canCalibrate, onSaved, active = true }) {
  const { user } = useAuth();
  const [view, setView] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  // Save paused: some chosen meanings differ from the JD's suggestion.
  const [askSense, setAskSense] = useState(false);
  // Add / remove a skill (applied at once, each saved as a calibration version).
  const [addPick, setAddPick] = useState(null);         // a catalogue skill { id, canonicalName }
  const [addName, setAddName] = useState("");           // or a new skill's name
  const [addTier, setAddTier] = useState("SUPPORTING");
  const [skillBusy, setSkillBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [skillMessage, setSkillMessage] = useState(null);
  const [versions, setVersions] = useState(null);

  // keepEdits: refresh from the server without discarding unsaved changes.
  const load = useCallback(async ({ keepEdits = false } = {}) => {
    if (!keepEdits) setLoading(true);
    try {
      const data = await getJDCalibration(jdId);
      setView(data);
      setForm((f) => (keepEdits ? mergeForm(f, formFromView(data)) : formFromView(data)));
    } catch {
      if (!keepEdits) setView(null);
    } finally {
      if (!keepEdits) setLoading(false);
    }
  }, [jdId]);

  useEffect(() => { load(); }, [load]);

  // Coming back to the tab (the panel stays mounted while hidden): pick up
  // changes made elsewhere - e.g. an unknown skill resolved in another tab -
  // and keep this form's unsaved edits.
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) load({ keepEdits: true });
    wasActive.current = active;
  }, [active, load]);

  const coreCount = useMemo(
    () => (form ? Object.values(form.skills).filter((s) => s.tier === "CORE").length : 0), [form]);
  // Blank means "use the extracted minimum" (scoring falls back to it).
  const extractedMin = view?.extracted_min_experience_years ?? null;
  const minYears = form && form.min !== "" ? Number(form.min) : extractedMin;
  const defaultTolerance = minYears !== null ? Math.max(1, Math.round(minYears * 0.1 * 10) / 10) : null;

  const setSkill = (id, patch) => setForm((f) => ({ ...f, skills: { ...f.skills, [id]: { ...f.skills[id], ...patch } } }));

  const save = async () => {
    setAskSense(false);
    setSaving(true);
    setResult(null);
    try {
      const payload = {
        skills: Object.entries(form.skills).map(([jd_skill_id, s]) => ({
          jd_skill_id, tier: s.tier, sense_key: s.sense_key || null,
        })),
        min_experience_years: form.min === "" ? null : Number(form.min),
        experience_tolerance_years: form.tolerance === "" ? null : Number(form.tolerance),
        education_requirement: form.education,
        internship_credit_pct: form.internships === "" ? null : Number(form.internships),
        role_domain: form.domain || null,
      };
      const saved = await saveJDCalibration(jdId, payload);
      setResult(saved);
      setView(saved.calibration);
      setForm(formFromView(saved.calibration));
      setVersions(null);
      onSaved?.();
    } catch {
      // the service already shows the server's reason (e.g. a missing skill meaning)
    } finally {
      setSaving(false);
    }
  };

  // An unknown skill was resolved: take the new view, keeping unsaved edits to
  // the skills already on the form (a mapped skill arrives with its own tier).
  const onUnknownResolved = (calibration) => {
    if (!calibration) { load({ keepEdits: true }); return; }
    setView(calibration);
    setForm((f) => mergeForm(f, formFromView(calibration)));
    setVersions(null);
    onSaved?.();
  };

  // A skill was added or removed: take the server's view, keeping unsaved edits
  // to the other skills, and say what was saved.
  const applySkillChange = (change, verb) => {
    setView(change.calibration);
    setForm((f) => mergeForm(f, formFromView(change.calibration)));
    setVersions(null);
    setSkillMessage(`'${change.skill}' ${verb}${change.calibration_version
      ? ` - saved as calibration version ${change.calibration_version}` : ""}.${change.candidates_marked_out_of_date
      ? ` ${change.candidates_marked_out_of_date} scored candidate(s) marked "score out of date".` : ""}`);
    onSaved?.();
  };

  const addSkill = async () => {
    const name = addName.trim();
    if (!addPick && !name) return;
    setSkillBusy(true);
    setSkillMessage(null);
    try {
      const change = await addJDCalibrationSkill(jdId, addPick
        ? { canonical_skill_id: addPick.id, tier: addTier }
        : { new_skill_name: name, tier: addTier });
      setAddPick(null);
      setAddName("");
      applySkillChange(change, `added as ${addTier.toLowerCase()}${change.created_new_skill ? " (new catalogue skill)" : ""}`);
    } catch {
      // the service already shows the server's reason
    } finally {
      setSkillBusy(false);
    }
  };

  const removeSkill = async (skill) => {
    setSkillBusy(true);
    setSkillMessage(null);
    try {
      const change = await removeJDCalibrationSkill(jdId, skill.jd_skill_id);
      applySkillChange(change, "removed from this JD");
    } catch {
      // the service already shows the server's reason
    } finally {
      setSkillBusy(false);
      setConfirmRemove(null);
    }
  };

  const toggleHistory = async () => {
    if (versions) { setVersions(null); return; }
    setVersions(await getJDCalibrationVersions(jdId));
  };

  if (loading) return <div className="py-10 flex justify-center"><LoadingSpinner /></div>;
  if (!view || !form) return <p className="text-xs text-slate-500 py-6">Calibration couldn't be loaded.</p>;

  // Editable when the SERVER says this user may calibrate: it computes
  // can_calibrate from the token it received, with the same rule that
  // authorises the save. The browser's decoded roles can be stale (a silent
  // token refresh doesn't update them), so they are only the fallback. A live
  // campaign never makes calibration read-only (D2).
  const readOnly = !(typeof view.can_calibrate === "boolean" ? view.can_calibrate : canCalibrate);
  const signedInRoles = [].concat(user?.roles || user?.role || []).join(", ") || "none";
  const missingSense = view.skills.filter((s) => s.ambiguous && !form.skills[s.jd_skill_id]?.sense_key);
  const senseConflicts = view.skills.filter((s) => {
    const chosen = form.skills[s.jd_skill_id]?.sense_key;
    return s.ambiguous && chosen && s.suggested_sense_key && JD_SUGGESTION_BASES.has(s.suggested_sense_basis)
      && chosen !== s.suggested_sense_key;
  });
  // The role domain differs from the one suggested by the JD (title / core skills).
  const domainConflict = Boolean(form.domain && view.suggested_role_domain && form.domain !== view.suggested_role_domain);
  const requestSave = () => (senseConflicts.length > 0 || domainConflict ? setAskSense(true) : save());
  const anyConflict = senseConflicts.length > 0 || domainConflict;
  const blocking = view.blocking_unknown_skills || [];
  const unsaved = !readOnly && !sameForm(form, formFromView(view));

  return (
    <div className="space-y-5">
      {/* Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <JdCalibrationBadge calibrationStatus={view.calibration_status} calibrationVersion={view.calibration_version}
            verificationStatus={view.verification_status} />
          {view.calibrated_at && (
            <p className="text-[11px] text-slate-500">
              Calibrated by {view.calibrated_by_name || view.calibrated_by} on {view.calibrated_at.split("T")[0]}
            </p>
          )}
          {view.live_campaigns.length > 0 && (
            <p className="text-[11px] text-slate-500">
              Used by {view.live_campaigns.map((c) => `${c.name} (${c.status.toLowerCase()})`).join(", ")}.
              {" "}Saving changes marks their scored candidates "score out of date"; scores are never changed automatically.
            </p>
          )}
        </div>
        <Button variant="outline" size="small" onClick={toggleHistory}>
          <History className="h-3.5 w-3.5" /> {versions ? "Hide history" : "History"}
        </Button>
      </div>

      {versions && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          {versions.length === 0 ? <p className="text-xs text-slate-500">Not calibrated yet.</p> : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li key={v.version_no} className="text-xs text-slate-700">
                  <span className="font-bold">v{v.version_no}</span> · {v.calibrated_by_name || v.calibrated_by} · {v.calibrated_at.split("T")[0]}
                  {v.changes?.note && <span className="text-slate-500"> · {v.changes.note}</span>}
                  {v.changes?.skills?.length > 0 && (
                    <span className="text-slate-500"> · {v.changes.skills.map((c) => (
                      c.field === "added" ? `${c.skill} added (${(c.after || "unclassified").toLowerCase()})`
                        : c.field === "removed" ? `${c.skill} removed`
                          : `${c.skill}: ${c.field === "tier" ? "tier" : "meaning"} ${c.before ?? "—"} → ${c.after ?? "—"}`
                    )).join("; ")}</span>
                  )}
                  {["min_experience_years", "experience_tolerance_years", "education_requirement", "internship_credit_pct", "role_domain"].filter((k) => v.changes?.[k]).map((k) => (
                    <span key={k} className="text-slate-500"> · {k.replaceAll("_", " ")}: {String(v.changes[k].before ?? "—")} → {String(v.changes[k].after ?? "—")}</span>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {readOnly && (
        <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" role="note">
          Read-only: calibrating needs the HR_ADMIN role. Roles on your sign-in: {signedInRoles}.
        </p>
      )}

      {/* Warnings */}
      {(view.warnings.length > 0 || coreCount > CORE_WARNING_THRESHOLD) && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
          {coreCount > CORE_WARNING_THRESHOLD && (
            <p className="text-xs text-amber-800 flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
              {coreCount} core skills: more than {CORE_WARNING_THRESHOLD} makes the core gate strict. Consider marking some as supporting.</p>
          )}
          {view.warnings.filter((w) => !w.includes("core skills:")).map((w) => (
            <p key={w} className="text-xs text-amber-800 flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 mt-0.5" />{w}</p>
          ))}
        </div>
      )}

      {/* Skills */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Skills</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="py-1.5">Skill</th><th className="py-1.5">Tier</th><th className="py-1.5">Meaning (ambiguous skills)</th>
              {!readOnly && <th className="py-1.5" />}
            </tr>
          </thead>
          <tbody>
            {view.skills.map((s) => {
              const value = form.skills[s.jd_skill_id];
              return (
                <tr key={s.jd_skill_id} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-slate-800">{s.name}</td>
                  <td className="py-2">
                    <select className={selectClass} disabled={readOnly} value={value.tier}
                      onChange={(e) => setSkill(s.jd_skill_id, { tier: e.target.value })}>
                      {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                  <td className="py-2">
                    {s.ambiguous ? (
                      <div className="flex flex-col gap-0.5">
                        <select className={selectClass} disabled={readOnly} value={value.sense_key || ""}
                          onChange={(e) => setSkill(s.jd_skill_id, { sense_key: e.target.value || null })}>
                          <option value="">Choose a meaning…</option>
                          {s.sense_options.map((o) => <option key={o.sense_key} value={o.sense_key}>{o.label}</option>)}
                        </select>
                        {senseConflicts.includes(s) ? (
                          <span className="text-[10px] font-semibold text-amber-700">
                            The JD suggests: {senseLabel(s, s.suggested_sense_key)}
                            {" "}({BASIS_LABEL[s.suggested_sense_basis] || s.suggested_sense_basis})
                          </span>
                        ) : !s.sense_key && s.suggested_sense_key && (
                          <span className="text-[10px] text-slate-400">
                            Suggested: {senseLabel(s, s.suggested_sense_key)}
                            {" "}({BASIS_LABEL[s.suggested_sense_basis] || s.suggested_sense_basis})
                          </span>
                        )}
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  {!readOnly && (
                    <td className="py-2 text-right whitespace-nowrap">
                      {confirmRemove === s.jd_skill_id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500">Remove from this JD?</span>
                          <Button variant="danger" size="small" disabled={skillBusy} onClick={() => removeSkill(s)}>Remove</Button>
                          <Button variant="outline" size="small" disabled={skillBusy} onClick={() => setConfirmRemove(null)}>Keep</Button>
                        </span>
                      ) : (
                        <Button variant="outline" size="small" disabled={skillBusy} title="Remove this skill from the JD (e.g. one the extraction invented)"
                          onClick={() => setConfirmRemove(s.jd_skill_id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!readOnly && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <h4 className="text-[11px] font-bold text-slate-600 mb-1">Add a skill the extraction missed</h4>
            <div className="flex flex-wrap items-center gap-2">
              {addPick ? (
                <span className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                  {addPick.canonicalName}
                  <button type="button" className="ml-1.5 text-slate-400 hover:text-slate-700" onClick={() => setAddPick(null)}
                    aria-label="Clear">×</button>
                </span>
              ) : (
                <>
                  <SkillSearch disabled={skillBusy} onPick={(skill) => { setAddPick(skill); setAddName(""); }} />
                  <span className="text-[10px] text-slate-400">or a new skill:</span>
                  <input className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-44" placeholder="New skill name"
                    value={addName} disabled={skillBusy} onChange={(e) => setAddName(e.target.value)} />
                </>
              )}
              <select className={selectClass} value={addTier} disabled={skillBusy} onChange={(e) => setAddTier(e.target.value)}>
                {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <Button variant="outline" size="small" disabled={skillBusy || (!addPick && !addName.trim())} onClick={addSkill}
                title={addPick ? "Add this catalogue skill to the JD" : "Add to the catalogue and to this JD"}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Adding or removing a skill is saved straight away (a new calibration version); your other unsaved changes are kept.
            </p>
            {skillMessage && <p className="mt-1 text-[11px] text-emerald-700">{skillMessage}</p>}
          </div>
        )}
        <JdUnknownSkillResolver jdId={jdId} unknownSkills={view.unknown_skills} readOnly={readOnly}
          onResolved={onUnknownResolved} />
      </div>

      {/* Experience & education */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        <label className="text-xs text-slate-700 flex flex-col gap-1">
          <span className="font-bold">Minimum experience (years)</span>
          <input type="number" min="0" max="60" step="0.5" className={inputClass} disabled={readOnly}
            value={form.min} onChange={(e) => setForm((f) => ({ ...f, min: e.target.value }))} />
          <span className="text-[10px] text-slate-400">
            Blank uses the extracted minimum ({extractedMin !== null ? `${extractedMin} years` : "none extracted"}). Enter 0 for no minimum.
          </span>
        </label>
        <label className="text-xs text-slate-700 flex flex-col gap-1">
          <span className="font-bold">Tolerance (years)</span>
          <input type="number" min="0" max="20" step="0.5" className={inputClass} disabled={readOnly}
            placeholder={defaultTolerance !== null ? `${defaultTolerance} (default)` : "default"}
            value={form.tolerance} onChange={(e) => setForm((f) => ({ ...f, tolerance: e.target.value }))} />
          <span className="text-[10px] text-slate-400">Short by up to this many years goes to HOLD for review. Blank = max(1 year, 10% of the minimum).</span>
        </label>
        <label className="text-xs text-slate-700 flex flex-col gap-1">
          <span className="font-bold">Education</span>
          <select className={selectClass} disabled={readOnly} value={form.education}
            onChange={(e) => setForm((f) => ({ ...f, education: e.target.value }))}>
            <option value="MANDATORY">Mandatory (a requirement)</option>
            <option value="PREFERRED">Preferred (never rejects)</option>
          </select>
          <span className="text-[10px] text-slate-400">
            {view.education_degree || view.education_field
              ? `${view.education_degree || "Any degree"}${view.education_field ? ` in ${view.education_field}` : ""}`
              : "No education requirement in this JD."}
          </span>
        </label>
        <label className="text-xs text-slate-700 flex flex-col gap-1">
          <span className="font-bold">Internships count as experience</span>
          <select className={selectClass} disabled={readOnly} value={form.internships}
            onChange={(e) => setForm((f) => ({ ...f, internships: e.target.value }))}>
            <option value="">Default ({view.default_internship_credit_pct ?? 0}%{view.is_fresher_jd ? ", fresher JD" : ""})</option>
            <option value="100">100% (in full)</option>
            <option value="50">50% (half)</option>
            <option value="0">Not at all</option>
          </select>
          <span className="text-[10px] text-slate-400">
            Internship months not overlapping a job, towards the minimum. Default: 100% when the minimum is 1 year or less (a fresher JD), else not at all.
          </span>
        </label>
        <label className="text-xs text-slate-700 flex flex-col gap-1">
          <span className="font-bold">Role domain</span>
          <select className={selectClass} disabled={readOnly} value={form.domain}
            onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}>
            <option value="">Not set</option>
            {ROLE_DOMAINS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <span className={`text-[10px] ${domainConflict ? "font-semibold text-amber-700" : "text-slate-400"}`}>
            {view.suggested_role_domain
              ? `Suggested: ${domainLabel(view.suggested_role_domain)} (${DOMAIN_BASIS_LABEL[view.suggested_role_domain_basis] || view.suggested_role_domain_basis}). `
              : "No suggestion from the title or core skills. "}
            With mandatory education, related fields of this domain also qualify (Settings).
          </span>
        </label>
      </div>

      {result && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 flex gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5" />
          {result.changed
            ? `Saved as calibration version ${result.calibration_version}.${result.candidates_marked_out_of_date
              ? ` ${result.candidates_marked_out_of_date} scored candidate(s) marked "score out of date".` : ""}`
            : "No changes - the calibration is unchanged."}
        </div>
      )}

      {!readOnly && askSense && anyConflict && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex flex-col gap-2">
          <div className="flex gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Some choices differ from what the JD suggests. Scoring uses what you choose: resume evidence only in the chosen meaning, and the related education fields of the chosen role domain.</span>
          </div>
          <ul className="list-disc pl-6 space-y-0.5">
            {senseConflicts.map((s) => (
              <li key={s.jd_skill_id}>
                <span className="font-semibold">{s.name}</span>: you chose{" "}
                <span className="font-semibold">{senseLabel(s, form.skills[s.jd_skill_id].sense_key)}</span>; the JD suggests{" "}
                <span className="font-semibold">{senseLabel(s, s.suggested_sense_key)}</span>
                {" "}({BASIS_LABEL[s.suggested_sense_basis] || s.suggested_sense_basis}).
              </li>
            ))}
            {domainConflict && (
              <li>
                <span className="font-semibold">Role domain</span>: you chose{" "}
                <span className="font-semibold">{domainLabel(form.domain)}</span>; the JD suggests{" "}
                <span className="font-semibold">{domainLabel(view.suggested_role_domain)}</span>
                {" "}({DOMAIN_BASIS_LABEL[view.suggested_role_domain_basis] || view.suggested_role_domain_basis}).
              </li>
            )}
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="small" disabled={saving} onClick={() => setAskSense(false)}>Go back</Button>
            <Button variant="primary" size="small" disabled={saving} onClick={save}>Save with my choices</Button>
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="flex justify-end items-center gap-3">
          {unsaved && (
            <span className="text-[11px] font-semibold text-amber-700">Unsaved changes - they are kept if you switch tabs, but only saved here.</span>
          )}
          <Button variant="primary" size="medium" onClick={requestSave}
            disabled={saving || (askSense && anyConflict) || missingSense.length > 0 || blocking.length > 0}
            loading={saving} loadingText="Saving..."
            title={blocking.length > 0 ? `Resolve these core skills first: ${blocking.join(", ")}`
              : missingSense.length > 0 ? `Choose the meaning of: ${missingSense.map((s) => s.name).join(", ")}` : undefined}>
            {view.calibration_status === "CALIBRATED" ? "Save calibration" : "Calibrate JD"}
          </Button>
        </div>
      )}
    </div>
  );
}
