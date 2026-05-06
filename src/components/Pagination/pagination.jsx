import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const Pagination = ({ currentPage, totalPages, onPrevious, onNext, className }) => {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex justify-center items-center gap-4 py-2", className)}>
      <button
        onClick={onPrevious}
        disabled={currentPage === 1}
        className={cn(
          "flex items-center justify-center h-8 w-8 rounded-lg border transition-all duration-200",
          currentPage === 1
            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-sm active:scale-90"
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 px-3 py-1 bg-slate-100/50 rounded-full border border-slate-200/60">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Page</span>
        <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
          <span className="text-sm font-bold text-indigo-600 tabular-nums">{currentPage}</span>
          <span className="text-xs font-medium text-slate-400">of</span>
          <span className="text-sm font-bold text-slate-700 tabular-nums">{totalPages}</span>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={currentPage === totalPages}
        className={cn(
          "flex items-center justify-center h-8 w-8 rounded-lg border transition-all duration-200",
          currentPage === totalPages
            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-sm active:scale-90"
        )}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Pagination;

