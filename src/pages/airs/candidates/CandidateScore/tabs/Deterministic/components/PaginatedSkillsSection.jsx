import React, { useEffect, useState } from "react";
import Pagination from "@/components/Pagination/pagination";

const DEFAULT_PAGE_SIZE = 8;

// Client-side pagination shell for the Mandatory / Preferred / Missing /
// Additional skill lists — the deterministic breakdown returns every skill
// in one response, so paging happens entirely in the browser. Resets to
// page 1 whenever the underlying item list changes (e.g. a refetch).
export default function PaginatedSkillsSection({ items, pageSize = DEFAULT_PAGE_SIZE, children }) {
  const [currentPage, setCurrentPage] = useState(1);
  const list = items || [];
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [items]);

  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  return (
    <div>
      {children(pageItems)}
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
      />
    </div>
  );
}
