import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import procurementService from "../services/procurementService";

export const PR_LIST_KEY = (filters) => ["accountsPayable", "procurement", "purchaseRequisitions", filters];

const PAGE_SIZE = 10;

/**
 * Purchase requisitions matching `filters`, paginated client-side the same way
 * useVendors.js does — the backend returns a plain array with no total count, so we
 * request one extra row per page to detect whether a next page exists.
 * @param {{departmentId?: number, purchaseCategoryId?: number, statusId?: number,
 *   createdBy?: string, search?: string}} filters
 */
export const usePurchaseRequisitions = (filters = {}) => {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: PR_LIST_KEY({ ...filters, page }),
    queryFn: () =>
      procurementService.getPurchaseRequisitions({
        ...filters,
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE + 1,
      }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    setPage(1);
  }, [filters.departmentId, filters.purchaseCategoryId, filters.statusId, filters.search]);

  const rows = query.data || [];
  const hasNextPage = rows.length > PAGE_SIZE;
  const purchaseRequisitions = hasNextPage ? rows.slice(0, PAGE_SIZE) : rows;
  const totalPages = page + (hasNextPage ? 1 : 0);

  return {
    ...query,
    purchaseRequisitions,
    page,
    setPage,
    totalPages,
    hasNextPage,
  };
};

/**
 * Unpaginated fetch used to populate PR selectors (Quotation / Vendor Selection tabs),
 * which need the whole eligible set to filter by status code client-side, not a page of it.
 */
export const useAllPurchaseRequisitions = (limit = 200) =>
  useQuery({
    queryKey: PR_LIST_KEY({ all: true, limit }),
    queryFn: () => procurementService.getPurchaseRequisitions({ limit }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

export default usePurchaseRequisitions;
