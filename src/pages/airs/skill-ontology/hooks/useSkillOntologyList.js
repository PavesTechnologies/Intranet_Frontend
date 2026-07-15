import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getSkills, getCategories } from "../services/skillOntologyService";
import { SKILL_ONTOLOGY_PAGE_SIZE } from "../constants/skillOntologyConstants";

// Server-driven list state (search/filter/pagination all round-trip to the
// backend) — matches the fetch pattern used by src/pages/airs/pages/Campaigns.jsx
// rather than the client-side-filtered mock pattern used elsewhere in AIRS.
export default function useSkillOntologyList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [confidenceFilter, setConfidenceFilter] = useState("All");
  const [source, setSource] = useState("All"); // kept for the Source filter UI — no server-side equivalent exists yet
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [skills, setSkills] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [categoryOptions, setCategoryOptions] = useState([{ label: "All Categories", value: "All" }]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, category, confidenceFilter, source, showInactive]);

  const fetchSkills = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSkills({
        search: debouncedSearch || undefined,
        category: category === "All" ? undefined : category,
        confidence: confidenceFilter === "All" ? undefined : confidenceFilter.toLowerCase(),
        // Default (toggle off): active only. Toggle on: omit is_active entirely
        // so the backend returns both active and inactive records.
        is_active: showInactive ? undefined : true,
        page: currentPage,
        page_size: SKILL_ONTOLOGY_PAGE_SIZE,
      });
      setSkills(res?.data?.items || res?.items || []);
      setTotalCount(res?.data?.total ?? res?.total ?? 0);
    } catch (err) {
      setError(err);
      toast.error("Failed to load the skill ontology.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, category, confidenceFilter, showInactive, currentPage]);

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
    showInactive,
    setShowInactive,
  };
}
