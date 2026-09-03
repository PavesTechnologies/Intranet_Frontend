import React from "react";
import { History } from "lucide-react";
import { formatDateTime } from "../../../../utils/candidateDataUtils";

// Renders the reschedule history oldest-to-newest, exactly as stored — this
// mirrors interview_schedule_history's append-only design (Option B): every
// reschedule action adds an entry here, none is ever edited or removed, so
// the UI already demonstrates the guarantee the real backend will enforce.
export default function InterviewHistoryTimeline({ history }) {
  if (!history?.length) {
    return <p className="text-[12px] text-slate-400">No reschedule history yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {history.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <History size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <div className="text-[12px] text-slate-700">
            <div>
              <span className="text-slate-400">{formatDateTime(entry.old_scheduled_at)}</span>
              <span className="mx-1.5 text-slate-300">&rarr;</span>
              <span className="font-semibold text-slate-900">{formatDateTime(entry.new_scheduled_at)}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Changed by <span className="font-medium text-slate-600">{entry.rescheduled_by}</span> on{" "}
              {formatDateTime(entry.changed_at)} &mdash; {entry.reason}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
