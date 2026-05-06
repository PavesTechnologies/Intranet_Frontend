// src/pages/Projects/MyWork/components/FilterBar.jsx
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { useMyWorkStore } from "../hooks/myWorkStore";
import { TYPE_CONFIG, PRIORITY_CONFIG } from "../utils/myWorkUtils";

const MultiSelect = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (value) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium
          transition-colors duration-150
          ${selected.length > 0
            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}
        `}
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {selected.length}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[160px] py-1 overflow-hidden">
          {options.map(({ value, label: optLabel, color }) => (
            <button
              key={value}
              onClick={() => toggle(value)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left
                transition-colors hover:bg-slate-50
                ${selected.includes(value) ? "bg-indigo-50" : ""}
              `}
            >
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                selected.includes(value) ? "bg-indigo-500" : "bg-slate-200"
              }`} />
              {color && (
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
              )}
              <span className={selected.includes(value) ? "text-indigo-700 font-medium" : "text-slate-700"}>
                {optLabel}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function FilterBar({ projects }) {
  const {
    selectedProjects, setSelectedProjects,
    selectedTypes,    setSelectedTypes,
    selectedPriorities, setSelectedPriorities,
    activeChip, clearFilters,
  } = useMyWorkStore();

  const projectOptions = (projects || []).map((g) => ({
    value: g.projectId,
    label: g.projectName,
  }));

  const typeOptions = Object.entries(TYPE_CONFIG)
    .filter(([k]) => ["TASK","STORY","BUG"].includes(k))
    .map(([value, cfg]) => ({ value, label: cfg.label, color: cfg.dot }));

  const priorityOptions = Object.entries(PRIORITY_CONFIG).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  }));

  const hasFilters = selectedProjects.length > 0
    || selectedTypes.length > 0
    || selectedPriorities.length > 0
    || !!activeChip;

  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />

      <MultiSelect
        label="Projects"
        options={projectOptions}
        selected={selectedProjects}
        onChange={setSelectedProjects}
      />
      <MultiSelect
        label="Type"
        options={typeOptions}
        selected={selectedTypes}
        onChange={setSelectedTypes}
      />
      <MultiSelect
        label="Priority"
        options={priorityOptions}
        selected={selectedPriorities}
        onChange={setSelectedPriorities}
      />

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium
            text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent
            hover:border-red-200 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear filters
        </button>
      )}
    </div>
  );
}