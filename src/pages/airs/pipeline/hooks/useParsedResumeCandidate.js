import { useCallback, useEffect, useState } from "react";
import { candidateJson } from "../../service/resumeIntake";
import { mapParsedResumeToCandidate } from "../utils/mapParsedResumeToCandidate";

// Candidate Scorecard reached from Resume Upload History — sourced from
// GET /resumes/candidate/{candidateId}/parsed-json instead of the
// campaign-candidates detail endpoint (not implemented on the backend).
// `fallback` carries the candidate name/email/etc. from the Resume Upload
// History row (router state), since the parsed-json response only returns
// resume/parsing data, not candidate profile fields.
export default function useParsedResumeCandidate(candidateId, fallback) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCandidate = useCallback(async () => {
    if (!candidateId) {
      setCandidate(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await candidateJson(candidateId);
      setCandidate(mapParsedResumeToCandidate(response, fallback));
    } catch (err) {
      setError(err);
      setCandidate(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  return { candidate, loading, error, refetch: fetchCandidate };
}
