import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

/**
 * A dropdown of checkboxes for picking several values, sized like FormSelect (label above, h-10 button).
 * The button reads "All …" when nothing is picked, the one name when one is, and "N …" otherwise.
 * Search narrows the list once it is long; "Select all" picks the options shown, "Clear" empties the choice.
 *
 * @param options  [{ value, label, hint? }]
 * @param value    array of picked values
 * @param onChange (nextValues) => void
 * @param noun     plural word for the button, e.g. "departments"
 */
export default function MultiSelectFilter({ label, options = [], value = [], onChange, noun = "items", allLabel, searchPlaceholder = "Search" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);
  const listId = useId();
  const picked = new Set(value);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.hint || ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (v) => onChange(picked.has(v) ? value.filter((x) => x !== v) : [...value, v]);
  const selectShown = () => onChange([...new Set([...value, ...shown.map((o) => o.value)])]);

  const summary =
    value.length === 0
      ? allLabel || `All ${noun}`
      : value.length === 1
      ? options.find((o) => o.value === value[0])?.label || value[0]
      : `${value.length} ${noun}`;

  return (
    <div className="relative" ref={boxRef} data-multi-select={noun}>
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${summary}`}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-sm text-gray-800 transition focus:outline-none focus:ring-2 focus:ring-[#0A0082]/15 ${
          open ? "border-[#0A0082]" : "border-gray-300"
        }`}
      >
        <span className="truncate">{summary}</span>
        <span className="flex shrink-0 items-center gap-1">
          {value.length > 0 && (
            <span className="rounded-full bg-[#0A0082]/10 px-1.5 text-[11px] font-semibold text-[#0A0082]">{value.length}</span>
          )}
          <ChevronDown size={16} className={`text-gray-500 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div id={listId} className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {options.length > 6 && (
            <label className="mb-2 flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-2.5 focus-within:border-[#0A0082]">
              <Search size={14} className="text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={`Search ${noun}`}
                className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
              />
            </label>
          )}
          <div className="mb-1 flex items-center justify-between px-1 text-xs">
            <button type="button" onClick={selectShown} className="font-semibold text-[#0A0082] hover:underline" disabled={!shown.length}>
              Select all{query ? " shown" : ""}
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={!value.length}
              className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-40"
            >
              <X size={12} aria-hidden="true" /> Clear
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto" role="group" aria-label={label}>
            {shown.map((o) => {
              const on = picked.has(o.value);
              return (
                <li key={o.value}>
                  <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 ${on ? "text-[#0a174e]" : "text-slate-700"}`}>
                    <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggle(o.value)} />
                    <span
                      aria-hidden="true"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border peer-focus-visible:ring-2 peer-focus-visible:ring-[#0A0082]/40 ${on ? "border-[#0A0082] bg-[#0A0082] text-white" : "border-slate-300 bg-white"}`}
                    >
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="shrink-0 text-[11px] text-slate-400">{o.hint}</span>}
                  </label>
                </li>
              );
            })}
            {!shown.length && <li className="px-2 py-3 text-center text-xs text-slate-400">No {noun} match “{query}”.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
