import React, { useState } from "react";
import { toast } from "react-toastify";
import { CalendarClock, CalendarPlus } from "lucide-react";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import useInterviewQuery from "./hooks/useInterviewQuery";
import { useScheduleInterview, useRescheduleInterview, useCancelInterview, useCompleteInterview } from "./hooks/useInterviewMutations";
import InterviewScheduleModal from "./components/InterviewScheduleModal";
import CancelInterviewModal from "./components/CancelInterviewModal";
import EditInterviewersModal from "./components/EditInterviewersModal";
import InterviewStatusBadge from "./components/InterviewStatusBadge";
import InterviewRoundCard from "./components/InterviewRoundCard";

// Interview tab (Epic 4) — a candidate can have several interview rounds,
// freely (HM decides count/order). `interviews` is the full ordered list
// from the real query (item 0 = round 1); every mutation invalidates that
// same query instead of merging its own response into local state, so the
// tab always reflects the server's authoritative rounds after any action.
//
// Scheduling is round-aware server-side now: POSTing again while the
// latest round is SCHEDULED/RESCHEDULED atomically completes that round
// and starts a new one — "Schedule Next Round" is the exact same call as
// the first "Schedule Interview", just a different button/label depending
// on the latest round's status.
function getScheduleErrorMessage(error, isNextRound, fallback) {
  if (error?.response?.status === 409) {
    return (
      error.response?.data?.message ||
      (isNextRound
        ? "Couldn't start the next round — it may already have been started elsewhere. Refreshed to the latest state."
        : "This candidate isn't ready for interview scheduling yet.")
    );
  }
  return error?.response?.data?.message || fallback;
}

function getErrorMessage(error, fallback) {
  if (error?.response?.status === 409) {
    return error.response?.data?.message || "This round's status changed elsewhere — refreshed to the latest.";
  }
  return error?.response?.data?.message || fallback;
}

