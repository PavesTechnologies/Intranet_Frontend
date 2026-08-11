import { useCallback, useEffect, useState } from "react";
import { getCompositeScoreBreakdown } from "../services/candidateScoreService";
import { mapCompositeScoreBreakdown } from "../utils/mapCompositeScoreBreakdown";

export default function useCompositeScore(campaignCandidateId) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(Boolean(campaignCandidateId));
  const [error, setError] = useState(null);

  const fetchBreakdown = useCallback(async () => {
    if (!campaignCandidateId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getCompositeScoreBreakdown(campaignCandidateId);
      setBreakdown(mapCompositeScoreBreakdown(response));
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
