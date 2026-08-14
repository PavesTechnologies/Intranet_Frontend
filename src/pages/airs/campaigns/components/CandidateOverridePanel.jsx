import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { RotateCcw, ShieldCheck, Undo2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import ReasonModal from "./ReasonModal";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  applyHrOverride,
  clearOverride,
  getRejectionHistory,
} from "../services/candidateActionsService";

// Which action is offered comes from the candidate's state, not a toggle: the
// two are never both valid. A REJECTED candidate can be overridden; an override
// that has not yet produced a new outcome can be cleared.
export default function CandidateOverridePanel({ candidate, onChanged }) {
  const { hasRole } = useAuth();
  const isHrAdmin = hasRole(["HR_ADMIN"]);
  const [open, setOpen] = useState(null);
  // The rejection history doubles as the override history: every
  // entry records whether it was overridden.
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!candidate?.id) return undefined;
    (async () => {
      try {
        const rows = await getRejectionHistory(candidate.id);
        if (!cancelled) setHistory(rows);
      } catch {
        if (!cancelled) setHistory([]);
      }
    })();
    return () => { cancelled = true; };
  }, [candidate?.id, candidate?.hrOverride, candidate?.pipelineStage]);

  if (!candidate?.id || !isHrAdmin) return null;

  const stage = (candidate.pipelineStage || candidate.stage || "").toUpperCase();
  const canOverride = stage === "REJECTED" && !candidate.hrOverride;
  // The server only permits clearing while the candidate is still in SCREENING
  // Past that the override has produced a real outcome. Mirrored here so we
  // don't offer a button that is guaranteed to 409.
  const canClear = candidate.hrOverride && stage === "SCREENING";

  // Nothing to act on AND nothing to show — stay out of the way entirely.
  if (!canOverride && !canClear && history.length === 0) return null;


  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-2">
        <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> HR Override
      </h3>

      {canOverride && (
        <>
          <p className="text-[11px] text-slate-600 mb-2">
            This candidate was rejected automatically. An override returns them to screening and
            re-runs the remaining scoring pipeline. Available only for deterministic or semantic
            rejections.
          </p>
          <Button variant="primary" size="small" onClick={() => setOpen("apply")}>
            <RotateCcw className="h-3 w-3 mr-1" /> Override rejection
          </Button>
        </>
      )}

      {canClear && (
        <>
          <p className="text-[11px] text-slate-600 mb-1">
            An HR override is currently in force on this candidate.
          </p>
          {candidate.overrideReason && (
            <p className="text-[11px] text-slate-500 italic mb-2 border-l-2 border-slate-200 pl-2">
              “{candidate.overrideReason}”
            </p>
          )}
          <p className="text-[11px] text-slate-500 mb-2">
            Clearing it restores the automated decision that was replaced. This is only possible
            while the candidate is still in screening.
          </p>
          <Button variant="outline" size="small" onClick={() => setOpen("clear")}>
            <Undo2 className="h-3 w-3 mr-1" /> Clear override
          </Button>
        </>
      )}

      {/* Override history, newest first */}
      {history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">
            Decision history
          </p>
          <div className="space-y-1.5">
            {history.map((h) => (
              <div key={h.id} className="flex items-start gap-2 text-[11px]">
                <span className="shrink-0 mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  #{h.evaluation_round}
                </span>
                <div className="min-w-0">
                  <p className="text-slate-700 break-words">
                    <span className="font-semibold">{h.rejection_layer}</span> — {h.rejection_reason}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {h.rejected_at ? new Date(h.rejected_at).toLocaleString() : ""}
                    {h.hr_override && " · overridden by HR"}
                    {h.current_status && " · current"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ReasonModal
        isOpen={open === "apply"}
        onClose={() => setOpen(null)}
        title="Override this rejection"
        description="The original rejection is preserved on the record — it is replaced, never deleted."
        confirmLabel="Apply override"
        placeholder="Why should this candidate re-enter the pipeline?"
        onConfirm={async (reason) => {
          try {
            await applyHrOverride(candidate.id, reason);
            toast.success("Override applied — the candidate is back in screening.");
            setOpen(null);
            onChanged?.();
          } catch (err) {
            toast.error(err?.response?.data?.message || "Could not apply the override.");
          }
        }}
      />

      <ReasonModal
        isOpen={open === "clear"}
        onClose={() => setOpen(null)}
        title="Clear this override"
        description="The candidate returns to REJECTED with the original automated decision restored."
        confirmLabel="Clear override"
        variant="danger"
        placeholder="Why is this override being withdrawn?"
        onConfirm={async (reason) => {
          try {
            const res = await clearOverride(candidate.id, reason);
            toast.success(
              `Override cleared — ${(res?.restored_decision_source || "automated").toLowerCase()} decision restored.`
            );
            setOpen(null);
            onChanged?.();
          } catch (err) {
            toast.error(err?.response?.data?.message || "Could not clear the override.");
          }
        }}
      />
    </div>
  );
}
