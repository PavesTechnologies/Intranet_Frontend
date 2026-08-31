import { useQuery } from "@tanstack/react-query";
import { getRoundFeedback } from "../services/interviewService";

export const roundFeedbackQueryKey = (interviewId) => ["interview-feedback", interviewId];

// Per-round feedback list — purely informational (submitting feedback
// never changes pipeline_stage or the round's status on its own), so this
// is a plain query with no mutation-driven invalidation wired to it from
// elsewhere; useRequestFeedback doesn't touch this cache since requesting
// more emails doesn't change who's already submitted.
export default function useRoundFeedback(campaignCandidateId, interviewId) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: roundFeedbackQueryKey(interviewId),
    queryFn: () => getRoundFeedback(campaignCandidateId, interviewId),
    enabled: !!campaignCandidateId && !!interviewId,
  });

  return {
    feedback: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
