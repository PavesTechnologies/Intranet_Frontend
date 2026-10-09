import { useQuery } from "@tanstack/react-query";
import { globalSearchApi } from "../api/globalSearchApi";
import { useMemo } from "react";

const GLOBAL_SEARCH_KEY = ["globalSearch"];

/**
 * Hook for global expense search with role-based scope enforcement
 * Backend returns paginated results scoped by role
 * Spec: EP12-S1 - Global search across reports and line items
 */
export const useGlobalSearch = (page = 0, size = 20, query = "") => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...GLOBAL_SEARCH_KEY, query, page, size],
    queryFn: () => globalSearchApi.search(query, page, size),
    enabled: query && query.trim() !== "",
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const results = data?.data?.content || [];
  const totalElements = data?.data?.totalElements || 0;
  const totalPages = data?.data?.totalPages || 0;

  return {
    results,
    totalElements,
    totalPages,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Client-side filtering for search results
 * Filters: searchText, status, dateFrom, dateTo, amountMin, amountMax, category, costCenter
 */
export const useFilteredResults = (results, filters = {}) => {
  const filtered = useMemo(() => {
    let filtered = [...results];

    // Text search (free-text across multiple fields)
    if (filters.searchText?.trim()) {
      const query = filters.searchText.toLowerCase();
      filtered = filtered.filter(r =>
        r.reportNumber?.toLowerCase().includes(query) ||
        r.employeeName?.toLowerCase().includes(query) ||
        r.merchant?.toLowerCase().includes(query) ||
        r.businessPurpose?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filters.status && filters.status !== "ALL") {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    // Date range filter
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      filtered = filtered.filter(r => new Date(r.createdAt) >= dateFrom);
    }
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.createdAt) <= dateTo);
    }

    // Amount range filter
    if (filters.amountMin !== undefined && filters.amountMin !== "") {
      filtered = filtered.filter(r => r.amount >= parseFloat(filters.amountMin));
    }
    if (filters.amountMax !== undefined && filters.amountMax !== "") {
      filtered = filtered.filter(r => r.amount <= parseFloat(filters.amountMax));
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(r => r.category === filters.category);
    }

    // Cost center filter
    if (filters.costCenter) {
      filtered = filtered.filter(r => r.costCenter === filters.costCenter);
    }

    return filtered;
  }, [results, filters]);

  return filtered;
};
