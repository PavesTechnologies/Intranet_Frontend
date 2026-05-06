import React, { useState, useEffect, useRef } from 'react';
import { Filter, X, Search, ChevronDown, Check, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MultiSelectDropdown = ({ options, value, onChange, placeholder, formatEnum = (s) => s }) => {
    const valueArray = Array.isArray(value) ? value : (value === 'ALL' || !value ? [] : [value]);

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    const filteredOptions = options.filter(o => formatEnum(o).toLowerCase().includes(search.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (opt) => {
        let newValue;
        if (valueArray.includes(opt)) {
            newValue = valueArray.filter(v => v !== opt);
        } else {
            newValue = [...valueArray, opt];
        }
        onChange(newValue);
    };

    const handleSelectAll = (e) => {
        e.stopPropagation();
        onChange([...options]);
    };

    const handleClearAll = (e) => {
        e.stopPropagation();
        onChange([]);
    };

    const removeTag = (e, opt) => {
        e.stopPropagation();
        onChange(valueArray.filter(v => v !== opt));
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                className={cn(
                    "min-h-[36px] w-full bg-white border border-slate-200 rounded-md flex items-center justify-between px-2 py-1 cursor-pointer focus-within:ring-1 focus-within:ring-indigo-500",
                    isOpen ? "ring-1 ring-indigo-500 border-indigo-500 shadow-sm" : "hover:border-slate-300"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-wrap gap-1 items-center overflow-hidden flex-1">
                    {valueArray.length === 0 ? (
                        <span className="text-[11px] text-slate-400 font-medium px-1 py-1">{placeholder}</span>
                    ) : (
                        valueArray.map(v => (
                            <span key={v} className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 mt-0.5 mb-0.5 border border-indigo-100">
                                {formatEnum(v)}
                                <XIcon className="h-3 w-3 hover:bg-indigo-200 hover:text-indigo-900 rounded-full cursor-pointer transition-colors" onClick={(e) => removeTag(e, v)} />
                            </span>
                        ))
                    )}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 shrink-0 ml-1 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
            </div>

            {isOpen && (
                <div className="absolute z-[120] mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 border-b bg-slate-50 flex items-center shrink-0">
                        <Search className="h-3.5 w-3.5 text-slate-400 mr-2 shrink-0" />
                        <input
                            type="text"
                            className="w-full bg-transparent text-[11px] font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Search options..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    {options.length > 0 && (
                        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-slate-50/50 shrink-0">
                            <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors" onClick={handleSelectAll}>Select All</button>
                            <button className="text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors" onClick={handleClearAll}>Clear</button>
                        </div>
                    )}
                    <div className="overflow-y-auto max-h-[180px] flex-1 custom-scrollbar py-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-[10px] font-medium text-slate-400">No matching options</div>
                        ) : (
                            filteredOptions.map(opt => {
                                const isSelected = valueArray.includes(opt);
                                return (
                                    <div
                                        key={opt}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleOption(opt);
                                        }}
                                        className="flex items-center justify-between px-3 py-2 hover:bg-slate-50/80 cursor-pointer transition-colors"
                                    >
                                        <span className={cn("text-[11px] font-semibold truncate pr-2", isSelected ? "text-slate-900" : "text-slate-600")}>
                                            {formatEnum(opt)}
                                        </span>
                                        <div className={cn("h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors", isSelected ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-300")}>
                                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

const DemandFilters = ({
    onToggleCollapse,
    clientFilter = [],
    onClientChange,
    priorityFilter = [],
    onPriorityChange,
    onReset,
    activeCount,
    inline = false,
    clients = [],
    statuses = [],
    demandNames = [],
    demandTypes = [],
    deliveryModels = [],
    priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'low'],
    statusFilter = [],
    onStatusChange,
    demandNameFilter = [],
    onDemandNameChange,
    demandTypeFilter = [],
    onDemandTypeChange,
    deliveryModelFilter = [],
    onDeliveryModelChange,
    draft: externalDraft,
    setDraft: setExternalDraft
}) => {
    // Standardize 'All' to [] backwards compat
    const safeClient = Array.isArray(clientFilter) ? clientFilter : (clientFilter === 'ALL' ? [] : [clientFilter].filter(Boolean));
    const safePriority = Array.isArray(priorityFilter) ? priorityFilter : (priorityFilter === 'ALL' ? [] : [priorityFilter].filter(Boolean));
    const safeStatus = Array.isArray(statusFilter) ? statusFilter : (statusFilter === 'ALL' ? [] : [statusFilter].filter(Boolean));
    const safeName = Array.isArray(demandNameFilter) ? demandNameFilter : (demandNameFilter === 'ALL' ? [] : [demandNameFilter].filter(Boolean));
    const safeType = Array.isArray(demandTypeFilter) ? demandTypeFilter : (demandTypeFilter === 'ALL' ? [] : [demandTypeFilter].filter(Boolean));
    const safeModel = Array.isArray(deliveryModelFilter) ? deliveryModelFilter : (deliveryModelFilter === 'ALL' ? [] : [deliveryModelFilter].filter(Boolean));

    const [localDraft, setLocalDraft] = useState({
        client: safeClient,
        priority: safePriority,
        status: safeStatus,
        demandName: safeName,
        demandType: safeType,
        deliveryModel: safeModel
    });

    const draft = externalDraft || localDraft;
    const setDraft = setExternalDraft || setLocalDraft;

    // Sync with external changes ONLY if using local state (Sidebar)
    useEffect(() => {
        if (!externalDraft) {
            setLocalDraft({
                client: safeClient,
                priority: safePriority,
                status: safeStatus,
                demandName: safeName,
                demandType: safeType,
                deliveryModel: safeModel
            });
        }
    }, [clientFilter, priorityFilter, statusFilter, demandNameFilter, demandTypeFilter, deliveryModelFilter, externalDraft]);

    const handleApply = () => {
        onClientChange(draft.client);
        onPriorityChange(draft.priority);
        onStatusChange(draft.status);
        onDemandNameChange(draft.demandName);
        onDemandTypeChange(draft.demandType);
        onDeliveryModelChange(draft.deliveryModel);
        if (inline && onToggleCollapse) {
            onToggleCollapse(); // Close on apply
        }
    };

    const handleReset = () => {
        if (onReset) onReset();
        // Reset local draft immediately for better UX
        setDraft({
            client: [],
            priority: [],
            status: [],
            demandName: [],
            demandType: [],
            deliveryModel: []
        });
    };

    const formatEnum = (str) => {
        if (!str) return '';
        return str.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    // Inline Layout (Popover)
    if (inline) {
        return (
            <div className="flex flex-col min-w-[340px] w-full bg-white rounded-xl overflow-hidden shadow-sm font-sans">
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-b">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-indigo-500" />
                        Demand Workspace Filters
                    </span>
                    <button
                        onClick={onToggleCollapse}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body Elements */}
                <div className="p-4 space-y-4 overflow-y-auto flex-1 max-h-[60vh] custom-scrollbar pb-10">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 focus-within:z-[60] relative">
                            <label className="text-[11px] font-semibold text-slate-500 ml-0.5">
                                Client account
                            </label>
                            <MultiSelectDropdown
                                options={clients}
                                value={draft.client}
                                onChange={(v) => setDraft(prev => ({ ...prev, client: v }))}
                                placeholder="All Clients"
                                formatEnum={formatEnum}
                            />
                        </div>
                        <div className="space-y-1.5 focus-within:z-[50] relative">
                            <label className="text-[11px] font-semibold text-slate-500 ml-0.5">
                                Priority Level
                            </label>
                            <MultiSelectDropdown
                                options={priorities}
                                value={draft.priority}
                                onChange={(v) => setDraft(prev => ({ ...prev, priority: v }))}
                                placeholder="All Priorities"
                                formatEnum={formatEnum}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 focus-within:z-[40] relative">
                            <label className="text-[11px] font-semibold text-slate-500 ml-0.5">
                                Demand Status
                            </label>
                            <MultiSelectDropdown
                                options={statuses}
                                value={draft.status}
                                onChange={(v) => setDraft(prev => ({ ...prev, status: v }))}
                                placeholder="All Statuses"
                                formatEnum={formatEnum}
                            />
                        </div>
                        <div className="space-y-1.5 focus-within:z-[30] relative">
                            <label className="text-[11px] font-semibold text-slate-500 ml-0.5">
                                Demand Name
                            </label>
                            <MultiSelectDropdown
                                options={demandNames}
                                value={draft.demandName}
                                onChange={(v) => setDraft(prev => ({ ...prev, demandName: v }))}
                                placeholder="All Names"
                                formatEnum={formatEnum}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 focus-within:z-[20] relative">
                            <label className="text-[11px] font-semibold text-slate-500 ml-0.5">
                                Demand Type
                            </label>
                            <MultiSelectDropdown
                                options={demandTypes}
                                value={draft.demandType}
                                onChange={(v) => setDraft(prev => ({ ...prev, demandType: v }))}
                                placeholder="All Types"
                                formatEnum={formatEnum}
                            />
                        </div>
                        <div className="space-y-1.5 focus-within:z-[10] relative">
                            <label className="text-[11px] font-semibold text-slate-500 ml-0.5">
                                Delivery Model
                            </label>
                            <MultiSelectDropdown
                                options={deliveryModels}
                                value={draft.deliveryModel}
                                onChange={(v) => setDraft(prev => ({ ...prev, deliveryModel: v }))}
                                placeholder="All Models"
                                formatEnum={formatEnum}
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-medium text-slate-400 italic leading-relaxed">
                            Adjust filter criteria and click apply to refresh your demand pipeline.
                        </p>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-3 border-t bg-slate-50 flex gap-3 z-0">
                    <button
                        onClick={handleReset}
                        className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-lg text-[11px] font-bold hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-[0.98] shadow-sm"
                    >
                        Reset All
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-[2] bg-indigo-600 text-white py-2 rounded-lg text-[11px] font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        );
    }

    // Default view (Sidebar style)
    return (
        <div className="w-64 shrink-0 rounded-lg border bg-card flex flex-col shadow-sm h-full font-sans">
            <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-700">
                        Filters
                    </h3>
                </div>
                {activeCount > 0 && (
                    <button
                        onClick={onReset}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-0.5 rounded transition-colors"
                    >
                        Reset All
                    </button>
                )}
            </div>

            <div className="p-4 space-y-6 overflow-y-visible custom-scrollbar flex-1 pb-24 h-full">
                <div className="space-y-1.5 focus-within:z-[60] relative">
                    <label className="text-[11px] font-semibold text-slate-500 block ml-0.5">Client account</label>
                    <MultiSelectDropdown options={clients} value={clientFilter} onChange={onClientChange} placeholder="All Clients" formatEnum={formatEnum} />
                </div>
                <div className="space-y-1.5 focus-within:z-[50] relative">
                    <label className="text-[11px] font-semibold text-slate-500 block ml-0.5">Priority level</label>
                    <MultiSelectDropdown options={priorities} value={priorityFilter} onChange={onPriorityChange} placeholder="All Priorities" formatEnum={formatEnum} />
                </div>
                <div className="space-y-1.5 focus-within:z-[40] relative">
                    <label className="text-[11px] font-semibold text-slate-500 block ml-0.5">Demand Status</label>
                    <MultiSelectDropdown options={statuses} value={statusFilter} onChange={onStatusChange} placeholder="All Statuses" formatEnum={formatEnum} />
                </div>
                <div className="space-y-1.5 focus-within:z-[30] relative">
                    <label className="text-[11px] font-semibold text-slate-500 block ml-0.5">Demand Name</label>
                    <MultiSelectDropdown options={demandNames} value={demandNameFilter} onChange={onDemandNameChange} placeholder="All Names" formatEnum={formatEnum} />
                </div>
                <div className="space-y-1.5 focus-within:z-[20] relative">
                    <label className="text-[11px] font-semibold text-slate-500 block ml-0.5">Demand Type</label>
                    <MultiSelectDropdown options={demandTypes} value={demandTypeFilter} onChange={onDemandTypeChange} placeholder="All Types" formatEnum={formatEnum} />
                </div>
                <div className="space-y-1.5 focus-within:z-[10] relative">
                    <label className="text-[11px] font-semibold text-slate-500 block ml-0.5">Delivery Model</label>
                    <MultiSelectDropdown options={deliveryModels} value={deliveryModelFilter} onChange={onDeliveryModelChange} placeholder="All Models" formatEnum={formatEnum} />
                </div>
            </div>

            <div className="mt-auto p-4 border-t bg-slate-50/30">
                <p className="text-[10px] font-medium text-slate-400 italic leading-snug">
                    Use filters to refine the pipeline. Changes reflect in real-time in sidebar mode.
                </p>
            </div>
        </div>
    );
};

export default DemandFilters;
