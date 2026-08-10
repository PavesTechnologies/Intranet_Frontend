import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";

export const INVOICES_KEY = (params) => ["accountsPayable", "invoices", params];

/**
 * List query for Invoice Management and both queue pages — a single parameterized hook, not
 * one per queue, so pagination/search/filter logic lives in exactly one place.
 * @param {Object} params - see invoiceService.getInvoices for the full shape
 */
export function useInvoices(params = {}) {
  const query = useQuery({
    queryKey: INVOICES_KEY(params),
    queryFn: () => invoiceService.getInvoices(params),
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    invoices: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? params.page ?? 1,
    pageSize: query.data?.pageSize ?? params.pageSize ?? 10,
    totalPages: query.data?.totalPages ?? 1,
  };
}
