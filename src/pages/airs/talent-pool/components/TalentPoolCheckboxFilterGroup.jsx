import React, { useMemo, useState } from "react";

// One categorical filter field inside TalentPoolFilterPanel, styled to match
// the project's existing "Client Filters" field pattern (uppercase label
// above a bordered control). The search box here only narrows the OPTIONS
// shown locally — it never calls the candidate search API. `selected` is
// this filter's draft value (OR-combined), owned by the panel until "Apply
// Filters" commits it.
export default function TalentPoolCheckboxFilterGroup({
  label,
  options,
  selected,
  onToggle,
  isOpen,
  onOpen,
  searchPlaceholder = "Search...",
  emptyLabel = "No options available.",
}) {
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="relative">
      <input
        aria-label={label}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onOpen();
        }}
        onFocus={onOpen}
        onClick={onOpen}
        placeholder={selected.length > 0 ? `${searchPlaceholder} (${selected.length})` : searchPlaceholder}
        className="w-full border border-slate-200 rounded-md py-1 px-2 text-[11px] outline-none focus:border-indigo-500 text-slate-700"
      />
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-24 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 space-y-0.5 shadow-lg">
          {options.length === 0 ? (
            <p className="text-[11px] text-slate-400 px-1.5 py-1">{emptyLabel}</p>
          ) : filteredOptions.length === 0 ? (
            <p className="text-[11px] text-slate-400 px-1.5 py-1">No matches.</p>
          ) : (
            filteredOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1.5 cursor-pointer select-none px-1.5 py-1 rounded hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  className="accent-indigo-600 h-3 w-3 shrink-0"
                  checked={selected.includes(opt.value)}
                  onChange={() => onToggle(opt.value)}
                />
                <span className="text-[11px] text-gray-700 truncate" title={opt.label}>
                  {opt.label}
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
