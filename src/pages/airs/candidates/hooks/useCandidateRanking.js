import { useCallback, useEffect, useMemo, useState } from "react";
import { CANDIDATE_PAGE_SIZE } from "../constants/candidateConstants";
import { filterCandidates, sortCandidates, paginate, computeCandidateStats } from "../utils/candidateUtils.jsx";
import { getCampaignCandidates } from "../../campaigns/services/campaignservice";
import { mapCampaignCandidateList } from "../utils/mapCampaignCandidateList";

export default function useCandidateRanking(campaignId) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [sortValue, setSortValue] = useState("composite:desc");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCandidates = useCallback(async () => {
    if (!campaignId) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getCampaignCandidates(campaignId);
      const list = response && response.data !== undefined ? response.data : response;
      setCandidates(mapCampaignCandidateList(list));
    } catch (err) {
      setError(err);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

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
    loading,
    error,
    refetch: fetchCandidates,
  };
}
