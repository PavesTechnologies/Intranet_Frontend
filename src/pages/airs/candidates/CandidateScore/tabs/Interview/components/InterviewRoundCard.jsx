import React, { useState } from "react";
import { toast } from "react-toastify";
import { Copy, CheckCircle2, ChevronDown } from "lucide-react";
import Button from "@/components/Button/Button";
import { textOrDash } from "../../../../utils/candidateDataUtils";
import { INTERVIEW_TYPE_LABEL, PLATFORM_LABEL, formatDateLabel, formatTimeLabel, hasRoundEnded } from "../interviewMock";
import useRoundFeedback from "../hooks/useRoundFeedback";
import InterviewStatusBadge from "./InterviewStatusBadge";
import InterviewHistoryTimeline from "./InterviewHistoryTimeline";
import InterviewRoundFeedback from "./InterviewRoundFeedback";

// Marking a round COMPLETED (see canComplete below) is a separate, explicit
// action from this — this indicator reads purely from the feedback list,
// independent of status, and stays useful even for a round nobody's
// explicitly marked complete yet.
function FeedbackProgress({ interviewerCount, feedbackCount }) {
  if (!interviewerCount) return null;
  if (feedbackCount >= interviewerCount) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border-emerald-100">
        <CheckCircle2 size={11} /> Feedback complete
      </span>
    );
  }
  if (feedbackCount > 0) {
    return (
      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-bold bg-amber-50 text-amber-700 border-amber-100">
        {feedbackCount}/{interviewerCount} feedback received
      </span>
    );
  }
  return null;
}

function DetailRow({ label, children }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-[13px] font-semibold text-slate-900 mt-0.5">{children}</div>
    </div>
  );
}

