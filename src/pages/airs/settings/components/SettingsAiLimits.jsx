import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, ArrowDown, ArrowUp, Cpu, Gauge, Plus, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import {
  fieldProblems, getEmbeddingOverview, getLlmCapabilities, getLlmCaps, previewLlmCapabilities, previewLlmCaps,
  saveLlmCapabilities, saveLlmCaps,
} from "../services/settingsService";
import { apiErrorMessage } from "../services/aiProviderService";

const inputClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white";
const Problems = ({ list }) => (list?.length ? (
  <ul className="list-disc ml-5 mt-2 text-[11px] text-rose-700">{list.map((p) => <li key={p}>{p}</li>)}</ul>
) : null);

// Daily LLM call caps: default and per model in use. Checked and previewed by the server; confirmed; audited.
function DailyCaps() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [problems, setProblems] = useState(null);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = (result) => {
    setData(result);
    setForm({ default: result.default, models: Object.entries(result.models).map(([model, cap]) => ({ model, cap })) });
    setProblems(null);
  };

  useEffect(() => {
    getLlmCaps().then(load).catch((error) => toast.error(apiErrorMessage(error, "Couldn't load the caps.")));
  }, []);

  if (!form) return <LoadingSpinner text="Loading caps..." />;
  const payload = {
    default: form.default === "" ? null : Number(form.default),
    models: Object.fromEntries(form.models.filter((m) => m.model).map((m) => [m.model, m.cap === "" ? null : Number(m.cap)])),
  };
  const unused = data.models_in_use.filter((m) => !form.models.some((row) => row.model === m));

  const startReview = async () => {
    setBusy(true);
    try {
      setProblems(null);
      const result = await previewLlmCaps(payload);
      if (!Object.keys(result.changes).length) { toast.info("Nothing to save."); return; }
      setReview(result);
    } catch (error) {
      const list = fieldProblems(error);
      if (list) setProblems(list);
      else toast.error(apiErrorMessage(error, "Couldn't check the caps."));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      load(await saveLlmCaps(payload));
      toast.success("Caps saved.");
    } catch (error) {
      const list = fieldProblems(error);
      if (list) setProblems(list);
      toast.error(apiErrorMessage(error, "Couldn't save the caps."));
    } finally {
      setBusy(false);
      setReview(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Gauge className="h-4 w-4 text-slate-500" /> Daily LLM call caps</h2>
      <p className="text-[11px] text-slate-500 mt-1 max-w-3xl">
        The most core-skill confirmation calls per day, per model (the provider's quota day). At the cap, candidates are
        scored without the LLM and held for review until full scoring can run. Only models assigned on the AI providers
        tab or used by a scoring version can have their own cap.
      </p>
      <div className="mt-3 space-y-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="w-56 font-semibold text-slate-700">Default (any model without its own cap)</span>
          <input type="number" className={`${inputClass} w-28 text-right`} min={0} max={100000} step={1} disabled={busy}
            value={form.default ?? ""} onChange={(e) => setForm((f) => ({ ...f, default: e.target.value }))} />
          <span className="text-slate-500">calls a day</span>
        </label>
        {form.models.map((row, i) => (
          <div key={row.model || i} className="flex items-center gap-2">
            <span className="w-56 font-mono text-slate-700 truncate">{row.model}</span>
            <input type="number" className={`${inputClass} w-28 text-right`} min={0} max={100000} step={1} disabled={busy}
              value={row.cap ?? ""} onChange={(e) => setForm((f) => ({ ...f, models: f.models.map((m, j) => (j === i ? { ...m, cap: e.target.value } : m)) }))} />
            <span className="text-slate-500">calls a day</span>
            <Button variant="outline" size="small" disabled={busy}
              onClick={() => setForm((f) => ({ ...f, models: f.models.filter((_, j) => j !== i) }))}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {unused.length > 0 && (
          <select className={inputClass} value="" disabled={busy}
            onChange={(e) => e.target.value && setForm((f) => ({ ...f, models: [...f.models, { model: e.target.value, cap: f.default }] }))}>
            <option value="">Add a cap for a model…</option>
            {unused.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>
      <Problems list={problems} />
      <div className="mt-3"><Button variant="primary" size="small" disabled={busy} onClick={startReview}>Review changes</Button></div>
      <ConfirmationModal isOpen={!!review} title="Save these caps?" message="They apply from the next confirmation and are recorded in the audit log."
        confirmText="Save" variant="primary" isLoading={busy} onCancel={() => setReview(null)} onConfirm={save}>
        {review && (
          <div className="space-y-2 text-xs">
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {Object.entries(review.changes).map(([key, c]) => (
                <li key={key} className="px-2 py-1.5"><span className="font-mono">{key}</span>: {c.before ?? "none"} → <strong>{c.after ?? "none"}</strong></li>
              ))}
            </ul>
            {review.warnings.map((w) => (
              <p key={w} className="text-[11px] text-amber-700 flex items-start gap-1.5"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {w}</p>
            ))}
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
}

// The model capability map: what each model accepts. The first matching rule wins, so order matters.
function CapabilityMap() {
  const [data, setData] = useState(null);
  const [rules, setRules] = useState(null);
  const [problems, setProblems] = useState(null);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = (result) => {
    setData(result);
    setRules(result.rules.map((r) => ({ ...r })));
    setProblems(null);
  };

  useEffect(() => {
    getLlmCapabilities().then(load).catch((error) => toast.error(apiErrorMessage(error, "Couldn't load the capability map.")));
  }, []);

  if (!rules) return <LoadingSpinner text="Loading the capability map..." />;
  const set = (i, field, value) => setRules((rs) => rs.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  const move = (i, step) => setRules((rs) => {
    const next = [...rs];
    [next[i], next[i + step]] = [next[i + step], next[i]];
    return next;
  });
  const payload = rules.map((r) => ({ ...r, max_output_tokens: r.max_output_tokens === "" || r.max_output_tokens == null ? null : Number(r.max_output_tokens) }));

  const startReview = async () => {
    setBusy(true);
    try {
      setProblems(null);
      const result = await previewLlmCapabilities(payload);
      const c = result.changes;
      if (!c.rules_added.length && !c.rules_removed.length && !c.rules_changed.length && !c.order_changed) {
        toast.info("Nothing to save.");
        return;
      }
      setReview(c);
    } catch (error) {
      const list = fieldProblems(error);
      if (list) setProblems(list);
      else toast.error(apiErrorMessage(error, "Couldn't check the map."));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      load(await saveLlmCapabilities(payload));
      toast.success("Capability map saved.");
    } catch (error) {
      const list = fieldProblems(error);
      if (list) setProblems(list);
      toast.error(apiErrorMessage(error, "Couldn't save the map."));
    } finally {
      setBusy(false);
      setReview(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mt-4">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Cpu className="h-4 w-4 text-slate-500" /> Model capability map</h2>
      <p className="text-[11px] text-slate-500 mt-1 max-w-3xl">
        What each model accepts: temperature, the structured-output mode and the output token limit. The first matching
        rule wins, so specific patterns go above catch-alls (*). Every model assigned on the AI providers tab must keep a
        matching rule. The model check on the AI providers tab uses this map.
      </p>
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
              <th className="py-1.5 pr-2">#</th><th className="py-1.5 pr-2">Provider</th><th className="py-1.5 pr-2">Model pattern</th>
              <th className="py-1.5 pr-2">Temperature</th><th className="py-1.5 pr-2">Output mode</th><th className="py-1.5 pr-2">Token limit</th>
              <th className="py-1.5 pr-2">Source</th><th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map((r, i) => (
              <tr key={`${i}-${r.provider}-${r.model_pattern}`}>
                <td className="py-1 pr-2 text-slate-400">{i + 1}</td>
                <td className="py-1 pr-2">
                  <select className={inputClass} value={r.provider} disabled={busy}
                    onChange={(e) => { set(i, "provider", e.target.value); set(i, "structured_output", data.structured_output_methods[e.target.value][0]); }}>
                    {data.providers.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-2"><input className={`${inputClass} w-40 font-mono`} value={r.model_pattern} disabled={busy} onChange={(e) => set(i, "model_pattern", e.target.value)} /></td>
                <td className="py-1 pr-2 text-center"><input type="checkbox" checked={!!r.supports_temperature} disabled={busy} onChange={(e) => set(i, "supports_temperature", e.target.checked)} /></td>
                <td className="py-1 pr-2">
                  <select className={inputClass} value={r.structured_output} disabled={busy} onChange={(e) => set(i, "structured_output", e.target.value)}>
                    {(data.structured_output_methods[r.provider] || []).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-2"><input type="number" className={`${inputClass} w-24 text-right`} min={256} max={1000000} placeholder="none" disabled={busy}
                  value={r.max_output_tokens ?? ""} onChange={(e) => set(i, "max_output_tokens", e.target.value)} /></td>
                <td className="py-1 pr-2"><input className={`${inputClass} w-48`} maxLength={300} value={r.source || ""} disabled={busy} onChange={(e) => set(i, "source", e.target.value)} /></td>
                <td className="py-1 whitespace-nowrap">
                  <button type="button" className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" disabled={busy || i === rules.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" className="p-1 text-slate-400 hover:text-rose-600" disabled={busy} onClick={() => setRules((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Problems list={problems} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="small" disabled={busy}
          onClick={() => setRules((rs) => [{ provider: data.providers[0], model_pattern: "", supports_temperature: false, structured_output: data.structured_output_methods[data.providers[0]][0], max_output_tokens: null, source: "" }, ...rs])}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add a rule at the top
        </Button>
        <Button variant="outline" size="small" disabled={busy} onClick={() => load(data)}>Discard</Button>
        <Button variant="primary" size="small" disabled={busy} onClick={startReview}>Review changes</Button>
      </div>
      <ConfirmationModal isOpen={!!review} title="Save the capability map?" message="It applies to the next LLM call and is recorded in the audit log."
        confirmText="Save" variant="primary" isLoading={busy} onCancel={() => setReview(null)} onConfirm={save}>
        {review && (
          <ul className="text-[11px] space-y-1">
            {review.rules_added.length > 0 && <li>Added: <span className="font-mono">{review.rules_added.join(", ")}</span></li>}
            {review.rules_removed.length > 0 && <li>Removed: <span className="font-mono">{review.rules_removed.join(", ")}</span></li>}
            {review.rules_changed.length > 0 && <li>Changed: <span className="font-mono">{review.rules_changed.join(", ")}</span></li>}
            {review.order_changed && <li>The order changed (the first matching rule wins).</li>}
          </ul>
        )}
      </ConfirmationModal>
    </div>
  );
}

function EmbeddingModel() {
  const [data, setData] = useState(null);
  useEffect(() => {
    getEmbeddingOverview().then(setData).catch(() => setData({ active: null }));
  }, []);
  if (!data) return null;
  const a = data.active;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mt-4">
      <h2 className="text-sm font-bold text-slate-800">Embedding model</h2>
      {a ? (
        <p className="text-xs text-slate-600 mt-1">
          <span className="font-mono font-semibold">{a.model_name}</span> ({a.vector_dimensions} dimensions, {a.distance_metric}),
          in use since {a.activated_at ? new Date(a.activated_at).toLocaleDateString() : "—"}: {data.resume_embeddings} resume and {data.jd_embeddings} JD embeddings.
        </p>
      ) : <p className="text-xs text-slate-500 mt-1">No active embedding model.</p>}
      <p className="text-[11px] text-slate-500 mt-1">
        View only. Changing the model rebuilds every embedding and changes scores, so it is planned for after launch.
        Embedding retries and batch size are on the General tab.
      </p>
    </div>
  );
}

// Settings phase 4: LLM limits and the embedding model (view only).
export default function SettingsAiLimits() {
  return (
    <div>
      <DailyCaps />
      <CapabilityMap />
      <EmbeddingModel />
    </div>
  );
}
