import { Fragment, useRef, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";

export default function FilterListbox({ options, value, onChange, disabled = false }) {
  const selected = options.find((o) => o.value === value) ?? options[0];
  const containerRef = useRef(null);
  const [openUpward, setOpenUpward] = useState(false);

  const checkPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setOpenUpward(window.innerHeight - rect.bottom < 250);
    }
  };

  return (
    <Listbox value={selected} onChange={(opt) => onChange(opt.value)} disabled={disabled}>
      <div className="relative w-full" ref={containerRef}>
        <Listbox.Button
          className="w-full cursor-default rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 text-left text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          onClick={checkPosition}
        >
          <span className="block truncate text-gray-700">
            {selected?.label || "SELECT AN OPTION"}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronUpDownIcon className="h-4 w-4 text-gray-500" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className={`absolute z-[100] min-w-full w-max max-h-60 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 border border-gray-100 focus:outline-none text-sm ${
              openUpward ? "bottom-full mb-2" : "mt-2"
            }`}
          >
            {options.map((option, idx) => (
              <Listbox.Option
                key={idx}
                value={option}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 px-4 transition-colors ${
                    active ? "bg-blue-50 text-blue-900" : "text-gray-700"
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-medium text-blue-700" : "font-normal"
                      }`}
                    >
                      {option.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600">
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