// One round's full card — every round gets the same treatment regardless of
// position (round 1's card looks the same as round 3's). A round can always
// be rescheduled once it's had a real date/time (even after being
// cancelled — a fresh POST only starts a *new* round, so reschedule is the
// only way back to a scheduled state for that same round), but Cancel/Copy
// Link only make sense while it's actually active.
//
// The header (round label + type + date/time + status badge) is its own
// button, separate from everything below it — action buttons live in the
// body, never nested inside the header's clickable area, so a click on
// Reschedule/Cancel/etc. can't bubble into the collapse toggle by
// construction. No stopPropagation needed because there's no shared click
// target to propagate through.
export default function InterviewRoundCard({
  round,
  roundNumber,
  defaultExpanded = false,
  onReschedule,
  onCancel,
  onComplete,
  isCompleting,
  onEditInterviewers,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const canReschedule = round.status === "SCHEDULED" || round.status === "RESCHEDULED" || round.status === "CANCELLED";
  const canCancel = round.status === "SCHEDULED" || round.status === "RESCHEDULED";
  // Same set as canCancel today, but named for what it actually means —
  // editing interviewers only makes sense on an active, still-happening
  // round (not CANCELLED, which canReschedule otherwise allows back into).
  const canEditInterviewers = round.status === "SCHEDULED" || round.status === "RESCHEDULED";
  // Absent (not disabled) until end_at passes — there's genuinely nothing
  // to do yet, same reasoning as Request Feedback's start_at gate.
  const canComplete = (round.status === "SCHEDULED" || round.status === "RESCHEDULED") && hasRoundEnded(round);

  // Fetched once here and passed down to InterviewRoundFeedback — the
  // header's "done" indicator and the detail list below both read the
  // same round's feedback, no reason to fetch it twice.
  const { feedback, isLoading: feedbackLoading } = useRoundFeedback(round.campaign_candidate_id, round.id);
  const interviewerCount = round.interviewers?.length || 0;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(round.meeting_link);
    toast.success("Meeting link copied to clipboard.");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 flex-wrap p-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        <span className="flex items-center gap-3 flex-wrap min-w-0">
          <span className="text-[12.5px] font-bold text-slate-900 whitespace-nowrap">
            Round {roundNumber} <span className="text-slate-400 font-normal">· {INTERVIEW_TYPE_LABEL[round.interview_type] || round.interview_type}</span>
          </span>
          <span className="text-[11.5px] text-slate-400 whitespace-nowrap">
            {formatDateLabel(round.date)} · {formatTimeLabel(round.start_time)}-{formatTimeLabel(round.end_time)}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {!feedbackLoading && <FeedbackProgress interviewerCount={interviewerCount} feedbackCount={feedback.length} />}
          <InterviewStatusBadge status={round.status} />
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <DetailRow label="Date">{formatDateLabel(round.date)}</DetailRow>
            <DetailRow label="Time">
              {formatTimeLabel(round.start_time)} - {formatTimeLabel(round.end_time)}
            </DetailRow>
            <DetailRow label="Platform">{PLATFORM_LABEL[round.platform]}</DetailRow>
            <DetailRow label="Duration">{round.duration_minutes ? `${round.duration_minutes} minutes` : "-"}</DetailRow>
          </div>

          <DetailRow label="Interviewers">
            {round.interviewers.length ? (
              <ul className="mt-1 space-y-0.5">
                {round.interviewers.map((i) => (
                  <li key={i.id} className="text-[12.5px] font-medium text-slate-700">
                    {i.name} <span className="text-slate-400 font-normal">({i.email})</span>
                  </li>
                ))}
              </ul>
            ) : (
              "-"
            )}
          </DetailRow>

          {round.platform === "ONSITE" ? (
            <DetailRow label="Location">{textOrDash(round.location)}</DetailRow>
          ) : round.meeting_link ? (
            <div>
              <div className="text-[11px] text-slate-400">Meeting Link</div>
              {round.status === "CANCELLED" ? (
                // Backend keeps meeting_link on a cancelled round as historical
                // record — still worth showing, but not as something to click
                // into for an interview that no longer exists.
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[12.5px] font-medium text-slate-400 line-through break-all">{round.meeting_link}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">(meeting cancelled)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={round.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] font-medium text-blue-600 hover:underline break-all"
                  >
                    {round.meeting_link}
                  </a>
                  <button onClick={handleCopyLink} className="text-slate-400 hover:text-blue-600 shrink-0" aria-label="Copy meeting link">
                    <Copy size={13} />
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {round.notes && (
            <DetailRow label="Notes">
              <span className="font-normal text-slate-700">{round.notes}</span>
            </DetailRow>
          )}

          {round.status === "CANCELLED" && round.cancel_reason && (
            <DetailRow label="Cancellation Reason">
              <span className="font-normal text-rose-700">{round.cancel_reason}</span>
            </DetailRow>
          )}

          {round.history?.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11.5px] font-semibold text-slate-500 mb-2">Reschedule History</div>
              <InterviewHistoryTimeline history={round.history} />
            </div>
          )}

          {canReschedule && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
              {canCancel && round.meeting_link && (
                <Button variant="outline" size="small" onClick={handleCopyLink}>
                  Copy Meeting Link
                </Button>
              )}
              <Button variant="outline" size="small" onClick={() => onReschedule(round)}>
                Reschedule
              </Button>
              {canEditInterviewers && (
                <Button variant="outline" size="small" onClick={() => onEditInterviewers(round)}>
                  Edit Interviewers
                </Button>
              )}
              {canCancel && (
                <Button variant="danger" size="small" onClick={() => onCancel(round)}>
                  Cancel
                </Button>
              )}
              {canComplete && (
                <Button variant="primary" size="small" onClick={() => onComplete(round)} loading={isCompleting} loadingText="Completing...">
                  Mark as Completed
                </Button>
              )}
            </div>
          )}

          <InterviewRoundFeedback round={round} feedback={feedback} isLoading={feedbackLoading} />
        </div>
      )}
    </div>
  );
}
