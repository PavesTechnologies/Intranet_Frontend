import { useState } from "react";
import { Combobox } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import classNames from "classnames";

export default function SearchableSelect({
  label,
  options,
  value,
  onChange,
  name,
  placeholder = "Search...",
  disabled = false,
  requiredMark = false,
}) {
  const [query, setQuery] = useState("");
  const selectedOption = options.find((option) => option.value === value) || null;

  const filteredOptions =
    query === ""
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));

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

          <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-max min-w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">No matches found.</div>
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
