import { useCallback, useEffect, useMemo, useState } from "react";
import { getCampaignCandidates } from "../../campaigns/services/campaignservice";
import { mapCampaignCandidateList } from "../../candidates/utils/mapCampaignCandidateList";
import { filterCandidates, paginate } from "../../candidates/utils/candidateUtils.jsx";
import { CANDIDATE_PAGE_SIZE } from "../../candidates/constants/candidateConstants";

// This page is scoped to HM Review only — a candidate who's moved on
// (Interview, Selected, Rejected, ...) is out of scope and drops out of the
// list rather than staying visible read-only.
const QUEUE_STAGE = "HM_REVIEW";

// Same shape as useCandidateRanking — getCampaignCandidates returns a whole
// campaign's candidate list in one call, so there's no per-filter round
// trip to debounce; search/pagination all happen client-side against that
// one fetch.
export default function useCandidateQueue(campaignId) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
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
      // Body is { success, message, data: { items, page, page_size, total } } —
      // unwrap one level for the envelope, then again for the paginated list.
      const data = response && response.data !== undefined ? response.data : response;
      const list = Array.isArray(data) ? data : data?.items || [];
      const mapped = mapCampaignCandidateList(list).filter((c) => c.stage === QUEUE_STAGE);
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
  }, [search]);

  const filtered = useMemo(
    () => filterCandidates(candidates, { search }),
    [candidates, search]
  );

  const { pageItems, totalPages, currentPage: safePage } = useMemo(
    () => paginate(filtered, currentPage, CANDIDATE_PAGE_SIZE),
    [filtered, currentPage]
  );

  // A successful move/reject takes a candidate out of HM Review — drop the
  // row locally instead of refetching.
  const removeCandidate = useCallback((campaignCandidateId) => {
    setCandidates((prev) => prev.filter((c) => c.id !== campaignCandidateId));
  }, []);

  return {
    candidates: pageItems,
    totalResults: filtered.length,
    search,
    setSearch,
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    loading,
    error,
    refetch: fetchCandidates,
    removeCandidate,
  };
}
