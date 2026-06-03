import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Filter, X, ChevronDown, Check } from "lucide-react";
import { notify } from "../../utils/notify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";
import { defaultFilters } from "../../hooks/useAvailability";
import { getWorkforceFilters } from "../../services/workforceService";
export { defaultFilters };

function SearchableDropdown({ label, value, options, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownRect, setDropdownRect] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync search with external value changes
  useEffect(() => {
    setSearch(value);
  }, [value]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        !event.target.closest(".searchable-dropdown-portal")
      ) {
        setIsOpen(false);
        setSearch(value);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const updatePosition = () => {
    if (inputRef.current) {
      setDropdownRect(inputRef.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt != null && opt.toLowerCase().includes((search || "").toLowerCase())
  );

  const handleSelect = (option) => {
    onChange(option);
    setSearch(option);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-[10px] font-heading font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
        {label}
      </label>
      <div className="relative" ref={inputRef}>
        <Input
          value={search || ""}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (search === placeholder) setSearch("");
          }}
          className="h-8 text-xs pr-8"
          placeholder={placeholder}
          onClick={() => setIsOpen(true)}
        />
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
      </div>

      {isOpen &&
        dropdownRect &&
        createPortal(
          <div
            className="searchable-dropdown-portal absolute z-[9999] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
            style={{
              top: dropdownRect.bottom + window.scrollY + 4,
              left: dropdownRect.left + window.scrollX,
              width: dropdownRect.width,
              maxHeight: "240px",
            }}
          >
            {filteredOptions.length > 0 ? (
              <div className="p-1">
                {filteredOptions.map((option) => (
                  <div
                    key={option}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-xs outline-none hover:bg-accent hover:text-accent-foreground",
                      value === option &&
                      "bg-accent/50 text-accent-foreground font-medium"
                    )}
                    onClick={() => handleSelect(option)}
                  >
                    {option}
                    {value === option && (
                      <Check className="ml-auto h-3 w-3 opacity-100" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 px-2 text-xs text-muted-foreground text-center">
                No results found.
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

export function FilterPanel({
  filters,
  onFiltersChange,
  onReset,
  collapsed,
  onToggleCollapse,
}) {
  const activeCount = [
    filters.role !== "All Roles",
    filters.location !== "All Locations",
    filters.experienceRange[0] !== 0 || filters.experienceRange[1] !== 15,
    filters.allocationPercentage !== 0,
    filters.project !== "All Projects",
    filters.employmentType !== "All Types",
    filters.startDate,
    filters.endDate,
  ].filter(Boolean).length;

  const [loadingFilters, setLoadingFilters] = useState(false);
  const [filtersRes, setFiltersRes] = useState({});
  function hasActiveFilters(filters) {
    return (
      filters.role !== "All Roles" ||
      filters.location !== "All Locations" ||
      filters.experienceRange[0] !== 0 ||
      filters.experienceRange[1] !== filtersRes.maxExperience ||
      filters.allocationPercentage !== 0 ||
      filters.project !== "All Projects" ||
      filters.employmentType !== "All Types" ||
      filters.startDate ||
      filters.endDate
    );
  }

  const EMPLOYMENT_TYPES = filtersRes.workforceCategory || [];
  const LOCATIONS = filtersRes.location || [];
  const ROLES = filtersRes.designation || [];
  const PROJECTS = filtersRes.projectNames || [];

  const workforceFilters = async () => {
    setLoadingFilters(true);
    try {
      const res = await getWorkforceFilters();
      setFiltersRes(res.data);
    } catch (err) {
      console.error("Failed to load filters", err);
      notify.error(err, "Failed to load filters");
    } finally {
      setLoadingFilters(false);
    }
  };

  useEffect(() => {
    workforceFilters();
  }, []);

  if (collapsed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleCollapse}
        className="flex items-center gap-2 bg-background border shadow-sm"
      >
        <Filter className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <Badge className="bg-primary text-primary-foreground text-xs h-5 px-1.5">
            {activeCount}
          </Badge>
        )}
      </Button>
    );
  }
  // className="w-64 shrink-0 rounded-lg border bg-card flex flex-col max-h-[calc(100vh-180px)] sticky top-6 shadow-sm overflow-hidden"
  return (
    <div
      className="w-full lg:w-64 lg:shrink-0 rounded-lg border bg-card flex flex-col shadow-sm lg:sticky lg:top-6"
    >
      <div className="flex items-center justify-between p-4 border-b bg-card z-10">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-heading font-bold text-card-foreground">
            Filters
          </h3>
          {activeCount > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs h-5 px-1.5 font-bold">
              {activeCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters(filters) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={onReset}
            >
              Clear
            </Button>
          )}
          <button
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={onToggleCollapse}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40"
        style={{ overscrollBehavior: "contain" }}
      >
        <SearchableDropdown
          label="Role"
          value={filters.role}
          options={ROLES}
          placeholder="All Roles"
          onChange={(value) => onFiltersChange({ ...filters, role: value })}
        />

        <SearchableDropdown
          label="Location"
          value={filters.location}
          options={LOCATIONS}
          placeholder="All Locations"
          onChange={(value) => onFiltersChange({ ...filters, location: value })}
        />

        <div>
          <label className="text-[10px] font-heading font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
            Experience: {filters.experienceRange[0]}{">"} yrs
          </label>
          <Slider
            value={[filters.experienceRange[0]]}
            min={0}
            max={15}
            step={1}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, experienceRange: [value[0], 15] })
            }
            className="mt-2"
          />
        </div>

        <div>
          <label className="text-[10px] font-heading font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
            Allocation: {filters.allocationPercentage}{"<"} %
          </label>
          <Slider
            value={[filters.allocationPercentage]}
            min={0}
            max={100}
            step={5}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, allocationPercentage: value[0] })
            }
            className="mt-2"
          />
        </div>

        <SearchableDropdown
          label="Project / Account"
          value={filters.project}
          options={PROJECTS}
          placeholder="All Projects"
          onChange={(value) => onFiltersChange({ ...filters, project: value })}
        />

        {/* <SearchableDropdown
          label="Employment Type"
          value={filters.employmentType}
          options={EMPLOYMENT_TYPES}
          placeholder="All Types"
          onChange={(value) =>
            onFiltersChange({ ...filters, employmentType: value })
          }
        /> */}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-heading font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
              Start Date
            </label>
            <DatePicker
              selected={filters.startDate ? new Date(filters.startDate) : null}
              onChange={(date) => {
                const newDate = date ? date.toLocaleDateString("en-CA") : null;
                onFiltersChange({
                  ...filters,
                  startDate: newDate,
                  endDate: newDate,
                });
              }}
              selectsStart={false} // Remove range highlighting
              dateFormat="yyyy-MM-dd"
              placeholderText="Select date"
              className="w-full h-8 text-xs px-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              portalId="root"
              popperPlacement="bottom-start"
            />
          </div>
          <div>
            <label className="text-[10px] font-heading font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
              End Date
            </label>
            <DatePicker
              selected={filters.endDate ? new Date(filters.endDate) : null}
              onChange={(date) =>
                onFiltersChange({
                  ...filters,
                  endDate: date ? date.toLocaleDateString("en-CA") : null,
                })
              }
              selectsEnd={false} // Remove range highlighting
              minDate={filters.startDate ? new Date(filters.startDate) : null}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select date"
              className="w-full h-8 text-xs px-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              portalId="root"
              popperPlacement="bottom-start"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
