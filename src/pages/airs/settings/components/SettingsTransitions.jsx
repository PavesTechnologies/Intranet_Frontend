import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, GitBranch, Lock, Plus, Trash2, Undo2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { fieldProblems, getTransitions, previewTransitions, saveTransitions } from "../services/settingsService";
import { apiErrorMessage } from "../services/aiProviderService";

const ROLE_LABEL = { HR_ADMIN: "HR admin", RECRUITER: "Recruiter", HIRING_MANAGER: "Hiring manager" };
const stageLabel = (s) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "Any");
const selectClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white";
const EMPTY_ADD = { previous_stage: "", from_stage: "", to_stage: "", allowed_roles: [], requires_reason: false };

const describeChange = (c) => {
  const parts = [];
  if (c.allowed_roles?.before) {
    parts.push(`roles ${c.allowed_roles.before.join(", ") || "none"} → ${c.allowed_roles.after.join(", ") || "none"}`);
  } else if (c.allowed_roles) {
    parts.push(`roles ${c.allowed_roles.join(", ")}`);
  }
  if (c.requires_reason?.before !== undefined) {
    parts.push(`reason ${c.requires_reason.before ? "required" : "optional"} → ${c.requires_reason.after ? "required" : "optional"}`);
  }
  return parts.join("; ");
};

