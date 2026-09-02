// The month-scope pill used by all three approval views.
//
// Built directly on Headless UI rather than the shared FilterListbox so the trigger can
// carry a calendar icon, an animated chevron and proper hover/open states — FilterListbox
// only exposes a className, which cannot add markup. Height matches Button size="medium"
// (py-2.5 + text-sm = 40px) so it lines up with the buttons it sits beside.

import React, { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";

const MonthScopeSelect = ({
  options = [],
  value,
  onChange,
  disabled = false,
  className = "",
}) => {
  const selected = options.find((o) => o.value === value) || null;

  return (
    <Listbox
      value={selected}
      onChange={(option) => onChange(option.value)}
      disabled={disabled}
    >
      {({ open }) => (
        // Fixed width: every short month name is 3 characters, but pinning it keeps the
        // control from shifting by a pixel or two as the selection changes.
        <div className={`relative shrink-0 w-[9.5rem] ${className}`.trim()}>
          <Listbox.Button
            className={`group flex w-full items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-sm font-semibold shadow-sm transition-all
              ${
                disabled
                  ? "cursor-not-allowed border-gray-200 text-gray-400"
                  : "cursor-pointer border-gray-300 text-gray-800 hover:border-[#0A0082]/40 hover:bg-[#0A0082]/[0.03] hover:shadow"
              }
              ${open ? "border-[#0A0082] ring-2 ring-[#0A0082]/15 shadow" : ""}
              focus:outline-none focus-visible:border-[#0A0082] focus-visible:ring-2 focus-visible:ring-[#0A0082]/20`}
          >
            <CalendarDays
              className={`h-4 w-4 shrink-0 transition-colors ${
                disabled ? "text-gray-300" : "text-[#0A0082]"
              }`}
            />
            <span className="flex-1 truncate text-left">
              {selected ? selected.label : "Select month"}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                disabled ? "text-gray-300" : "text-gray-400 group-hover:text-[#0A0082]"
              } ${open ? "rotate-180" : ""}`}
            />
          </Listbox.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 -translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 -translate-y-1"
          >
            <Listbox.Options className="absolute right-0 z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-xl ring-1 ring-black/5 focus:outline-none">
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option}
                  className={({ active, selected: isSelected }) =>
                    `flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active ? "bg-[#0A0082]/[0.06] text-[#0A0082]" : "text-gray-700"
                    } ${isSelected ? "font-semibold text-[#0A0082]" : ""}`
                  }
                >
                  {({ selected: isSelected }) => (
                    <>
                      <span className="truncate">{option.label}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-[#0A0082]" />
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      )}
    </Listbox>
  );
};

export default MonthScopeSelect;
