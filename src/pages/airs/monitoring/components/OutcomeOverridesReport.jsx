import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { GitCompareArrows } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { useAuth } from "../../../../contexts/AuthContext";
import { getOutcomeOverrideReport } from "../services/outcomeOverrideService";
import { apiErrorMessage } from "../../settings/services/aiProviderService";

const KIND_LABEL = { OVERRIDE: "Override", REVIEW_DECISION: "HOLD resolved" };
const DIRECTION_LABEL = { UP: "moved forward", DOWN: "moved back" };
const inputClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs";
const th = "py-1.5 pr-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400";
const td = "py-1.5 pr-3 text-xs text-slate-700";

function CountList({ title, rows, labelKey, empty = "None." }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-1 text-[11px] font-bold text-slate-600">{title}</h4>
      {rows?.length ? (
        <ul className="space-y-0.5">
          {rows.map((row) => (
            <li key={row[labelKey]} className="flex justify-between gap-3 text-xs text-slate-700">
              <span className="truncate">{row[labelKey]}</span>
              <span className="font-semibold tabular-nums">{row.count}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-slate-400">{empty}</p>}
    </div>
  );
}

// Phase 4: how often people move candidates against the system's screening outcome, and the most
// common patterns. HR_ADMIN only - renders nothing for other roles. No candidate details.
export default function OutcomeOverridesReport() {
  const { hasRole } = useAuth();
  const isHrAdmin = hasRole(["HR_ADMIN"]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await getOutcomeOverrideReport({ since, until }));
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't load the overrides report."));
    } finally {
      setLoading(false);
    }
  }, [since, until]);

  useEffect(() => {
    if (isHrAdmin) load();
    // Loads once; the date filters apply on Refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHrAdmin]);

  if (!isHrAdmin) return null;

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <GitCompareArrows className="h-4 w-4 text-slate-500" /> Recruiter overrides
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Moves against the system&apos;s screening outcome (a PASS rejected or put on hold, a REJECT brought
            back) and HOLD resolutions, each with its reason code.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-slate-500">From
            <input type="date" className={`${inputClass} ml-1`} value={since} onChange={(e) => setSince(e.target.value)} />
          </label>
          <label className="text-[11px] text-slate-500">Before
            <input type="date" className={`${inputClass} ml-1`} value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
          <Button variant="outline" size="small" onClick={load} disabled={loading}>Refresh</Button>
        </div>
      </div>

      {loading && !report ? <div className="py-6"><LoadingSpinner /></div> : report && (
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-6 text-xs text-slate-600">
            <span><span className="text-lg font-bold text-slate-900">{report.overrides}</span> overrides</span>
            <span><span className="text-lg font-bold text-slate-900">{report.review_decisions}</span> HOLDs resolved</span>
          </div>

          <div>
            <h4 className="mb-1 text-[11px] font-bold text-slate-600">Most common patterns</h4>
            {report.patterns?.length ? (
              <table className="w-full">
                <thead><tr>
                  <th className={th}>Kind</th><th className={th}>System outcome</th><th className={th}>Move</th>
                  <th className={th}>Reason</th><th className={`${th} text-right`}>Count</th>
                </tr></thead>
                <tbody>
                  {report.patterns.map((p) => (
                    <tr key={`${p.kind}-${p.system_outcome}-${p.direction}-${p.reason_code}`} className="border-t border-slate-100">
                      <td className={td}>{KIND_LABEL[p.kind] || p.kind}</td>
                      <td className={td}>{p.system_outcome}</td>
                      <td className={td}>{DIRECTION_LABEL[p.direction] || p.direction}</td>
                      <td className={td}>{p.reason}</td>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-xs text-slate-400">No overrides recorded in this period.</p>}
          </div>

          <div>
            <h4 className="mb-1 text-[11px] font-bold text-slate-600">By campaign</h4>
            {report.by_campaign?.length ? (
              <table className="w-full">
                <thead><tr>
                  <th className={th}>Campaign</th><th className={`${th} text-right`}>Overrides</th>
                  <th className={`${th} text-right`}>HOLDs resolved</th>
                  <th className={`${th} text-right`} title="Candidates overridden at least once, of those with a decided outcome">Override rate</th>
                </tr></thead>
                <tbody>
                  {report.by_campaign.map((c) => (
                    <tr key={c.campaign_id} className="border-t border-slate-100">
                      <td className={td}>{c.campaign || c.campaign_id}</td>
                      <td className={`${td} text-right tabular-nums`}>{c.overrides}</td>
                      <td className={`${td} text-right tabular-nums`}>{c.review_decisions}</td>
                      <td className={`${td} text-right tabular-nums`}>
                        {c.override_rate == null ? "—" : `${Math.round(c.override_rate * 100)}% of ${c.decided_candidates}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-xs text-slate-400">None.</p>}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <CountList title="Reasons" rows={report.by_reason} labelKey="reason" />
            <CountList title="Missing core skills behind the outcome" rows={report.by_missing_core_skill} labelKey="skill" />
            <CountList title="Failed checks behind the outcome" rows={report.by_failed_check} labelKey="check" />
            <CountList title="Profile template" rows={report.by_template} labelKey="template" />
          </div>
        </div>
      )}
    </div>
  );
}
