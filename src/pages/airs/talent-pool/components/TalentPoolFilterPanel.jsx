import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import TalentPoolCheckboxFilterGroup from "./TalentPoolCheckboxFilterGroup";

function titleCase(value) {
  return String(value)
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toStringOptions(values) {
  return (values || []).map((v) => ({ value: v, label: titleCase(v) }));
}

function RangeField({ label, minValue, maxValue, onMinChange, onMaxChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-400 uppercase ml-0.5">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          placeholder="Min"
          className="w-full border border-slate-200 rounded-md py-1 px-2 text-[11px] outline-none focus:border-indigo-500 text-slate-700"
        />
        <input
          type="number"
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          placeholder="Max"
          className="w-full border border-slate-200 rounded-md py-1 px-2 text-[11px] outline-none focus:border-indigo-500 text-slate-700"
        />
      </div>
    </div>
  );
}

// M13 filter panel — styled to match the project's existing "Client Filters"
// panel (FilterBar.jsx): uppercase title bar, uppercase labels above each
// field, Reset/Apply Filters footer. Rendered via a portal and positioned by
// the caller (TalentPoolFilters) relative to the Filters button's actual
// getBoundingClientRect, never a fixed screen position.
//
// Selections are staged in local `draft` state (re-seeded from
// `appliedFilters` every time the panel opens) and only reach the candidate
// search on "Apply Filters". Options come solely from GET /talentpoolfilters
// — no hardcoded/mock fallback. If that call fails or returns nothing, the
// panel shows "No filters found." instead of any fake options.
export default function TalentPoolFilterPanel({
  open,
  appliedFilters,
  options,
  optionsLoading,
  optionsError,
  onApply,
  onClear,
  onClose,
  positionStyle,
  align,
}) {
  const [draft, setDraft] = useState(appliedFilters);
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    if (open) {
      setDraft(appliedFilters);
      setActiveFilter(null);
    }
  }, [open, appliedFilters]);

  const toggleValue = (key, value) => {
    setDraft((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  };

  const setRange = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleClear = () => {
    onClear();
    onClose();
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const campaignOptions = (options.campaigns || []).map((c) => ({ value: c.id, label: c.name }));
  const noFiltersFound =
    !optionsLoading &&
    !optionsError &&
    (options.locations || []).length === 0 &&
    (options.designations || []).length === 0 &&
    (options.degreeLevels || []).length === 0 &&
    (options.educationFields || []).length === 0 &&
    campaignOptions.length === 0 &&
    (options.pipelineStages || []).length === 0;

  return (
    <div
      className={`fixed z-[100] w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
        align === "up" ? "origin-bottom" : "origin-top"
      }`}
      style={positionStyle}
    >
      <div className="flex justify-between items-center px-3 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
        <span className="text-[11px] text-slate-700">Talent Pool Filters</span>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Close filters">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {optionsLoading ? (
        <div className="py-10 flex justify-center">
          <LoadingSpinner text="Loading filter options..." size="sm" />
        </div>
      ) : optionsError || noFiltersFound ? (
        <div className="px-4 py-10 text-center">
          <p className="text-[12.5px] text-slate-400 font-semibold">No filters found.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <TalentPoolCheckboxFilterGroup
              label="Location"
              options={toStringOptions(options.locations)}
              selected={draft.locations}
              onToggle={(v) => toggleValue("locations", v)}
              isOpen={activeFilter === "locations"}
              onOpen={() => setActiveFilter("locations")}
              searchPlaceholder="Search location..."
            />
            <TalentPoolCheckboxFilterGroup
              label="Designation"
              options={toStringOptions(options.designations)}
              selected={draft.designations}
              onToggle={(v) => toggleValue("designations", v)}
              isOpen={activeFilter === "designations"}
              onOpen={() => setActiveFilter("designations")}
              searchPlaceholder="Search designation..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TalentPoolCheckboxFilterGroup
              label="Education Degree Level"
              options={toStringOptions(options.degreeLevels)}
              selected={draft.degreeLevels}
              onToggle={(v) => toggleValue("degreeLevels", v)}
              isOpen={activeFilter === "degreeLevels"}
              onOpen={() => setActiveFilter("degreeLevels")}
              searchPlaceholder="Search degree level..."
            />
            <TalentPoolCheckboxFilterGroup
              label="Education Field"
              options={toStringOptions(options.educationFields)}
              selected={draft.educationFields}
              onToggle={(v) => toggleValue("educationFields", v)}
              isOpen={activeFilter === "educationFields"}
              onOpen={() => setActiveFilter("educationFields")}
              searchPlaceholder="Search field..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TalentPoolCheckboxFilterGroup
              label="Campaign"
              options={campaignOptions}
              selected={draft.campaignIds}
              onToggle={(v) => toggleValue("campaignIds", v)}
              isOpen={activeFilter === "campaignIds"}
              onOpen={() => setActiveFilter("campaignIds")}
              searchPlaceholder="Search campaign..."
            />
            <TalentPoolCheckboxFilterGroup
              label="Pipeline Stage"
              options={toStringOptions(options.pipelineStages)}
              selected={draft.pipelineStages}
              onToggle={(v) => toggleValue("pipelineStages", v)}
              isOpen={activeFilter === "pipelineStages"}
              onOpen={() => setActiveFilter("pipelineStages")}
              searchPlaceholder="Search stage..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <RangeField
              label="Experience (Yrs)"
              minValue={draft.experienceMin}
              maxValue={draft.experienceMax}
              onMinChange={(v) => setRange("experienceMin", v)}
              onMaxChange={(v) => setRange("experienceMax", v)}
            />
            <RangeField
              label="Composite Score"
              minValue={draft.scoreMin}
              maxValue={draft.scoreMax}
              onMinChange={(v) => setRange("scoreMin", v)}
              onMaxChange={(v) => setRange("scoreMax", v)}
            />
          </div>
        </div>
      )}

      <div className="p-2 border-t border-slate-200 bg-slate-50 flex gap-2 shrink-0">
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 bg-white text-slate-500 border border-slate-200 py-1.5 rounded-lg text-[11px] font-bold hover:text-red-500 hover:border-red-100 transition-all active:scale-[0.98]"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={optionsLoading || !!optionsError || noFiltersFound}
          className="flex-[2] bg-indigo-600 text-white py-1.5 rounded-lg text-[11px] font-bold shadow-sm hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
