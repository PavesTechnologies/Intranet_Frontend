import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleInterview, rescheduleInterview, cancelInterview, requestFeedback, completeInterview } from "../services/interviewService";
import { interviewQueryKey } from "./useInterviewQuery";
import { emailDraftsQueryKey } from "../../../../hooks/useEmailDrafts";

// Email plan phase 3: every interview action prepares its emails as drafts - the drafts panel refreshes too.
const refresh = (qc, campaignCandidateId) => {
  qc.invalidateQueries({ queryKey: interviewQueryKey(campaignCandidateId) });
  qc.invalidateQueries({ queryKey: campaignCandidateId ? emailDraftsQueryKey(campaignCandidateId) : ["airs", "emailDrafts"] });
};

// Each mutation invalidates the one candidate's interview query on success,
// so the tab re-renders from the server's authoritative state rather than
// the mutation's own response — the actual point of using react-query's
// cache here instead of local component state.
export const useScheduleInterview = (campaignCandidateId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => scheduleInterview(campaignCandidateId, payload),
    onSuccess: () => refresh(qc, campaignCandidateId),
  });
};

export const useRescheduleInterview = (campaignCandidateId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ interviewId, payload }) => rescheduleInterview(interviewId, payload),
    onSuccess: () => refresh(qc, campaignCandidateId),
  });
};

export const useCancelInterview = (campaignCandidateId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ interviewId, reason }) => cancelInterview(interviewId, reason),
    onSuccess: () => refresh(qc, campaignCandidateId),
  });
};

// Requesting feedback doesn't change who has already submitted (the feedback list query stays); it
// prepares feedback-request drafts, so the drafts panel refreshes.
export const useRequestFeedback = (interviewId, campaignCandidateId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => requestFeedback(interviewId),
    onSuccess: () => qc.invalidateQueries({
      queryKey: campaignCandidateId ? emailDraftsQueryKey(campaignCandidateId) : ["airs", "emailDrafts"],
    }),
  });
};

export const useCompleteInterview = (campaignCandidateId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (interviewId) => completeInterview(interviewId),
    onSuccess: () => refresh(qc, campaignCandidateId),
  });
};
