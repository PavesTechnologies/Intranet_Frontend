import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, FlaskConical, RefreshCw, Save } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import {
  formatApiError,
  getScoringShadowReport,
  saveShadowRecruiterRanking,
  setScoringV2Shadow,
} from "../services/campaignservice";

// Scoring v2 shadow report (HR_ADMIN). v1 is what the pipeline acts on; v2 is
// computed alongside for comparison only. A recruiter's own ranking can be
// entered to compare both against. Rows where v1 and v2 (or either and the
// recruiter) disagree are highlighted.

const OUTCOME_STYLES = {
  PASS: "bg-emerald-50 text-emerald-700",
  REVIEW: "bg-amber-50 text-amber-700",
  REJECT: "bg-rose-50 text-rose-700",
  PENDING: "bg-slate-100 text-slate-600",
  NOT_RUN: "bg-slate-100 text-slate-500",
  NOT_SCORED: "bg-slate-50 text-slate-400",
};
const OUTCOME_LABELS = { NOT_RUN: "Not run", NOT_SCORED: "Not scored", PENDING: "Pending" };

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

export default function ScoringShadowReport({ campaignId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ranks, setRanks] = useState({});
  const [rankedBy, setRankedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getScoringShadowReport(campaignId);
      const data = res?.data ?? res;
      setReport(data);
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

  const toggleShadow = async (enabled) => {
    setSwitching(true);
    try {
      const res = await setScoringV2Shadow(campaignId, enabled, enabled);
      const result = res?.data ?? res;
      toast.success(
        enabled
          ? `Shadow scoring on. ${result?.queued ?? 0} candidate(s) queued for v2 - refresh in a few minutes.`
          : "Shadow scoring off. Stored v2 results stay in the report."
      );
      await load();
    } catch (err) {
      toast.error(formatApiError(err, "Could not change shadow scoring."));
    } finally {
      setSwitching(false);
    }
  };

  if (loading && !report) return <LoadingSpinner text="Loading shadow report..." />;
  if (error && !report) return <p className="text-sm text-rose-700">Couldn't load the shadow report.</p>;
  if (!report) return null;

  const counts = report.v2_outcome_counts || {};
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FlaskConical className="h-5 w-5 text-slate-500" />
          <div className="mr-auto">
            <h3 className="text-sm font-semibold text-slate-800">Scoring v2 — shadow comparison</h3>
            <p className="text-[11px] text-slate-500">
              v1 decides. v2 is computed alongside for comparison only and never changes a candidate's stage.
            </p>
          </div>
          <span className="text-[11px] text-slate-500">
            LLM calls today: {report.daily_llm_calls_used} / {report.daily_llm_call_cap}
          </span>
          <Button variant="outline" size="small" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            variant={report.scoring_v2_shadow ? "outline" : "primary"}
            size="small"
            loading={switching}
            onClick={() => toggleShadow(!report.scoring_v2_shadow)}
            title={report.scoring_v2_shadow ? "Stop computing v2 for this campaign" : "Compute v2 for this campaign's candidates (uses LLM calls)"}
          >
            {report.scoring_v2_shadow ? "Turn shadow off" : "Turn shadow on & score existing candidates"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
          {Object.entries(counts).map(([outcome, n]) => (
            <span key={outcome} className={`px-2 py-0.5 rounded ${OUTCOME_STYLES[outcome] || OUTCOME_STYLES.NOT_SCORED}`}>
              v2 {OUTCOME_LABELS[outcome] || outcome}: {n}
            </span>
          ))}
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
              <th className="px-3 py-2 font-semibold">v1 score</th>
              <th className="px-3 py-2 font-semibold">v1</th>
              <th className="px-3 py-2 font-semibold">v1 rank</th>
              <th className="px-3 py-2 font-semibold">v2 score</th>
              <th className="px-3 py-2 font-semibold">v2</th>
              <th className="px-3 py-2 font-semibold">v2 rank</th>
              <th className="px-3 py-2 font-semibold">Recruiter rank</th>
              <th className="px-3 py-2 font-semibold">v2 core skills</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => {
              const flagged = row.disagreements?.length > 0;
              return (
                <tr key={row.campaign_candidate_id} className={`border-t border-slate-100 align-top ${flagged ? "bg-amber-50/40" : ""}`}>
                  <td className="px-3 py-2">
                    <span className="font-medium text-slate-800">{row.candidate_name}</span>
                    {flagged && <span className="block text-[10px] text-amber-700">{row.disagreements.join(" · ")}</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.stage}</td>
                  <td className="px-3 py-2">{row.v1_score ?? "—"}</td>
                  <td className="px-3 py-2"><Outcome value={row.v1_outcome} /></td>
                  <td className="px-3 py-2">{row.v1_rank ?? "—"}</td>
                  <td className="px-3 py-2">{row.v2_score ?? "—"}</td>
                  <td className="px-3 py-2"><Outcome value={row.v2_outcome} title={row.v2_outcome_reason} /></td>
                  <td className="px-3 py-2">{row.v2_rank ?? "—"}</td>
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
                    {row.v2_core_confirmed && <span className="block font-semibold text-slate-700">{row.v2_core_confirmed} confirmed</span>}
                    <List label="Confirmed" items={row.v2_core_confirmed_names} tone="text-emerald-700" />
                    <List label="Uncertain" items={row.v2_core_uncertain} tone="text-amber-700" />
                    <List label="Found, not confirmed as core" items={row.v2_core_found_not_confirmed} />
                    <List label="Not the candidate's own skill" items={row.v2_core_rejected_by_llm} tone="text-rose-700" />
                    <List label="Different meaning" items={row.v2_core_sense_mismatch} tone="text-slate-500" />
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
