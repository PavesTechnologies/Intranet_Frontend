import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Globe, Plus, Search, X } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getSkills } from "../../skill-ontology/services/skillOntologyService";
import { addTalentPoolCandidateToCampaign } from "../../talent-pool/services/talentPoolService";
import { crossCampaignSearch, getDashboardCampaigns } from "../services/dashboardService";

// T03 — the add action reuses M13's talent-pool endpoint, which already owns
// resume selection, stage history, audit and re-queuing scoring. Only ACTIVE
// campaigns are offered because that endpoint refuses anything else.
function AddToCampaign({ candidateId, campaigns, alreadyIn }) {
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const options = campaigns.filter(
    (c) => c.status === "ACTIVE" && !alreadyIn.has(String(c.id)),
  );
  if (added) return <span className="text-[10px] font-bold text-emerald-600">Added ✓</span>;
  if (options.length === 0) return null;

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await addTalentPoolCandidateToCampaign(candidateId, target);
      setAdded(true);
      toast.success("Candidate added — scoring has been queued.");
    } catch (err) {
      // The refusals here are meaningful (already added, campaign closed, no
      // eligible resume), so show the server's own message rather than a
      // generic failure.
      toast.error(err?.response?.data?.message || "Could not add this candidate.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <select value={target} onChange={(e) => setTarget(e.target.value)}
        className="text-[10px] px-2 py-1 border border-slate-200 rounded-lg max-w-[160px]">
        <option value="">Add to campaign…</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <Button variant="secondary" size="small" onClick={submit} disabled={!target} loading={busy}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

// M11-E03-S04. The skill picker uses the global ontology list rather than the
// campaign-scoped autocomplete — by definition this search isn't tied to one
// campaign, so scoping suggestions to one would hide valid choices.
export default function CrossCampaignSearch({ canAdd = false }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [skills, setSkills] = useState([]);
  const [minScore, setMinScore] = useState("");
  const [rejectedOnly, setRejectedOnly] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  // Fetched independently of the page's campaign filters — the set of
  // campaigns you can add someone TO must not shrink because of a search
  // term applied to the table above.
  const [addTargets, setAddTargets] = useState([]);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!canAdd) return;
    getDashboardCampaigns({ limit: 50, show_closed: false })
      .then(setAddTargets)
      .catch(() => setAddTargets([]));
  }, [canAdd]);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await getSkills({ page: 1, page_size: 8, search: query.trim(), is_active: true });
        setSuggestions(res?.data?.items || res?.items || []);
        setOpen(true);
      } catch { setSuggestions([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const addSkill = (s) => {
    const id = s.id || s.canonical_skill_id;
    const name = s.canonicalName || s.canonical_name || s.name;
    if (!skills.some((x) => x.id === id)) setSkills([...skills, { id, name }]);
    setQuery(""); setSuggestions([]); setOpen(false);
  };

  const runSearch = async () => {
    if (skills.length === 0) {
      toast.error("Pick at least one skill to search for.");
      return;
    }
    setLoading(true);
    try {
      const data = await crossCampaignSearch({
        skill_ids: skills.map((s) => s.id),
        min_composite_score: minScore === "" ? undefined : Number(minScore),
        rejected_only: rejectedOnly || undefined,
        q: skills.map((s) => s.name).join(", "),
      });
      setResults(data);
    } catch {
      toast.error("Cross-campaign search failed.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-slate-400" /> Cross-Campaign Candidate Search
      </h2>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div ref={boxRef} className="relative flex-1 min-w-[220px] max-w-[340px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a skill (e.g. Java)…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
              {suggestions.map((s) => (
                <li key={s.id || s.canonical_skill_id}>
                  <button type="button" onClick={() => addSkill(s)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 truncate">
                    {s.canonicalName || s.canonical_name || s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <input type="number" min="0" max="100" placeholder="Min score"
          value={minScore} onChange={(e) => setMinScore(e.target.value)}
          className="w-28 px-2 py-2 border border-slate-200 rounded-lg text-xs" />

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={rejectedOnly}
            onChange={(e) => setRejectedOnly(e.target.checked)} className="accent-indigo-600" />
          <span className="text-[11px] text-slate-600" title="Candidates rejected in every campaign — free to consider again">
            Rejected everywhere
          </span>
        </label>

        <Button variant="primary" size="small" onClick={runSearch} loading={loading} loadingText="Searching...">
          Search
        </Button>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-[10px] uppercase font-bold text-slate-400">Has all of:</span>
          {skills.map((s) => (
            <span key={s.id}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              {s.name}
              <button type="button" onClick={() => setSkills(skills.filter((x) => x.id !== s.id))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {loading && <div className="py-6 flex justify-center"><LoadingSpinner text="Searching..." /></div>}

      {!loading && results && results.result_count === 0 && (
        <p className="text-[11px] text-slate-400 py-6 text-center">
          No candidates match all of those skills in campaigns you can access.
        </p>
      )}

      {!loading && results && results.result_count > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500">
            {results.result_count} candidate{results.result_count === 1 ? "" : "s"} · best score first
          </p>
          {results.results.slice(0, 20).map((c) => (
            <div key={c.candidate_id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* no PII on this screen — UUID only, per spec */}
                <span className="text-[11px] font-mono text-slate-500">
                  {String(c.candidate_id).slice(0, 8)}…
                </span>
                <div className="flex items-center gap-2">
                  {c.rejected_everywhere && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      Available
                    </span>
                  )}
                  {c.best_composite_score != null && (
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                      {c.best_composite_score}
                      <span className="text-[10px] font-normal text-slate-400"> best</span>
                    </span>
                  )}
                </div>
              </div>
              {canAdd && (
                <div className="mt-2">
                  <AddToCampaign
                    candidateId={c.candidate_id}
                    campaigns={addTargets}
                    alreadyIn={new Set(c.appearances.map((a) => String(a.campaign_id)))}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {c.appearances.map((a) => (
                  <Link key={a.campaign_candidate_id}
                    to={`/airs/campaigns/${a.campaign_id}?tab=candidates&stage=${a.pipeline_stage}`}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition">
                    {a.campaign_name} · {a.pipeline_stage.replace(/_/g, " ")}
                    {a.composite_score != null && ` · ${a.composite_score}`}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
