import { useEffect, useMemo, useState } from "react";
import { CANDIDATE_PAGE_SIZE } from "../constants/candidateConstants";
import { filterCandidates, sortCandidates, paginate, computeCandidateStats } from "../utils/candidateUtils.jsx";
import { readCandidates, persistCandidates } from "../store/candidateStore";

export default function useCandidateRanking() {
  const [candidates, setCandidates] = useState(readCandidates);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [sortValue, setSortValue] = useState("composite:desc");
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    persistCandidates(candidates);
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

  const toggleStar = (id) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)));
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
  };
}
