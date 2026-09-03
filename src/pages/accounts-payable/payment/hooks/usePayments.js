import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { paymentService } from "../services/paymentService";

export const PAYMENTS_KEY = (filters) => ["accountsPayable", "payments", filters];

const PAGE_SIZE = 20;

/**
 * Fetches payments matching `filters` with server-side filtering and pagination. The backend
 * returns a plain array with no total count (same limitation as vendors — see useVendors.js),
 * so this requests one extra row per page to detect whether a next page exists.
 * @param {{vendorId?: number, statusId?: number}} filters
 */
export function usePayments(filters = {}) {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: PAYMENTS_KEY({ ...filters, page }),
    queryFn: () =>
      paymentService.getPayments({
        ...filters,
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE + 1,
      }),
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    setPage(1);
  }, [filters.vendorId, filters.statusId]);

  const rows = query.data || [];
  const hasNextPage = rows.length > PAGE_SIZE;
  const payments = hasNextPage ? rows.slice(0, PAGE_SIZE) : rows;
  const totalPages = page + (hasNextPage ? 1 : 0);

  return {
    ...query,
    payments,
    page,
    setPage,
    totalPages,
    hasNextPage,
  };
}
