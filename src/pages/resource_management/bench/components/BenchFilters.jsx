import React from "react";
import { X, Filter } from "lucide-react";

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
          <select value={filters.category} onChange={(event) => onChange("category", event.target.value)} className={selectClassName}>
            <option value="">All Categories</option>
            {filterOptions.categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className={labelClassName}>Geography</label>
          <select value={filters.location} onChange={(event) => onChange("location", event.target.value)} className={selectClassName}>
            <option value="">All Locations</option>
            {filterOptions.locations.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={labelClassName}>Availability Band</label>
          <select value={filters.availability} onChange={(event) => onChange("availability", event.target.value)} className={selectClassName}>
            <option value="">All Ranges</option>
            <option value="0-25">0-25%</option>
            <option value="26-50">26-50%</option>
            <option value="51-75">51-75%</option>
            <option value="76-100">76-100%</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className={labelClassName}>Seniority Level</label>
          <select value={filters.experience} onChange={(event) => onChange("experience", event.target.value)} className={selectClassName}>
            <option value="">All Bands</option>
            <option value="0-3">0-3 Years</option>
            <option value="4-7">4-7 Years</option>
            <option value="8-12">8-12 Years</option>
            <option value="13+">13+ Years</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={labelClassName}>Bench Aging</label>
          <select value={filters.aging} onChange={(event) => onChange("aging", event.target.value)} className={selectClassName}>
            <option value="">All Ranges</option>
            <option value="0-15">0-15 days</option>
            <option value="16-30">16-30 days</option>
            <option value="31+">31+ days</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className={labelClassName}>Cost Exposure</label>
          <select value={filters.cost} onChange={(event) => onChange("cost", event.target.value)} className={selectClassName}>
            <option value="">All Ranges</option>
            <option value="0-1500">0-1500</option>
            <option value="1501-3000">1501-3000</option>
            <option value="3001+">3001+</option>
          </select>
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

  if (isDashboardPortal) return FilterBody;

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
    </div>
  );
};

export default BenchFilters;

