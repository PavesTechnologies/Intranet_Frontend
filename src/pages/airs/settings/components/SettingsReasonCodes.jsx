import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ListChecks, Lock, Plus } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { addReasonCode, getReasonCodes, updateReasonCode } from "../services/settingsService";
import { apiErrorMessage } from "../services/aiProviderService";

const inputClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white";
const CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,39}$/;

// Settings phase 1: the reasons a person picks when moving a candidate against the screening outcome.
// Codes are never renamed or deleted (past overrides keep them); retire one to stop offering it.
export default function SettingsReasonCodes() {
  const [codes, setCodes] = useState(null);
  const [labels, setLabels] = useState({});
  const [orders, setOrders] = useState({});
  const [adding, setAdding] = useState({ code: "", label: "" });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = (rows) => {
    setCodes(rows);
    setLabels({});
    setOrders({});
  };

  useEffect(() => {
    getReasonCodes().then(reset).catch((error) => {
      toast.error(apiErrorMessage(error, "Couldn't load the reason codes."));
      setCodes([]);
    });
  }, []);

  const run = async (action, success) => {
    setBusy(true);
    try {
      reset(await action());
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't save the reason code."));
      return false;
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const changesFor = (row) => {
    const payload = {};
    const label = labels[row.code];
    if (label !== undefined && label.trim() !== row.label) payload.label = label.trim();
    const order = orders[row.code];
    if (order !== undefined && order !== "" && Number(order) !== row.sort_order) payload.sort_order = Number(order);
    return payload;
  };

  const newCode = adding.code.trim().toUpperCase();
  const canAdd = CODE_PATTERN.test(newCode) && adding.label.trim().length >= 2 && !busy;

  if (!codes) return <LoadingSpinner text="Loading reason codes..." />;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-slate-500" /> Override reason codes
      </h2>
      <p className="text-[11px] text-slate-500 mt-1 max-w-2xl">
        The reasons recruiters and hiring managers pick when they move a candidate against the screening
        outcome. A code is never renamed or deleted, so past overrides keep their meaning: retire a code to
        stop offering it. "Other" always stays available.
      </p>

      <table className="w-full mt-4 text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
            <th className="py-1.5 pr-2 font-semibold">Code</th>
            <th className="py-1.5 pr-2 font-semibold">Label</th>
            <th className="py-1.5 pr-2 font-semibold">Order</th>
            <th className="py-1.5 pr-2 font-semibold">Used</th>
            <th className="py-1.5 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {codes.map((row) => {
            const payload = changesFor(row);
            const dirty = Object.keys(payload).length > 0;
            return (
              <tr key={row.code} className={row.is_active ? "" : "opacity-60"}>
                <td className="py-1.5 pr-2 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                  {row.code}
                  {row.locked && <Lock className="inline h-3 w-3 ml-1 text-slate-400" title="Always available" />}
                </td>
                <td className="py-1.5 pr-2">
                  <input className={`${inputClass} w-full`} maxLength={80} disabled={busy}
                    value={labels[row.code] ?? row.label}
                    onChange={(e) => setLabels((l) => ({ ...l, [row.code]: e.target.value }))} />
                </td>
                <td className="py-1.5 pr-2">
                  <input type="number" className={`${inputClass} w-16 text-right`} min={0} max={10000} step={1}
                    disabled={busy} value={orders[row.code] ?? row.sort_order}
                    onChange={(e) => setOrders((o) => ({ ...o, [row.code]: e.target.value }))} />
                </td>
                <td className="py-1.5 pr-2 text-slate-500">{row.times_used}</td>
                <td className="py-1.5 text-right whitespace-nowrap space-x-1.5">
                  {dirty && (
                    <Button variant="primary" size="small" disabled={busy}
                      onClick={() => setPending({ kind: "edit", row, payload })}>Save</Button>
                  )}
                  {!row.locked && (
                    <Button variant="outline" size="small" disabled={busy}
                      onClick={() => setPending({ kind: "active", row, payload: { is_active: !row.is_active } })}>
                      {row.is_active ? "Retire" : "Restore"}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 border-t border-slate-100 pt-3 flex flex-wrap items-center gap-2">
        <input className={`${inputClass} w-48 font-mono`} placeholder="NEW_CODE" maxLength={40} disabled={busy}
          value={adding.code} onChange={(e) => setAdding((a) => ({ ...a, code: e.target.value }))} />
        <input className={`${inputClass} w-64`} placeholder="Label people see" maxLength={80} disabled={busy}
          value={adding.label} onChange={(e) => setAdding((a) => ({ ...a, label: e.target.value }))} />
        <Button variant="outline" size="small" disabled={!canAdd}
          onClick={() => setPending({ kind: "add", payload: { code: newCode, label: adding.label.trim() } })}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add code
        </Button>
        {adding.code && !CODE_PATTERN.test(newCode) && (
          <span className="text-[11px] text-rose-600">3 to 40 capital letters, digits or underscores, starting with a letter.</span>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!pending}
        title={{ add: "Add this reason code?", edit: "Save this change?", active: pending?.row?.is_active ? "Retire this code?" : "Restore this code?" }[pending?.kind] || ""}
        message={(() => {
          if (!pending) return "";
          if (pending.kind === "add") return `${pending.payload.code}: "${pending.payload.label}" will be offered from the next move.`;
          if (pending.kind === "active") {
            return pending.row.is_active
              ? `${pending.row.code} will no longer be offered. Past overrides keep it.`
              : `${pending.row.code} will be offered again.`;
          }
          const parts = [];
          if (pending.payload.label !== undefined) parts.push(`label "${pending.row.label}" → "${pending.payload.label}"`);
          if (pending.payload.sort_order !== undefined) parts.push(`order ${pending.row.sort_order} → ${pending.payload.sort_order}`);
          return `${pending.row.code}: ${parts.join("; ")}.`;
        })()}
        confirmText={pending?.kind === "active" && pending.row.is_active ? "Retire" : "Save"}
        variant={pending?.kind === "active" && pending.row.is_active ? "danger" : "primary"}
        isLoading={busy}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (pending.kind === "add") {
            if (await run(() => addReasonCode(pending.payload), "Reason code added.")) setAdding({ code: "", label: "" });
          } else {
            await run(() => updateReasonCode(pending.row.code, pending.payload), "Reason code saved.");
          }
        }}
      />
    </div>
  );
}
