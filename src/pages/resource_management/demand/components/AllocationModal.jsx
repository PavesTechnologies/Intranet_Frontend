import React, { useState, useEffect } from 'react';
import FilterListbox from "../../../../components/filter/FilterListbox";
import { CloseIcon, CalendarIcon, UserIcon, PercentIcon, ActivityIcon, SpinnerIcon, SuccessIcon } from "@/components/icons";
import Modal from "@/components/Modal/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { fetchResources, resourceAllocation } from "../../services/resource";
import { notify } from '../../utils/notify';
import { cn } from "@/lib/utils";

const toDateInputValue = (date) => {
    if (!date) return "";
    const matchedDate = String(date).trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return matchedDate ? matchedDate[1] : "";
};
const getTodayLocalDate = () => {
    const today = new Date();
    return new Date(today.getTime() - today.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
};

const getAllocationStartDate = (demandStartDate) => {
    const today = getTodayLocalDate();
    const demandDate = toDateInputValue(demandStartDate);

    return demandDate && demandDate > today ? demandDate : today;
};

const EMPTY_ARRAY = [];

const AllocationModal = ({ isOpen, onClose, demand, initialResourceIds = EMPTY_ARRAY, isBenchMode = false, benchMatches = EMPTY_ARRAY, onSuccess }) => {
    const [resources, setResources] = useState([]);
    const [isLoadingResources, setIsLoadingResources] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [availableBenchDemands, setAvailableBenchDemands] = useState([]);

    const [formData, setFormData] = useState({
        resourceId: [],
        demandId: demand?.demandId || demand?.id || '',
        allocationStartDate: getAllocationStartDate(demand?.demandStartDate),
        allocationEndDate: toDateInputValue(demand?.demandEndDate),
        allocationPercentage: demand?.allocation || demand?.allocationPercentage || 100,
        allocationStatus: 'ACTIVE',
        skipValidation: false
    });

    const [errors, setErrors] = useState({});

    const getResourceNameById = (resourceId) => {
        const matchedResource = resources.find(
            (resource) => String(resource.resourceId) === String(resourceId)
        );
        return matchedResource?.resourceName || null;
    };

    const enrichAllocationResult = (result) => {
        if (!result?.data) return result;

        return {
            ...result,
            data: {
                ...result.data,
                savedAllocations: (result.data.savedAllocations || []).map((item) => ({
                    ...item,
                    resourceName: item.resourceName || getResourceNameById(item.resourceId),
                })),
                failedResources: (result.data.failedResources || []).map((item) => ({
                    ...item,
                    resourceName: item.resourceName || getResourceNameById(item.resourceId),
                })),
            },
        };
    };

    useEffect(() => {
        if (isOpen) {
            const loadResources = async () => {
                setIsLoadingResources(true);
                try {
                    const response = await fetchResources();
                    const resourceList = Array.isArray(response?.data)
                        ? response.data
                        : Array.isArray(response)
                            ? response
                            : [];
                    setResources(resourceList);
                } catch (error) {
                    console.error("Failed to fetch resources", error);
                    notify.error(error, "Failed To Load Resources");
                } finally {
                    setIsLoadingResources(false);
                }
            };
            loadResources();

            setFormData(prev => ({
                ...prev,
                demandId: demand?.demandId || demand?.id || '',
                allocationStartDate: getAllocationStartDate(demand?.demandStartDate),
                allocationEndDate: toDateInputValue(demand?.demandEndDate),
                resourceId: initialResourceIds,
                skipValidation: false,
                allocationPercentage: 100 // Default or driven by demand if available later
            }));
            
            if (isBenchMode && !demand && initialResourceIds.length > 0) {
                const targetResId = initialResourceIds[0];
                const matchObj = benchMatches.find(m => String(m.resourceId) === String(targetResId));
                setAvailableBenchDemands(matchObj?.demands || []);
            } else {
                setAvailableBenchDemands([]);
            }

            setErrors({});
            setSearchQuery("");
        }
    }, [isOpen, demand, isBenchMode, benchMatches, initialResourceIds]);

    const handleDemandChange = (e) => {
        const selectedId = e.target.value;
        const selectedMatch = availableBenchDemands.find(d => String(d.demandId || d.id) === String(selectedId));
        setFormData(prev => ({
            ...prev,
            demandId: selectedId,
            allocationStartDate: toDateInputValue(selectedMatch?.demandStartDate) || prev.allocationStartDate,
            allocationEndDate: toDateInputValue(selectedMatch?.demandEndDate) || prev.allocationEndDate,
        }));
    };

    const toggleResource = (id) => {
        setFormData(prev => {
            const current = prev.resourceId;
            if (current.includes(id)) {
                return { ...prev, resourceId: current.filter(i => i !== id) };
            } else {
                return { ...prev, resourceId: [...current, id] };
            }
        });
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.demandId) newErrors.demandId = 'Demand must be selected';
        if (formData.resourceId.length === 0) newErrors.resourceId = 'At least one resource is required';
        if (!formData.allocationStartDate) newErrors.allocationStartDate = 'Start date is required';
        if (!formData.allocationEndDate) newErrors.allocationEndDate = 'End date is required';

        if (formData.allocationStartDate && formData.allocationEndDate) {
            if (new Date(formData.allocationEndDate) < new Date(formData.allocationStartDate)) {
                newErrors.allocationEndDate = 'End date cannot be earlier than start date';
            }
        }

        const limits = getCurrentDemandLimits();
        if (limits.minStart && formData.allocationStartDate && formData.allocationStartDate < limits.minStart) {
            newErrors.allocationStartDate = `Start date cannot be before ${limits.minStart}`;
        }
        if (limits.maxEnd && formData.allocationEndDate && formData.allocationEndDate > limits.maxEnd) {
            newErrors.allocationEndDate = `End date cannot be after ${limits.maxEnd}`;
        }

        if (!formData.skipValidation) {
            if (formData.allocationPercentage <= 0 || formData.allocationPercentage > 100) {
                newErrors.allocationPercentage = 'Percentage must be between 1 and 100';
            }
        } else {
            if (!formData.allocationPercentage || formData.allocationPercentage <= 0) {
                newErrors.allocationPercentage = 'Percentage must be greater than 0';
            }
        }

        if (!formData.allocationStatus) newErrors.allocationStatus = 'Allocation status is required';

        setErrors(newErrors);
        return {
            isValid: Object.keys(newErrors).length === 0,
            errors: newErrors,
        };
    };

    const getCurrentDemandLimits = () => {
        let currentStartDate = null;
        let currentEndDate = null;

        if (isBenchMode && formData.demandId && availableBenchDemands) {
            const matchedMatch = availableBenchDemands.find(d => String(d.demandId || d.id) === String(formData.demandId));
            if (matchedMatch) {
                currentStartDate = toDateInputValue(matchedMatch.demandStartDate);
                currentEndDate = toDateInputValue(matchedMatch.demandEndDate);
            }
        } else if (demand) {
            currentStartDate = toDateInputValue(demand.demandStartDate);
            currentEndDate = toDateInputValue(demand.demandEndDate);
        }
        return { 
            minStart: currentStartDate || undefined, 
            maxEnd: currentEndDate || undefined 
        };
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        const { isValid, errors: validationErrors } = validate();
        if (!isValid) {
            const validationMessages = Object.values(validationErrors).filter(Boolean);
            notify.warning(validationMessages[0] || "Please correct the validation errors");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await resourceAllocation(formData);
            const enrichedResult = enrichAllocationResult(result);
            const hasAllocationResults = !!enrichedResult?.data;
            const successCount = enrichedResult?.data?.successCount || 0;
            const failureCount = enrichedResult?.data?.failureCount || 0;
            const normalizedMessage = String(result?.message || "").toLowerCase();
            const isFailedAllocationMessage = normalizedMessage.includes("allocation failed");

            if (!result.success && !hasAllocationResults) {
                notify.error(result.message || "Allocation failed");
                return;
            }

            const errorReasons = (enrichedResult?.data?.failedResources || [])
                .map(item => item.reason)
                .filter(Boolean);

            if (hasAllocationResults && failureCount > 0 && successCount === 0) {
                if (errorReasons.length > 0) {
                    errorReasons.forEach(msg => notify.error(msg, undefined, { autoClose: 7000 }));
                } else {
                    notify.error(result.message || "Allocation failed");
                }
            } else if (hasAllocationResults && failureCount > 0) {
                notify.warning(result.message || "Allocation completed with some failures");
                errorReasons.forEach(msg => notify.error(msg, undefined, { autoClose: 7000 }));
            } else if (result.success && !isFailedAllocationMessage) {
                notify.success(result.message || "Resources allocated successfully");
            } else {
                if (errorReasons.length > 0) {
                    errorReasons.forEach(msg => notify.error(msg, undefined, { autoClose: 7000 }));
                } else {
                    notify.error(result.message || "Allocation failed");
                }
            }

            if (onSuccess) onSuccess(enrichedResult);
            onClose();
        } catch (error) {
            console.error("Allocation error:", error);
            notify.error(error, "Failed to allocate resources");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const filteredResources = resources.filter((res) => {
        const resourceName = String(res?.resourceName || "").toLowerCase();
        const resourceRole = String(res?.resourceRole || "").toLowerCase();
        const normalizedQuery = searchQuery.toLowerCase();

        return resourceName.includes(normalizedQuery) || resourceRole.includes(normalizedQuery);
    });

    const { minStart, maxEnd } = getCurrentDemandLimits();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Bulk Allocation"
            maxWidth="3xl"
            footer={
                <div className="flex gap-3 w-full">
                    <Button
                        variant="outline"
                        type="button"
                        onClick={onClose}
                        className="flex-1 h-10 rounded-xl border-slate-200 font-bold tracking-widest text-[10px] hover:bg-white text-slate-500"
                    >
                        CANCEL
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-[2] h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black tracking-widest text-[10px] shadow-xl shadow-indigo-600/20"
                    >
                        {isSubmitting ? (
                            <>
                                <SpinnerIcon className="h-3.5 w-3.5 animate-spin mr-2" />
                                PROCESSING...
                            </>
                        ) : (
                            `ALLOCATE ${formData.resourceId.length || ''} RESOURCE${formData.resourceId.length !== 1 ? 'S' : ''}`
                        )}
                    </Button>
                </div>
            }
        >
            <form id="allocation-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Demand Name (Read-only or Selectable) */}
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        Demand Pipeline
                    </label>
                    {isBenchMode && !demand ? (
                        <div className="relative">
                            <FilterListbox
                                options={[
                                    { value: "", label: "Select a demand..." },
                                    ...availableBenchDemands.map((d, i) => ({ value: d.demandId || d.id || i, label: d.demandName || "Unnamed Demand" }))
                                ]}
                                value={formData.demandId}
                                onChange={(val) => handleDemandChange({ target: { value: val } })}
                            />
                        </div>
                    ) : (
                        <Input
                            value={demand?.demandName || 'N/A'}
                            readOnly
                            className="bg-slate-50 border-slate-200 font-bold text-slate-900 h-10 rounded-xl focus-visible:ring-0 cursor-not-allowed pl-4 text-xs"
                        />
                    )}
                    {errors.demandId && <p className="text-[9px] font-bold text-rose-500 mt-0.5">{errors.demandId}</p>}
                </div>

                {/* Multi-Resource Selection */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <UserIcon className="h-3 w-3 text-indigo-500" /> Target Resources ({formData.resourceId.length})
                        </label>
                        {(!isBenchMode && formData.resourceId.length > 0) && (
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, resourceId: [] }))}
                                className="text-[9px] font-black text-rose-500 uppercase hover:underline"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Search Input */}
                    {!isBenchMode && (
                        <div className="relative">
                            <Input
                                placeholder="Filter resources by name or role..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 rounded-xl border-slate-200 text-xs pl-4 pr-10"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                                <SpinnerIcon className={cn("h-3.5 w-3.5 animate-spin", !isLoadingResources && "hidden")} />
                            </div>
                        </div>
                    )}

                    {/* Resource List (Selectable) */}
                    {!isBenchMode && (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {isLoadingResources ? (
                                    <div className="p-8 text-center"><SpinnerIcon className="h-5 w-5 animate-spin mx-auto text-indigo-400" /></div>
                                ) : filteredResources.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 font-bold text-[10px] uppercase">No resources found</div>
                                ) : filteredResources.map((res) => {
                                    const isSelected = formData.resourceId.includes(res.resourceId);
                                    return (
                                        <button
                                            key={res.resourceId}
                                            type="button"
                                            onClick={() => toggleResource(res.resourceId)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-xl transition-all border group text-left",
                                                isSelected
                                                    ? "bg-indigo-50 border-indigo-200 shadow-sm"
                                                    : "bg-white border-transparent hover:border-slate-200"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <span className={cn("text-xs font-bold", isSelected ? "text-indigo-900" : "text-slate-700 group-hover:text-slate-900")}>
                                                    {res.resourceName || `Resource ${res.resourceId}`}
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    {res.resourceRole || "No role assigned"}
                                                </span>
                                            </div>
                                            <div className={cn(
                                                "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                isSelected ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"
                                            )}>
                                                {isSelected && <CloseIcon className="h-3 w-3 text-white" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {errors.resourceId && <p className="text-[9px] font-bold text-rose-500 mt-1">{errors.resourceId}</p>}
                </div>

                {/* Selected Tags Display */}
                {formData.resourceId.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {formData.resourceId.map(id => {
                            const res = resources.find(r => String(r.resourceId) === String(id));
                            const displayName = res?.resourceName || `Allocated Resource Profile`;
                            return (
                                <div key={id} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg animate-in zoom-in-50">
                                    <span className="text-[11px] font-bold text-indigo-700">{displayName}</span>
                                    {!isBenchMode && (
                                        <button
                                            type="button"
                                            onClick={() => toggleResource(id)}
                                            className="text-indigo-400 hover:text-indigo-600 ml-1"
                                        >
                                            <CloseIcon className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Dates Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <CalendarIcon className="h-3 w-3 text-indigo-500" /> End Date
                        </label>
                        <Input
                            type="date"
                            value={formData.allocationEndDate}
                            min={formData.allocationStartDate || minStart}
                            max={maxEnd}
                            onChange={(e) => setFormData({ ...formData, allocationEndDate: e.target.value })}
                            className={cn("h-10 rounded-xl border-slate-200 font-bold text-slate-900 text-xs", errors.allocationEndDate && "border-rose-500")}
                        />
                        {errors.allocationEndDate && <p className="text-[9px] font-bold text-rose-500 mt-0.5">{errors.allocationEndDate}</p>}
                    </div>
                </div>

                {/* Percentage & Status Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <PercentIcon className="h-3 w-3 text-indigo-500" /> Allocation
                            {formData.skipValidation && (
                                <span className="ml-auto text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                    Flexible
                                </span>
                            )}
                        </label>
                        <div className="relative">
                            <Input
                                readOnly={!formData.skipValidation}
                                disabled={!formData.skipValidation}
                                type="number"
                                min="1"
                                {...(!formData.skipValidation ? { max: '100' } : {})}
                                value={formData.allocationPercentage}
                                onWheel={(e) => e.target.blur()}
                                onChange={(e) => setFormData({ ...formData, allocationPercentage: parseInt(e.target.value) || 0 })}
                                className={cn(
                                    "h-10 rounded-xl border-slate-200 font-bold text-slate-900 pr-8 text-xs transition-all",
                                    (formData.skipValidation)
                                        ? "bg-white cursor-text border-amber-300 focus-visible:ring-amber-400"
                                        : "bg-slate-100 opacity-70 cursor-not-allowed select-none",
                                    errors.allocationPercentage && "border-rose-500"
                                )}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">%</span>
                        </div>
                        {errors.allocationPercentage && <p className="text-[9px] font-bold text-rose-500 mt-0.5">{errors.allocationPercentage}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <ActivityIcon className="h-3 w-3 text-indigo-500" /> Status
                        </label>
                        <div className="relative">
                            <FilterListbox
                                options={[
                                    { value: "PLANNED", label: "PLANNED" },
                                    { value: "ACTIVE", label: "ACTIVE" },
                                    { value: "ENDED", label: "ENDED" },
                                    { value: "CANCELLED", label: "CANCELLED" },
                                ]}
                                value={formData.allocationStatus}
                                onChange={(val) => setFormData({ ...formData, allocationStatus: val })}
                            />
                        </div>
                        {errors.allocationStatus && <p className="text-[9px] font-bold text-rose-500 mt-1">{errors.allocationStatus}</p>}
                    </div>
                </div>

                {/* Skip Validation Toggle */}
                <div className="flex items-center gap-3 pt-1 pb-1">
                    <button
                        type="button"
                        id="skip-validation-toggle"
                        role="checkbox"
                        aria-checked={formData.skipValidation}
                        onClick={() => setFormData(prev => ({
                            ...prev,
                            skipValidation: !prev.skipValidation,
                            // Reset percentage to 100 when unchecking
                            allocationPercentage: !prev.skipValidation ? prev.allocationPercentage : 100
                        }))}
                        className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1",
                            formData.skipValidation
                                ? "bg-amber-500 border-amber-500 focus:ring-amber-400"
                                : "bg-slate-200 border-slate-200 focus:ring-slate-400"
                        )}
                    >
                        <span
                            className={cn(
                                "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200",
                                formData.skipValidation ? "translate-x-4" : "translate-x-0.5"
                            )}
                        />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Skip Validation</span>
                        <span className="text-[9px] font-medium text-slate-400">
                            {formData.skipValidation
                                ? "Validation bypassed — enter any allocation percentage"
                                : "Enable to override capacity limits and enter a custom percentage"}
                        </span>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default AllocationModal;
