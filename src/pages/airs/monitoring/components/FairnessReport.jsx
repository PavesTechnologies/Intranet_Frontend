import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Scale } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { getFairnessReport, saveFairnessMinGroupSize } from "../services/scoringMonitoringService";
import { apiErrorMessage } from "../../settings/services/aiProviderService";

const th = "py-1.5 pr-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400";
const td = "py-1.5 pr-3 text-xs text-slate-700";
const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

// Pass rates compared across groups the system can see without inferring any protected attribute.
// Uses the monitoring panel's period and campaign. Small groups are hidden; the notes say what it can't show.
export default function FairnessReport({ days, campaignId }) {
  const [report, setReport] = useState(null);
  const [view, setView] = useState("all");
  const [size, setSize] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getFairnessReport({ days, campaignId: campaignId || undefined });
      setReport(data);
      setSize(String(data.min_group_size));
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't load the fairness report."));
    }
  }, [days, campaignId]);

  useEffect(() => { load(); }, [load]);

  const saveSize = async () => {
    setBusy(true);
    try {
      await saveFairnessMinGroupSize(Number(size));
      toast.success("Minimum group size saved.");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save the minimum group size."));
    } finally {
      setBusy(false);
    }
  };

  if (!report) return null;
  const key = view === "all" ? "all" : "meeting_min_experience";
  const count = view === "all" ? report.candidates : report.meeting_min_experience;

  return (
    <section className="space-y-3 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <Scale className="h-3.5 w-3.5 text-slate-500" /> Fairness
          </h4>
          <p className="text-[11px] text-slate-500">
            Screening pass rates by group, for {count} decided candidate(s). Groups under {report.min_group_size} are hidden.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-[11px]" role="group"
            aria-label="Which candidates">
            {[["all", "All candidates"], ["min", "Meeting the minimum experience"]].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={view === value}
                className={`px-2.5 py-1 ${view === value ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
                onClick={() => setView(value)}>
                {label}
              </button>
            ))}
          </div>
          <label className="text-[11px] text-slate-500">Minimum group
            <input type="number" min="2" max="1000" className="ml-1 w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs"
              value={size} onChange={(e) => setSize(e.target.value)} />
          </label>
          <Button variant="outline" size="small" onClick={saveSize}
            disabled={busy || Number(size) === report.min_group_size || !(Number(size) >= 2)}>Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {report.dimensions.map((dimension) => (
          <div key={dimension.key} className="min-w-0">
            <h5 className="mb-1 text-[11px] font-semibold text-slate-700">{dimension.label}</h5>
            <table className="w-full">
              <thead><tr>
                <th className={th}>Group</th><th className={`${th} text-right`}>Candidates</th>
                <th className={`${th} text-right`}>Pass</th><th className={`${th} text-right`}>Pass or hold</th>
                <th className={`${th} text-right`} title="Pass rate divided by the best shown group's">Ratio to best</th>
              </tr></thead>
              <tbody>
                {dimension[key].map((g) => (
                  <tr key={g.group} className="border-t border-slate-100">
                    <td className={td}>{g.group}</td>
                    {g.suppressed ? (
                      <td className={`${td} text-right text-slate-400`} colSpan={4}>fewer than {report.min_group_size}</td>
                    ) : (
                      <>
                        <td className={`${td} text-right tabular-nums`}>{g.candidates}</td>
                        <td className={`${td} text-right tabular-nums`}>{pct(g.pass_rate)}</td>
                        <td className={`${td} text-right tabular-nums`}>{pct(g.pass_or_hold_rate)}</td>
                        <td className={`${td} text-right tabular-nums`}>
                          {g.ratio_to_best == null ? "—" : g.ratio_to_best.toFixed(2)}
                          {g.below_four_fifths && <span className="ml-1 font-semibold text-amber-700">below 4/5</span>}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <ul className="list-disc space-y-1 pl-5 text-[11px] text-slate-500">
        {report.notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  );
}
