import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getUnknownSkills } from "../services/skillOntologyService";
import { SKILL_ONTOLOGY_PAGE_SIZE } from "../constants/skillOntologyConstants";

// Fully separate from useSkillOntologyList — its own search/page/loading/
// error state, own response model (raw/unrecognized skill mentions), never
// shares params or state with the Verified Skills list.
//
// `active` gates every fetch: this only ever calls GET /skills/unknown while
// the Unknown Skills tab is actually selected, so switching to/staying on
// Verified Skills never fires this endpoint.
export default function useUnknownSkillsList(active) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [skills, setSkills] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchUnknownSkills = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getUnknownSkills({
        search: debouncedSearch || undefined,
        page: currentPage,
        page_size: SKILL_ONTOLOGY_PAGE_SIZE,
      });
      setSkills(res?.data?.items || res?.items || []);
      setTotalCount(res?.data?.total ?? res?.total ?? 0);
    } catch (err) {
      setError(err);
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to load unknown skills.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, currentPage]);

  useEffect(() => {
    if (!active) return;
    fetchUnknownSkills();
  }, [active, fetchUnknownSkills]);

  const totalPages = Math.max(1, Math.ceil(totalCount / SKILL_ONTOLOGY_PAGE_SIZE));

  return {
    skills,
    totalCount,
    totalPages,
    currentPage,
    setCurrentPage,
    isLoading,
    error,
    refresh: fetchUnknownSkills,

    search,
    setSearch,
  };
}
