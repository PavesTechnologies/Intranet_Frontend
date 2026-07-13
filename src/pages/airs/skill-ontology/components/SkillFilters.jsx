import React from "react";
import { Search } from "lucide-react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { CONFIDENCE_FILTER_OPTIONS, SKILL_SOURCE_FILTER_OPTIONS } from "../constants/skillOntologyConstants";

export default function SkillFilters({
  search,
  setSearch,
  category,
  setCategory,
  categoryOptions,
  confidenceFilter,
  setConfidenceFilter,
  source,
  setSource,
  showInactive,
  setShowInactive,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by canonical name or alias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[440px]">
        <FilterListbox options={categoryOptions} value={category} onChange={setCategory} />
        <FilterListbox options={CONFIDENCE_FILTER_OPTIONS} value={confidenceFilter} onChange={setConfidenceFilter} />
        <FilterListbox options={SKILL_SOURCE_FILTER_OPTIONS} value={source} onChange={setSource} />
      </div>

      <label className="flex items-center gap-2 shrink-0 cursor-pointer">
        <span className="text-[12px] font-semibold text-slate-600 whitespace-nowrap">Show inactive</span>
        <button
          type="button"
          onClick={() => setShowInactive(!showInactive)}
          className="w-11 h-6 rounded-full relative transition-colors"
          style={{ background: showInactive ? "#2563EB" : "#D9DEE7" }}
        >
          <div
            className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow"
            style={{ left: showInactive ? 22 : 2 }}
          />
        </button>
      </label>
    </div>
  );
}
