import { useCallback, useEffect, useState } from "react";
import { getSemanticScoreBreakdown } from "../services/candidateScoreService";
import { mapSemanticScoreBreakdown } from "../utils/mapSemanticScoreBreakdown";

// Module-level cache keyed by campaign_candidate_id — the Semantic tab
// unmounts/remounts on every tab switch, so this avoids re-fetching the same
// breakdown each time the recruiter tabs back into it.
const cache = new Map();

export default function useSemanticScore(campaignCandidateId) {
  const [breakdown, setBreakdown] = useState(() => cache.get(campaignCandidateId) ?? null);
  const [loading, setLoading] = useState(!cache.has(campaignCandidateId));
  const [error, setError] = useState(null);

  const fetchBreakdown = useCallback(async () => {
    if (!campaignCandidateId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getSemanticScoreBreakdown(campaignCandidateId);
      const mapped = mapSemanticScoreBreakdown(response);
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