// Settings phase 2: who may move candidates between which stages. Changes are collected locally and checked as
// one batch by the server against the pipeline rules (every stage reachable, no new moves out of final stages,
// protected moves kept, only roles a screen supports, SYSTEM untouched); a batch that breaks one is refused.
export default function SettingsTransitions() {
  const [data, setData] = useState(null);
  const [edits, setEdits] = useState({});
  const [removed, setRemoved] = useState(new Set());
  const [added, setAdded] = useState([]);
  const [newMove, setNewMove] = useState(EMPTY_ADD);
  const [problems, setProblems] = useState(null);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = (result) => {
    setData(result);
    setEdits({});
    setRemoved(new Set());
    setAdded([]);
    setProblems(null);
  };

  useEffect(() => {
    getTransitions().then(reset).catch((error) => {
      toast.error(apiErrorMessage(error, "Couldn't load the stage moves."));
    });
  }, []);

  const changes = useMemo(() => {
    if (!data) return [];
    const list = [];
    data.transitions.forEach((t) => {
      if (removed.has(t.id)) {
        list.push({ op: "remove", id: t.id });
        return;
      }
      const e = edits[t.id];
      if (!e) return;
      const change = { op: "update", id: t.id };
      const humanBefore = t.allowed_roles.filter((r) => r !== "SYSTEM");
      if (e.allowed_roles && e.allowed_roles.join() !== humanBefore.join()) change.allowed_roles = e.allowed_roles;
      if (e.requires_reason !== undefined && e.requires_reason !== t.requires_reason) change.requires_reason = e.requires_reason;
      if (Object.keys(change).length > 2) list.push(change);
    });
    added.forEach((a) => list.push({ op: "add", ...a, previous_stage: a.previous_stage || null }));
    return list;
  }, [data, edits, removed, added]);

  if (!data) return <LoadingSpinner text="Loading stage moves..." />;

  const rolesOf = (t) => edits[t.id]?.allowed_roles ?? t.allowed_roles.filter((r) => r !== "SYSTEM");
  const reasonOf = (t) => edits[t.id]?.requires_reason ?? t.requires_reason;

  const toggleRole = (t, role) => {
    const current = rolesOf(t);
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    setEdits((e) => ({ ...e, [t.id]: { ...e[t.id], allowed_roles: data.roles.filter((r) => next.includes(r)) } }));
    setProblems(null);
  };

  const discard = () => reset(data);

  const startReview = async () => {
    setBusy(true);
    try {
      setProblems(null);
      const result = await previewTransitions(changes);
      if (!result.changes?.length) {
        toast.info("Nothing to save.");
        discard();
        return;
      }
      setReview(result.changes);
    } catch (error) {
      const list = fieldProblems(error);
      if (list) setProblems(list);
      else toast.error(apiErrorMessage(error, "Couldn't check the changes."));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const result = await saveTransitions(changes);
      reset(result);
      toast.success(`${result.changed} change${result.changed === 1 ? "" : "s"} saved.`);
    } catch (error) {
      const list = fieldProblems(error);
      if (list) setProblems(list);
      toast.error(apiErrorMessage(error, "Couldn't save the stage moves."));
    } finally {
      setBusy(false);
      setReview(null);
    }
  };

  const fromStages = data.stages.filter((s) => !data.terminal_stages.includes(s));
  const canAdd = newMove.from_stage && newMove.to_stage && newMove.allowed_roles.length > 0 && !busy;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-slate-500" /> Stage moves
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 max-w-3xl">
            Who may move a candidate from one stage to the next, and whether they must give a reason. HR admins
            move candidates through bulk moves and rejections; recruiters and hiring managers through stage moves.
            Moves made by automated scoring <Lock className="inline h-3 w-3" /> and the moves re-parse and re-upload
            use can't be removed. Selected and Rejected are final stages: no new moves out of them. Every stage
            must stay reachable.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {changes.length > 0 && <Button variant="outline" size="small" disabled={busy} onClick={discard}>Discard</Button>}
          <Button variant="primary" size="small" disabled={!changes.length || busy} onClick={startReview}>
            Review changes{changes.length ? ` (${changes.length})` : ""}
          </Button>
        </div>
      </div>

      {problems && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> These changes would break the pipeline rules:
          </p>
          <ul className="list-disc ml-5 mt-1 text-[11px] text-rose-700">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      {data.stages.map((stage) => {
        const rows = data.transitions.filter((t) => t.from_stage === stage);
        if (!rows.length) return null;
        return (
          <div key={stage} className="mt-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
              From {stageLabel(stage)}{data.terminal_stages.includes(stage) && <span className="ml-2 normal-case font-normal text-slate-400">final stage</span>}
            </h3>
            <table className="w-full text-xs border border-slate-100 rounded-lg">
              <tbody className="divide-y divide-slate-100">
                {rows.map((t) => {
                  const isRemoved = removed.has(t.id);
                  return (
                    <tr key={t.id} className={isRemoved ? "bg-rose-50/60 line-through text-slate-400" : edits[t.id] ? "bg-blue-50/40" : ""}>
                      <td className="px-2 py-1.5 font-semibold text-slate-800 whitespace-nowrap">→ {stageLabel(t.to_stage)}</td>
                      <td className="px-2 py-1.5 text-[11px] text-slate-500 whitespace-nowrap">
                        {t.previous_stage ? `arrived from ${stageLabel(t.previous_stage)}` : "any route in"}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="inline-flex flex-wrap gap-2">
                          {data.roles.map((role) => (
                            <label key={role} className="inline-flex items-center gap-1 text-[11px]">
                              <input type="checkbox" disabled={busy || isRemoved} checked={rolesOf(t).includes(role)}
                                onChange={() => toggleRole(t, role)} />
                              {ROLE_LABEL[role]}
                            </label>
                          ))}
                          {t.system && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                              title="Automated scoring makes this move; set in code">
                              <Lock className="h-3 w-3" /> System
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <label className="inline-flex items-center gap-1 text-[11px]">
                          <input type="checkbox" disabled={busy || isRemoved} checked={reasonOf(t)}
                            onChange={(e) => setEdits((ed) => ({ ...ed, [t.id]: { ...ed[t.id], requires_reason: e.target.checked } }))} />
                          Reason required
                        </label>
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        {isRemoved ? (
                          <Button variant="outline" size="small" disabled={busy}
                            onClick={() => setRemoved((s) => { const n = new Set(s); n.delete(t.id); return n; })}>
                            <Undo2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          // A disabled button takes no pointer events, so the reason sits on its wrapper.
                          <span title={t.protected ? `Can't be removed: ${t.protected}` : "Remove this move"}>
                            <Button variant="outline" size="small" disabled={busy || !!t.protected}
                              onClick={() => setRemoved((s) => new Set(s).add(t.id))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {added.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">New moves (not saved yet)</h3>
          <ul className="text-xs divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {added.map((a, i) => (
              <li key={`${a.from_stage}-${a.to_stage}-${a.previous_stage}`} className="flex items-center gap-3 px-2 py-1.5 bg-emerald-50/50">
                <span className="font-semibold">{stageLabel(a.from_stage)} → {stageLabel(a.to_stage)}</span>
                <span className="text-[11px] text-slate-500">{a.previous_stage ? `arrived from ${stageLabel(a.previous_stage)}` : "any route in"}</span>
                <span className="text-[11px]">{a.allowed_roles.map((r) => ROLE_LABEL[r]).join(", ")}{a.requires_reason ? " · reason required" : ""}</span>
                <Button className="ml-auto" variant="outline" size="small" disabled={busy}
                  onClick={() => setAdded((list) => list.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-600">Add a move:</span>
        <select className={selectClass} value={newMove.from_stage} disabled={busy}
          onChange={(e) => setNewMove((m) => ({ ...m, from_stage: e.target.value }))}>
          <option value="">From…</option>
          {fromStages.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
        </select>
        <select className={selectClass} value={newMove.to_stage} disabled={busy}
          onChange={(e) => setNewMove((m) => ({ ...m, to_stage: e.target.value }))}>
          <option value="">To…</option>
          {data.stages.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
        </select>
        <select className={selectClass} value={newMove.previous_stage} disabled={busy}
          onChange={(e) => setNewMove((m) => ({ ...m, previous_stage: e.target.value }))}>
          <option value="">Any route in</option>
          {data.stages.map((s) => <option key={s} value={s}>Arrived from {stageLabel(s)}</option>)}
        </select>
        {data.roles.map((role) => (
          <label key={role} className="inline-flex items-center gap-1 text-[11px]">
            <input type="checkbox" disabled={busy} checked={newMove.allowed_roles.includes(role)}
              onChange={() => setNewMove((m) => ({
                ...m,
                allowed_roles: m.allowed_roles.includes(role)
                  ? m.allowed_roles.filter((r) => r !== role)
                  : data.roles.filter((r) => [...m.allowed_roles, role].includes(r)),
              }))} />
            {ROLE_LABEL[role]}
          </label>
        ))}
        <label className="inline-flex items-center gap-1 text-[11px]">
          <input type="checkbox" disabled={busy} checked={newMove.requires_reason}
            onChange={(e) => setNewMove((m) => ({ ...m, requires_reason: e.target.checked }))} />
          Reason required
        </label>
        <Button variant="outline" size="small" disabled={!canAdd}
          onClick={() => { setAdded((list) => [...list, newMove]); setNewMove(EMPTY_ADD); setProblems(null); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      <ConfirmationModal
        isOpen={!!review}
        title="Save these stage moves?"
        message="They apply to the next move anyone makes and are recorded in the audit log."
        confirmText="Save"
        variant="primary"
        isLoading={busy}
        onCancel={() => setReview(null)}
        onConfirm={save}
      >
        {review && (
          <ul className="text-xs divide-y divide-slate-100 border border-slate-100 rounded-lg max-h-64 overflow-auto">
            {review.map((c) => (
              <li key={`${c.op}-${c.move}`} className="px-2 py-1.5">
                <span className={`text-[10px] font-bold mr-1.5 ${c.op === "remove" ? "text-rose-700" : c.op === "add" ? "text-emerald-700" : "text-blue-700"}`}>
                  {c.op === "remove" ? "Remove" : c.op === "add" ? "Add" : "Change"}
                </span>
                <span className="font-semibold text-slate-700">{c.move}</span>
                {c.op !== "remove" && <div className="text-[11px] text-slate-500">{describeChange(c)}</div>}
              </li>
            ))}
          </ul>
        )}
      </ConfirmationModal>
    </div>
  );
}
