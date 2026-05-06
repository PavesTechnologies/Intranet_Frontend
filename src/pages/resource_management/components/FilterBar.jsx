import React, { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Search, Filter, X, Check } from "lucide-react";
import { Combobox, Listbox, Transition } from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/20/solid";
import ct from "countries-and-timezones";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";

// --- Reusable Components ---


const CountryCombobox = ({ value, onChange, options }) => {
  const [query, setQuery] = useState("");
  const filtered =
    query === ""
      ? options
      : options.filter((o) =>
        o
          .toLowerCase()
          .replace(/\s+/g, "")
          .includes(query.toLowerCase().replace(/\s+/g, "")),
      );

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative">
        <Combobox.Input
          className="w-full border rounded-md py-1 px-2 pr-6 text-[11px] outline-none focus:border-indigo-500 bg-white placeholder:text-gray-400 text-gray-700"
          displayValue={(o) => o || ""}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search country..."
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-1 cursor-pointer">
          <ChevronUpDownIcon className="h-3.5 w-3.5 text-gray-400" />
        </Combobox.Button>
        <Transition
          as={Fragment}
          afterLeave={() => setQuery("")}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Combobox.Options className="absolute mt-1 max-h-40 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 z-[70] text-[11px] focus:outline-none">
            <Combobox.Option
              value=""
              className={({ active }) =>
                `px-2 py-1.5 cursor-pointer flex justify-between items-center ${active ? "bg-slate-50 text-indigo-600" : "text-gray-400"}`
              }
            >
              {({ active }) => (
                <>All Countries {!value && <Check className="w-3 h-3" />}</>
              )}
            </Combobox.Option>
            {filtered.length === 0 && query !== "" ? (
              <div className="relative cursor-default select-none px-2 py-1.5 text-gray-500">
                Nothing found.
              </div>
            ) : (
              filtered.map((o) => (
                <Combobox.Option
                  key={o}
                  value={o}
                  className={({ active, selected }) =>
                    `px-2 py-1.5 cursor-pointer flex justify-between items-center ${active ? "bg-indigo-600 text-white" : "text-gray-700"} ${selected ? "font-semibold" : ""}`
                  }
                >
                  {({ active, selected }) => (
                    <>
                      <span className="truncate">{o}</span>
                      {value === o && (
                        <Check
                          className={`w-3 h-3 ${active ? "text-white" : "text-indigo-600"}`}
                        />
                      )}
                    </>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  );
};

const SelectListbox = ({
  value,
  onChange,
  options,
  placeholder = "Select",
}) => {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="w-full cursor-pointer border rounded-md py-1 px-2 pr-6 text-[11px] text-left outline-none focus:border-indigo-500 bg-white flex items-center justify-between text-gray-700">
          <span className={`block truncate ${!value ? "text-gray-500" : ""}`}>
            {value || placeholder}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
            <ChevronUpDownIcon
              className="h-3.5 w-3.5 text-gray-400"
              aria-hidden="true"
            />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute mt-1 max-h-40 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 z-[70] text-[11px] focus:outline-none">
            {/* "All" / Clear Option */}
            <Listbox.Option
              value=""
              className={({ active }) =>
                `px-2 py-1.5 cursor-pointer flex justify-between items-center ${active ? "bg-slate-50 text-indigo-600" : "text-gray-400"}`
              }
            >
              {({ active }) => (
                <>
                  {placeholder}
                  {!value && <Check className="w-3 h-3" />}
                </>
              )}
            </Listbox.Option>

            {options.map((opt) => (
              <Listbox.Option
                key={opt}
                value={opt}
                className={({ active, selected }) =>
                  `px-2 py-1.5 cursor-pointer flex justify-between items-center ${active ? "bg-indigo-600 text-white" : "text-gray-700"} ${selected ? "font-semibold" : ""}`
                }
              >
                {/* FIXED: Using render prop pattern here to access 'active' */}
                {({ active, selected }) => (
                  <>
                    <span className="truncate">{opt}</span>
                    {value === opt && (
                      <Check
                        className={`w-3 h-3 ${active ? "text-white" : "text-indigo-600"}`}
                      />
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};

// --- Main Component ---

const FilterBar = ({ filters, onUpdate }) => {
  const { getEnumValues } = useEnums();
  const CLIENT_TYPES = getEnumValues("ClientType");
  const PRIORITY_LEVELS = getEnumValues("PriorityLevel");
  const RECORD_STATUSES = getEnumValues("RecordStatus");

  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState(null);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const [draft, setDraft] = useState({ ...filters });
  const countries = useMemo(
    () =>
      Object.values(ct.getAllCountries())
        .map((c) => c.name)
        .sort(),
    [],
  );

  // Calculate active filters (excluding global search)
  const activeCount = useMemo(() => {
    if (!filters) return 0;
    return Object.entries(filters).filter(
      ([key, value]) =>
        key !== "search" &&
        value !== "" &&
        value !== null &&
        value !== undefined,
    ).length;
  }, [filters]);

  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const popupHeight = 350;
        const popupWidth = 320;

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        let align = 'down';
        if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
          align = 'up';
        }

        let horizontalPos = { left: rect.left };
        if (rect.left + popupWidth > viewportWidth) {
          horizontalPos = { right: viewportWidth - rect.right };
          delete horizontalPos.left;
        }

        setDropdownPos({
          top: align === 'up' ? 'auto' : (rect.bottom + 8),
          bottom: align === 'up' ? (viewportHeight - rect.top + 8) : 'auto',
          ...horizontalPos,
          align,
          maxHeight: Math.min(viewportHeight * 0.85, align === 'up' ? spaceAbove - 24 : spaceBelow - 24)
        });
      }
    };

    if (open) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  // Sync draft with global filters ONLY when global filters change (like Reset)
  useEffect(() => {
    setDraft({ ...filters });
  }, [filters]);

  const handleDateChange = (field, value) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "startDate" && !prev.endDate) {
        next.endDate = value;
      } else if (field === "endDate" && !prev.startDate) {
        next.startDate = value;
      }
      return next;
    });
  };

  const resetAndClose = () => {
    const empty = {
      search: "",
      region: "",
      type: "",
      priority: "",
      status: "",
      startDate: "",
      endDate: "",
    };
    setDraft(empty);
    onUpdate(empty);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e) => {
      if (buttonRef.current && buttonRef.current.contains(e.target)) return;
      const portal = document.getElementById('client-filter-portal');
      if (portal && !portal.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="flex items-center gap-2 p-2 bg-white border-b font-sans">
      {/* Search Input */}
      <div className="relative w-80 group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
        <input
          value={filters.search}
          onChange={(e) => onUpdate({ ...filters, search: e.target.value })}
          placeholder="Search client names..."
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all placeholder:text-gray-400"
        />
      </div>

      <div ref={containerRef} className="relative flex items-center gap-3">
        {/* Filter Toggle Button */}
        <button
          ref={buttonRef}
          onClick={() => setOpen(!open)}
          className={`
            relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 active:scale-[0.98] shadow-sm
            ${open
              ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-500/20"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
            }
          `}
        >
          <Filter
            className={`w-4 h-4 ${open ? "text-white" : "text-gray-500"}`}
          />
          {(filters.region && filters.region !== 'ALL') ||
            (filters.type && filters.type !== 'ALL') ||
            (filters.priority && filters.priority !== 'ALL') ||
            (filters.status && filters.status !== 'ALL')
            ? (filters.region || filters.type || filters.priority || filters.status)
            : 'Filters'
          }
          {!open && activeCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in duration-200">
              {activeCount}
            </span>
          )}
        </button>

        {/* Active Filter Counter */}
        {/* {!open && activeCount > 0 && (
          <span className="animate-in fade-in slide-in-from-left-2 duration-300 flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Active
            </span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
              {activeCount}
            </span>
          </span>
        )} */}

        {/* Dropdown Menu */}
        {open && dropdownPos && createPortal(
          <div
            id="client-filter-portal"
            className={`fixed z-[100] w-72 bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200
            ${dropdownPos.align === 'up' ? "origin-bottom" : "origin-top"}`}
            style={{
              top: dropdownPos.top === 'auto' ? 'auto' : `${dropdownPos.top}px`,
              bottom: dropdownPos.bottom === 'auto' ? 'auto' : `${dropdownPos.bottom}px`,
              right: dropdownPos.right !== undefined ? `${dropdownPos.right}px` : 'auto',
              left: dropdownPos.left !== undefined ? `${dropdownPos.left}px` : 'auto',
              maxHeight: `${dropdownPos.maxHeight}px`
            }}
          >
            <div className="flex justify-between items-center px-3 py-2 bg-slate-50 border-b">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Client Filters
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-0.5">
                    Country
                  </label>
                  <CountryCombobox
                    options={countries}
                    value={draft.region}
                    onChange={(v) => setDraft({ ...draft, region: v })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-0.5">
                    Type
                  </label>
                  <SelectListbox
                    value={draft.type}
                    onChange={(v) => setDraft({ ...draft, type: v })}
                    options={CLIENT_TYPES}
                    placeholder="All Types"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-0.5">
                    Priority
                  </label>
                  <SelectListbox
                    value={draft.priority}
                    onChange={(v) => setDraft({ ...draft, priority: v })}
                    options={PRIORITY_LEVELS}
                    placeholder="All"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-0.5">
                    Status
                  </label>
                  <SelectListbox
                    value={draft.status}
                    onChange={(v) => setDraft({ ...draft, status: v })}
                    options={RECORD_STATUSES}
                    placeholder="All Status"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    From
                  </label>
                  <input
                    type="date"
                    max={draft.endDate || undefined}
                    value={draft.startDate}
                    onChange={(e) =>
                      handleDateChange("startDate", e.target.value)
                    }
                    className="w-full border rounded-md py-1 px-1 text-[10px] outline-none focus:border-indigo-500 text-gray-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    To
                  </label>
                  <input
                    type="date"
                    min={draft.startDate || undefined}
                    value={draft.endDate}
                    onChange={(e) =>
                      handleDateChange("endDate", e.target.value)
                    }
                    className="w-full border rounded-md py-1 px-1 text-[10px] outline-none focus:border-indigo-500 text-gray-600"
                  />
                </div>
              </div>
            </div>

            <div className="p-2 border-t bg-slate-50 flex gap-2">
              <button
                onClick={resetAndClose}
                className="flex-1 bg-white text-slate-500 border border-slate-200 py-1.5 rounded-lg text-[11px] font-bold hover:text-red-500 hover:border-red-100 transition-all active:scale-[0.98]"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  onUpdate(draft);
                  setOpen(false);
                }}
                className="flex-[2] bg-indigo-600 text-white py-1.5 rounded-lg text-[11px] font-bold shadow-sm hover:bg-indigo-700 transition-all active:scale-[0.98]"
              >
                Apply Filters
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default FilterBar;
