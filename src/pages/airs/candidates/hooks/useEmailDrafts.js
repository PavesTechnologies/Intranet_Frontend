import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listEmailDrafts } from "../services/emailDraftService";

export const emailDraftsQueryKey = (campaignCandidateId) => ["airs", "emailDrafts", campaignCandidateId];

// A candidate's emails waiting for Send (email plan phase 3). Interview actions and the Final status tab
// invalidate it, so the panel shows a newly prepared draft right away.
export default function useEmailDrafts(campaignCandidateId) {
  const query = useQuery({
    queryKey: emailDraftsQueryKey(campaignCandidateId),
    queryFn: () => listEmailDrafts(campaignCandidateId),
    enabled: !!campaignCandidateId,
  });
  return { drafts: query.data || [], isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

export function useInvalidateEmailDrafts() {
  const qc = useQueryClient();
  return (campaignCandidateId) => qc.invalidateQueries({
    queryKey: campaignCandidateId ? emailDraftsQueryKey(campaignCandidateId) : ["airs", "emailDrafts"],
  });
}
