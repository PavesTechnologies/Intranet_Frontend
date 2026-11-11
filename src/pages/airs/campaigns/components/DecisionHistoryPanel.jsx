import React, { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useAuth } from "../../../../contexts/AuthContext";
import { getRejectionHistory } from "../services/candidateActionsService";

// HR admins: the candidate's rejection history, newest first. Read only - overrides are recorded
// through stage moves with a reason code (the old "Override rejection" / "Clear override" actions
// are gone).
export default function DecisionHistoryPanel({ candidate }) {
  const { hasRole } = useAuth();
  const isHrAdmin = hasRole(["HR_ADMIN"]);
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
  }, [candidate?.id, candidate?.pipelineStage]);

  if (!candidate?.id || !isHrAdmin || history.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-2">
        <History className="h-3.5 w-3.5 text-slate-400" /> Decision history
      </h3>
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
                {h.current_status && " · current"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
