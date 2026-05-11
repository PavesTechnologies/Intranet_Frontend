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
      // max-h-60 = 240px, add a small buffer
      setOpenUpward(window.innerHeight - rect.bottom < 250);
    }
  };

  return (
    <Listbox value={selected} onChange={(opt) => onChange(opt.value)} disabled={disabled}>
      <div className="relative w-full" ref={containerRef}>
        <Listbox.Button
          className="w-full cursor-default rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-left text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          onClick={checkPosition}
        >
          <span className="block truncate">{selected?.label}</span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className={`absolute z-40 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-2xl ring-1 ring-black/5 border border-gray-100 focus:outline-none text-sm ${
              openUpward ? "bottom-full mb-1" : "mt-1"
            }`}
          >
            {options.map((option, idx) => (
              <Listbox.Option
                key={idx}
                value={option}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-4 pr-9 ${
                    active ? "bg-indigo-50 text-indigo-900" : "text-gray-900"
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? "font-semibold" : "font-normal"}`}>
                      {option.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600">
                        <CheckIcon className="h-4 w-4" />
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
