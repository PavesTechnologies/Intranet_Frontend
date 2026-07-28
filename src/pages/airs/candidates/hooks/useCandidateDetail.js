import { useEffect, useMemo, useState } from "react";
import { readCandidates, persistCandidates } from "../store/candidateStore";

export default function useCandidateDetail(candidateId) {
  const [candidates, setCandidates] = useState(readCandidates);

  useEffect(() => {
    persistCandidates(candidates);
  }, [candidates]);

  const candidate = useMemo(
    () => candidates.find((c) => c.id === candidateId) || null,
    [candidates, candidateId]
  );

  return { candidate };
}
