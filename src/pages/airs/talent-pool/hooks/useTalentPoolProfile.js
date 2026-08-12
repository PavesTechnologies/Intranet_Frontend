import { useCallback, useEffect, useState } from "react";
import { getTalentPoolCandidateProfile } from "../services/talentPoolService";

// Talent Pool candidate profile — the real, dedicated
// GET /talent-pool/candidates/{candidate_id} endpoint (unified cross-campaign
// view: identity, consent, talent-pool eligibility, active resume, campaign
// summary, performance summary). Resume Versions / Campaign History detail
// stay on the resume-versions endpoint (useResumeVersions) — this profile
// response only carries the LATEST campaign's name/stage, not the full list.
export default function useTalentPoolProfile(candidateId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!candidateId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getTalentPoolCandidateProfile(candidateId);
      setProfile(response?.data ?? response);
    } catch (err) {
      setError(err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, loading, error, refetch: load };
}
