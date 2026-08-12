import { useCallback, useEffect, useState } from "react";
import { getResumeVersions } from "../../service/resumeIntake";

const unwrap = (res) => {
  const data = res && res.data !== undefined ? res.data : res;
  if (Array.isArray(data)) return data;
  return data?.versions || data?.items || [];
};

// Real API-backed resume version history for one candidate —
// GET /resumes/candidate/{candidate_id}/versions. Order is left exactly
// as returned by the API (no client-side re-sort).
export default function useResumeVersions(candidateId) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!candidateId) {
      setVersions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getResumeVersions(candidateId);
      setVersions(unwrap(response));
    } catch (err) {
      setError(err);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    load();
  }, [load]);

  return { versions, loading, error, refetch: load };
}
