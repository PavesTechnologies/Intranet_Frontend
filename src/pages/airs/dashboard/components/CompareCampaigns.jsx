import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GitCompare, X } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getPipelineSummary } from "../../campaigns/services/campaignservice";

// M11-E01-S04-T03. Deliberately built on the existing per-campaign
// pipeline-summary endpoint rather than a new compare API: the funnels are
// already exposed, and 2-4 parallel reads cost less than maintaining a second
// aggregation path that could drift from the single-campaign funnel.
const MIN = 2;
const MAX = 4;
const POLL_MS = 30000;

const STAGE_COLORS = {
  UPLOADED: "#6366F1", SCREENING: "#3B82F6", SHORTLISTED: "#0EA5E9",
  HM_REVIEW: "#14B8A6", INTERVIEW: "#10B981", SELECTED: "#22C55E",
  HOLD: "#94A3B8", REJECTED: "#F43F5E", FRAUD_REVIEW: "#F59E0B",
};
const stageLabel = (s) =>
  s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

export default function CompareCampaigns({ campaigns = [] }) {
  const [selected, setSelected] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(false);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX ? prev : [...prev, id],
    );
  };

  useEffect(() => {
    if (selected.length < MIN) { setSummaries({}); return; }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const results = await Promise.allSettled(
        selected.map((id) => getPipelineSummary(id)),
      );
      if (cancelled) return;
      const next = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") next[selected[i]] = unwrap(r.value);
      });
      setSummaries(next);
      setLoading(false);
    };

    load();
    // same 30s cadence the spec gives the individual funnels
    const t = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [selected]);

  const nameOf = (id) => campaigns.find((c) => c.id === id)?.name || "Campaign";

  // Cross-campaign summary: shortlist rate is the comparison that actually
  // drives attention, so it is computed rather than left to the reader.
  const rates = selected
    .map((id) => {
      const s = summaries[id];
      if (!s) return null;
      const stages = s.stages || [];
      const at = (k) => stages.find((x) => x.stage === k)?.count ?? 0;
      const uploaded = at("UPLOADED") || s.total_candidates || 0;
      const shortlisted = at("SHORTLISTED");
      return {
        id,
        rate: uploaded ? Math.round((shortlisted / uploaded) * 100) : 0,
        hmReview: at("HM_REVIEW"),
      };
    })
    .filter(Boolean);
  const best = rates.length ? rates.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
  const mostHm = rates.length ? rates.reduce((a, b) => (b.hmReview > a.hmReview ? b : a)) : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-slate-400" /> Compare Campaigns
        </h2>
        <p className="text-[11px] text-slate-400">
          Select {MIN}–{MAX} campaigns{selected.length > 0 && ` · ${selected.length} selected`}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {campaigns.map((c) => {
          const on = selected.includes(c.id);
          const full = !on && selected.length >= MAX;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              disabled={full}
              title={full ? `Maximum ${MAX} campaigns` : undefined}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${
                on
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : full
                    ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
              }`}
            >
              {c.name}
              {on && <X className="h-3 w-3 inline ml-1" />}
            </button>
          );
        })}
      </div>

      {selected.length < MIN && (
        <p className="text-[11px] text-slate-400 py-6 text-center">
          Pick at least {MIN} campaigns to compare their funnels side by side.
        </p>
      )}

      {selected.length >= MIN && loading && Object.keys(summaries).length === 0 && (
        <div className="py-8 flex justify-center"><LoadingSpinner text="Loading funnels..." /></div>
      )}

      {selected.length >= MIN && Object.keys(summaries).length > 0 && (
        <>
          {best && (
            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11.5px] text-slate-700 space-y-0.5">
              <div>
                Highest shortlist rate: <b>{nameOf(best.id)}</b> ({best.rate}%)
              </div>
              {mostHm && mostHm.hmReview > 0 && (
                <div>
                  Most awaiting HM review: <b>{nameOf(mostHm.id)}</b> ({mostHm.hmReview})
                </div>
              )}
            </div>
          )}

          {/* Static class strings — Tailwind purges anything built by
              interpolation, so a lookup is required here, not a template. */}
          <div className={`grid gap-4 grid-cols-1 md:grid-cols-2 ${
            { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[selected.length] || "lg:grid-cols-2"
          }`}>
            {selected.map((id) => {
              const s = summaries[id];
              if (!s) return null;
              const stages = s.stages || [];
              const max = Math.max(1, ...stages.map((x) => x.count));
              return (
                <div key={id} className="border border-slate-200 rounded-xl p-4">
                  <Link
                    to={`/airs/campaigns/${id}`}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline block truncate mb-1"
                  >
                    {nameOf(id)}
                  </Link>
                  <p className="text-[10px] text-slate-400 mb-3">
                    {s.total_candidates} candidates
                  </p>
                  <div className="space-y-2">
                    {stages.map((st) => (
                      <div key={st.stage}>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-slate-600">{stageLabel(st.stage)}</span>
                          <span className="font-bold text-slate-900 tabular-nums">{st.count}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${(st.count / max) * 100}%`,
                              backgroundColor: STAGE_COLORS[st.stage] || "#6366F1",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
