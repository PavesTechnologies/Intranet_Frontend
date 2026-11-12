import React from "react";

// Shared segmented filter. The active option uses the site's navy primary.
export default function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            data-filter={o.key}
            onClick={() => onChange(o.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 ${
              active ? "bg-[#0A0082] text-white shadow-sm" : "text-slate-600 hover:text-[#0a174e]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
