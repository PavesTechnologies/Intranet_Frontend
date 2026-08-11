import { useCallback, useEffect, useState } from "react";
import { getSemanticScoreBreakdown } from "../services/candidateScoreService";
import { mapSemanticScoreBreakdown } from "../utils/mapSemanticScoreBreakdown";

export default function useSemanticScore(campaignCandidateId) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(Boolean(campaignCandidateId));
  const [error, setError] = useState(null);

  const fetchBreakdown = useCallback(async () => {
    if (!campaignCandidateId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getSemanticScoreBreakdown(campaignCandidateId);
      const mapped = mapSemanticScoreBreakdown(response);
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
