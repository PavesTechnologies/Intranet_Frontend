import React from "react";

/** Compact count tabs for KPI filters inside an AR table card. */
export default function ARKPIStatusTabs({
  items = [],
  label = "Filter records by status",
  loading = false,
  className = "",
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200 px-2 sm:px-3 ${className}`}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={Boolean(item.active)}
          aria-pressed={Boolean(item.active)}
          disabled={item.disabled}
          title={item.title || item.label}
          onClick={item.onClick}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap
            rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold
            transition-colors duration-150
            focus:outline-none focus-visible:bg-slate-50
            disabled:cursor-not-allowed disabled:opacity-50 ${
              item.active
                ? "border-[#0A0082] text-[#0A0082]"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
            }`}
        >
          <span>{item.label}</span>

          <span
            className={`inline-flex min-w-[20px] items-center justify-center
              rounded-full px-1.5 py-0.5 text-[10px] font-semibold
              leading-none tabular-nums ${
                item.active
                  ? "bg-[#0A0082] text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
          >
            {loading ? "…" : item.value}
          </span>
        </button>
      ))}
    </div>
  );
}