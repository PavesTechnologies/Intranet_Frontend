import { useCallback, useState } from "react";

const DEFAULT_FILTERS = {
  search: "",
  invoiceType: "",
  dateField: "invoiceDate",
  dateFrom: "",
  dateTo: "",
  page: 1,
};

/**
 * Combined filter state for the invoice list/queue views (search + type + date range +
 * pagination page) — a single small hook rather than five separate useState calls scattered
 * across InvoiceQueueView, so "Clear Filters" and "changing a filter resets to page 1" are each
 * defined once.
 */
export function useInvoiceFilters() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const setSearch = useCallback((search) => setFilters((f) => ({ ...f, search, page: 1 })), []);
  const setInvoiceType = useCallback((invoiceType) => setFilters((f) => ({ ...f, invoiceType, page: 1 })), []);
  const setDateRange = useCallback(
    (dateFrom, dateTo, dateField = "invoiceDate") => setFilters((f) => ({ ...f, dateFrom, dateTo, dateField, page: 1 })),
    []
  );
  const setPage = useCallback((page) => setFilters((f) => ({ ...f, page })), []);
  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const hasActiveFilters = Boolean(
    filters.search || filters.invoiceType || filters.dateFrom || filters.dateTo
  );

  return { filters, setSearch, setInvoiceType, setDateRange, setPage, resetFilters, hasActiveFilters };
}
