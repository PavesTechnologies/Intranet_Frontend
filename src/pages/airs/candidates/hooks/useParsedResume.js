import { useCallback, useEffect, useState } from "react";
import { getParsedResume } from "../services/candidateScoreService";
import { mapParsedResumeFields } from "../utils/mapParsedResumeFields";

// Backs the Summary/Resume tabs' real data — GET /resumes/candidate/
// {campaign_candidate_id}/parsed-json. 404 (no resume linked) and 409
// (resume uploaded but still parsing) are expected, not exceptional, so
// they surface as distinct `status` values instead of just `error`,
// letting ResumeTab show "not linked yet" / "still parsing" instead of a
// generic failure — or worse, silently falling back to synthesized mock
// content as if it were real.
export default function useParsedResume(campaignCandidateId) {
  const [fields, setFields] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | not_found | pending | error
  const [loading, setLoading] = useState(true);

  const fetchResume = useCallback(async () => {
    if (!campaignCandidateId) {
      setFields(null);
      setStatus("error");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await getParsedResume(campaignCandidateId);
      setFields(mapParsedResumeFields(response));
      setStatus("ready");
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      if (err?.response?.status === 404 || code === "RESUME_NOT_FOUND") setStatus("not_found");
      else if (err?.response?.status === 409 || code === "PARSE_NOT_COMPLETE") setStatus("pending");
      else setStatus("error");
      setFields(null);
    } finally {
      setLoading(false);
    }
  }, [campaignCandidateId]);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  return { fields, status, loading, refetch: fetchResume };
}
