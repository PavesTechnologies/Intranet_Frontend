import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { filterInvoices, invoiceService } from "../services/invoiceService";

/**
 * One cache entry for the whole invoice list. The backend list endpoint takes no filter params,
 * so search/filter/page are applied client-side in `select` rather than being part of the key —
 * changing them re-filters the cached array instantly instead of re-downloading every invoice
 * per keystroke. Still under ["accountsPayable", "invoices"], so every existing invalidation
 * (approvals, payments, TDS, OCR review...) refreshes it.
 */
export const INVOICE_LIST_KEY = ["accountsPayable", "invoices", "list"];

/**
 * List query for Invoice Management and both queue pages — a single parameterized hook, not
 * one per queue, so pagination/search/filter logic lives in exactly one place.
 * @param {Object} params - see invoiceService.getInvoices for the full shape
 */
export function useInvoices(params = {}) {
  // Keyed on the serialized params so `select` only re-runs when the criteria actually change.
  const paramsKey = JSON.stringify(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const select = useCallback((all) => filterInvoices(all, params), [paramsKey]);

  const query = useQuery({
    queryKey: INVOICE_LIST_KEY,
    queryFn: () => invoiceService.getAllInvoices(),
    select,
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
