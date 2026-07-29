import { useEffect, useMemo, useState } from "react";
import { readCandidates, persistCandidates } from "../store/candidateStore";

export default function useCandidateDetail(candidateId) {
  const [candidates, setCandidates] = useState(readCandidates);

  useEffect(() => {
    persistCandidates(candidates);
  }, [candidates]);

  // Resume-intake links here with a real backend candidate_id (a UUID) that
  // won't match any entry in this mock pool — fall back to the first mock
  // candidate so the page still renders instead of showing "not found".
  const candidate = useMemo(
    () => candidates.find((c) => c.id === candidateId) || candidates[0] || null,
    [candidates, candidateId]
  );

  const addComment = (id, text) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, comments: [...c.comments, { author: "You", text }] } : c))
    );
  };

  // M07-E01/S04 — HR-admin-added skill, informational only; never touches
  // scoreBreakdown/deterministic scoring.
  const addManualSkill = (id, skill) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, manualSkills: [...c.manualSkills, { id: skill.id, canonicalName: skill.canonicalName }] }
          : c
      )
    );
  };

  return { candidate, addComment, addManualSkill };
}
