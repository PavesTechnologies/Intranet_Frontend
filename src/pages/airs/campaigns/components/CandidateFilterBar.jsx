import React, { useEffect, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Button from "../../../../components/Button/Button";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { getCampaignUploaders } from "../../dashboard/services/dashboardService";

/**
 * Filter bar for a campaign's candidate list: candidate-name search, plus
 * the resume-derived filters.
 *
 * Filter state lives in the URL (see CampaignDetails), so the scorecard can
 * read the active filters without coupling to this component.
 */
const DEGREE_LEVELS = ["PHD", "MASTER", "BACHELOR", "DIPLOMA"];

export default function CandidateFilterBar({
  campaignId,
  nameFilter = "",
  onNameFilterChange,
  resultCount,
  resumeFilters = {},
  onResumeFiltersChange,
  scoreFilters,
  onScoreFiltersChange,
  stageOptions,
  stageFilter,
  onStageFilterChange,
}) {
  // local echo so typing feels instant; the debounced value below is what
  // actually triggers the server-side candidate_name search + URL sync
  const [nameQuery, setNameQuery] = useState(nameFilter);
  const [showMore, setShowMore] = useState(false);
  const [uploaders, setUploaders] = useState([]);

  // keep the input in sync if the filter is cleared/changed from outside
  // (e.g. a "clear all" action, or restoring from browser back/forward)
  useEffect(() => { setNameQuery(nameFilter); }, [nameFilter]);

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

  // debounce — a server request per keystroke otherwise
  useEffect(() => {
    if (nameQuery === nameFilter) return;
    const t = setTimeout(() => onNameFilterChange?.(nameQuery.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameQuery]);
  // S03-T03 — CampaignDetails/CandidatesTab keep the address bar in sync with
  // every active filter (tab, stage, skills, score range, resume filters,
  // page), so the current URL already *is* the shareable link.
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Filter link copied to clipboard.", { autoClose: 3000 });
    } catch {
      toast.info(url);
    }
  };

  const fieldClass = "px-2 py-1.5 border border-slate-200 rounded-lg text-xs";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* candidate-name search */}
        <div className="relative flex-1 min-w-[140px] max-w-[220px] shrink">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Filter by candidate name…"
            className="w-full pl-9 pr-8 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {nameQuery && (<button
              type="button"
              onClick={() => setNameQuery("")}
              aria-label="Clear name filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button variant="outline" size="small" onClick={() => setShowMore((v) => !v)} className="shrink-0 whitespace-nowrap">
          <SlidersHorizontal className="h-3.5 w-3.5" /> More filters
        </Button>

        {stageOptions && onStageFilterChange && (
          <div className="shrink-0 w-32">
            <FilterListbox
              options={stageOptions}
              value={stageFilter}
              onChange={onStageFilterChange}
              buttonClassName="w-full cursor-default rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-8 text-left text-xs shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}

        {scoreFilters && onScoreFiltersChange && (<>
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Score</span>
          <input type="number" min="0" max="100" placeholder="Min" value={scoreFilters.min}
            onChange={(e) => onScoreFiltersChange({ ...scoreFilters, min: e.target.value })}
            className={`w-14 shrink-0 ${fieldClass}`} />
          <span className="text-slate-300 shrink-0">–</span>
          <input type="number" min="0" max="100" placeholder="Max" value={scoreFilters.max}
            onChange={(e) => onScoreFiltersChange({ ...scoreFilters, max: e.target.value })}
            className={`w-14 shrink-0 ${fieldClass}`} />

          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">AI says</span>
          <select value={scoreFilters.recommendation}
            onChange={(e) => onScoreFiltersChange({ ...scoreFilters, recommendation: e.target.value })}
            className={`shrink-0 bg-white ${fieldClass}`}>
            <option value="">Any</option>
            <option value="SHORTLIST">Shortlist</option>
            <option value="HOLD">Hold</option>
            <option value="REJECT">Reject</option>
          </select>

          {(scoreFilters.min || scoreFilters.max || scoreFilters.recommendation) && (
            <button type="button"
              onClick={() => onScoreFiltersChange({ min: "", max: "", recommendation: "" })}
              className="text-[11px] text-indigo-600 font-semibold hover:underline shrink-0">
              Clear
            </button>
          )}
        </>)}

        {resultCount != null && (
          <span className="text-[11px] text-slate-500 ml-auto shrink-0 pl-2">
            {resultCount} match{resultCount === 1 ? "" : "es"}
          </span>
        )}
      </div>

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
