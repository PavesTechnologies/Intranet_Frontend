/**
 * Single-choice button group. Each option is a native <button> exposing
 * aria-pressed, so screen readers announce the selected option.
 */
export default function SegmentedControl({ label, options, value, onChange, size = "md" }) {
  const pad = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5";

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`min-h-[28px] touch-manipulation rounded-md text-xs font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${pad} ${
              selected
                ? "bg-white text-[#0A0082] shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
