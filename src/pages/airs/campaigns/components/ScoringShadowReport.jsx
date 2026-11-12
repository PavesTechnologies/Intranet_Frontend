import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AlertTriangle, FlaskConical, Plus, RefreshCw, Save } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import {
  createScoringVersion,
  formatApiError,
  getScoringShadowReport,
  listScoringVersions,
  retireScoringVersion,
  saveShadowRecruiterRanking,
  setCandidateScoringVersion,
} from "../services/campaignservice";

// Shadow report (HR_ADMIN, retire v1 phase D). The current scoring version is what the pipeline acts on;
// a candidate version can be tried on this campaign - scored alongside, never deciding anything. A
// recruiter's own ranking can be entered to compare both against. Rows where the two versions (or
// either and the recruiter) disagree are highlighted. Promoting a version makes it current for every
// campaign.

const OUTCOME_STYLES = {
  PASS: "bg-emerald-50 text-emerald-700",
  REVIEW: "bg-amber-50 text-amber-700",
  REJECT: "bg-rose-50 text-rose-700",
  PENDING: "bg-slate-100 text-slate-600",
  NOT_RUN: "bg-slate-100 text-slate-500",
  NOT_SCORED: "bg-slate-50 text-slate-400",
};
const OUTCOME_LABELS = { NOT_RUN: "Not run", NOT_SCORED: "Not scored", PENDING: "Pending" };
const selectClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white";

