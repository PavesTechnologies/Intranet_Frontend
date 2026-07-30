import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getSkills, getCategories } from "../services/skillOntologyService";
import { SKILL_ONTOLOGY_PAGE_SIZE } from "../constants/skillOntologyConstants";

// Safety cap for the page-fetch loop below — this dataset is small, so this
// is just a backstop against looping forever if a response's `total` is ever
// wrong or missing, not a size we expect to actually hit.
const MAX_FALLBACK_PAGES = 20;

// Fetches every page for one is_active value, using ONLY the already-valid
// page_size (never an inflated one — see fetchSkills below for why that
// matters) and stopping as soon as a page comes back short or `total` is
// reached.
async function fetchAllPages(params) {
  let page = 1;
  let all = [];
  let total = Infinity;
  while (page <= MAX_FALLBACK_PAGES && all.length < total) {
    const res = await getSkills({ ...params, page, page_size: SKILL_ONTOLOGY_PAGE_SIZE });
    const items = res?.data?.items || res?.items || [];
    total = res?.data?.total ?? res?.total ?? all.length + items.length;
    if (items.length === 0) break;
    all = all.concat(items);
    page += 1;
  }
  return all;
}

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
  let is_active;

  switch (statusFilter) {
    case "ACTIVE":
      is_active = true;
      break;

    case "INACTIVE":
      is_active = false;
      break;

    default:
      is_active = undefined; // All
  }

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
  const [statusFilter, setStatusFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [skills, setSkills] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [categoryOptions, setCategoryOptions] = useState([{ label: "All Categories", value: "All" }]);

  // Guards against an older, slower fetch (e.g. the two-request Show
  // Inactive fallback below) resolving after a newer one and overwriting
  // fresher results with stale data — only the most recently *started*
  // fetch is allowed to commit its results.
  const latestRequestId = useRef(0);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, category, confidenceFilter, source, showInactive]);

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
        showInactive,
      });

      let items;
      let total;

      if (!showInactive) {
        // Show Inactive off — single, server-paginated, active-only request.
        // Unchanged from before.
        const res = await getSkills({ ...baseParams, page: currentPage, page_size: SKILL_ONTOLOGY_PAGE_SIZE });
        items = res?.data?.items || res?.items || [];
        total = res?.data?.total ?? res?.total ?? 0;
      } else {
        // Show Inactive on — temporary client-side fallback. Omitting
        // is_active and trusting the backend to return both statuses isn't
        // reliable for every category/search/confidence/source combination,
        // so fetch active and inactive explicitly (same other filters, same
        // single source of truth via baseParams) and merge here instead.
        // Every request this sends uses the same page/page_size/is_active
        // shape as the already-working non-fallback path above — no new or
        // out-of-range parameter values are ever introduced.
        

        total = combined.length;
        const start = (currentPage - 1) * SKILL_ONTOLOGY_PAGE_SIZE;
        items = combined.slice(start, start + SKILL_ONTOLOGY_PAGE_SIZE);
      }

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
  }, [debouncedSearch, category, confidenceFilter, source, showInactive, currentPage]);

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
