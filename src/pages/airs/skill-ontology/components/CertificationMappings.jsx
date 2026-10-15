import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Award, Plus, Trash2, X } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { SkillSearch } from "../../pages/components/JdUnknownSkillResolver";
import { formatApiError } from "../../campaigns/services/campaignservice";
import {
  addCertification, addCertificationSkill, getCertifications, getSkillMeanings, removeCertification,
  removeCertificationSkill,
} from "../services/certificationService";

const inputClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white";

// Phase 3 Step 5: a certification on a resume (never one still in progress)
// gives scoring v2 evidence for each mapped skill - always confirmed by the
// 3-vote check, never on its own. HR_ADMIN only.
export default function CertificationMappings() {
  const [certifications, setCertifications] = useState([]);
  const [meanings, setMeanings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ name: "", variants: "", note: "" });
  const [adding, setAdding] = useState({});          // certification id -> { skill, senseKey }
  const [confirmRemove, setConfirmRemove] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [certs, skillMeanings] = await Promise.all([getCertifications(), getSkillMeanings()]);
      setCertifications(certs);
      setMeanings(skillMeanings);
    } catch (error) {
      toast.error(formatApiError(error, "Couldn't load the certifications."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (action, success, failure) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await load();
      return true;
    } catch (error) {
      toast.error(formatApiError(error, failure));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createCertification = async () => {
    const nameVariants = draft.variants.split(/[\n,;]/).map((v) => v.trim()).filter(Boolean);
    const ok = await run(() => addCertification({ name: draft.name.trim(), nameVariants, note: draft.note.trim() }),
      "Certification added.", "Couldn't add the certification.");
    if (ok) setDraft({ name: "", variants: "", note: "" });
  };

  const sensesFor = (skillId) => meanings.find((m) => m.canonical_skill_id === skillId)?.senses || [];
  const senseLabel = (skillId, key) => sensesFor(skillId).find((s) => s.sense_key === key)?.label || key;

  const mapSkill = async (cert) => {
    const pick = adding[cert.id];
    const ok = await run(() => addCertificationSkill(cert.id, pick.skill.id, pick.senseKey),
      `'${pick.skill.canonicalName}' mapped from ${cert.name}.`, "Couldn't map the skill.");
    if (ok) setAdding((a) => ({ ...a, [cert.id]: undefined }));
  };

  if (loading) return <LoadingSpinner text="Loading certifications..." />;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Award className="h-4 w-4 text-slate-500" /> Certifications and the skills they show
        </h2>
        <p className="text-[11px] text-slate-500 mt-1 max-w-3xl">
          A certification on a resume that matches a name or variant (case, punctuation and "v4"/"4" don't matter)
          counts as evidence for each mapped skill - always confirmed by the 3-vote check. A certification still
          in progress, pursuing, scheduled, appearing or expected (with a date) never counts.
        </p>
      </div>

      {certifications.map((cert) => {
        const pick = adding[cert.id];
        const pickSenses = pick?.skill ? sensesFor(pick.skill.id) : [];
        return (
          <div key={cert.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="mr-auto">
                <h3 className="text-xs font-bold text-slate-800">{cert.name}</h3>
                <p className="text-[10px] text-slate-500">
                  Also matches: {cert.name_variants.length ? cert.name_variants.join(" · ") : "the name only"}
                </p>
                {cert.note && <p className="text-[10px] text-slate-400">{cert.note}</p>}
              </div>
              {confirmRemove === cert.id ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">Remove the certification and its mappings?</span>
                  <Button variant="danger" size="small" disabled={busy}
                    onClick={() => run(() => removeCertification(cert.id), "Certification removed.",
                      "Couldn't remove the certification.").then(() => setConfirmRemove(null))}>Remove</Button>
                  <Button variant="outline" size="small" disabled={busy} onClick={() => setConfirmRemove(null)}>Keep</Button>
                </span>
              ) : (
                <Button variant="outline" size="small" disabled={busy} title="Remove this certification"
                  onClick={() => setConfirmRemove(cert.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {cert.skills.length === 0 && <span className="text-[10px] text-slate-400">No skills mapped yet.</span>}
              {cert.skills.map((s) => (
                <span key={s.canonical_skill_id}
                  className="inline-flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                  {s.skill || s.canonical_skill_id}
                  {s.sense_key && <span className="text-slate-400">({senseLabel(s.canonical_skill_id, s.sense_key)})</span>}
                  <button type="button" disabled={busy} className="text-slate-400 hover:text-rose-600"
                    aria-label={`Remove ${s.skill}`} title="Remove this skill from the certification"
                    onClick={() => run(() => removeCertificationSkill(cert.id, s.canonical_skill_id),
                      "Skill removed.", "Couldn't remove the skill.")}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {pick?.skill ? (
                <>
                  <span className="text-xs font-semibold text-slate-800">{pick.skill.canonicalName}</span>
                  {pickSenses.length > 0 && (
                    <select className={inputClass} value={pick.senseKey || ""} disabled={busy}
                      onChange={(e) => setAdding((a) => ({ ...a, [cert.id]: { ...pick, senseKey: e.target.value } }))}>
                      <option value="">Any meaning</option>
                      {pickSenses.map((s) => <option key={s.sense_key} value={s.sense_key}>{s.label}</option>)}
                    </select>
                  )}
                  <Button variant="outline" size="small" disabled={busy} onClick={() => mapSkill(cert)}>
                    <Plus className="h-3.5 w-3.5" /> Map
                  </Button>
                  <Button variant="outline" size="small" disabled={busy}
                    onClick={() => setAdding((a) => ({ ...a, [cert.id]: undefined }))}>Cancel</Button>
                </>
              ) : (
                <SkillSearch disabled={busy}
                  onPick={(skill) => setAdding((a) => ({ ...a, [cert.id]: { skill, senseKey: "" } }))} />
              )}
            </div>
          </div>
        );
      })}

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-700 mb-2">Add a certification</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${inputClass} w-56`} placeholder="Name (e.g. AWS Solutions Architect)" maxLength={150}
            value={draft.name} disabled={busy} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          <input className={`${inputClass} w-72`} placeholder="Other names, comma-separated" value={draft.variants}
            disabled={busy} onChange={(e) => setDraft((d) => ({ ...d, variants: e.target.value }))} />
          <input className={`${inputClass} w-56`} placeholder="Note (optional)" maxLength={500} value={draft.note}
            disabled={busy} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} />
          <Button variant="outline" size="small" disabled={busy || !draft.name.trim()} onClick={createCertification}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Then map its skills above.</p>
      </div>
    </div>
  );
}
