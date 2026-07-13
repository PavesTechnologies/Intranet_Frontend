import React from "react";
import { Search } from "lucide-react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { UPLOAD_STATUS_FILTER_OPTIONS, UPLOAD_SORT_OPTIONS } from "../constants/resumeIntakeConstants";

export default function ResumeIntakeFilters({ search, setSearch, statusFilter, setStatusFilter, sortValue, setSortValue }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search uploads by file name or uploader..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[340px]">
        <FilterListbox options={UPLOAD_STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
        <FilterListbox options={UPLOAD_SORT_OPTIONS} value={sortValue} onChange={setSortValue} />
      </div>
    </div>
  );
}
