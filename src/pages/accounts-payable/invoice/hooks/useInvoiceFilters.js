import { useCallback, useState } from "react";

const DEFAULT_FILTERS = {
  search: "",
  invoiceType: "",
  status: "",
  dateField: "invoiceDate",
  dateFrom: "",
  dateTo: "",
  page: 1,
};

/**
 * Combined filter state for the invoice list/queue views (search + type + status + date range +
 * pagination page) — a single small hook rather than six separate useState calls scattered
 * across InvoiceQueueView, so "Clear Filters" and "changing a filter resets to page 1" are each
 * defined once.
 *
 * Search and filters clear independently: `clearFilters` drops type/status/date but keeps the
 * search term, while `resetFilters` restores everything (used when switching queue tabs).
 */
export function useInvoiceFilters() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const setSearch = useCallback(
    // Same term (e.g. only trailing whitespace changed) keeps the current page.
    (search) => setFilters((f) => (f.search === search ? f : { ...f, search, page: 1 })),
    [],
  );
  const setInvoiceType = useCallback((invoiceType) => setFilters((f) => ({ ...f, invoiceType, page: 1 })), []);
  const setStatus = useCallback((status) => setFilters((f) => ({ ...f, status, page: 1 })), []);
  const setDateRange = useCallback(
    (dateFrom, dateTo, dateField = "invoiceDate") => setFilters((f) => ({ ...f, dateFrom, dateTo, dateField, page: 1 })),
    []
  );
  const setPage = useCallback((page) => setFilters((f) => ({ ...f, page })), []);
  const clearFilters = useCallback(
    () => setFilters((f) => ({ ...DEFAULT_FILTERS, search: f.search })),
    [],
  );
  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const hasActiveFilters = Boolean(filters.invoiceType || filters.status || filters.dateFrom || filters.dateTo);
  // Anything narrowing the list, search included — decides the "no matches" empty state.
  const hasActiveCriteria = Boolean(filters.search) || hasActiveFilters;

  return {
    filters,
    setSearch,
    setInvoiceType,
    setStatus,
    setDateRange,
    setPage,
    clearFilters,
    resetFilters,
    hasActiveFilters,
    hasActiveCriteria,
  };
}
