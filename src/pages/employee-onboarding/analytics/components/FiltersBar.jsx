import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Fonts } from "../../../../components/Fonts/Fonts";

const FILTERS = [
  { key: "dept", label: "Department" },
  { key: "date", label: "Date Range", options: ["All", "Today", "This Month", "This Year"] },
  {
    key: "worker",
    label: "Worker Type",
    options: ["All", "Permanent", "Contract"],
  },
];

export default function FiltersBar({ filters, setFilters, departments = [] }) {
  const [openKey, setOpenKey] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpenKey(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filterOptions = {
    dept: ["All", ...(departments || [])],
    date: FILTERS.find((filter) => filter.key === "date")?.options || [],
    worker: FILTERS.find((filter) => filter.key === "worker")?.options || [],
  };

  const getLabel = (filter) => {
    const currentValue = filters?.[filter.key];
    return currentValue && currentValue !== "All" ? currentValue : filter.label;
  };

  const handleSelect = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value === "All" ? "" : value,
    }));
    setOpenKey(null);
  };

  return (
    <div
      ref={containerRef}
      className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 h-10 w-1.5 rounded-full bg-indigo-600" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
          <p className={Fonts.smallText}>
            Narrow the analytics view by department, period, or worker type.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {FILTERS.map((filter) => (
          <div key={filter.key} className="relative">
            <button
              type="button"
              onClick={() => setOpenKey(openKey === filter.key ? null : filter.key)}
              className={`flex min-w-[190px] items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:bg-white ${Fonts.button}`}
            >
              <span className="truncate">{getLabel(filter)}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {openKey === filter.key && (
              <div className="absolute left-0 top-[105%] z-20 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {filterOptions[filter.key].map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(filter.key, option)}
                    className={`block w-full px-3 py-2.5 text-left hover:bg-slate-50 ${Fonts.button} ${
                      index !== filterOptions[filter.key].length - 1
                        ? "border-b border-slate-100"
                        : ""
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