function Outcome({ value, title }) {
  return (
    <span title={title || undefined} className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${OUTCOME_STYLES[value] || OUTCOME_STYLES.NOT_SCORED}`}>
      {OUTCOME_LABELS[value] || value}
    </span>
  );
}

function List({ label, items, tone = "text-slate-600" }) {
  if (!items?.length) return null;
  return (
    <span className={`block ${tone}`}>
      {label}: {items.join(", ")}
    </span>
  );
}

function Counts({ label, counts }) {
  return Object.entries(counts || {}).map(([outcome, n]) => (
    <span key={`${label}-${outcome}`} className={`px-2 py-0.5 rounded ${OUTCOME_STYLES[outcome] || OUTCOME_STYLES.NOT_SCORED}`}>
      {label} {OUTCOME_LABELS[outcome] || outcome}: {n}
    </span>
  ));
}

// A candidate version: a label, the configuration keys that differ from the defaults (JSON), and
// optionally its own core-confirmation model.
function NewVersionForm({ onCreated }) {
  const [label, setLabel] = useState("");
  const [configuration, setConfiguration] = useState("{\n  \n}");
  const [model, setModel] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async () => {
    let parsed;
    try {
      parsed = JSON.parse(configuration || "{}");
    } catch {
      toast.error("The configuration isn't valid JSON.");
      return;
    }
    setCreating(true);
    try {
      const res = await createScoringVersion({ label: label.trim(), configuration: parsed, model: model.trim() });
      toast.success("Candidate scoring version created.");
      setLabel("");
      setConfiguration("{\n  \n}");
      setModel("");
      onCreated(res?.data ?? res);
    } catch (err) {
      toast.error(formatApiError(err, "Could not create the scoring version."));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_2fr]">
      <div className="space-y-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} placeholder="Label, e.g. core x3"
          aria-label="Version label" className="w-full px-2 py-1 border border-slate-200 rounded text-xs" />
        <input value={model} onChange={(e) => setModel(e.target.value)} maxLength={150}
          placeholder="Confirmation model (optional)" aria-label="Confirmation model"
          className="w-full px-2 py-1 border border-slate-200 rounded text-xs" />
        <p className="text-[10px] text-slate-500">
          Only configuration can differ. Code and prompt changes go through the golden set instead.
        </p>
        <Button variant="primary" size="small" loading={creating} disabled={!label.trim()} onClick={create}>
          Create candidate version
        </Button>
      </div>
      <textarea value={configuration} onChange={(e) => setConfiguration(e.target.value)} rows={6} spellCheck={false}
        aria-label="Configuration (JSON)" placeholder='{"importance_weights": {"core": 3.0}}'
        className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-[11px]" />
    </div>
  );
}

export default function ScoringShadowReport({ campaignId }) {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ranks, setRanks] = useState({});
  const [rankedBy, setRankedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [picked, setPicked] = useState("");
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [res, listed] = await Promise.all([getScoringShadowReport(campaignId), listScoringVersions()]);
      const data = res?.data ?? res;
      setReport(data);
      setVersions(listed?.data ?? listed ?? []);
      setPicked(data?.candidate_version?.id || "");
      setRanks(Object.fromEntries((data?.rows || []).map((r) => [r.campaign_candidate_id, r.recruiter_rank ?? ""])));
      setRankedBy((data?.rows || []).find((r) => r.recruiter_ranked_by)?.recruiter_ranked_by || "");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(
    () => (report?.rows || []).some((r) => String(r.recruiter_rank ?? "") !== String(ranks[r.campaign_candidate_id] ?? "")),
    [report, ranks]
  );
  const candidates = versions.filter((v) => v.status === "candidate");
  const trying = report?.candidate_version;

  const saveRanks = async () => {
    setSaving(true);
    try {
      const rankings = (report?.rows || []).map((r) => {
        const value = ranks[r.campaign_candidate_id];
        return { campaign_candidate_id: r.campaign_candidate_id, rank: value === "" || value == null ? null : Number(value) };
      });
      const res = await saveShadowRecruiterRanking(campaignId, rankings, rankedBy.trim());
      setReport(res?.data ?? res);
      toast.success("Recruiter ranking saved.");
    } catch (err) {
      toast.error(formatApiError(err, "Could not save the ranking."));
    } finally {
      setSaving(false);
    }
  };

  const tryVersion = async (versionId) => {
    setSwitching(true);
    try {
      const res = await setCandidateScoringVersion(campaignId, versionId, Boolean(versionId));
      const result = res?.data ?? res;
      toast.success(
        versionId
          ? `Trying the version. ${result?.queued ?? 0} candidate(s) queued - refresh in a few minutes.`
          : "Stopped trying the version. Its stored results stay in the history."
      );
      await load();
    } catch (err) {
      toast.error(formatApiError(err, "Could not change the candidate scoring version."));
    } finally {
      setSwitching(false);
    }
  };

  const retire = async () => {
    if (!trying || !window.confirm(`Retire "${trying.label}"? Every campaign trying it stops.`)) return;
    setSwitching(true);
    try {
      await retireScoringVersion(trying.id);
      toast.success(`"${trying.label}" retired.`);
      await load();
    } catch (err) {
      toast.error(formatApiError(err, "Could not retire the scoring version."));
    } finally {
      setSwitching(false);
    }
  };

  if (loading && !report) return <LoadingSpinner text="Loading shadow report..." />;
  if (error && !report) return <p className="text-sm text-rose-700">Couldn't load the shadow report.</p>;
  if (!report) return null;

  const currentLabel = report.current_version?.label || "Current";
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FlaskConical className="h-5 w-5 text-slate-500" />
          <div className="mr-auto">
            <h3 className="text-sm font-semibold text-slate-800">Scoring versions — shadow comparison</h3>
            <p className="text-[11px] text-slate-500">
              <span className="font-semibold">{currentLabel}</span> (current) decides.
              {trying
                ? <> <span className="font-semibold">{trying.label}</span> is scored alongside for comparison only and never changes a candidate's stage.</>
                : " Try a candidate version to compare it on this campaign."}
            </p>
          </div>
          <span className="text-[11px] text-slate-500">
            LLM calls today: {report.daily_llm_calls_used} / {report.daily_llm_call_cap}
          </span>
          <Button variant="outline" size="small" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <select className={selectClass} value={picked} aria-label="Candidate scoring version"
            onChange={(e) => setPicked(e.target.value)} disabled={switching}>
            <option value="">No candidate version</option>
            {candidates.map((v) => (
              <option key={v.id} value={v.id}>{v.label}{v.model ? ` (${v.model})` : ""}</option>
            ))}
          </select>
          <Button variant="primary" size="small" loading={switching}
            disabled={(picked || "") === (trying?.id || "")} onClick={() => tryVersion(picked || null)}
            title="Score this campaign's candidates with the picked version too (uses LLM calls)">
            {picked ? "Try on this campaign & score existing candidates" : "Stop trying"}
          </Button>
          {trying && (
            <>
              {/* Settings phase 3: promotion needs a passing golden run - done on Settings > Scoring. */}
              <Button variant="outline" size="small" disabled={switching}
                onClick={() => navigate("/ai-screening/settings?tab=scoring")}
                title="Promotion needs a passing golden run for this version, on Settings > Scoring">
                Promote… (Settings › Scoring)
              </Button>
              <Button variant="outline" size="small" disabled={switching} onClick={retire}>Retire</Button>
            </>
          )}
          <Button variant="outline" size="small" onClick={() => setShowNew((v) => !v)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New candidate version
          </Button>
        </div>
        {showNew && (
          <NewVersionForm onCreated={(version) => {
            setShowNew(false);
            setVersions((prev) => [...prev, version]);
            setPicked(version?.id || "");
          }} />
        )}

        <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
          <Counts label={currentLabel} counts={report.outcome_counts?.current} />
          {trying && <Counts label={trying.label} counts={report.outcome_counts?.candidate} />}
          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">Disagreements: {report.disagreement_count}</span>
        </div>
        {report.assumed_jd_senses?.length > 0 && (
          <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            JD skill meaning assumed (not stated in the JD): {report.assumed_jd_senses.join(", ")}
          </p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-[11px] text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Candidate</th>
              <th className="px-3 py-2 font-semibold">Stage</th>
              <th className="px-3 py-2 font-semibold">Current score</th>
              <th className="px-3 py-2 font-semibold">Current</th>
              <th className="px-3 py-2 font-semibold">Current rank</th>
              <th className="px-3 py-2 font-semibold">Candidate score</th>
              <th className="px-3 py-2 font-semibold">Candidate</th>
              <th className="px-3 py-2 font-semibold">Candidate rank</th>
              <th className="px-3 py-2 font-semibold">Recruiter rank</th>
              <th className="px-3 py-2 font-semibold">Core skills</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => {
              const flagged = row.disagreements?.length > 0;
              const core = row.candidate_core_confirmed || row.current_core_confirmed;
              return (
                <tr key={row.campaign_candidate_id} className={`border-t border-slate-100 align-top ${flagged ? "bg-amber-50/40" : ""}`}>
                  <td className="px-3 py-2">
                    <span className="font-medium text-slate-800">{row.candidate_name}</span>
                    {flagged && <span className="block text-[10px] text-amber-700">{row.disagreements.join(" · ")}</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.stage}</td>
                  <td className="px-3 py-2">{row.current_score ?? "—"}</td>
                  <td className="px-3 py-2"><Outcome value={row.current_outcome} title={row.current_outcome_reason} /></td>
                  <td className="px-3 py-2">{row.current_rank ?? "—"}</td>
                  <td className="px-3 py-2">{row.candidate_score ?? "—"}</td>
                  <td className="px-3 py-2"><Outcome value={row.candidate_outcome} title={row.candidate_outcome_reason} /></td>
                  <td className="px-3 py-2">{row.candidate_rank ?? "—"}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={ranks[row.campaign_candidate_id] ?? ""}
                      onChange={(e) => setRanks((prev) => ({ ...prev, [row.campaign_candidate_id]: e.target.value }))}
                      className="w-16 px-2 py-1 border border-slate-200 rounded text-xs"
                      aria-label={`Recruiter rank for ${row.candidate_name}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-[11px]">
                    {core && <span className="block font-semibold text-slate-700">{core} confirmed</span>}
                    <List label="Confirmed" items={row.core_confirmed_names} tone="text-emerald-700" />
                    <List label="Uncertain" items={row.core_uncertain} tone="text-amber-700" />
                    <List label="Found, not confirmed as core" items={row.core_found_not_confirmed} />
                    <List label="Not the candidate's own skill" items={row.core_rejected_by_llm} tone="text-rose-700" />
                    <List label="Different meaning" items={row.core_sense_mismatch} tone="text-slate-500" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="text-[11px] text-slate-500">
          Ranking by
          <input
            value={rankedBy}
            onChange={(e) => setRankedBy(e.target.value)}
            placeholder="e.g. hiring lead's name"
            maxLength={150}
            className="ml-2 w-48 px-2 py-1 border border-slate-200 rounded text-xs"
          />
        </label>
        <Button variant="primary" size="small" loading={saving} disabled={!dirty && rankedBy === ((report.rows || []).find((r) => r.recruiter_ranked_by)?.recruiter_ranked_by || "")} onClick={saveRanks}>
          <Save className="h-3.5 w-3.5 mr-1" /> Save recruiter ranking
        </Button>
      </div>
    </div>
  );
}
