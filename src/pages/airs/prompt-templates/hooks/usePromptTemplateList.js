import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getPromptTemplates } from "../services/promptTemplateService";
import { PROMPT_TEMPLATE_PAGE_SIZE, SORTABLE_FIELDS } from "../constants/promptTemplateConstants";

// Server-driven list state (search/filter/sort/pagination all round-trip to
// the backend) — matches src/pages/airs/skill-ontology/hooks/useSkillOntologyList.js.
export default function usePromptTemplateList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [taskTypeFilter, setTaskTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState(SORTABLE_FIELDS.UPDATED_AT);
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const [promptTemplates, setPromptTemplates] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Guards against an older fetch resolving after a newer one and
  // overwriting fresher results with stale data.
  const latestRequestId = useRef(0);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset to page 1 whenever filters or search change.
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, taskTypeFilter, statusFilter]);

  const fetchPromptTemplates = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPromptTemplates({
        page: currentPage,
        page_size: PROMPT_TEMPLATE_PAGE_SIZE,
        search: debouncedSearch || undefined,
        task_type: taskTypeFilter === "All" ? undefined : taskTypeFilter,
        status: statusFilter === "All" ? undefined : statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (requestId !== latestRequestId.current) return; // a newer fetch has since started — drop this one
      setPromptTemplates(res?.data?.items || []);
      setTotalCount(res?.data?.total ?? 0);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err);
      toast.error("Failed to load prompt templates.");
    } finally {
      if (requestId === latestRequestId.current) setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, taskTypeFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchPromptTemplates();
  }, [fetchPromptTemplates]);

  const refresh = useCallback(() => {
    fetchPromptTemplates();
  }, [fetchPromptTemplates]);

  const toggleSort = useCallback((field) => {
    setSortBy((prevField) => {
      if (prevField === field) {
        setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
        return prevField;
      }
      setSortOrder("asc");
      return field;
    });
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / PROMPT_TEMPLATE_PAGE_SIZE));

  return {
    promptTemplates,
    totalCount,
    totalPages,
    currentPage,
    setCurrentPage,
    isLoading,
    error,
    refresh,

    search,
    setSearch,
    taskTypeFilter,
    setTaskTypeFilter,
    statusFilter,
    setStatusFilter,

    sortBy,
    sortOrder,
    toggleSort,
  };
}
