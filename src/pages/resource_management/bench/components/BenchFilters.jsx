import React from "react";
import { X, Filter } from "lucide-react";
import FilterListbox from "../../../../components/filter/FilterListbox";

const BenchFilters = ({
  open,
  filters,
  filterOptions,
  onChange,
  onReset,
  onApply,
  onClose,
  isDashboardPortal = false,
}) => {
  if (!open) return null;

  const labelClassName = "text-[10px] font-black text-slate-400 capitalize tracking-tighter ml-0.5 mb-1.5 block";
  const selectClassName = "w-full text-[11px] font-semibold border-slate-200 rounded-lg h-9 bg-slate-50/50 focus:ring-indigo-600 shadow-sm transition-all outline-none";

  const FilterBody = (
    <div className={`space-y-4 ${isDashboardPortal ? '' : 'p-5 flex-1 max-h-[60vh] overflow-y-auto custom-scrollbar pb-8'}`}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={labelClassName}>Category Type</label>
          <FilterListbox options={[{value:"",label:"All Categories"},...filterOptions.categories.map(item=>({value:item,label:item}))]} value={filters.category} onChange={(val) => onChange("category", val)} />
        </div>

        <div className="space-y-1">
          <label className={labelClassName}>Geography</label>
          <FilterListbox options={[{value:"",label:"All Locations"},...filterOptions.locations.map(item=>({value:item,label:item}))]} value={filters.location} onChange={(val) => onChange("location", val)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={labelClassName}>Availability Band</label>
          <FilterListbox options={[{value:"",label:"All Ranges"},{value:"0-25",label:"0-25%"},{value:"26-50",label:"26-50%"},{value:"51-75",label:"51-75%"},{value:"76-100",label:"76-100%"}]} value={filters.availability} onChange={(val) => onChange("availability", val)} />
        </div>

        <div className="space-y-1">
          <label className={labelClassName}>Seniority Level</label>
          <FilterListbox options={[{value:"",label:"All Bands"},{value:"0-3",label:"0-3 Years"},{value:"4-7",label:"4-7 Years"},{value:"8-12",label:"8-12 Years"},{value:"13+",label:"13+ Years"}]} value={filters.experience} onChange={(val) => onChange("experience", val)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={labelClassName}>Bench Aging</label>
          <FilterListbox options={[{value:"",label:"All Ranges"},{value:"0-15",label:"0-15 days"},{value:"16-30",label:"16-30 days"},{value:"31+",label:"31+ days"}]} value={filters.aging} onChange={(val) => onChange("aging", val)} />
        </div>

        <div className="space-y-1">
          <label className={labelClassName}>Cost Exposure</label>
          <FilterListbox options={[{value:"",label:"All Ranges"},{value:"0-1500",label:"0-1500"},{value:"1501-3000",label:"1501-3000"},{value:"3001+",label:"3001+"}]} value={filters.cost} onChange={(val) => onChange("cost", val)} />
        </div>
      </div>

      {!isDashboardPortal && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[10px] font-medium text-slate-400 italic leading-relaxed">
            Adjust recruitment criteria to isolate specific bench availability gaps.
          </p>
        </div>
      )}
    </div>
  );

  const FilterFooter = (
    <div className="shrink-0 p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
      <button 
        type="button"
        onClick={onReset}
        className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-lg text-[11px] font-bold hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-[0.98] shadow-sm"
      >
        Reset All
      </button>
      <div className="flex-[2] flex items-center gap-3">
        <button 
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-600 capitalize tracking-widest transition-colors outline-none"
        >
          Cancel
        </button>
        <button 
          type="button"
          onClick={onApply}
          className="flex-[1.5] bg-indigo-600 text-white py-2 rounded-lg text-[11px] font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-[0.98]"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );

  if (isDashboardPortal) {
    return (
      <>
        <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
          {FilterBody}
        </div>
        {FilterFooter}
      </>
    );
  }

  return (
    <div className="flex flex-col w-full bg-white rounded-xl overflow-hidden font-sans">
      {/* Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-indigo-500" />
          <h3 className="text-[12px] font-bold text-slate-800 capitalize tracking-widest leading-none mt-0.5">Bench Inventory Filters</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      {FilterBody}

      {/* Footer */}
      {FilterFooter}
    </div>
  );
};

export default BenchFilters;

