import { useCallback, useEffect, useState } from "react";
import { getDeterministicScoreBreakdown } from "../services/candidateScoreService";
import { mapDeterministicScoreBreakdown } from "../utils/mapDeterministicScoreBreakdown";

export default function useDeterministicScore(campaignCandidateId) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(Boolean(campaignCandidateId));
  const [error, setError] = useState(null);

  const fetchBreakdown = useCallback(async () => {
    if (!campaignCandidateId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getDeterministicScoreBreakdown(campaignCandidateId);
      const mapped = mapDeterministicScoreBreakdown(response);
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
    fetchBreakdown();
  }, [campaignCandidateId, fetchBreakdown]);

  return { breakdown, loading, error, refetch: fetchBreakdown };
}
