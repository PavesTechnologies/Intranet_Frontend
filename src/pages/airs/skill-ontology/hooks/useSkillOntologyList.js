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
        confidence: confidenceFilter === "All" ? undefined : confidenceFilter,
        is_active: showInactive ? false : true,
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

  const refresh = useCallback(() => {
    fetchCategories();
    fetchSkills();
  }, [fetchCategories, fetchSkills]);

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
