import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleInterview, rescheduleInterview, cancelInterview, requestFeedback, completeInterview } from "../services/interviewService";
import { interviewQueryKey } from "./useInterviewQuery";

// Each mutation invalidates the one candidate's interview query on success,
// so the tab re-renders from the server's authoritative state rather than
// the mutation's own response — the actual point of using react-query's
// cache here instead of local component state.
export const useScheduleInterview = (campaignCandidateId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => scheduleInterview(campaignCandidateId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: interviewQueryKey(campaignCandidateId) }),
  });
};

export const useRescheduleInterview = (campaignCandidateId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ interviewId, payload }) => rescheduleInterview(interviewId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: interviewQueryKey(campaignCandidateId) }),
  });
};

export const useCancelInterview = (campaignCandidateId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ interviewId, reason }) => cancelInterview(interviewId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: interviewQueryKey(campaignCandidateId) }),
  });
};

// No cache to invalidate here — requesting more emails doesn't change who
// has already submitted, so it doesn't touch the feedback list query.
export const useRequestFeedback = (interviewId) =>
  useMutation({
    mutationFn: () => requestFeedback(interviewId),
  });

export const useCompleteInterview = (campaignCandidateId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (interviewId) => completeInterview(interviewId),
    onSuccess: () => qc.invalidateQueries({ queryKey: interviewQueryKey(campaignCandidateId) }),
  });
};
