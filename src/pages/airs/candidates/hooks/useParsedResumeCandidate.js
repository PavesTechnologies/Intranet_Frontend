import { useCallback, useEffect, useState } from "react";
import { candidateJson } from "../../service/resumeIntake";
import { mapParsedResumeToCandidate } from "../utils/mapParsedResumeToCandidate";

// Candidate Scorecard's one data source, wherever it's opened from
// (Candidates tab, Pipeline Board, Interview Calendar, Resume Upload
// History) — GET /resumes/candidate/{campaign_candidate_id}/parsed-json now
// carries the full candidate record (identity, contact, pipeline stage,
// override state, scores, AI summary) alongside the resume parse, so no
// separate campaign-candidates detail call is needed. `fallback` (the row
// the caller navigated from, e.g. router state) only fills in whatever a
// given response still leaves out.
// 404 (no resume linked) and 409 (resume uploaded but still parsing) are
// expected, non-exceptional states the caller branches on via `status`,
// not just a generic error.
export default function useParsedResumeCandidate(candidateId, fallback) {
  const [candidate, setCandidate] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | not_found | pending | error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCandidate = useCallback(async () => {
    if (!candidateId) {
      setCandidate(null);
      setStatus("error");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await candidateJson(candidateId);
      setCandidate(mapParsedResumeToCandidate(response, fallback));
      setStatus("ready");
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      if (err?.response?.status === 404 || code === "RESUME_NOT_FOUND") setStatus("not_found");
      else if (err?.response?.status === 409 || code === "PARSE_NOT_COMPLETE") setStatus("pending");
      else setStatus("error");
      setError(err);
      setCandidate(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId, fallback]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  return { candidate, loading, error, status, refetch: fetchCandidate };
}
