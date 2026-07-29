import { useCallback, useEffect, useState } from "react";
import { getCampaignCandidateDetail } from "../services/candidateScoreService";
import { mapCandidateScoreDetail } from "../utils/mapCandidateScoreDetail";

export default function useCandidateDetail(campaignCandidateId) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCandidate = useCallback(async () => {
    if (!campaignCandidateId) {
      setCandidate(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getCampaignCandidateDetail(campaignCandidateId);
      setCandidate(mapCandidateScoreDetail(response));
    } catch (err) {
      setError(err);
      setCandidate(null);
    } finally {
      setLoading(false);
    }
  }, [campaignCandidateId]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  return { candidate, loading, error, refetch: fetchCandidate };
}
