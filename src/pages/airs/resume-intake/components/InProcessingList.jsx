import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import LoadingSpinner from "../../../../components/LoadingSpinner.jsx";
import Pagination from "../../../../components/Pagination/pagination";
import ResumeProcessingCard from "./ResumeProcessingCard";

const ITEMS_PER_PAGE = 10;

// Visually and behaviorally mirrors JdProcessingList.jsx (same expandable
// card, stage-stepper, status-badge, and pagination pattern) — only the
// stage set and per-card WS subscription (by task_id) differ.
export default function InProcessingList({ files, isLoading, onRefresh }) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(files.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 p-12 text-center text-slate-400 rounded-xl">
        <LoadingSpinner text="Loading in-progress resumes..."></LoadingSpinner>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
        <Loader2 className="h-10 w-10 mx-auto stroke-1 mb-2" />
        Nothing is currently queued or parsing.
      </div>
    );
  }

  const paginatedFiles = files.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      {paginatedFiles.map((f) => (
        <ResumeProcessingCard key={f.id || f.resume_id} file={f} onTerminal={onRefresh} />
      ))}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
      />
    </div>
  );
}
