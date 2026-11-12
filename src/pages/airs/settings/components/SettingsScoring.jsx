import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { CheckCircle2, FlaskConical, Loader2, Plus, Rocket, Trash2, XCircle } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import {
  createScoringVersion, listScoringVersions, promoteScoringVersion, retireScoringVersion,
} from "../../campaigns/services/campaignservice";
import { fieldProblems, getGoldenBudget, getGoldenRuns, getScoringConfig, startGoldenRun } from "../services/settingsService";
import { apiErrorMessage } from "../services/aiProviderService";

const inputClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white";
const label = (s) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const ACTIVE = ["QUEUED", "RUNNING"];
const STOP_TEXT = {
  DAILY_LIMIT_RESERVE: "stopped to keep LLM calls for real candidates",
  CANDIDATES_AWAITING_FULL_SCORING: "stopped: candidates are waiting for full scoring",
  CONFIGURATION_CHANGED: "stopped: the version changed",
};
const unwrapList = (res) => (Array.isArray(res) ? res : res?.data ?? []);

// The settings a version changes compared with another (dotted keys, before -> after).
function differences(a, b, prefix = "") {
  const out = [];
  Object.keys({ ...a, ...b }).forEach((key) => {
    const x = a?.[key];
    const y = b?.[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (x && y && typeof x === "object" && !Array.isArray(x) && typeof y === "object" && !Array.isArray(y)) {
      out.push(...differences(x, y, path));
    } else if (JSON.stringify(x) !== JSON.stringify(y)) {
      out.push({ path, before: x, after: y });
    }
  });
  return out;
}

const show = (v) => (Array.isArray(v) ? `${v.length} entr${v.length === 1 ? "y" : "ies"}` : v === null || v === undefined ? "none" : String(v));

function RunSummary({ run }) {
  if (!run?.summary) return null;
  const parts = [["With the LLM", run.summary.llm], ["Without the LLM", run.summary.no_llm]].filter(([, p]) => p && p.cases);
  return (
    <ul className="text-[11px] space-y-1">
      {parts.map(([title, p]) => (
        <li key={title}>
          <span className="font-semibold text-slate-700">{title}:</span>{" "}
          {p.cases_scored}/{p.cases} cases · {p.expectation_failures.length} expectation failure(s) ·{" "}
          {p.pair_failures.length} counterfactual pair(s) failing · {p.cache_misses.length} cache miss(es) ·{" "}
          {p.changed_vs_accepted.length} case(s) changed from the accepted run{p.changed_vs_accepted.length ? ` (${p.changed_vs_accepted.slice(0, 8).join(", ")}${p.changed_vs_accepted.length > 8 ? "…" : ""})` : ""} ·{" "}
          {p.llm_calls} LLM call(s)
        </li>
      ))}
    </ul>
  );
}

function GoldenPanel({ version, onRuns }) {
  const [data, setData] = useState(null);
  const [budget, setBudget] = useState(null);
  const [confirmRun, setConfirmRun] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getGoldenRuns(version.id);
      setData(result);
      onRuns?.(result);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't load the golden runs."));
    }
  }, [version.id, onRuns]);

  useEffect(() => { load(); }, [load]);

  const latest = data?.runs?.[0];
  const running = latest && ACTIVE.includes(latest.status);
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [running, load]);

  const estimate = data?.runs?.find((r) => r.kind === "ESTIMATE" && r.status === "ESTIMATED" && r.config_hash === data.config_hash);
  const lastRun = data?.runs?.find((r) => r.kind === "RUN");

  useEffect(() => {
    if (!estimate) { setBudget(null); return; }
    getGoldenBudget(version.id, estimate.expected_llm_calls || 0).then(setBudget).catch(() => setBudget(null));
  }, [estimate, version.id]);

  const start = async (kind) => {
    setBusy(true);
    try {
      await startGoldenRun(version.id, kind);
      toast.success(kind === "ESTIMATE" ? "Estimating - no LLM call is made." : "Golden run started.");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't start it."));
    } finally {
      setBusy(false);
      setConfirmRun(false);
    }
  };

  if (!data) return <LoadingSpinner text="Loading golden runs..." />;
  const fits = budget && budget.used_today + budget.needed + budget.reserved_for_candidates <= budget.cap;

  return (
    <div className="border border-slate-100 rounded-lg p-3 mt-3">
      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        <FlaskConical className="h-3.5 w-3.5" /> Golden set
        {version.status === "current" && <span className="font-normal text-slate-500">— check the current version, e.g. after reference-data edits</span>}
      </h4>
      {running ? (
        <p className="text-[11px] text-slate-600 mt-2 flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" /> {latest.kind === "ESTIMATE" ? "Estimating" : "Running"}… this takes a few minutes.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="small" disabled={busy} onClick={() => start("ESTIMATE")}>Estimate LLM calls</Button>
            {estimate && (
              <Button variant="primary" size="small" disabled={busy || !fits} onClick={() => setConfirmRun(true)}>
                Run the golden set
              </Button>
            )}
          </div>
          {estimate && (
            <p className="text-[11px] text-slate-600">
              Expected: about <strong>{estimate.expected_llm_calls}</strong> LLM call{estimate.expected_llm_calls === 1 ? "" : "s"}
              {budget && <> on {budget.model || "the configured model"} — {budget.used_today} used today of {budget.cap}, {budget.reserved_for_candidates} kept for real candidates.</>}
              {budget && !fits && <span className="text-rose-600"> Not enough calls left today without using the candidates' share.</span>}
            </p>
          )}
          {!estimate && <p className="text-[11px] text-slate-500">Estimate first: it shows the LLM calls a run would make, and costs none.</p>}
        </div>
      )}
      {lastRun && !ACTIVE.includes(lastRun.status) && (
        <div className="mt-3 text-[11px]">
          <div className="flex items-center gap-1.5 font-semibold">
            {lastRun.status === "PASSED" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
            Last run: {lastRun.status.toLowerCase()}{lastRun.stop_reason ? ` (${STOP_TEXT[lastRun.stop_reason] || lastRun.stop_reason})` : ""}
            {lastRun.finished_at && <span className="font-normal text-slate-400"> · {new Date(lastRun.finished_at).toLocaleString()}</span>}
            {lastRun.config_hash !== data.config_hash && <span className="font-normal text-amber-700"> · for an earlier configuration</span>}
          </div>
          <RunSummary run={lastRun} />
        </div>
      )}
      <ConfirmationModal
        isOpen={confirmRun}
        title="Run the golden set?"
        message={`About ${estimate?.expected_llm_calls ?? 0} LLM calls today. The run stops by itself rather than use calls real candidates need, and never while candidates are waiting for full scoring.`}
        confirmText="Run"
        variant="primary"
        isLoading={busy}
        onCancel={() => setConfirmRun(false)}
        onConfirm={() => start("RUN")}
      />
    </div>
  );
}

function FieldInput({ rule, value, onChange }) {
  if (rule.type === "bool") {
    return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
  }
  if (rule.type === "sections") {
    return (
      <span className="inline-flex flex-wrap gap-2">
        {rule.options.map((o) => (
          <label key={o} className="inline-flex items-center gap-1 text-[11px]">
            <input type="checkbox" checked={(value || []).includes(o)}
              onChange={() => onChange((value || []).includes(o) ? value.filter((x) => x !== o) : [...(value || []), o])} />
            {label(o.toLowerCase())}
          </label>
        ))}
      </span>
    );
  }
  return (
    <input type="number" className={`${inputClass} w-24 text-right`} min={rule.min} max={rule.max}
      step={rule.type === "int" ? 1 : "any"} value={value ?? ""}
      placeholder={rule.type === "number_or_none" ? "none" : undefined}
      onChange={(e) => onChange(e.target.value === "" ? (rule.type === "number_or_none" ? null : "") : Number(e.target.value))} />
  );
}

function NewVersionForm({ config, current, onCreated, onCancel }) {
  const [form, setForm] = useState(() => JSON.parse(JSON.stringify(current)));
  const [meta, setMeta] = useState({ label: "", note: "", model: "" });
  const [problems, setProblems] = useState(null);
  const [busy, setBusy] = useState(false);

  // Only what differs from the defaults is stored: merge_config fills in the rest.
  const overrides = useMemo(() => {
    const out = {};
    Object.entries(config.schema).forEach(([section, rule]) => {
      const value = form[section];
      const base = config.defaults[section];
      if (rule.type) {
        if (JSON.stringify(value) !== JSON.stringify(base)) out[section] = value;
      } else {
        const changed = Object.fromEntries(Object.keys(rule).filter((k) => JSON.stringify(value?.[k]) !== JSON.stringify(base?.[k])).map((k) => [k, value[k]]));
        if (Object.keys(changed).length) out[section] = changed;
      }
    });
    return out;
  }, [form, config]);
  const changes = differences(current, form);

  const set = (section, key, value) => setForm((f) => (key ? { ...f, [section]: { ...f[section], [key]: value } } : { ...f, [section]: value }));

  const submit = async () => {
    setBusy(true);
    setProblems(null);
    try {
      await createScoringVersion({ label: meta.label.trim(), configuration: overrides, model: meta.model.trim(), note: meta.note.trim() });
      toast.success("Version created. Try it on a campaign, then run the golden set.");
      onCreated();
    } catch (error) {
      const list = fieldProblems(error);
      if (list) setProblems(list);
      else toast.error(apiErrorMessage(error, "Couldn't create the version."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-blue-100 bg-blue-50/30 rounded-lg p-3 mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <input className={`${inputClass} w-56`} placeholder="Version name" maxLength={100} value={meta.label}
          onChange={(e) => setMeta((m) => ({ ...m, label: e.target.value }))} />
        <input className={`${inputClass} w-56`} placeholder="Confirmation model (optional)" maxLength={150} value={meta.model}
          onChange={(e) => setMeta((m) => ({ ...m, model: e.target.value }))} />
        <input className={`${inputClass} flex-1 min-w-[12rem]`} placeholder="Why this version (optional)" maxLength={1000} value={meta.note}
          onChange={(e) => setMeta((m) => ({ ...m, note: e.target.value }))} />
      </div>
      <p className="text-[11px] text-slate-500">Starts from the current version. Change only what this version should try.</p>
      {Object.entries(config.schema).filter(([s]) => s !== "near_miss" && s !== "match_blocklist").map(([section, rule]) => (
        <div key={section}>
          <div className="text-[11px] font-bold text-slate-600">{label(section)}</div>
          {rule.type ? (
            <div className="mt-1"><FieldInput rule={rule} value={form[section]} onChange={(v) => set(section, null, v)} /></div>
          ) : (
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(rule).map(([key, r]) => (
                <label key={key} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                  {label(key)} <FieldInput rule={r} value={form[section]?.[key]} onChange={(v) => set(section, key, v)} />
                  {r.min !== undefined && <span className="text-[10px] text-slate-400">{r.min}–{r.max}</span>}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      <div>
        <div className="text-[11px] font-bold text-slate-600">Match blocklist <span className="font-normal text-slate-500">(applies in this version's golden run and from promotion; a campaign's shadow trial can't use it)</span></div>
        {(form.match_blocklist || []).map((entry, i) => (
          <div key={`${entry.term}-${i}`} className="flex flex-wrap gap-2 mt-1">
            <input className={`${inputClass} w-48`} placeholder="Written term" value={entry.term}
              onChange={(e) => set("match_blocklist", null, form.match_blocklist.map((x, j) => (j === i ? { ...x, term: e.target.value } : x)))} />
            <input className={`${inputClass} w-48`} placeholder="Catalogue skill" value={entry.skill}
              onChange={(e) => set("match_blocklist", null, form.match_blocklist.map((x, j) => (j === i ? { ...x, skill: e.target.value } : x)))} />
            <Button variant="outline" size="small" onClick={() => set("match_blocklist", null, form.match_blocklist.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button className="mt-1" variant="outline" size="small"
          onClick={() => set("match_blocklist", null, [...(form.match_blocklist || []), { term: "", skill: "" }])}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add a blocked match
        </Button>
      </div>
      {problems && (
        <ul className="list-disc ml-5 text-[11px] text-rose-700">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
      )}
      <div className="flex items-center gap-2">
        <Button variant="primary" size="small" disabled={busy || !meta.label.trim() || !changes.length} onClick={submit}>
          Create version ({changes.length} change{changes.length === 1 ? "" : "s"})
        </Button>
        <Button variant="outline" size="small" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// Settings phase 3: scoring changes only through scoring versions - try a version on a campaign (shadow),
// run the golden set for its exact configuration, then promote it. Promotion needs a passing run.
export default function SettingsScoring() {
  const [versions, setVersions] = useState(null);
  const [config, setConfig] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [runs, setRuns] = useState(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, cfg] = await Promise.all([listScoringVersions(), getScoringConfig()]);
      const rows = unwrapList(list);
      setVersions(rows);
      setConfig(cfg);
      setSelectedId((id) => id || (rows.find((v) => v.status === "candidate") || rows.find((v) => v.status === "current"))?.id);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't load the scoring versions."));
      setVersions([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!versions || !config) return <LoadingSpinner text="Loading scoring versions..." />;
  const current = versions.find((v) => v.status === "current");
  const selected = versions.find((v) => v.id === selectedId);
  const changes = selected && current && selected.id !== current.id
    ? differences(current.effective_configuration, selected.effective_configuration) : [];
  const promotionRun = runs?.promotion_run;

  const act = async () => {
    setBusy(true);
    try {
      if (pending === "promote") await promoteScoringVersion(selected.id);
      else await retireScoringVersion(selected.id);
      toast.success(pending === "promote" ? `${selected.label} is now the current version.` : `${selected.label} retired.`);
      setSelectedId(null);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't change the version."));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-slate-500" /> Scoring
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 max-w-3xl">
            Scoring rules change only through scoring versions: create one, try it on a campaign (its Scoring versions
            tab scores candidates with it in shadow, deciding nothing), run the golden set for it, then promote it. A
            version can only be promoted with a passing golden run for exactly its configuration.
          </p>
        </div>
        {!creating && <Button variant="primary" size="small" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5 mr-1" /> New version</Button>}
      </div>

      {creating && current && (
        <NewVersionForm config={config} current={current.effective_configuration}
          onCancel={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 mt-4">
        <ul className="border border-slate-100 rounded-lg divide-y divide-slate-100 self-start">
          {versions.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => { setSelectedId(v.id); setRuns(null); }}
                className={`w-full text-left px-3 py-2 text-xs ${selectedId === v.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                <div className="font-semibold text-slate-800">{v.label}</div>
                <div className="text-[10px] text-slate-500">{v.status}{v.model ? ` · ${v.model}` : ""}{v.campaigns_trying?.length ? ` · tried on ${v.campaigns_trying.length}` : ""}</div>
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-800">{selected.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{selected.status}</span>
              {selected.status === "candidate" && (
                <span className="ml-auto inline-flex gap-2">
                  <span title={promotionRun ? "" : "Needs a passing golden run for this exact configuration"}>
                    <Button variant="primary" size="small" disabled={!promotionRun || busy} onClick={() => setPending("promote")}>Promote</Button>
                  </span>
                  <Button variant="outline" size="small" disabled={busy} onClick={() => setPending("retire")}>Retire</Button>
                </span>
              )}
            </div>
            {selected.note && <p className="text-[11px] text-slate-500 mt-1">{selected.note}</p>}
            {selected.status !== "current" && (
              <div className="mt-2">
                <div className="text-[11px] font-bold text-slate-600">Changes from the current version</div>
                {changes.length ? (
                  <ul className="text-[11px] text-slate-600 mt-1">
                    {changes.map((c) => <li key={c.path}><span className="font-mono">{c.path}</span>: {show(c.before)} → <strong>{show(c.after)}</strong></li>)}
                  </ul>
                ) : <p className="text-[11px] text-slate-400">Same configuration as the current version.</p>}
              </div>
            )}
            {selected.campaigns_trying?.length > 0 && (
              <p className="text-[11px] text-slate-500 mt-2">Tried on: {selected.campaigns_trying.map((c) => c.name).join(", ")}</p>
            )}
            {selected.status !== "retired" && <GoldenPanel key={selected.id} version={selected} onRuns={setRuns} />}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!pending}
        title={pending === "promote" ? `Make ${selected?.label} the current version?` : `Retire ${selected?.label}?`}
        message={pending === "promote"
          ? "Every campaign scores with it from the next score on (nothing is re-scored automatically); the current version is retired and campaigns trying a version stop. Its golden run:"
          : "Campaigns trying it stop. It can't be promoted afterwards."}
        confirmText={pending === "promote" ? "Promote" : "Retire"}
        variant={pending === "promote" ? "primary" : "danger"}
        isLoading={busy}
        onCancel={() => setPending(null)}
        onConfirm={act}
      >
        {pending === "promote" && promotionRun && (
          <div className="text-[11px]">
            <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Passed {promotionRun.finished_at ? new Date(promotionRun.finished_at).toLocaleString() : ""}
            </div>
            <RunSummary run={promotionRun} />
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
}
