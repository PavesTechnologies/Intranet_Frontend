import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/Pagination/pagination";

const TONE = {
  matching: "bg-emerald-50 text-emerald-700 border-emerald-100",
  missing: "bg-rose-50 text-rose-700 border-rose-100",
  neutral: "bg-blue-50 text-blue-700 border-blue-100",
};

const PAGE_SIZE = 8;

// Matching Skills / Missing Skills / Matched Keywords — rendered as chips off
// semantic_score_breakdown.matching_skills / .missing_skills / .matched_keywords.
// Paginated client-side (8 per page) by default since these can run to 20+
// entries; pass paginate={false} to render the full list with no controls.
export default function SkillChipGroup({ title, items, tone = "neutral", paginate = true }) {
  const [currentPage, setCurrentPage] = useState(1);
  const list = items || [];
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [items]);

  const safePage = Math.min(currentPage, totalPages);
  const start = paginate ? (safePage - 1) * PAGE_SIZE : 0;
  const pageItems = paginate ? list.slice(start, start + PAGE_SIZE) : list;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <span className="text-[12.5px] font-bold text-slate-900 block mb-2.5">{title}</span>
      {list.length === 0 ? (
        <p className="text-[11.5px] text-slate-400">No data available</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {pageItems.map((item, i) => (
              <Badge key={start + i} className={`${TONE[tone]} font-medium px-2.5 py-1 text-[11px]`}>
                {item}
              </Badge>
            ))}
          </div>
          {paginate && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            />
          )}
        </>
      )}
    </div>
  );
}