export default function InterviewTab({ candidate }) {
  const { interviews, isLoading, error, refetch } = useInterviewQuery(candidate?.id);
  const [modalMode, setModalMode] = useState(null); // null | "schedule" | "reschedule"
  const [activeRound, setActiveRound] = useState(null); // round being rescheduled
  const [cancelTarget, setCancelTarget] = useState(null);
  const [completingRoundId, setCompletingRoundId] = useState(null);
  const [editInterviewersTarget, setEditInterviewersTarget] = useState(null);

  const scheduleMutation = useScheduleInterview(candidate?.id);
  const rescheduleMutation = useRescheduleInterview(candidate?.id);
  const cancelMutation = useCancelInterview(candidate?.id);
  const completeMutation = useCompleteInterview(candidate?.id);

  const latestRound = interviews.length ? interviews[interviews.length - 1] : null;
  const isFirstRound = (latestRound?.status || "PENDING") === "PENDING";
  // Explicit gate, per product decision: scheduling the next round requires
  // the latest one to already be COMPLETED (via its own "Mark as Completed"
  // action on the round card) — scheduling no longer auto-completes the
  // previous round as a side effect from the recruiter's point of view,
  // even though the backend endpoint itself still supports that atomically.
  const canScheduleNext = isFirstRound || latestRound?.status === "COMPLETED";
  // A real PENDING placeholder round (nothing scheduled yet) has no details
  // worth showing — same treatment as no rounds at all. Round numbers come
  // from each item's original position, not the filtered list's index, so
  // they stay stable even if a PENDING row ever shows up somewhere unusual.
  const displayRounds = interviews
    .map((round, idx) => ({ round, roundNumber: idx + 1 }))
    .filter((item) => item.round.status !== "PENDING");

  const openSchedule = () => {
    setActiveRound(null);
    setModalMode("schedule");
  };

  const openReschedule = (round) => {
    setActiveRound(round);
    setModalMode("reschedule");
  };

  const handleScheduleSubmit = (values) => {
    const isNextRound = !isFirstRound;
    scheduleMutation.mutate(values, {
      onSuccess: () => {
        setModalMode(null);
        toast.success(
          isNextRound
            ? "Next round scheduled — the previous round is now marked complete."
            : "Interview scheduled successfully. A calendar invitation will be sent to the selected interviewers once calendar integration is enabled."
        );
      },
      onError: (err) => {
        toast.error(getScheduleErrorMessage(err, isNextRound, "Couldn't schedule the interview. Please try again."));
        // Unlike reschedule/cancel (which target one specific round and
        // still make sense to retry with the same input), a schedule error
        // means the whole premise of "is there a next round to start" may
        // have changed under this tab — closing forces a look at the
        // refetched, authoritative list instead of retrying blind against
        // a wizard whose captured isNextRound is now stale.
        setModalMode(null);
        setActiveRound(null);
        if (err?.response?.status === 409) refetch();
      },
    });
  };

  const handleRescheduleSubmit = (values) => {
    rescheduleMutation.mutate(
      { interviewId: activeRound.id, payload: values },
      {
        onSuccess: () => {
          setModalMode(null);
          setActiveRound(null);
          toast.success("Interview rescheduled successfully.");
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, "Couldn't reschedule the interview. Please try again."));
          if (err?.response?.status === 409) refetch();
        },
      }
    );
  };

  const handleCancelConfirm = (reason) => {
    cancelMutation.mutate(
      { interviewId: cancelTarget.id, reason },
      {
        onSuccess: () => {
          setCancelTarget(null);
          toast.success("Interview cancelled.");
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, "Couldn't cancel the interview. Please try again."));
          if (err?.response?.status === 409) refetch();
        },
      }
    );
  };

  const handleComplete = (round) => {
    setCompletingRoundId(round.id);
    completeMutation.mutate(round.id, {
      onSuccess: ({ feedbackQueuedCount }) => {
        setCompletingRoundId(null);
        toast.success(
          feedbackQueuedCount > 0
            ? `Marked as completed — feedback requested from ${feedbackQueuedCount} interviewer${feedbackQueuedCount > 1 ? "s" : ""}.`
            : "Marked as completed."
        );
      },
      onError: (err) => {
        setCompletingRoundId(null);
        toast.error(getErrorMessage(err, "Couldn't mark this interview as completed. Please try again."));
        if (err?.response?.status === 409) refetch();
      },
    });
  };

  // Reuses the reschedule endpoint with the round's own date/time/platform/
  // etc. unchanged — the backend detects nothing schedule-related changed
  // and skips appending a history entry, so this stays a plain reschedule
  // call from the frontend's side.
  const handleEditInterviewersSubmit = ({ interviewers, reason }) => {
    const round = editInterviewersTarget;
    rescheduleMutation.mutate(
      {
        interviewId: round.id,
        payload: {
          interviewers,
          date: round.date,
          startTime: round.start_time,
          endTime: round.end_time,
          durationMinutes: round.duration_minutes,
          platform: round.platform,
          location: round.location,
          notes: round.notes,
          reason,
        },
      },
      {
        onSuccess: () => {
          setEditInterviewersTarget(null);
          toast.success("Interviewers updated.");
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, "Couldn't update the interviewer list. Please try again."));
          if (err?.response?.status === 409) refetch();
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <LoadingSpinner text="Loading interviews..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load interview details"
        message="We couldn't load this candidate's interview rounds. Please try again."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900">
          <CalendarClock size={14} className="text-blue-500" /> Interview
          {displayRounds.length > 0 && (
            <span className="text-slate-400 font-normal">
              ({displayRounds.length} round{displayRounds.length > 1 ? "s" : ""})
            </span>
          )}
        </span>
        <Button
          size="small"
          onClick={openSchedule}
          disabled={!canScheduleNext}
          title={canScheduleNext ? undefined : "Mark the current round as completed before scheduling the next one."}
        >
          <CalendarPlus size={14} /> {isFirstRound ? "Schedule Interview" : "Schedule Next Round"}
        </Button>
      </div>

      {displayRounds.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-[12.5px] text-slate-500">No interview scheduled yet.</span>
          <InterviewStatusBadge status="PENDING" />
        </div>
      ) : (
        displayRounds.map(({ round, roundNumber }, idx) => (
          <InterviewRoundCard
            key={round.id}
            round={round}
            roundNumber={roundNumber}
            // Most recent round open by default, earlier ones collapsed —
            // each card's expand state is otherwise independent after that.
            defaultExpanded={idx === displayRounds.length - 1}
            onReschedule={openReschedule}
            onCancel={setCancelTarget}
            onComplete={handleComplete}
            isCompleting={completeMutation.isPending && completingRoundId === round.id}
            onEditInterviewers={setEditInterviewersTarget}
          />
        ))
      )}

      {modalMode && (
        <InterviewScheduleModal
          mode={modalMode}
          round={modalMode === "reschedule" ? activeRound : null}
          isSubmitting={modalMode === "reschedule" ? rescheduleMutation.isPending : scheduleMutation.isPending}
          onClose={() => {
            setModalMode(null);
            setActiveRound(null);
          }}
          onSubmit={modalMode === "reschedule" ? handleRescheduleSubmit : handleScheduleSubmit}
        />
      )}

      {cancelTarget && (
        <CancelInterviewModal
          candidateName={candidate?.name}
          round={cancelTarget}
          isSubmitting={cancelMutation.isPending}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancelConfirm}
        />
      )}

      {editInterviewersTarget && (
        <EditInterviewersModal
          round={editInterviewersTarget}
          isSubmitting={rescheduleMutation.isPending}
          onClose={() => setEditInterviewersTarget(null)}
          onSubmit={handleEditInterviewersSubmit}
        />
      )}
    </div>
  );
}
