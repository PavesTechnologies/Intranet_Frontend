import React from "react";
import { Search } from "lucide-react";
import FilterListbox from "@/components/filter/FilterListbox";

const STAGE_FILTER_OPTIONS = [
  { label: "All Stages", value: "All" },
  { label: "HM Review", value: "HM_REVIEW" },
  { label: "Interview", value: "INTERVIEW" },
];

export default function QueueFilters({ search, setSearch, stageFilter, setStageFilter }) {
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

      <div className="w-full lg:w-56">
        <FilterListbox options={STAGE_FILTER_OPTIONS} value={stageFilter} onChange={setStageFilter} />
      </div>
    </div>
  );
}
