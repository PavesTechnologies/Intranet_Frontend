import React from "react";
import { Listbox } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import classNames from "classnames";

// One option row = py-2 (1rem) + sm:text-sm line-height (1.25rem); the list adds py-1 (0.5rem).
const OPTION_ROW_REM = 2.25;
const LIST_PADDING_REM = 0.5;

const FormSelect = ({
  label,
  options,
  value,
  onChange,
  name,
  className = "",
  buttonClassName = "",
  // Cap the dropdown to N rows and scroll past them. Omit to keep the default max-h-60.
  maxVisibleOptions,
}) => {
  const selectedOption = options.find((opt) => opt.value === value);

  const optionsStyle =
    maxVisibleOptions > 0
      ? {
          maxHeight: `${
            maxVisibleOptions * OPTION_ROW_REM + LIST_PADDING_REM
          }rem`,
        }
      : undefined;

  const handleOptionsWheel = (event) => {
    const element = event.currentTarget;
    const canScrollOptions = element.scrollHeight > element.clientHeight;

    if (!canScrollOptions) {
      window.scrollBy({ top: event.deltaY, behavior: "auto" });
      return;
    }

    const atTop = element.scrollTop <= 0;
    const atBottom = Math.ceil(element.scrollTop + element.clientHeight) >= element.scrollHeight;

    if ((atTop && event.deltaY < 0) || (atBottom && event.deltaY > 0)) {
      window.scrollBy({ top: event.deltaY, behavior: "auto" });
    }
  };

  return (
    <div className={`space-y-1 w-full min-w-0 ${className}`.trim()}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <Listbox value={value} onChange={(val) => onChange({ target: { name, value: val } })}>
        <div className="relative min-w-0">
          <Listbox.Button
            className={`w-full h-10 min-w-0 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-left text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${buttonClassName}`.trim()}
          >
            <span className="block truncate pr-6">
              {selectedOption?.label || "Select"}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </span>
          </Listbox.Button>

          <Listbox.Options
            style={optionsStyle}
            onWheel={handleOptionsWheel}
            className={classNames(
              "absolute z-50 mt-1 overflow-y-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm w-max min-w-full",
              !optionsStyle && "max-h-60",
            )}
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
