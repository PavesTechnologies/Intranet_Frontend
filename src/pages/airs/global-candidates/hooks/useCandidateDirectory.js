import { useCallback, useEffect, useState } from "react";
import { getCandidateDirectory } from "../services/candidateDirectoryService";

const PAGE_SIZE = 20;

// Real GET /candidates list — already paginated/enriched server-side
// (resume version, parse status, uploaded date, skills all come back on
// each item), so this never makes a per-candidate follow-up call.
export default function useCandidateDirectory() {
  const [jurisdiction, setJurisdictionState] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [items, setItems] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reset to page 1 whenever a filter changes; page changes alone leave it be.
  const setJurisdiction = (value) => {
    setJurisdictionState(value);
    setCurrentPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCandidateDirectory({
        jurisdiction: jurisdiction.trim() || undefined,
        page: currentPage,
        size: PAGE_SIZE,
      });
      const data = res?.data ?? res;
      setItems(data?.items || []);
      setTotalResults(data?.total || 0);
    } catch (err) {
      setError(err);
      setItems([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [jurisdiction, currentPage]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    items,
    loading,
    error,
    refetch: load,
    jurisdiction,
    setJurisdiction,
    currentPage,
    setCurrentPage,
    totalPages: Math.max(1, Math.ceil(totalResults / PAGE_SIZE)),
    totalResults,
  };
}
