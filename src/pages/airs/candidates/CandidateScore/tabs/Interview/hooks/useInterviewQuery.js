import { useQuery } from "@tanstack/react-query";
import { getInterviews } from "../services/interviewService";

// Shared with useInterviewMutations.js so a successful schedule/reschedule/
// cancel can invalidate exactly this candidate's cache entry. Key name kept
// as "interview" (singular) even though it now caches a list — it's just an
// identifier, renaming it would only churn every call site for no benefit.
export const interviewQueryKey = (campaignCandidateId) => ["interview", campaignCandidateId];

// Same overall shape as usePromptTemplateDetail (data/isLoading/error), but
// backed by react-query instead of manual useState/useEffect — the whole
// point of the query cache here is that useInterviewMutations.js can
// invalidate it, which a plain fetch-on-mount hook can't participate in.
// `interviews` is [] both while there's genuinely no round yet (backend
// 404, mapped to [] in the service) and before the first fetch resolves —
// isLoading distinguishes the two. Items are ordered by round (index 0 =
// round 1) — there's no explicit round_number field, position is it.
export default function useInterviewQuery(campaignCandidateId) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: interviewQueryKey(campaignCandidateId),
    queryFn: () => getInterviews(campaignCandidateId),
    enabled: !!campaignCandidateId,
  });

  return {
    interviews: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
