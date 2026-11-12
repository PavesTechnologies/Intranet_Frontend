import React, { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { previewReferenceImpact } from "../services/settingsService";

// Settings phase 3: shown in the confirm step of a reference-data edit (skill catalogue, certification
// mappings, education field pairs, profile templates). Loads which live campaigns the edit affects and how
// many scored candidates it will mark "score out of date"; scores are never changed automatically.
// target: { kind, skill_ids? | certification_id? | role_domain? | template_key? }
export default function ReferenceImpactNote({ target }) {
  const [impact, setImpact] = useState(null);
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(target || {});

  useEffect(() => {
    let cancelled = false;
    setImpact(null);
    setFailed(false);
    if (!target) return undefined;
    previewReferenceImpact(target)
      .then((result) => { if (!cancelled) setImpact(result); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
    // key stands for target's contents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!target) return null;
  if (failed) {
    return <p className="text-[11px] text-slate-500">Couldn't check which campaigns this affects.</p>;
  }
  if (!impact) {
    return (
      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking which campaigns this affects…
      </p>
    );
  }
  if (!impact.campaigns.length) {
    return <p className="text-[11px] text-slate-500">No live campaign uses this, so no score is affected.</p>;
  }
  const names = impact.campaigns.slice(0, 3).map((c) => c.name).join(", ");
  const more = impact.campaigns.length > 3 ? ` and ${impact.campaigns.length - 3} more` : "";
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 flex items-start gap-1.5">
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        Affects {impact.campaigns.length} live campaign{impact.campaigns.length === 1 ? "" : "s"} ({names}{more}).{" "}
        {impact.candidates_marked_out_of_date} scored candidate{impact.candidates_marked_out_of_date === 1 ? "" : "s"} will
        be marked "score out of date" for a recruiter to re-score. To check scoring overall, run the golden set on
        Settings › Scoring.
      </span>
    </div>
  );
}
