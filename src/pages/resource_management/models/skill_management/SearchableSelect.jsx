import React, { Fragment, useMemo, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { Check, ChevronDown, Search } from "lucide-react";

const SearchableSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
}) => {
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter((option) =>
      option.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
  }, [options, query]);

  const selectedOption = options.find((option) => String(option.id) === String(value));

  return (
    <div className="w-full">
      {label ? (
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </label>
      ) : null}

      <Combobox
        value={value}
        onChange={(nextValue) => {
          onChange(nextValue);
          setQuery("");
        }}
        disabled={disabled}
      >
        {({ open }) => (
          <div className="relative">
            <Combobox.Button
              as="div"
              className={`relative w-full rounded-xl border bg-white shadow-sm transition ${
                disabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                  : "border-slate-200 hover:border-indigo-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10"
              }`}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Combobox.Input
                className="w-full border-none bg-transparent py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none focus:ring-0"
                displayValue={() => selectedOption?.name || ""}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                autoComplete="off"
              />
              <ChevronDown
                className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition ${
                  open ? "rotate-180 text-indigo-600" : ""
                }`}
              />
            </Combobox.Button>

            <Transition
              as={Fragment}
              show={open}
              enter="transition ease-out duration-150"
              enterFrom="translate-y-1 opacity-0"
              enterTo="translate-y-0 opacity-100"
              leave="transition ease-in duration-100"
              leaveFrom="translate-y-0 opacity-100"
              leaveTo="translate-y-1 opacity-0"
              afterLeave={() => setQuery("")}
            >
              <Combobox.Options className="absolute z-[1300] mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl focus:outline-none">
                {filteredOptions.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                    No results found
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <Combobox.Option
                      key={option.id}
                      value={option.id}
                      className={({ active, selected }) =>
                        `relative mb-1 cursor-pointer rounded-xl py-2.5 pl-10 pr-4 text-sm transition last:mb-0 ${
                          selected
                            ? "bg-indigo-600 font-semibold text-white"
                            : active
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-slate-700"
                        }`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className="block truncate">{option.name}</span>
                          {selected ? (
                            <Check className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                          ) : null}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </Transition>
          </div>
        )}
      </Combobox>
    </div>
  );
};

export default SearchableSelect;
