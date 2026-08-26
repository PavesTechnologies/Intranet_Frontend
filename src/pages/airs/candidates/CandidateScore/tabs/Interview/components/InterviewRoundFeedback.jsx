import React from "react";
import { toast } from "react-toastify";
import { MessageSquare } from "lucide-react";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useRequestFeedback } from "../hooks/useInterviewMutations";
import { hasRoundStarted } from "../interviewMock";

const RECOMMENDATION_LABEL = {
  ADVANCE: "Advance",
  SELECT: "Select",
  REJECT: "Reject",
  HOLD: "Hold",
};

const RECOMMENDATION_TONE = {
  ADVANCE: "bg-blue-50 text-blue-700 border-blue-100",
  SELECT: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECT: "bg-rose-50 text-rose-700 border-rose-100",
  HOLD: "bg-amber-50 text-amber-700 border-amber-100",
};

// Purely informational — this never changes pipeline_stage or the round's
// status on its own. HR/HM still makes the real call via Select/Reject
// elsewhere; this is input to that decision, not something that
// auto-updates anything here.
export default function InterviewRoundFeedback({ round, feedback, isLoading }) {
  const requestMutation = useRequestFeedback(round.id);

  const started = hasRoundStarted(round);
  const canRequest = round.status !== "CANCELLED";

  const handleRequest = () => {
    requestMutation.mutate(undefined, {
      onSuccess: (queuedCount) => {
        toast.success(
          queuedCount > 0
            ? `Feedback requested from ${queuedCount} interviewer${queuedCount > 1 ? "s" : ""}.`
            : "All interviewers have already been asked or have responded."
        );
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || "Couldn't request feedback. Please try again.");
      },
    });
  };

  return (
    <div className="pt-2 border-t border-slate-100">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500">
          <MessageSquare size={13} /> Feedback
        </span>
        {canRequest && (
          <Button
            variant="outline"
            size="small"
            onClick={handleRequest}
            disabled={!started}
            title={started ? undefined : "Feedback can be requested once the interview has started."}
            loading={requestMutation.isPending}
            loadingText="Requesting..."
          >
            Request Feedback
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner size="sm" text="" />
      ) : feedback.length === 0 ? (
        <p className="text-[12px] text-slate-400">No feedback submitted yet.</p>
      ) : (
        <ul className="space-y-2">
          {feedback.map((f) => (
            <li key={f.id} className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[12.5px] font-semibold text-slate-800">{f.interviewerName}</span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${
                    RECOMMENDATION_TONE[f.recommendation] || "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {RECOMMENDATION_LABEL[f.recommendation] || f.recommendation}
                </span>
              </div>
              {f.notes && <p className="text-[12px] text-slate-600 mt-1">{f.notes}</p>}
              <p className="text-[10.5px] text-slate-400 mt-1">{new Date(f.submittedAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
