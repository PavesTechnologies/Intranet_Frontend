import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, History } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import JdCalibrationBadge from "../../components/JdCalibrationBadge";
import JdUnknownSkillResolver from "./JdUnknownSkillResolver";
import { useAuth } from "../../../../contexts/AuthContext";
import { getJDCalibration, getJDCalibrationVersions, saveJDCalibration } from "../../service/jdservice";

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
  };
}

export default function JdCalibrationPanel({ jdId, canCalibrate, onSaved }) {
  const { user } = useAuth();
  const [view, setView] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [versions, setVersions] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJDCalibration(jdId);
      setView(data);
      setForm(formFromView(data));
    } catch {
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [jdId]);

  useEffect(() => { load(); }, [load]);

  const coreCount = useMemo(
    () => (form ? Object.values(form.skills).filter((s) => s.tier === "CORE").length : 0), [form]);
  // Blank means "use the extracted minimum" (scoring falls back to it).
  const extractedMin = view?.extracted_min_experience_years ?? null;
  const minYears = form && form.min !== "" ? Number(form.min) : extractedMin;
  const defaultTolerance = minYears !== null ? Math.max(1, Math.round(minYears * 0.1 * 10) / 10) : null;

  const setSkill = (id, patch) => setForm((f) => ({ ...f, skills: { ...f.skills, [id]: { ...f.skills[id], ...patch } } }));

  const save = async () => {
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
    if (!calibration) { load(); return; }
    const fresh = formFromView(calibration);
    setView(calibration);
    setForm((f) => ({
      ...fresh,
      skills: Object.fromEntries(Object.entries(fresh.skills).map(([id, v]) => [id, f?.skills[id] || v])),
      min: f ? f.min : fresh.min, tolerance: f ? f.tolerance : fresh.tolerance, education: f ? f.education : fresh.education,
    }));
    setVersions(null);
    onSaved?.();
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
  const blocking = view.blocking_unknown_skills || [];

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
                  {["min_experience_years", "experience_tolerance_years", "education_requirement"].filter((k) => v.changes?.[k]).map((k) => (
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
                        {!s.sense_key && s.suggested_sense_key && (
                          <span className="text-[10px] text-slate-400">
                            Suggested: {s.sense_options.find((o) => o.sense_key === s.suggested_sense_key)?.label}
                            {" "}({BASIS_LABEL[s.suggested_sense_basis] || s.suggested_sense_basis})
                          </span>
                        )}
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <JdUnknownSkillResolver jdId={jdId} unknownSkills={view.unknown_skills} readOnly={readOnly}
          onResolved={onUnknownResolved} />
      </div>

      {/* Experience & education */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {!readOnly && (
        <div className="flex justify-end">
          <Button variant="primary" size="medium" onClick={save}
            disabled={saving || missingSense.length > 0 || blocking.length > 0}
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
