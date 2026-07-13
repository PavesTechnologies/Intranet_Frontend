import { useEffect, useMemo, useState } from "react";
import { MOCK_CANDIDATES } from "../mock/candidateMockData";
import { CANDIDATE_PAGE_SIZE } from "../constants/candidateConstants";
import { filterCandidates, sortCandidates, paginate, computeCandidateStats } from "../utils/candidateUtils.jsx";

const STORAGE_KEY = "airs_candidates_pool";

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : MOCK_CANDIDATES;
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
    detailCandidate,
    openCandidate: setDetailCandidateId,
    closeCandidate: () => setDetailCandidateId(null),
  };
}
