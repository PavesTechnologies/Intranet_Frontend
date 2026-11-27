import { useCallback, useEffect, useState } from "react";
import { getSemanticScoreBreakdown } from "../services/candidateScoreService";
import { mapSemanticScoreBreakdown } from "../utils/mapSemanticScoreBreakdown";

export default function useSemanticScore(campaignCandidateId) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(Boolean(campaignCandidateId));
  const [error, setError] = useState(null);
  // Set when this layer's task dead-lettered (backend `failure` block) - null otherwise.
  const [failure, setFailure] = useState(null);

  const fetchBreakdown = useCallback(async () => {
    if (!campaignCandidateId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getSemanticScoreBreakdown(campaignCandidateId);
      setFailure((response?.data ?? response)?.failure ?? null);
      const mapped = mapSemanticScoreBreakdown(response);
      setBreakdown(mapped);
    } catch (err) {
      setError(err);
      setBreakdown(null);
      setFailure(null);
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
    fetchBreakdown();
  }, [campaignCandidateId, fetchBreakdown]);

  return { breakdown, failure, loading, error, refetch: fetchBreakdown };
}
