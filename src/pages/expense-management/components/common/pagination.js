import { useEffect, useMemo, useState } from "react";

/** Rows per page for every table in Expense Management. */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Client-side pagination for a table whose full list is already loaded. Returns the current
 * page's rows plus props for the global Pagination component (`<Pagination {...paginationProps} />`).
 * Jumps back to a valid page if the list shrinks (a filter, a delete) below the current page.
 */
export function useClientPagination(items, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = items?.length ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => (items || []).slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  return {
    pageItems,
    paginationProps: {
      currentPage: page,
      totalPages,
      onPrevious: () => setPage((p) => Math.max(p - 1, 1)),
      onNext: () => setPage((p) => Math.min(p + 1, totalPages)),
    },
  };
}
