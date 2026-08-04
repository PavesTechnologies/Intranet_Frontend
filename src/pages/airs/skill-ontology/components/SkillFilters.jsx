import React from "react";
import { Search } from "lucide-react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import {
  CONFIDENCE_FILTER_OPTIONS,
  SKILL_SOURCE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from "../constants/skillOntologyConstants";

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
  statusFilter,
  setStatusFilter,
  // Unknown Skills has no category/confidence/source/is_active filters — only
  // search — so this renders just the search box instead of a second,
  // near-duplicate filter-bar component.
  onlySearch = false,
  searchPlaceholder = "Search by canonical name or alias...",
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      {!onlySearch && (
        <>
          {/* Status is a dropdown, not a toggle: Active / Inactive / All are
              three distinct states and a toggle can only express two. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto lg:min-w-[580px]">
            <FilterListbox options={categoryOptions} value={category} onChange={setCategory} />
            <FilterListbox options={CONFIDENCE_FILTER_OPTIONS} value={confidenceFilter} onChange={setConfidenceFilter} />
            <FilterListbox options={SKILL_SOURCE_FILTER_OPTIONS} value={source} onChange={setSource} />
            <FilterListbox options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
          </div>
        </>
      )}
    </div>
  );
}
