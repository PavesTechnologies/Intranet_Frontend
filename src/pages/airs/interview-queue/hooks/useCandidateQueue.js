import { useCallback, useEffect, useMemo, useState } from "react";
import { getCampaignCandidates } from "../../campaigns/services/campaignservice";
import { mapCampaignCandidateList } from "../../candidates/utils/mapCampaignCandidateList";
import { filterCandidates, paginate } from "../../candidates/utils/candidateUtils.jsx";
import { CANDIDATE_PAGE_SIZE } from "../../candidates/constants/candidateConstants";

// Candidates this queue ever shows — everything else (SCREENING, SELECTED,
// REJECTED, ...) is out of scope for an HM review/interview queue.
const QUEUE_STAGES = ["HM_REVIEW", "INTERVIEW"];

// Same shape as useCandidateRanking — getCampaignCandidates returns a whole
// campaign's candidate list in one call, so there's no per-filter round
// trip to debounce; search/stage filtering/pagination all happen
// client-side against that one fetch.
export default function useCandidateQueue(campaignId) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
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
      const mapped = mapCampaignCandidateList(list).filter((c) => QUEUE_STAGES.includes(c.stage));
      setCandidates(mapped);
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
  }, [search, stageFilter]);

  const filtered = useMemo(
    () => filterCandidates(candidates, { search, stage: stageFilter }),
    [candidates, search, stageFilter]
  );

  const { pageItems, totalPages, currentPage: safePage } = useMemo(
    () => paginate(filtered, currentPage, CANDIDATE_PAGE_SIZE),
    [filtered, currentPage]
  );

  // A successful advance/select/reject moves a candidate's stage — apply
  // that locally instead of refetching. If the new stage falls outside the
  // queue's own scope (SELECTED/REJECTED), the row simply drops out of it.
  const applyStageChange = useCallback((campaignCandidateId, nextStage) => {
    setCandidates((prev) =>
      QUEUE_STAGES.includes(nextStage)
        ? prev.map((c) => (c.id === campaignCandidateId ? { ...c, stage: nextStage } : c))
        : prev.filter((c) => c.id !== campaignCandidateId)
    );
  }, []);

  return {
    candidates: pageItems,
    totalResults: filtered.length,
    search,
    setSearch,
    stageFilter,
    setStageFilter,
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    loading,
    error,
    refetch: fetchCandidates,
    applyStageChange,
  };
}
