import { useCallback, useEffect, useState } from "react";
import { getDeterministicScoreBreakdown } from "../services/candidateScoreService";
import { mapDeterministicScoreBreakdown } from "../utils/mapDeterministicScoreBreakdown";

export default function useDeterministicScore(campaignCandidateId) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(Boolean(campaignCandidateId));
  const [error, setError] = useState(null);
  // Set when this layer's task dead-lettered (backend `failure` block) - null otherwise.
  const [failure, setFailure] = useState(null);
  // Scoring v2 shadow result - only sent to HR_ADMIN, read-only.
  const [shadowV2, setShadowV2] = useState(null);

  const fetchBreakdown = useCallback(async () => {
    if (!campaignCandidateId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getDeterministicScoreBreakdown(campaignCandidateId);
      setFailure((response?.data ?? response)?.failure ?? null);
      setShadowV2((response?.data ?? response)?.scoring_v2_shadow ?? null);
      const mapped = mapDeterministicScoreBreakdown(response);
      setBreakdown(mapped);
    } catch (err) {
      setError(err);
      setBreakdown(null);
      setFailure(null);
      setShadowV2(null);
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

  return { breakdown, failure, shadowV2, loading, error, refetch: fetchBreakdown };
}
