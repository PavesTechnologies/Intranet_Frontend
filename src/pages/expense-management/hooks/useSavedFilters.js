import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { savedFilterApi } from "../api/savedFilterApi";

const SAVED_FILTERS_KEY = ["savedFilters"];

/**
 * Hook to fetch all saved filters for current user
 * Spec: EP12-S3 - Saved Search/Filter Presets
 */
export const useSavedFilters = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: SAVED_FILTERS_KEY,
    queryFn: () => savedFilterApi.getAll(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const filters = data?.data?.data || [];

  return {
    filters,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook to fetch a specific saved filter
 */
export const useSavedFilter = (filterId) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [...SAVED_FILTERS_KEY, filterId],
    queryFn: () => savedFilterApi.getById(filterId),
    enabled: !!filterId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const filter = data?.data?.data;

  return {
    filter,
    isLoading,
    error,
  };
};

/**
 * Hook to create a new saved filter
 */
export const useCreateSavedFilter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ filterName, employeeId, filterJson }) =>
      savedFilterApi.create(filterName, employeeId, filterJson),
    onSuccess: () => {
      // Invalidate and refetch saved filters list
      queryClient.invalidateQueries({ queryKey: SAVED_FILTERS_KEY });
    },
  });
};

/**
 * Hook to update an existing saved filter
 */
export const useUpdateSavedFilter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ filterId, filterName, employeeId, filterJson }) =>
      savedFilterApi.update(filterId, filterName, employeeId, filterJson),
    onSuccess: (data) => {
      // Invalidate both list and specific filter
      queryClient.invalidateQueries({ queryKey: SAVED_FILTERS_KEY });
      queryClient.invalidateQueries({ queryKey: [...SAVED_FILTERS_KEY, data?.data?.data?.filterId] });
    },
  });
};

/**
 * Hook to delete a saved filter
 */
export const useDeleteSavedFilter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filterId) => savedFilterApi.delete(filterId),
    onSuccess: () => {
      // Invalidate saved filters list
      queryClient.invalidateQueries({ queryKey: SAVED_FILTERS_KEY });
    },
  });
};
