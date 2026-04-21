import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Percent, Activity, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { fetchResources, resourceAllocation } from "../../services/resource";
import { toast } from 'react-toastify';
import { cn } from "@/lib/utils";

const toDateInputValue = (date) => {
    if (!date) return "";
    const matchedDate = String(date).trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return matchedDate ? matchedDate[1] : "";
};

const AllocationModal = ({ isOpen, onClose, demand, initialResourceIds = [], isBenchMode = false, benchMatches = [], onSuccess }) => {
    const [resources, setResources] = useState([]);
    const [isLoadingResources, setIsLoadingResources] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [availableBenchDemands, setAvailableBenchDemands] = useState([]);

    const [formData, setFormData] = useState({
        resourceId: [],
        demandId: demand?.demandId || demand?.id || '',
        allocationStartDate: toDateInputValue(demand?.demandStartDate),
        allocationEndDate: toDateInputValue(demand?.demandEndDate),
        allocationPercentage: demand?.allocationPercentage || 100,
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
                    toast.error("Failed to load resources");
                } finally {
                    setIsLoadingResources(false);
                }
            };
            loadResources();

            setFormData(prev => ({
                ...prev,
                demandId: demand?.demandId || demand?.id || '',
                allocationStartDate: toDateInputValue(demand?.demandStartDate),
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
            toast.warning(validationMessages[0] || "Please correct the validation errors");
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
                toast.error(result.message || "Allocation failed");
                return;
            }

            const errorReasons = (enrichedResult?.data?.failedResources || [])
                .map(item => item.reason)
                .filter(Boolean);

            if (hasAllocationResults && failureCount > 0 && successCount === 0) {
                if (errorReasons.length > 0) {
                    errorReasons.forEach(msg => toast.error(msg, { autoClose: 7000 }));
                } else {
                    toast.error(result.message || "Allocation failed");
                }
            } else if (hasAllocationResults && failureCount > 0) {
                toast.warning(result.message || "Allocation completed with some failures");
                errorReasons.forEach(msg => toast.error(msg, { autoClose: 7000 }));
            } else if (result.success && !isFailedAllocationMessage) {
                toast.success(result.message || "Resources allocated successfully");
            } else {
                if (errorReasons.length > 0) {
                    errorReasons.forEach(msg => toast.error(msg, { autoClose: 7000 }));
                } else {
                    toast.error(result.message || "Allocation failed");
                }
            }

            if (onSuccess) onSuccess(enrichedResult);
            onClose();
        } catch (error) {
            console.error("Allocation error:", error);
            toast.error(error.response?.data?.message || "Failed to allocate resources");
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
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                style={{ width: '80vh', maxWidth: '95vw', maxHeight: '90vh' }}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 tracking-tight leading-none">Bulk Allocation</h2>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Multi-Resource Flow</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Form Body */}
                <form id="allocation-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">

                    {/* Demand Name (Read-only or Selectable) */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            Demand Pipeline
                        </label>
                        {isBenchMode && !demand ? (
                            <div className="relative">
                                <select
                                    value={formData.demandId}
                                    onChange={handleDemandChange}
                                    className={cn("bg-white border-slate-200 font-bold text-slate-900 h-10 w-full rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500 pl-4 text-xs appearance-none cursor-pointer", errors.demandId && "border-rose-500")}
                                >
                                    <option value="" disabled>Select a demand...</option>
                                    {availableBenchDemands.map((d, i) => (
                                        <option key={d.demandId || d.id || i} value={d.demandId || d.id}>
                                            {d.demandName || "Unnamed Demand"}
                                        </option>
                                    ))}
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </span>
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
                                <User className="h-3 w-3 text-indigo-500" /> Target Resources ({formData.resourceId.length})
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
                                    <Loader2 className={cn("h-3.5 w-3.5 animate-spin", !isLoadingResources && "hidden")} />
                                </div>
                            </div>
                        )}

                        {/* Resource List (Selectable) */}
                        {!isBenchMode && (
                            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30">
                                <div className="max-h-48 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                    {isLoadingResources ? (
                                        <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-400" /></div>
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
                                                    {isSelected && <X className="h-3 w-3 text-white" />}
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
                                                <X className="h-3 w-3" />
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
                                <Calendar className="h-3 w-3 text-indigo-500" /> Start Date
                            </label>
                            <Input
                                type="date"
                                value={formData.allocationStartDate}
                                min={minStart}
                                max={maxEnd}
                                onChange={(e) => setFormData({ ...formData, allocationStartDate: e.target.value })}
                                className={cn("h-10 rounded-xl border-slate-200 font-bold text-slate-900 text-xs", errors.allocationStartDate && "border-rose-500")}
                            />
                            {errors.allocationStartDate && <p className="text-[9px] font-bold text-rose-500 mt-0.5">{errors.allocationStartDate}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-indigo-500" /> End Date
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
                                <Percent className="h-3 w-3 text-indigo-500" /> Allocation
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
                                <Activity className="h-3 w-3 text-indigo-500" /> Status
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.allocationStatus}
                                    onChange={(e) => setFormData({ ...formData, allocationStatus: e.target.value })}
                                    className={cn(
                                        "h-10 w-full rounded-xl border font-bold text-slate-900 text-xs px-3 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-0 transition-colors",
                                        errors.allocationStatus ? "border-rose-500" : "border-slate-200"
                                    )}
                                >
                                    <option value="PLANNED">PLANNED</option>
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="ENDED">ENDED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </span>
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

                {/* Footer */}
                <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex gap-3">
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
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                PROCESSING...
                            </>
                        ) : (
                            `ALLOCATE ${formData.resourceId.length || ''} RESOURCE${formData.resourceId.length !== 1 ? 'S' : ''}`
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AllocationModal;
