import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getSkills, getCategories } from "../services/skillOntologyService";
import { SKILL_ONTOLOGY_PAGE_SIZE, SKILL_STATUS } from "../constants/skillOntologyConstants";

// Single source of truth for turning raw filter state into the exact
// query params the backend expects. Used by both the list's own fetch and
// SkillOntologyPage's export handler so the two can never drift — e.g. one
// omitting "All Sources" while the other forgets to (the bug that caused
// the Source filter to silently do nothing everywhere it was used).
export function buildSkillQueryParams({
  search,
  category,
  confidence,
  source,
  statusFilter,
}) {
  // The backend only filters on is_active when the param is present
  // (`if is_active is not None`), so "All" must OMIT it entirely — sending
  // false there would return inactive rows only.
  let is_active;
  if (statusFilter === SKILL_STATUS.ACTIVE) is_active = true;
  else if (statusFilter === SKILL_STATUS.INACTIVE) is_active = false;

  return {
    search: search || undefined,
    category: category === "All" ? undefined : category,
    confidence: confidence === "All" ? undefined : confidence?.toLowerCase(),
    source: source === "All" ? undefined : source,
    is_active,
  };
}

// Server-driven list state (search/filter/pagination all round-trip to the
// backend) — matches the fetch pattern used by src/pages/airs/campaigns/Campaigns.jsx
// rather than the client-side-filtered mock pattern used elsewhere in AIRS.
export default function useSkillOntologyList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [confidenceFilter, setConfidenceFilter] = useState("All");
  const [source, setSource] = useState("All"); // kept for the Source filter UI — no server-side equivalent exists yet
  const [statusFilter, setStatusFilter] = useState(SKILL_STATUS.ACTIVE);
  const [currentPage, setCurrentPage] = useState(1);

  const [skills, setSkills] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [categoryOptions, setCategoryOptions] = useState([{ label: "All Categories", value: "All" }]);

  // Guards against an older, slower fetch resolving after a newer one and
  // overwriting fresher results with stale data (debounced search racing a
  // page change) — only the most recently *started* fetch may commit.
  const latestRequestId = useRef(0);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, category, confidenceFilter, source, statusFilter]);

  const fetchSkills = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const baseParams = buildSkillQueryParams({
        search: debouncedSearch,
        category,
        confidence: confidenceFilter,
        source,
        statusFilter,
      });

      // One server-paginated request for every status choice — the backend
      // applies every filter (including is_active) to the same query it
      // counts with, so `total` and the page slice always agree.
      const res = await getSkills({
        ...baseParams,
        page: currentPage,
        page_size: SKILL_ONTOLOGY_PAGE_SIZE,
      });
      const items = res?.data?.items || res?.items || [];
      const total = res?.data?.total ?? res?.total ?? 0;

      if (requestId !== latestRequestId.current) return; // a newer fetch has since started — drop this one
      setSkills(items);
      setTotalCount(total);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err);
      toast.error("Failed to load the skill ontology.");
    } finally {
      if (requestId === latestRequestId.current) setIsLoading(false);
    }
  }, [debouncedSearch, category, confidenceFilter, source, statusFilter, currentPage]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await getCategories();
      const items = res?.data || [];
      setCategoryOptions([
        { label: "All Categories", value: "All" },
        ...items.map((c) => ({ label: c.category, value: c.category })),
      ]);
    } catch {
      // Keep whatever options are already loaded — the category filter simply
      // won't refresh rather than breaking the page.
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Skills-only refresh — used after create/update/deactivate/reactivate/merge.
  // The category field is a closed dropdown (see SkillForm.jsx), so none of
  // those actions can ever introduce a category that isn't already loaded;
  // refetching categories on every one of them was an unnecessary duplicate
  // request racing the list fetch for no reason.
  const refresh = useCallback(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Skills + categories — only Bulk Import can genuinely introduce a brand
  // new category value (from the uploaded file), so only its onImported
  // handler should invalidate both.
  const refreshAll = useCallback(() => {
    fetchCategories();
    fetchSkills();
  }, [fetchCategories, fetchSkills]);

  // Instant feedback for the row just edited/patched — applied immediately
  // from the PATCH response, ahead of the authoritative refresh() above (which
  // re-validates the row still belongs on the current page/filters).
  const updateSkillInPlace = useCallback((updatedSkill) => {
    if (!updatedSkill?.id) return;
    setSkills((prev) => prev.map((s) => (s.id === updatedSkill.id ? { ...s, ...updatedSkill } : s)));
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / SKILL_ONTOLOGY_PAGE_SIZE));

  return {
    skills,
    totalCount,
    totalPages,
    currentPage,
    setCurrentPage,
    isLoading,
    error,
    refresh,
    refreshAll,
    updateSkillInPlace,

    search,
    setSearch,
    category,
    setCategory,
    categoryOptions,
    confidenceFilter,
    setConfidenceFilter,
    source,
    setSource,
    statusFilter,
    setStatusFilter,
  };
}
