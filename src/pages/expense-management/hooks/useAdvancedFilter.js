import { useQuery } from "@tanstack/react-query";
import { advancedFilterApi } from "../api/advancedFilterApi";

const ADVANCED_FILTER_KEY = ["advancedFilter"];

/**
 * Hook for advanced multi-criteria filtering with server-side scope enforcement
 * Spec: EP12-S2 - Advanced filters for precise expense data narrowing
 *
 * Features:
 * - Server-side filtering (all criteria applied server-side)
 * - Amount range validation (server validates min <= max)
 * - Conflicting filters return empty set (no error)
 * - Role-based scope enforcement (admin/finance see all, others see own)
 * - URL-encoded filters for shareable/bookmarkable views
 * - Reactive results update on filter change
 */
export const useAdvancedFilter = (filters = {}, page = 0, size = 20) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...ADVANCED_FILTER_KEY, JSON.stringify(filters), page, size],
    queryFn: () => advancedFilterApi.filter(filters, page, size),
    // Always enabled - even with no filters, user can see all their own reports
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
