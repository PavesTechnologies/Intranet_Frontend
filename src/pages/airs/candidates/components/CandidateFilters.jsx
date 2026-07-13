import React from "react";
import { Search } from "lucide-react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { CANDIDATE_STAGE_FILTER_OPTIONS, CANDIDATE_SORT_OPTIONS } from "../constants/candidateConstants";

export default function CandidateFilters({ search, setSearch, stageFilter, setStageFilter, sortValue, setSortValue }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search candidates by name or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[380px]">
        <FilterListbox options={CANDIDATE_STAGE_FILTER_OPTIONS} value={stageFilter} onChange={setStageFilter} />
        <FilterListbox options={CANDIDATE_SORT_OPTIONS} value={sortValue} onChange={setSortValue} />
      </div>
    </div>
  );
}
