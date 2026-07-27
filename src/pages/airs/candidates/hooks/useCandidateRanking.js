import { useEffect, useMemo, useState } from "react";
import { MOCK_CANDIDATES } from "../mock/candidateMockData";
import { CANDIDATE_PAGE_SIZE } from "../constants/candidateConstants";
import { filterCandidates, sortCandidates, paginate, computeCandidateStats } from "../utils/candidateUtils.jsx";

// Bumped to v2: earlier cached candidates predate the scoreBreakdown.items
// shape (M07-E01/S05), so a v1 cache would show "No hierarchy match data
// available" forever. Bumping the key abandons stale caches and falls back
// to fresh MOCK_CANDIDATES, which always has the current shape.
const STORAGE_KEY = "airs_candidates_pool_v2";

// Guards against a cache that was written by an older shape of this mock
// store slipping past the STORAGE_KEY bump (e.g. a partially-applied write).
const looksCurrent = (candidates) =>
  Array.isArray(candidates) && candidates.length > 0 && Array.isArray(candidates[0]?.scoreBreakdown?.items);

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_CANDIDATES;
    const parsed = JSON.parse(raw);
    return looksCurrent(parsed) ? parsed : MOCK_CANDIDATES;
  } catch {
    return MOCK_CANDIDATES;
  }
};

const persist = (candidates) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
  } catch {
    // Ignore storage quota errors.
  }
};

export default function useCandidateRanking() {
  const [candidates, setCandidates] = useState(readStored);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [sortValue, setSortValue] = useState("composite:desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailCandidateId, setDetailCandidateId] = useState(null);

  useEffect(() => {
    persist(candidates);
  }, [candidates]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, stageFilter, sortValue]);

  const filteredSorted = useMemo(
    () => sortCandidates(filterCandidates(candidates, { search, stage: stageFilter }), sortValue),
    [candidates, search, stageFilter, sortValue]
  );

  const { pageItems, totalPages, currentPage: safePage } = useMemo(
    () => paginate(filteredSorted, currentPage, CANDIDATE_PAGE_SIZE),
    [filteredSorted, currentPage]
  );

  const stats = useMemo(() => computeCandidateStats(candidates), [candidates]);

  const detailCandidate = useMemo(
    () => candidates.find((c) => c.id === detailCandidateId) || null,
    [candidates, detailCandidateId]
  );

  const toggleStar = (id) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)));
  };

  const addComment = (candidateId, text) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, comments: [...c.comments, { author: "You", text }] } : c))
    );
  };

  // M07-E01/S04 — HR-admin-added skill, informational only; never touches
  // scoreBreakdown/deterministic scoring.
  const addManualSkill = (candidateId, skill) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? { ...c, manualSkills: [...c.manualSkills, { id: skill.id, canonicalName: skill.canonicalName }] }
          : c
      )
    );
  };

  return {
    candidates: pageItems,
    totalResults: filteredSorted.length,
    stats,
    search,
    setSearch,
    stageFilter,
    setStageFilter,
    sortValue,
    setSortValue,
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    toggleStar,
    addComment,
    addManualSkill,
    detailCandidate,
    openCandidate: setDetailCandidateId,
    closeCandidate: () => setDetailCandidateId(null),
  };
}
