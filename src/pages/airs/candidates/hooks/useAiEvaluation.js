import { useCallback, useEffect, useState } from "react";
import { getAiEvaluationBreakdown } from "../services/candidateScoreService";
import { mapAiEvaluationBreakdown } from "../utils/mapAiEvaluationBreakdown";

// Module-level cache keyed by campaign_candidate_id — the AI Evaluation tab
// unmounts/remounts on every tab switch, so this avoids re-fetching the same
// breakdown each time the recruiter tabs back into it.
const cache = new Map();

export default function useAiEvaluation(campaignCandidateId) {
  const [breakdown, setBreakdown] = useState(() => cache.get(campaignCandidateId) ?? null);
  const [loading, setLoading] = useState(!cache.has(campaignCandidateId));
  const [error, setError] = useState(null);

  const fetchBreakdown = useCallback(async () => {
    if (!campaignCandidateId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getAiEvaluationBreakdown(campaignCandidateId);
      const mapped = mapAiEvaluationBreakdown(response);
      cache.set(campaignCandidateId, mapped);
      setBreakdown(mapped);
    } catch (err) {
      setError(err);
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  }, [campaignCandidateId]);

  useEffect(() => {
    if (!campaignCandidateId) {
      setBreakdown(null);
      setLoading(false);
      return;
    }
    if (cache.has(campaignCandidateId)) {
      setBreakdown(cache.get(campaignCandidateId));
      setLoading(false);
      return;
    }
    fetchBreakdown();
  }, [campaignCandidateId, fetchBreakdown]);

  return { breakdown, loading, error, refetch: fetchBreakdown };
}
