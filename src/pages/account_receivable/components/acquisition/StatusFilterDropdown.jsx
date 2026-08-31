import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Circle } from "lucide-react";

export default function StatusFilterDropdown({
  selectedStatus = "ALL",
  onSelectStatus,
  counts = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const primaryWorkflow = [
    { key: "ALL", label: "All Setups", count: counts.totalSetups ?? 0 },
    { key: "NOT_ACQUIRED", label: "Not Acquired", count: counts.notAcquired ?? 0 },
    { key: "NEEDS_APPROVAL", label: "Needs Approval", count: counts.needsApproval ?? 0 },
    { key: "READY", label: "Ready", count: counts.ready ?? 0 },
  ];

  const exceptionsWorkflow = [
    { key: "NO_BILLABLE_DATA", label: "No Billable Data", count: counts.noData ?? 0 },
    { key: "ACQUISITION_FAILED", label: "Acquisition Failed", count: counts.failed ?? 0 },
    { key: "CONFIGURATION_REQUIRED", label: "Configuration Required", count: counts.configReq ?? 0 },
  ];

  const allOptions = [...primaryWorkflow, ...exceptionsWorkflow];
  const activeOption = allOptions.find((o) => o.key === selectedStatus) || primaryWorkflow[0];

  const handleSelect = (key) => {
    onSelectStatus(key);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left w-full sm:w-64" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-3 text-left text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      >
        <span className="truncate">
          {activeOption.label} <span className="font-mono text-slate-500">({activeOption.count})</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {/* Ultra-Compact Enterprise Dropdown Menu (Height ~330px, No Scrollbar) */}
      {isOpen && (
        <div className="absolute right-0 z-[9999] mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-100">
          {/* Main Header */}
          <div className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Filter by Status
          </div>

          {/* Primary Workflow Options */}
          <div className="mt-0.5 space-y-0.5">
            {primaryWorkflow.map((option) => {
              const isSelected = selectedStatus === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleSelect(option.key)}
                  className={`flex min-h-[34px] w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "bg-indigo-50/90 text-indigo-900 font-semibold border border-indigo-100/60"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0 stroke-[2.5]" />
                    ) : (
                      <Circle className="h-3 w-3 text-slate-300 flex-shrink-0" />
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>
                  <span
                    className={`font-mono text-xs ${
                      isSelected ? "text-indigo-700 font-bold" : option.count === 0 ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Section Divider */}
          <div className="my-1 border-t border-slate-100" />

          {/* Exceptions Header */}
          <div className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Exceptions
          </div>

          {/* Exception States Options */}
          <div className="mt-0.5 space-y-0.5">
            {exceptionsWorkflow.map((option) => {
              const isSelected = selectedStatus === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleSelect(option.key)}
                  className={`flex min-h-[34px] w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "bg-indigo-50/90 text-indigo-900 font-semibold border border-indigo-100/60"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0 stroke-[2.5]" />
                    ) : (
                      <Circle className="h-3 w-3 text-slate-300 flex-shrink-0" />
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>
                  <span
                    className={`font-mono text-xs ${
                      isSelected ? "text-indigo-700 font-bold" : option.count === 0 ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
