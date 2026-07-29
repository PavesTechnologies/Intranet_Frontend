import React from "react";
import { Search } from "lucide-react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { TASK_TYPE_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "../constants/promptTemplateConstants";

export default function PromptTemplateFilters({
  search,
  setSearch,
  taskTypeFilter,
  setTaskTypeFilter,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by prompt name, task type, or prompt template..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[320px]">
        <FilterListbox options={TASK_TYPE_FILTER_OPTIONS} value={taskTypeFilter} onChange={setTaskTypeFilter} />
        <FilterListbox options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
      </div>
    </div>
  );
}
