import { useCallback, useEffect, useState } from "react";
import { searchTalentPoolCandidates, semanticSearchTalentPoolCandidates } from "../services/talentPoolService";
import { TALENT_POOL_PAGE_SIZE, TALENT_POOL_SEARCH_MODES } from "../constants/talentPoolConstants";

// M13 Normal Search (GET /talent-pool/candidates) + M14 Semantic Search
// (POST /talent-pool/semantic-search) share this same page/hook — the mode
// toggle just decides which endpoint `load` below calls.
//
// `searchInput` is the live-typed value; it's debounced into `searchText`
// (the value actually sent as Normal's `search` / Semantic's `query`) 400ms
// after the user stops typing — no explicit Search action needed in either
// mode. Semantic requires a non-empty query, so `load` skips the request
// entirely while it's blank rather than hitting the endpoint with nothing to
// embed. Panel filters (locations, designations, degree levels, education
// fields, campaigns, pipeline stages, experience range, composite score
// range) are likewise never applied live in either mode — they're staged in
// the filter panel's own draft state and only committed here via
// applyFilters() when the user clicks "Apply Filters".
const EMPTY_FILTERS = {
  locations: [],
  designations: [],
  degreeLevels: [],
  educationFields: [],
  campaignIds: [],
  pipelineStages: [],
  experienceMin: "",
  experienceMax: "",
  scoreMin: "",
  scoreMax: "",
};

export default function useTalentPool() {
  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchMode, setSearchModeState] = useState(TALENT_POOL_SEARCH_MODES.SEMANTIC);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  // Switching Normal <-> Semantic hits a different endpoint — always restart
  // pagination so the new mode's results start at page 1.
  const setSearchMode = (mode) => {
    setSearchModeState(mode);
    setCurrentPage(1);
  };

  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounces the live-typed search box into `searchText` — the candidate
  // endpoint fires 400ms after the user stops typing, no explicit action
  // needed, in either mode.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchText(searchInput.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const applyFilters = (nextFilters) => {
    setFilters(nextFilters);
    setCurrentPage(1);
  };

  // Filter-modal Reset — clears applied filters only; search text is left
  // as-is (Reset is scoped to the filter modal, not a page-wide clear-all).
  const clearAllFilters = () => {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  // Backs each removable chip — drops exactly one value (array filters) or
  // one range bound pair (experience/score) and re-applies immediately.
  const removeFilterValue = (key, value) => {
    setFilters((prev) => {
      if (key === "experience") return { ...prev, experienceMin: "", experienceMax: "" };
      if (key === "score") return { ...prev, scoreMin: "", scoreMax: "" };
      const current = prev[key];
      if (!Array.isArray(current)) return prev;
      return { ...prev, [key]: current.filter((v) => v !== value) };
    });
    setCurrentPage(1);
  };

  const load = useCallback(async () => {
    const isSemantic = searchMode === TALENT_POOL_SEARCH_MODES.SEMANTIC;
    const query = searchText.trim();

    // Semantic requires a non-empty query to embed — nothing to search yet.
    if (isSemantic && !query) {
      setResults([]);
      setTotalResults(0);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const filterParams = {
        locations: filters.locations,
        designations: filters.designations,
        degreeLevels: filters.degreeLevels,
        educationFields: filters.educationFields,
        campaignIds: filters.campaignIds,
        pipelineStages: filters.pipelineStages,
        experienceMin: filters.experienceMin !== "" ? Number(filters.experienceMin) : undefined,
        experienceMax: filters.experienceMax !== "" ? Number(filters.experienceMax) : undefined,
        scoreMin: filters.scoreMin !== "" ? Number(filters.scoreMin) : undefined,
        scoreMax: filters.scoreMax !== "" ? Number(filters.scoreMax) : undefined,
      };

      const res = isSemantic
        ? await semanticSearchTalentPoolCandidates({
            query,
            ...filterParams,
            page: currentPage,
            size: TALENT_POOL_PAGE_SIZE,
          })
        : await searchTalentPoolCandidates({
            search: query || undefined,
            ...filterParams,
            page: currentPage,
            size: TALENT_POOL_PAGE_SIZE,
          });

      const data = res?.data ?? res;
      setResults(data?.items || []);
      setTotalResults(data?.total || 0);
    } catch (err) {
      setError(err);
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchMode,
    searchText,
    filters.locations.join("|"),
    filters.designations.join("|"),
    filters.degreeLevels.join("|"),
    filters.educationFields.join("|"),
    filters.campaignIds.join("|"),
    filters.pipelineStages.join("|"),
    filters.experienceMin,
    filters.experienceMax,
    filters.scoreMin,
    filters.scoreMax,
    currentPage,
  ]);

  // Candidate endpoint fires only when one of `load`'s dependencies above
  // actually changes — i.e. on mount, and whenever runSearch/applyFilters/
  // clearAllFilters/removeFilterValue/setCurrentPage commit a new value.
  // Typing in the search box or editing draft filters never touches any of
  // those dependencies, so it never triggers a request.
  useEffect(() => {
    load();
  }, [load]);

  const hasActiveFilters =
    searchText.trim() !== "" ||
    filters.locations.length > 0 ||
    filters.designations.length > 0 ||
    filters.degreeLevels.length > 0 ||
    filters.educationFields.length > 0 ||
    filters.campaignIds.length > 0 ||
    filters.pipelineStages.length > 0 ||
    filters.experienceMin !== "" ||
    filters.experienceMax !== "" ||
    filters.scoreMin !== "" ||
    filters.scoreMax !== "";

  return {
    results,
    loading,
    error,
    refetch: load,
    searchInput,
    setSearchInput,
    searchMode,
    setSearchMode,
    filters,
    applyFilters,
    clearAllFilters,
    removeFilterValue,
    hasActiveFilters,
    currentPage,
    setCurrentPage,
    totalPages: Math.max(1, Math.ceil(totalResults / TALENT_POOL_PAGE_SIZE)),
    totalResults,
  };
}
