import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import { getLlmPrices, saveLlmPrices } from "../services/scoringMonitoringService";
import { apiErrorMessage } from "../../settings/services/aiProviderService";

const inputClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs w-24";

const toRows = (prices) => Object.entries(prices?.models || {}).map(([model, p]) => ({
  model, input: String(p.input), output: String(p.output), source: p.source || "",
}));

// List prices per model, used only for the cost estimates. Saving is audited.
export default function LlmPricesEditor({ onSaved }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setRows(toRows(await getLlmPrices()));
      } catch (error) {
        toast.error(apiErrorMessage(error, "Couldn't load the LLM prices."));
      }
    })();
  }, []);

  const setRow = (i, patch) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const save = async () => {
    setBusy(true);
    try {
      const models = Object.fromEntries(rows.filter((r) => r.model.trim()).map((r) => [r.model.trim(), {
        input: Number(r.input), output: Number(r.output), ...(r.source ? { source: r.source } : {}),
      }]));
      setRows(toRows(await saveLlmPrices(models)));
      toast.success("LLM prices saved.");
      onSaved?.();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save the LLM prices."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h4 className="mb-1 text-[11px] font-bold text-slate-600">LLM list prices (USD per 1M tokens)</h4>
      <p className="mb-2 text-[11px] text-slate-400">
        Used only for the cost estimates. Output includes thinking tokens. Check the provider&apos;s pricing page when
        changing a price.
      </p>
      <table className="w-full text-xs">
        <thead><tr className="text-left text-[10px] uppercase text-slate-400">
          <th className="py-1 pr-2">Model</th><th className="py-1 pr-2">Input</th><th className="py-1 pr-2">Output</th>
          <th className="py-1 pr-2">Source</th><th className="py-1" />
        </tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="py-1 pr-2">
                <input className={`${inputClass} w-44`} value={row.model} aria-label="Model"
                  onChange={(e) => setRow(i, { model: e.target.value })} />
              </td>
              <td className="py-1 pr-2">
                <input className={inputClass} type="number" min="0" step="0.01" value={row.input} aria-label="Input price"
                  onChange={(e) => setRow(i, { input: e.target.value })} />
              </td>
              <td className="py-1 pr-2">
                <input className={inputClass} type="number" min="0" step="0.01" value={row.output} aria-label="Output price"
                  onChange={(e) => setRow(i, { output: e.target.value })} />
              </td>
              <td className="py-1 pr-2">
                <input className={`${inputClass} w-full min-w-[12rem]`} value={row.source} aria-label="Source"
                  onChange={(e) => setRow(i, { source: e.target.value })} />
              </td>
              <td className="py-1 text-right">
                <button type="button" className="text-[11px] text-slate-400 hover:text-rose-600"
                  onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" size="small"
          onClick={() => setRows((r) => [...r, { model: "", input: "0", output: "0", source: "" }])}>
          Add model
        </Button>
        <Button size="small" onClick={save} disabled={busy}>Save prices</Button>
      </div>
    </div>
  );
}
