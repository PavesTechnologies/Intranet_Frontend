import React from "react";

// Shared pill filter. The active option is the site's navy with a soft shadow.
export default function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full bg-slate-100/80 p-1">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            data-filter={o.key}
            onClick={() => onChange(o.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 ${
              active ? "bg-[#0A0082] text-white shadow-md shadow-[#0A0082]/20" : "text-slate-600 hover:bg-white hover:text-[#0a174e]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
