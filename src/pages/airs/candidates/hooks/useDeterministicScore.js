import { useCallback, useEffect, useState } from "react";
import { getDeterministicScoreBreakdown } from "../services/candidateScoreService";
import { mapDeterministicScoreBreakdown } from "../utils/mapDeterministicScoreBreakdown";

// Module-level cache keyed by campaign_candidate_id — the Deterministic tab
// unmounts/remounts on every tab switch, so this avoids re-fetching the same
// breakdown each time the recruiter tabs back into it.
const cache = new Map();

export default function useDeterministicScore(campaignCandidateId) {
  const [breakdown, setBreakdown] = useState(() => cache.get(campaignCandidateId) ?? null);
  const [loading, setLoading] = useState(!cache.has(campaignCandidateId));
  const [error, setError] = useState(null);

  const fetchBreakdown = useCallback(async () => {
    if (!campaignCandidateId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getDeterministicScoreBreakdown(campaignCandidateId);
      const mapped = mapDeterministicScoreBreakdown(response);
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
