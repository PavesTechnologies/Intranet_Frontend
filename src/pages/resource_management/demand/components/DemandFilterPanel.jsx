import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Filter, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function SearchableDropdown({ label, value, options, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [dropdownRect, setDropdownRect] = useState(null);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        setSearch(value === "All" ? "" : value);
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target) &&
                !event.target.closest(".searchable-dropdown-portal")
            ) {
                setIsOpen(false);
                setSearch(value === "All" ? "" : value);
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
        opt.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (option) => {
        onChange(option);
        setSearch(option === "All" ? "" : option);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <label className="text-[10px] font-heading font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
                {label}
            </label>
            <div className="relative" ref={inputRef}>
                <Input
                    value={search || (isOpen ? "" : value)}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
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
                        <div className="p-1">
                            <div
                                className={cn(
                                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-xs outline-none hover:bg-accent hover:text-accent-foreground",
                                    value === "All" && "bg-accent/50 text-accent-foreground font-medium"
                                )}
                                onClick={() => handleSelect("All")}
                            >
                                All
                                {value === "All" && <Check className="ml-auto h-3 w-3 opacity-100" />}
                            </div>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => (
                                    <div
                                        key={option}
                                        className={cn(
                                            "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-xs outline-none hover:bg-accent hover:text-accent-foreground",
                                            value === option && "bg-accent/50 text-accent-foreground font-medium"
                                        )}
                                        onClick={() => handleSelect(option)}
                                    >
                                        {option}
                                        {value === option && <Check className="ml-auto h-3 w-3 opacity-100" />}
                                    </div>
                                ))
                            ) : search && (
                                <div className="py-2 px-2 text-xs text-muted-foreground text-center">
                                    No results found.
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

export function DemandFilterPanel({
    filters,
    onFiltersChange,
    onReset,
    collapsed,
    onToggleCollapse,
    clients = [],
    priorities = ["Critical", "High", "Medium", "Low"]
}) {
    const activeCount = [
        filters.client !== "All",
        filters.priority !== "All",
        filters.status !== "All",
    ].filter(Boolean).length;

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

    return (
        <div className="w-full lg:w-64 lg:shrink-0 rounded-lg border bg-card flex flex-col shadow-sm lg:sticky lg:top-6">
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
                    {activeCount > 0 && (
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

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
                <SearchableDropdown
                    label="Client Account"
                    value={filters.client}
                    options={clients}
                    placeholder="All Clients"
                    onChange={(value) => onFiltersChange({ ...filters, client: value })}
                />

                <div className="space-y-2">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
                        Priority Level
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {["All", ...priorities].map((p) => (
                            <button
                                key={p}
                                onClick={() => onFiltersChange({ ...filters, priority: p })}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all",
                                    filters.priority === p
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                )}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-medium text-slate-400 italic leading-snug">
                        Use filters to refine the demand pipeline. Changes are reflected in real-time.
                    </p>
                </div>
            </div>
        </div>
    );
}
