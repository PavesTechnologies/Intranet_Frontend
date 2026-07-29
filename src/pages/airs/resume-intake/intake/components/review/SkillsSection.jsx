import React, { useState } from "react";
import { Tags, ShieldCheck, Inbox, Plus, Trash2, X } from "lucide-react";
import { MATCH_TIER_STYLE, SKILL_STATUS_STYLE } from "../../constants/intakeConstants";
import { computeSkillCoverage } from "../../utils/intakeUtils.jsx";
import { Input } from "../../../../../../components/ui/input";

function CoverageBar({ pct }) {
  const tone = pct === null ? "bg-slate-300" : pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full ${tone} rounded-full`} style={{ width: `${pct || 0}%` }} />
    </div>
  );
}

function NormalizedSkillRow({ skill, index, isEditing, onDelete, onToggleStatus }) {
  const tierStyle = MATCH_TIER_STYLE[skill.match_tier] || MATCH_TIER_STYLE.unknown;
  const statusStyle = SKILL_STATUS_STYLE[skill.status] || SKILL_STATUS_STYLE.PENDING_REVIEW;
  const confidencePct = Math.round((skill.confidence ?? 0) * 100);

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-slate-900 truncate">
          {skill.canonical_name || <span className="italic text-slate-400 font-normal">Unrecognized: "{skill.raw_extracted_text}"</span>}
        </div>
        {skill.canonical_name && skill.canonical_name !== skill.raw_extracted_text && (
          <div className="text-[11px] text-slate-400">from "{skill.raw_extracted_text}"</div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${tierStyle.tone}`}>
          {tierStyle.label}
        </span>
        <span className="text-[11px] font-mono text-slate-400 w-9 text-right">{confidencePct}%</span>
        
        {isEditing ? (
          <button
            type="button"
            onClick={onToggleStatus}
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border hover:opacity-85 transition cursor-pointer select-none ${statusStyle.tone}`}
            title="Click to toggle status"
          >
            {statusStyle.label} ⚡
          </button>
        ) : (
          <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${statusStyle.tone}`}>
            {statusStyle.label}
          </span>
        )}

        {isEditing && (
          <button
            type="button"
            onClick={onDelete}
            className="text-slate-400 hover:text-rose-600 transition"
            title="Remove normalized skill"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function SkillsSection({ skills, candidateSkills, isEditing, onSkillsChange }) {
  const rawSkills = skills || [];
  const normalized = candidateSkills || [];
  const coverage = computeSkillCoverage(normalized);

  // States for adding skills in edit mode
  const [newRawSkill, setNewRawSkill] = useState("");
  
  const [newNormName, setNewNormName] = useState("");
  const [newNormRaw, setNewNormRaw] = useState("");
  const [newNormTier, setNewNormTier] = useState("case_insensitive");
  const [newNormConf, setNewNormConf] = useState(90);
  const [newNormStatus, setNewNormStatus] = useState("AUTO_VERIFIED");

  const handleAddRawSkill = (e) => {
    e.preventDefault();
    if (!newRawSkill.trim()) return;
    const clean = newRawSkill.trim();
    if (!rawSkills.includes(clean)) {
      // Create a dummy normalized skill for it as well
      const newNorm = {
        canonical_skill_id: `sk-${clean.toLowerCase().replace(/\s+/g, "-")}`,
        canonical_name: clean,
        raw_extracted_text: clean,
        match_tier: "case_insensitive",
        confidence: 0.95,
        scoring_weight: 0.8,
        status: "AUTO_VERIFIED",
      };
      onSkillsChange([...normalized, newNorm]);
    }
    setNewRawSkill("");
  };

  const handleRemoveRawSkill = (name) => {
    const updated = normalized.filter((s) => (s.canonical_name || s.raw_extracted_text) !== name);
    onSkillsChange(updated);
  };

  const handleAddNormalizedSkill = (e) => {
    e.preventDefault();
    if (!newNormName.trim()) return;

    const newSkill = {
      canonical_skill_id: `sk-${newNormName.toLowerCase().trim().replace(/\s+/g, "-")}`,
      canonical_name: newNormName.trim(),
      raw_extracted_text: newNormRaw.trim() || newNormName.trim(),
      match_tier: newNormTier,
      confidence: parseFloat(newNormConf) / 100,
      scoring_weight: newNormStatus === "AUTO_VERIFIED" ? 0.9 : 0.4,
      status: newNormStatus,
    };

    onSkillsChange([...normalized, newSkill]);

    // reset fields
    setNewNormName("");
    setNewNormRaw("");
    setNewNormConf(90);
  };

  const handleRemoveNormalizedSkill = (idx) => {
    const updated = normalized.filter((_, i) => i !== idx);
    onSkillsChange(updated);
  };

  const handleToggleStatus = (idx) => {
    const updated = [...normalized];
    const curr = updated[idx].status;
    updated[idx] = {
      ...updated[idx],
      status: curr === "AUTO_VERIFIED" ? "PENDING_REVIEW" : "AUTO_VERIFIED",
    };
    onSkillsChange(updated);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-[13.5px] font-bold text-slate-900 flex items-center gap-2">
          <Tags size={15} className="text-slate-400" /> Skills
        </h2>
        {coverage.total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              <span className="font-bold text-slate-900">{coverage.pct}%</span> verified coverage ({coverage.verified}/{coverage.total})
            </span>
            <div className="w-24">
              <CoverageBar pct={coverage.pct} />
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        {/* RAW EXTRACTED SKILLS SECTION */}
        <div className="mb-6">
          <div className="text-[11px] font-semibold text-slate-400 mb-2">RAW EXTRACTED SKILLS</div>
          {rawSkills.length === 0 && !isEditing ? (
            <div className="flex items-center gap-2 text-[12px] text-slate-400">
              <Inbox size={14} /> No skills were extracted from this resume.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {rawSkills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {s}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRawSkill(s)}
                        className="text-slate-400 hover:text-slate-600 transition"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditing && (
                <form onSubmit={handleAddRawSkill} className="flex gap-2 w-72">
                  <Input
                    value={newRawSkill}
                    onChange={(e) => setNewRawSkill(e.target.value)}
                    placeholder="Add raw skill tag..."
                    className="h-8 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center transition"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* NORMALIZED SKILLS SECTION */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <ShieldCheck size={12} /> NORMALIZED &amp; SCORED SKILLS
          </div>
          <p className="text-[11.5px] text-slate-400 mb-2.5">This is what matching and scoring actually use — not the raw list above.</p>
          
          {normalized.length === 0 && !isEditing ? (
            <div className="flex items-center gap-2 text-[12px] text-slate-400">
              <Inbox size={14} /> No skills have been normalized against the skill library yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-slate-100 rounded-lg p-2 bg-white">
                {normalized.map((s, i) => (
                  <NormalizedSkillRow
                    key={i}
                    skill={s}
                    index={i}
                    isEditing={isEditing}
                    onDelete={() => handleRemoveNormalizedSkill(i)}
                    onToggleStatus={() => handleToggleStatus(i)}
                  />
                ))}
              </div>

              {isEditing && (
                <form onSubmit={handleAddNormalizedSkill} className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                  <div className="text-[11px] font-bold text-slate-500">ADD CANONICAL SKILL MAPPING</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Canonical Name</span>
                      <Input
                        value={newNormName}
                        onChange={(e) => setNewNormName(e.target.value)}
                        placeholder="e.g. Python"
                        className="h-8 text-xs bg-white"
                        required
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Raw Extracted Text</span>
                      <Input
                        value={newNormRaw}
                        onChange={(e) => setNewNormRaw(e.target.value)}
                        placeholder="e.g. Pythoon (defaults to Canonical)"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Match Tier</span>
                      <select
                        value={newNormTier}
                        onChange={(e) => setNewNormTier(e.target.value)}
                        className="w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="case_insensitive">Exact Match</option>
                        <option value="alias">Alias Match</option>
                        <option value="fuzzy">Fuzzy Match</option>
                        <option value="vector">Semantic Match</option>
                        <option value="unknown">Unmatched</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Confidence (%)</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={newNormConf}
                        onChange={(e) => setNewNormConf(e.target.value)}
                        className="h-8 text-xs bg-white"
                        required
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Status</span>
                      <select
                        value={newNormStatus}
                        onChange={(e) => setNewNormStatus(e.target.value)}
                        className="w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="AUTO_VERIFIED">Verified</option>
                        <option value="PENDING_REVIEW">Needs review</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus size={13} /> Add Skill Mapping
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
