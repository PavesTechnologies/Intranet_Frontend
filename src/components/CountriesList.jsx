import { useEffect, useMemo, useRef, useState } from "react";
import countries from "world-countries";
import { ChevronDown, Search, Check } from "lucide-react";

export default function CountriesList({
    value = "",
    onChange,
    placeholder = "Select Country",
    label,
    disabled = false,
    className = "",
    required = false,
    error = "",
    variant = "default",
}) {
    const isFilter = variant === "filter";
    const isIntake = variant === "intake";
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Extract only country names
    const countryList = useMemo(() => {
        return countries
            .map((country) => country.name.common)
            .sort((a, b) => a.localeCompare(b));
    }, []);

    // Filter countries
    const filteredCountries = useMemo(() => {
        if (!search.trim()) return countryList;

        return countryList.filter((country) =>
            country.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, countryList]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (!wrapperRef.current?.contains(e.target)) {
                setOpen(false);
                setSearch("");
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [open]);

    return (
        <div className={`relative w-full ${className}`} ref={wrapperRef}>
            {label && (
                <label className="mb-2 block text-sm font-medium text-gray-700">
                    {label}
                    {required && (
                        <span className="ml-1 text-red-500">*</span>
                    )}
                </label>
            )}

            <div className="relative">
                <Search
                    size={isIntake ? 15 : 14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                    ref={inputRef}
                    disabled={disabled}
                    value={open ? search : value}
                    onFocus={() => setOpen(true)}
                    onClick={() => {
                        if (disabled) return;
                        setOpen(true);
                    }}
                    onChange={(e) => {
                        setOpen(true);
                        setSearch(e.target.value);
                    }}
                    placeholder={placeholder}
                    className={`
            w-full
            border
            pl-8
            pr-8
            text-gray-900
            outline-none
            transition
            focus:ring-2
            focus:ring-blue-500
            placeholder:text-gray-400
            disabled:cursor-not-allowed
            ${isIntake
                            ? "h-10 rounded-md bg-white text-sm font-normal placeholder:font-normal disabled:bg-slate-50"
                            : isFilter
                                ? "rounded-lg bg-slate-50 py-2.5 text-xs font-medium hover:bg-slate-100/50 focus:bg-white placeholder:font-medium disabled:bg-gray-100"
                                : "rounded-lg bg-white py-2 text-xs font-semibold placeholder:font-normal disabled:bg-gray-100"
                        }
            ${error
                            ? "border-red-500 ring-1 ring-red-500"
                            : isIntake
                                ? "border-slate-300"
                                : "border-slate-200"
                        }
          `}
                />

                <ChevronDown
                    size={isIntake ? 15 : 16}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (disabled) return;
                        setOpen((prev) => {
                            const next = !prev;
                            if (next) {
                                inputRef.current?.focus();
                            } else {
                                setSearch("");
                                inputRef.current?.blur();
                            }
                            return next;
                        });
                    }}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 shrink-0 cursor-pointer text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""
                        }`}
                />
            </div>

            {open && (
                <div
                    className={`
            absolute
            z-50
            mt-2
            w-full
            overflow-hidden
            border
            border-gray-200
            bg-white
            shadow-xl
            ${isIntake ? "rounded-md" : "rounded-lg"}
          `}
                >
                    {/* List */}
                    <div className="max-h-56 overflow-y-auto py-2">
                        {filteredCountries.length ? (
                            filteredCountries.map((country) => (
                                <button
                                    key={country}
                                    type="button"
                                    onClick={() => {
                                        onChange?.(country);
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                    className={`
                    mx-2
                    flex
                    w-[calc(100%-16px)]
                    items-center
                    justify-between
                    rounded-md
                    px-3
                    py-2
                    text-left
                    transition-all
                    duration-150
                    hover:bg-blue-50
                    ${isIntake ? "text-sm font-normal" : "text-xs font-semibold"}
                  `}
                                >
                                    <span>{country}</span>

                                    {value === country && (
                                        <Check
                                            size={14}
                                            className="text-blue-600"
                                        />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div
                                className={`py-6 text-center font-medium text-gray-500 ${isIntake ? "text-sm" : "text-xs"
                                    }`}
                            >
                                No countries found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
}