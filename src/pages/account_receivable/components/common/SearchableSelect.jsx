import { useState } from "react";
import { Combobox } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import classNames from "classnames";

// `anchor` opts into Headless UI's floating/portal-based panel positioning
// (renders the options panel into a portal instead of a `relative` ancestor),
// which is what lets the panel escape an `overflow-hidden` parent instead of
// being clipped by it. Existing callers that don't pass `anchor` keep the
// original in-flow `absolute` panel behavior untouched.
export default function SearchableSelect({
  label,
  options,
  value,
  onChange,
  name,
  placeholder = "Search...",
  disabled = false,
  requiredMark = false,
  anchor = false,
  emptyState,
  noMatchesMessage = "No matches found.",
}) {
  const [query, setQuery] = useState("");
  const selectedOption = options.find((option) => option.value === value) || null;

  const filteredOptions =
    query === ""
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));

  const optionsPanelClassName = classNames(
    "z-50 max-h-[300px] overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm",
    anchor ? "w-[var(--input-width)] [--anchor-gap:4px]" : "absolute mt-1 w-max min-w-full"
  );

  return (
    <div className="space-y-1 w-full min-w-0">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {requiredMark ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
      )}

      <Combobox
        value={value || null}
        onChange={(val) => onChange({ target: { name, value: val } })}
        disabled={disabled}
      >
        <div className="relative min-w-0">
          <Combobox.Input
            className="w-full min-w-0 px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:cursor-not-allowed disabled:bg-gray-100"
            displayValue={() => selectedOption?.label || ""}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </Combobox.Button>

          <Combobox.Options
            {...(anchor ? { anchor: "bottom start" } : {})}
            className={optionsPanelClassName}
          >
            {filteredOptions.length === 0 ? (
              typeof emptyState === "function" ? (
                emptyState(query)
              ) : (
                emptyState || <div className="px-4 py-2 text-sm text-gray-500">{noMatchesMessage}</div>
              )
            ) : (
              filteredOptions.map((option) => (
                <Combobox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active }) =>
                    classNames(
                      "relative cursor-pointer select-none py-2 px-4",
                      active ? "bg-blue-100 text-blue-900" : "text-gray-900"
                    )
                  }
                >
                  {({ selected }) => (
                    <div className="flex justify-between items-center gap-2 min-w-[12rem] pr-6">
                      <span>{option.label}</span>
                      {selected && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </div>
      </Combobox>
    </div>
  );
}
