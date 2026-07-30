import React, { useEffect, useState } from "react";
import { resumeTimeline } from "../../service/resumeIntake";
import { STAGE_LABELS } from "../intake/constants/intakeConstants";

// Per the resume-intake API reference (§4.5), the timeline endpoint is a
// sanctioned lightweight poll target while a stage is RUNNING — suggested
// cadence 3-5s. Kept independent per row (rather than folded into the parent
// list's 10s poll) so only rows actually PARSING pay for it.
const TIMELINE_POLL_INTERVAL_MS = 4000;

// Renders the real per-resume stage/progress for one "In Processing" row,
// backed by GET /resumes/{resume_id}/timeline. Resumes still PENDING have no
// stage yet (a stage only appears in the response once it has actually run),
// so this renders nothing until the row moves to PARSING.
export default function InProcessingStageCell({ resumeId, parseStatus }) {
  const [timeline, setTimeline] = useState(null);

  useEffect(() => {
    if (parseStatus !== "PARSING" || !resumeId) {
      setTimeline(null);
      return undefined;
    }

    let cancelled = false;

    const fetchTimeline = async () => {
      try {
        const res = await resumeTimeline(resumeId);
        if (!cancelled) setTimeline(res?.data || null);
      } catch (err) {
        // A transient timeline-fetch failure leaves the last known stage
        // showing rather than blanking the row.
      }
    };

    fetchTimeline();
    const intervalId = setInterval(fetchTimeline, TIMELINE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [resumeId, parseStatus]);

  if (parseStatus !== "PARSING") return null;

  if (!timeline) {
    return <span className="text-[10px] text-slate-400 mt-1">Starting…</span>;
  }

  const pct = Math.min(100, Math.round(timeline.progress_percent ?? 0));
  const stageLabel = timeline.current_stage
    ? STAGE_LABELS[timeline.current_stage] || timeline.current_stage
    : "Queued";

  return (
    <div className="w-40 flex flex-col justify-center text-left mt-1.5">
      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
        <span>{stageLabel}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
