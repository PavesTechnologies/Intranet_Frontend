import React from "react";
import { Listbox } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import classNames from "classnames";

// One option row = py-2 (1rem) + sm:text-sm line-height (1.25rem).
const OPTION_ROW_REM = 2.25;
const DEFAULT_MAX_REM = 15; // matches the old max-h-60

const FormSelect = ({
  label,
  options,
  value,
  onChange,
  name,
  className = "",
  buttonClassName = "",
  placeholder = "Select",
  // Cap the dropdown to N rows and scroll past them. Omit to keep the default max-h-60.
  maxVisibleOptions,
  // Render the option list in a portal anchored to the button. Needed inside a
  // scrolling container (a wide table, a modal body) where an absolutely
  // positioned panel would otherwise be clipped by the overflow.
  anchorOptions = false,
}) => {
  const selectedOption = options.find((opt) => opt.value === value);

  // The scroll cap lives on an inner element, not on Listbox.Options: in anchored
  // mode headlessui writes its own inline style onto the panel and would drop a
  // maxHeight set there.
  const scrollStyle = {
    maxHeight: `${
      maxVisibleOptions > 0 ? maxVisibleOptions * OPTION_ROW_REM : DEFAULT_MAX_REM
    }rem`,
  };

  // Wheel over the option list scrolls the list; once it reaches an end — or when
  // the list is short enough not to scroll — the page scrolls instead.
  // NOTE: this must be bound to the element that actually scrolls, which is the
  // inner container below, not Listbox.Options.
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
            <span
              className={classNames(
                "block truncate pr-6",
                !selectedOption && "text-gray-400",
              )}
            >
              {selectedOption?.label || placeholder}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </span>
          </Listbox.Button>

          <Listbox.Options
            {...(anchorOptions ? { anchor: { to: "bottom start", gap: 4 } } : {})}
            className={classNames(
              "rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm",
              anchorOptions
                ? "z-[10000] w-max min-w-[var(--button-width)]"
                : "absolute z-50 mt-1 w-max min-w-full",
            )}
          >
            <div
              className="overflow-y-auto"
              style={scrollStyle}
              onWheel={handleOptionsWheel}
            >
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active }) =>
                    classNames(
                      "relative cursor-pointer select-none py-2 px-4",
                      active ? "bg-blue-100 text-blue-900" : "text-gray-900",
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
            </div>
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
};

export default FormSelect;
