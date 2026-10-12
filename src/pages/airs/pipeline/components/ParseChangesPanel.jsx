import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, History, RefreshCw } from "lucide-react";
import { getParseChanges } from "../../candidates/services/candidateScoreService";

// What each "Re-parse & re-score" changed for this candidate's resume. Every
// re-parse keeps the previous version; this lists them newest first with the
// skills that appeared/disappeared and the JD's core skills found before and
// after. Renders nothing until the resume has been re-parsed at least once.
// `refreshKey` changes when a new re-parse is requested from the scorecard.

const STATUS_STYLES = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
};
const STATUS_LABELS = { COMPLETED: "Completed", IN_PROGRESS: "In progress", FAILED: "Failed" };

function Chips({ items, tone }) {
  if (!items?.length) return <span className="text-[11px] text-slate-400">None</span>;
  const toneClass = tone === "add" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item} className={`px-1.5 py-0.5 rounded text-[11px] ${toneClass}`}>
          {tone === "add" ? "+ " : "− "}
          {item}
        </span>
      ))}
    </div>
  );
}

function CoreRow({ label, before, after, total }) {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="w-40 shrink-0 text-slate-500">{label}</span>
      <span className="text-slate-700">
        <span className="font-semibold">{before?.length ?? 0}</span>
        {" → "}
        <span className="font-semibold">{after?.length ?? 0}</span>
        {total ? <span className="text-slate-400"> of {total}</span> : null}
        {after?.length ? <span className="text-slate-500"> ({after.join(", ")})</span> : null}
      </span>
    </div>
  );
}

function VersionDiff({ version }) {
  const diff = version.diff || {};
  if (version.status === "FAILED") {
    return <p className="text-[11px] text-rose-700">The re-parse failed: {diff.error || "unknown error"}. The previous parse is unchanged.</p>;
  }
  if (version.status !== "COMPLETED") {
    return <p className="text-[11px] text-amber-700">Re-parsing… refresh in a moment to see what changed.</p>;
  }
  return (
    <div className="space-y-2">
      <CoreRow label="JD core skills matched" before={diff.core_matched_before} after={diff.core_matched_after} total={diff.core_total} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Skills added</p>
          <Chips items={diff.skills_added} tone="add" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Skills removed</p>
          <Chips items={diff.skills_removed} tone="remove" />
        </div>
      </div>
      {(diff.unknown_added?.length > 0 || diff.unknown_removed?.length > 0) && (
        <p className="text-[11px] text-slate-500">
          Not in the skill catalogue: {diff.unknown_added?.length || 0} added, {diff.unknown_removed?.length || 0} removed.
        </p>
      )}
      {diff.rescore && <p className="text-[11px] text-slate-600">Re-score: {diff.rescore}</p>}
    </div>
  );
}

export default function ParseChangesPanel({ campaignCandidateId, refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    if (!campaignCandidateId) return;
    setLoading(true);
    setError(false);
    try {
      const res = await getParseChanges(campaignCandidateId);
      setData(res?.data ?? res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [campaignCandidateId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const versions = data?.versions || [];
  if (!versions.length && !error) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <History className="h-4 w-4 text-slate-500" />
          Parse changes
          <span className="text-[11px] font-normal text-slate-500">({versions.length} re-parse{versions.length === 1 ? "" : "s"})</span>
        </button>
        <button type="button" onClick={load} disabled={loading} className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      {error && <p className="text-[11px] text-rose-700 mt-2">Couldn't load the parse changes.</p>}
      {open && (
        <div className="mt-3 space-y-3">
          {versions.map((version) => (
            <div key={version.version_no} className="border border-slate-100 rounded-lg p-3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-800">Re-parse #{version.version_no}</span>
                <span className={`px-1.5 py-0.5 rounded border text-[10px] ${STATUS_STYLES[version.status] || STATUS_STYLES.IN_PROGRESS}`}>
                  {STATUS_LABELS[version.status] || version.status}
                </span>
                <span className="text-[11px] text-slate-500">{version.created_at ? new Date(version.created_at).toLocaleString() : ""}</span>
              </div>
              {version.reason && <p className="text-[11px] text-slate-600 mb-2">Reason: {version.reason}</p>}
              <VersionDiff version={version} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
