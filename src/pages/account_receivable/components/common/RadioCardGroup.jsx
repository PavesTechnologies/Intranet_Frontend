export default function RadioCardGroup({
  name,
  options,
  value,
  onChange,
  columns = 3,
  disabled = false,
}) {
  const columnClass =
    {
      2: "sm:grid-cols-2",
      3: "sm:grid-cols-2 lg:grid-cols-3",
      4: "sm:grid-cols-2 lg:grid-cols-4",
    }[columns] || "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div role="radiogroup" aria-label={name} className={`grid grid-cols-1 gap-3 ${columnClass}`}>
      {options.map((option) => {
        const isSelected = String(value) === String(option.value);

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange?.(option.value)}
            className={`rounded-xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30 ${isSelected
                ? "border-[#0A0082] bg-[#0A0082]/5 ring-1 ring-[#0A0082]"
                : "border-slate-200 bg-white hover:border-slate-300"
              } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? "border-[#0A0082]" : "border-slate-300"
                  }`}
              >
                {isSelected ? <span className="h-2 w-2 rounded-full bg-[#0A0082]" /> : null}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                {option.description ? (
                  <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
                ) : null}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
