import React from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { PARSE_STATUS_FILTER_OPTIONS, SOURCE_FILTER_OPTIONS, RESUME_SORT_OPTIONS } from "../constants/resumeIntakeConstants";

export default function ResumeIntakeFilters({
  campaignOptions,
  campaignFilter,
  setCampaignFilter,
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  sortValue,
  setSortValue,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        <FilterListbox options={campaignOptions} value={campaignFilter} onChange={setCampaignFilter} />
        <FilterListbox options={PARSE_STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
        <FilterListbox options={SOURCE_FILTER_OPTIONS} value={sourceFilter} onChange={setSourceFilter} />
        <FilterListbox options={RESUME_SORT_OPTIONS} value={sortValue} onChange={setSortValue} />
      </div>
    </div>
  );
}
