import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Activity } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getScoringSummary } from "../services/scoringMonitoringService";
import { apiErrorMessage } from "../../settings/services/aiProviderService";
import OutcomesOverTimeChart from "./OutcomesOverTimeChart";
import LlmPricesEditor from "./LlmPricesEditor";
import OutcomeOverridesReport from "./OutcomeOverridesReport";
import FairnessReport from "./FairnessReport";

const selectClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white";
const th = "py-1.5 pr-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400";
const td = "py-1.5 pr-3 text-xs text-slate-700";
const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const usd = (v) => (v == null ? "—" : v < 0.01 && v > 0 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`);
const PROBLEM_STATUSES = ["FAILURE", "DEAD", "RETRY", "REVOKED"];

function Tile({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2 border-t border-slate-100 pt-4">
      <h4 className="text-[11px] font-bold text-slate-600">{title}</h4>
      {children}
    </section>
  );
}

// Phase 4 monitoring (HR_ADMIN): how scoring is running - outcomes over time, vote quality, LLM usage and
// cost, quota per model, task health, re-parses of rejected candidates, fairness, recruiter overrides. Counts
// and rates only, no candidate details.
export default function ScoringMonitoringPanel() {
  const [days, setDays] = useState(30);
  const [campaignId, setCampaignId] = useState("");
  const [summary, setSummary] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getScoringSummary({ days, campaignId: campaignId || undefined });
      setSummary(data);
      if (!campaignId) {
        const seen = new Map();
        [...(data.outcomes_over_time || []), ...(data.vote_quality || [])]
          .forEach((c) => c.campaign_id && seen.set(c.campaign_id, c.campaign || c.campaign_id));
        setCampaigns([...seen.entries()].map(([id, name]) => ({ id, name })));
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't load the monitoring summary."));
    } finally {
      setLoading(false);
    }
  }, [days, campaignId]);

  useEffect(() => { load(); }, [load]);

  const usage = summary?.llm_usage;
  const appCalls = useMemo(() => (usage?.by_model || []).reduce((n, m) => n + m.calls, 0), [usage]);
  const appCost = useMemo(() => (usage?.by_model || []).reduce((n, m) => n + m.cost_usd, 0), [usage]);
  const tasks = summary?.tasks;
  const pending = (tasks?.pending_results || []).reduce((n, p) => n + p.count, 0);
  const stuck = (tasks?.stuck || []).reduce((n, s) => n + s.count, 0);
  const dead = (tasks?.open_dead_letters || []).reduce((n, d) => n + d.count, 0);
  const problemTypes = (tasks?.by_task_type || []).filter((t) => PROBLEM_STATUSES.some((s) => t[s]));
  const reparses = summary?.rejected_reparses;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Activity className="h-4 w-4 text-slate-500" /> Scoring monitoring
          </h3>
          <p className="text-[11px] text-slate-500">Counts and rates only. Costs are estimates at list price.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectClass} value={days} aria-label="Period" onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <select className={selectClass} value={campaignId} aria-label="Campaign" onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">All campaigns</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button variant="outline" size="small" onClick={load} disabled={loading}>Refresh</Button>
        </div>
      </div>

      {loading && !summary ? <div className="py-6"><LoadingSpinner /></div> : summary && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Tile label="LLM calls" value={appCalls} hint="app calls in the period" />
            <Tile label="Estimated cost" value={usd(appCost)} hint="at list price" />
            <Tile label="Per resume" value={usage?.per_resume?.calls ? usage.per_resume.calls.median : "—"}
              hint={usage?.per_resume?.resumes ? `median calls · ${usd(usage.per_resume.cost_usd?.median)} each`
                : "calls logged per resume from now on"} />
            <Tile label="Pending results" value={pending} hint="scoring waiting on the model" />
            <Tile label="Stuck tasks" value={stuck} hint={`queued or running over ${tasks?.stuck_after_minutes} min`} />
            <Tile label="Open dead letters" value={dead} />
          </div>

          <OutcomesOverTimeChart series={summary.outcomes_over_time} bucket={summary.bucket} />

          <Section title="Vote quality (each candidate's latest v2 result)">
            {summary.vote_quality?.length ? (
              <table className="w-full">
                <thead><tr>
                  <th className={th}>Campaign</th><th className={`${th} text-right`}>Candidates</th>
                  <th className={`${th} text-right`}>Skills voted</th><th className={`${th} text-right`}>Auto-confirmed</th>
                  <th className={`${th} text-right`} title="Voted skills that came back UNCERTAIN">Uncertain</th>
                  <th className={`${th} text-right`} title="Voted skills with both yes and no among the votes">Split votes</th>
                </tr></thead>
                <tbody>
                  {summary.vote_quality.map((v) => (
                    <tr key={v.campaign_id} className="border-t border-slate-100">
                      <td className={td}>{v.campaign}</td>
                      <td className={`${td} text-right tabular-nums`}>{v.candidates}</td>
                      <td className={`${td} text-right tabular-nums`}>{v.voted}</td>
                      <td className={`${td} text-right tabular-nums`}>{v.auto_confirmed}</td>
                      <td className={`${td} text-right tabular-nums`}>{pct(v.uncertain_rate)}</td>
                      <td className={`${td} text-right tabular-nums`}>{pct(v.split_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-xs text-slate-400">No v2 results in this period.</p>}
          </Section>

          <Section title="LLM usage by model (app calls)">
            <table className="w-full">
              <thead><tr>
                <th className={th}>Model</th><th className={`${th} text-right`}>Calls</th><th className={`${th} text-right`}>Failed</th>
                <th className={`${th} text-right`}>Input tokens</th><th className={`${th} text-right`}>Output tokens</th>
                <th className={`${th} text-right`}>Est. cost</th>
              </tr></thead>
              <tbody>
                {(usage?.by_model || []).map((m) => (
                  <tr key={m.model} className="border-t border-slate-100">
                    <td className={td}>{m.model}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.calls}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.failed}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.input_tokens.toLocaleString()}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.output_tokens.toLocaleString()}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.unpriced_calls ? "no price" : usd(m.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usage?.by_context && Object.keys(usage.by_context).some((c) => c !== "app") && (
              <p className="text-[11px] text-slate-400">
                Not counted above:{" "}
                {Object.entries(usage.by_context).filter(([c]) => c !== "app").map(([c, n]) => `${n} ${c.replaceAll("_", " ")}`).join(", ")} calls.
              </p>
            )}
          </Section>

          <Section title={`Quota today (${summary.quota?.zone} day)`}>
            <ul className="space-y-1.5">
              {(summary.quota?.today || []).map((q) => (
                <li key={q.model} className="text-xs text-slate-700">
                  <div className="flex justify-between"><span>{q.model}</span>
                    <span className="tabular-nums">{q.calls} / {q.cap} ({pct(q.share)})</span></div>
                  <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-100" role="meter" aria-valuemin={0}
                    aria-valuemax={q.cap} aria-valuenow={q.calls} aria-label={`${q.model} calls today`}>
                    <div className="h-1.5 rounded-full bg-slate-500" style={{ width: `${Math.min(100, (q.share || 0) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Tasks">
            {!problemTypes.length && !stuck && !pending && !dead
              ? <p className="text-xs text-slate-400">No failed, stuck or pending work.</p> : (
                <table className="w-full">
                  <thead><tr>
                    <th className={th}>Task type</th>
                    {PROBLEM_STATUSES.map((s) => <th key={s} className={`${th} text-right`}>{s.toLowerCase()}</th>)}
                  </tr></thead>
                  <tbody>
                    {problemTypes.map((t) => (
                      <tr key={t.task_type} className="border-t border-slate-100">
                        <td className={td}>{t.task_type}</td>
                        {PROBLEM_STATUSES.map((s) => <td key={s} className={`${td} text-right tabular-nums`}>{t[s] || 0}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            {(tasks?.stuck || []).map((s) => (
              <p key={`${s.task_type}-${s.status}`} className="text-[11px] text-amber-700">
                {s.count} {s.task_type} task(s) {s.status.toLowerCase()} for over {tasks.stuck_after_minutes} minutes.
              </p>
            ))}
            {(tasks?.pending_results || []).map((p) => (
              <p key={`${p.campaign_id}-${p.scoring_version}`} className="text-[11px] text-amber-700">
                {p.count} {p.scoring_version} result(s) PENDING in {p.campaign || p.campaign_id}.
              </p>
            ))}
          </Section>

          {/* Not overrides: a re-parse corrects the input and the new score decides - counted here on
              their own so a pattern shows without inflating override rates. */}
          <Section title="Re-parses of rejected candidates (not counted as overrides)">
            {reparses?.total ? (
              <div className="grid gap-4 md:grid-cols-2">
                <table className="w-full">
                  <thead><tr>
                    <th className={th}>Campaign</th><th className={`${th} text-right`}>Re-parses</th>
                    <th className={`${th} text-right`} title="Sent back to screening to be re-scored">Back to screening</th>
                  </tr></thead>
                  <tbody>
                    {reparses.by_campaign.map((c) => (
                      <tr key={c.campaign_id} className="border-t border-slate-100">
                        <td className={td}>{c.campaign || c.campaign_id}</td>
                        <td className={`${td} text-right tabular-nums`}>{c.count}</td>
                        <td className={`${td} text-right tabular-nums`}>{c.moved_to_screening}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <table className="w-full">
                  <thead><tr>
                    <th className={th}>Requested by</th><th className={`${th} text-right`}>Re-parses</th>
                  </tr></thead>
                  <tbody>
                    {reparses.by_recruiter.map((r) => (
                      <tr key={r.actor_id || "unknown"} className="border-t border-slate-100">
                        <td className={td}>{r.recruiter || "Unknown user"}</td>
                        <td className={`${td} text-right tabular-nums`}>{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-xs text-slate-400">No rejected candidates re-parsed in this period.</p>}
          </Section>

          <FairnessReport days={days} campaignId={campaignId} />

          <Section title="Prices">
            <LlmPricesEditor onSaved={load} />
          </Section>
        </>
      )}

      <OutcomeOverridesReport />
    </div>
  );
}
