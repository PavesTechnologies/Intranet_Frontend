import { useState } from "react";

export function InputField({ label, type, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 border rounded-lg"
      />
    </div>
  );
}

export function TextAreaField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label}
      </label>
      <textarea
        rows="3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 border rounded-lg"
      />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
  loading = false,
}) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label}
      </label>

      <select
        disabled={disabled || loading}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full mt-1 px-3 py-2 border rounded-lg bg-white
          ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <option value="">
          {loading ? "Loading..." : `Select ${label}`}
        </option>

        {options.map((opt) => {
          if (typeof opt === "string") {
            return (
              <option key={opt} value={opt}>
                {opt}
              </option>
            );
          }

          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Search...",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = options.filter((opt) =>
    `${opt.label || ""} ${opt.name || ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const selectedLabel =
    options.find(
      (o) =>
        String(o.value || "") === String(value || "") ||
        String(o.label || "") === String(value || "") ||
        String(o.name || "") === String(value || ""),
    )?.label || "";

  return (
    <div className="relative">
      <label className="text-sm font-medium">
        {label}
      </label>

      <input
        disabled={disabled}
        value={open ? query : selectedLabel}
        onFocus={() => setOpen(true)}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={`w-full mt-1 px-3 py-2 border rounded-lg
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      />

      {open && !disabled && (
        <div className="absolute z-50 w-full bg-white border rounded-lg shadow max-h-48 overflow-y-auto mt-1">
          {filtered.length === 0 && (
            <div className="p-2 text-gray-500 text-sm">
              No results
            </div>
          )}

          {filtered.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                setQuery("");
              }}
              className="px-3 py-2 cursor-pointer hover:bg-indigo-50"
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
