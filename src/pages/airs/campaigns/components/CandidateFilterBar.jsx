import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Check, Link2, Search, SlidersHorizontal, X } from "lucide-react";
import Button from "../../../../components/Button/Button";
import {
  getCampaignUploaders, getSkillSuggestions,
} from "../../dashboard/services/dashboardService";

/**
 * Filter bar for a campaign's candidate list:
 * skill autocomplete + multi-skill AND search, resume-derived filters, and a
 * shareable URL of the current filter state.
 *
 * Filter state lives in the URL (see CampaignDetails), so a shared link fully
 * describes a filtered view and the scorecard can read the active filters
 * without coupling to this component.
 */
const DEGREE_LEVELS = ["PHD", "MASTER", "BACHELOR", "DIPLOMA"];

export default function CandidateFilterBar({
  campaignId,
  skills,            // [{canonical_skill_id, canonical_name}]
  onSkillsChange,
  stageFilter,
  resultCount,
  resumeFilters = {},
  onResumeFiltersChange,
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [uploaders, setUploaders] = useState([]);
  const boxRef = useRef(null);

  // uploader list only matters once the extra filters are opened
  useEffect(() => {
    if (!showMore || uploaders.length) return;
    (async () => {
      try { setUploaders(await getCampaignUploaders(campaignId)); } catch { /* non-fatal */ }
    })();
  }, [showMore, campaignId, uploaders.length]);

  const setResumeFilter = (key, value) =>
    onResumeFiltersChange?.({ ...resumeFilters, [key]: value === "" ? undefined : value });

  const toggleDegree = (level) => {
    const cur = resumeFilters.degree_levels || [];
    const next = cur.includes(level) ? cur.filter((d) => d !== level) : [...cur, level];
    onResumeFiltersChange?.({ ...resumeFilters, degree_levels: next.length ? next : undefined });
  };

  // debounce — autocomplete fires per keystroke otherwise
  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        setSuggestions(await getSkillSuggestions(campaignId, query.trim()));
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, campaignId]);

  useEffect(() => {
    (async () => {
    })();
  }, [campaignId]);

  // click-away closes the suggestion list
  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const addSkill = (s) => {
    if (!skills.some((x) => x.canonical_skill_id === s.canonical_skill_id)) {
      onSkillsChange([...skills, s]);
    }
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  };

  const removeSkill = (id) =>
    onSkillsChange(skills.filter((s) => s.canonical_skill_id !== id));

  const currentFilters = () => ({
    skill_ids: skills.map((s) => s.canonical_skill_id),
    skill_names: skills.map((s) => s.canonical_name),
    stage: stageFilter || null,
  });




  // Canonical IDs, never display names, so the link survives a
  // skill being renamed in the ontology.
  const handleShare = async () => {
    const params = new URLSearchParams();
    params.set("tab", "candidates");
    if (stageFilter) params.set("stage", stageFilter);
    skills.forEach((s) => params.append("skill_ids", s.canonical_skill_id));
    const url = `${window.location.origin}/airs/campaigns/${campaignId}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Filter link copied to clipboard.", { autoClose: 3000 });
    } catch {
      toast.info(url);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* skill autocomplete */}
        <div ref={boxRef} className="relative flex-1 min-w-[220px] max-w-[380px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length && setOpen(true)}
            placeholder="Filter by skill (e.g. Python)…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
              {suggestions.map((s) => (
                <li key={s.canonical_skill_id}>
                  <button
                    type="button"
                    onClick={() => addSkill(s)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex justify-between items-center gap-2"
                  >
                    <span className="truncate">
                      {s.canonical_name}
                      {s.category && <span className="text-slate-400"> · {s.category}</span>}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                      {s.candidate_count}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>


        <Button variant="outline" size="small" onClick={() => setShowMore((v) => !v)}>
          <SlidersHorizontal className="h-3.5 w-3.5" /> More filters
        </Button>
        <Button variant="outline" size="small" onClick={handleShare}>
          <Link2 className="h-3.5 w-3.5" /> Share
        </Button>

        {resultCount != null && (
          <span className="text-[11px] text-slate-500 ml-auto">
            {resultCount} match{resultCount === 1 ? "" : "es"}
          </span>
        )}
      </div>

      {/* active skill chips — AND-combined */}
      {skills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Has all of:</span>
          {skills.map((s) => (
            <span key={s.canonical_skill_id}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              <Check className="h-3 w-3" />
              {s.canonical_name}
              <button type="button" onClick={() => removeSkill(s.canonical_skill_id)}
                className="hover:text-indigo-900" aria-label={`Remove ${s.canonical_name}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button type="button" onClick={() => onSkillsChange([])}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline">
            clear
          </button>
        </div>
      )}

      {/* Resume-derived filters */}
      {showMore && (
        <div className="border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Experience (years)
            </label>
            <div className="flex items-center gap-1">
              <input type="number" min="0" step="0.5" placeholder="min"
                value={resumeFilters.experience_min ?? ""}
                onChange={(e) => setResumeFilter("experience_min", e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
              <span className="text-slate-300">–</span>
              <input type="number" min="0" step="0.5" placeholder="max"
                value={resumeFilters.experience_max ?? ""}
                onChange={(e) => setResumeFilter("experience_max", e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
            </div>
            <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
              <input type="checkbox"
                checked={resumeFilters.include_unknown_experience !== false}
                onChange={(e) => setResumeFilter("include_unknown_experience", e.target.checked)}
                className="accent-indigo-600" />
              <span className="text-[10px] text-slate-500">Include unparsed</span>
            </label>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Education
            </label>
            <div className="flex flex-wrap gap-1">
              {DEGREE_LEVELS.map((d) => {
                const on = (resumeFilters.degree_levels || []).includes(d);
                return (
                  <button key={d} type="button" onClick={() => toggleDegree(d)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-full border transition ${
                      on ? "bg-indigo-600 text-white border-indigo-600"
                         : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-400 mt-1">
              Matched from free-text degree — parsed data may be imprecise.
            </p>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Uploaded by
            </label>
            <select
              value={resumeFilters.uploaded_by ?? ""}
              onChange={(e) => setResumeFilter("uploaded_by", e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white">
              <option value="">Anyone</option>
              {uploaders.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name} ({u.upload_count})
                </option>
              ))}
            </select>
            <select
              value={resumeFilters.upload_type ?? ""}
              onChange={(e) => setResumeFilter("upload_type", e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white mt-1">
              <option value="">Any upload type</option>
              <option value="individual">Individual</option>
              <option value="bulk">Bulk</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Uploaded between
            </label>
            <input type="date"
              value={resumeFilters.uploaded_from ?? ""}
              onChange={(e) => setResumeFilter("uploaded_from", e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
            <input type="date"
              value={resumeFilters.uploaded_to ?? ""}
              onChange={(e) => setResumeFilter("uploaded_to", e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs mt-1" />
          </div>
        </div>
      )}

    </div>
  );
}
