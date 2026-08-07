import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import vendorService from "../services/vendorService";

export const VENDORS_KEY = (filters) => ["accountsPayable", "vendors", filters];

const PAGE_SIZE = 10;

/**
 * Fetches vendors matching `filters` with server-side filtering and
 * pagination. The backend returns a plain array with no total count, so we
 * request one extra row per page to detect whether a next page exists.
 * @param {{search?: string, statusId?: number, countryId?: number}} filters
 */
export const useVendors = (filters) => {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: VENDORS_KEY({ ...filters, page }),
    queryFn: () =>
      vendorService.getVendors({
        ...filters,
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE + 1,
      }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

  // Reset to first page whenever the filter criteria change.
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.statusId, filters.countryId]);

  const rows = query.data || [];
  const hasNextPage = rows.length > PAGE_SIZE;
  const vendors = hasNextPage ? rows.slice(0, PAGE_SIZE) : rows;
  const totalPages = page + (hasNextPage ? 1 : 0);

  return {
    ...query,
    vendors,
    page,
    setPage,
    totalPages,
    hasNextPage,
  };
};

export default useVendors;
