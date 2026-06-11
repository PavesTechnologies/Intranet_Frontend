import React from "react";
import { Listbox } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import classNames from "classnames";

const FormSelect = ({
  label,
  options,
  value,
  onChange,
  name,
  className = "",
  buttonClassName = "",
}) => {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`space-y-1 w-full min-w-0 ${className}`.trim()}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <Listbox value={value} onChange={(val) => onChange({ target: { name, value: val } })}>
        <div className="relative min-w-0">
          <Listbox.Button
            className={`w-full min-w-0 px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${buttonClassName}`.trim()}
          >
            <span className="block truncate pr-6">
              {selectedOption?.label || "Select"}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </span>
          </Listbox.Button>

          <Listbox.Options
            className="absolute z-50 mt-1 max-h-60 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm w-max min-w-full"
          >
            {options.map((option) => (
              <Listbox.Option
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
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
};

export default FormSelect;
