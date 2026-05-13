import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { SearchIcon, FilterIcon, ActivityIcon, WarningIcon, ZapIcon, SecurityAlertIcon, ErrorIcon, SuccessIcon, SpinnerIcon, CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import DemandKPIStrip from '../components/DemandKPIStrip';
import DemandList from '../components/DemandList';
import DemandFilters from '../components/DemandFilters';
import { useDemand } from '../hooks/useDemand';
import DemandModal from '../../models/DemandModal';
import { handleDMDecision, handleRMDecision, deleteDemandByPM } from '../../services/demandService';
import { updateDemandStatus } from '../../services/projectService';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Pagination from '../../../../components/Pagination/pagination';
import { toast } from 'react-toastify';

const getActionErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.message ||
    fallback;

const DecisionModal = ({
    type,
    demand,
    reason,
    error,
    loading,
    onReasonChange,
    onClose,
    onSubmit
}) => {
    if (!demand) return null;

    const isReject = type === "reject";
    const isFulfill = type === "fulfill";
    const accentWrapClass = isReject
        ? "border-rose-200 bg-rose-50 text-rose-600"
        : isFulfill
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
    const headerBg = isReject
        ? "bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#fef2f2_100%)]"
        : isFulfill
            ? "bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_55%,#f8fafc_100%)]"
        : "bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_55%,#eff6ff_100%)]";
    const primaryButtonClass = isReject
        ? "bg-rose-600 shadow-rose-200 hover:bg-rose-700"
        : isFulfill
            ? "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
        : "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700";
    const title = isReject ? "Share the rejection reason" : isFulfill ? "Fulfill this demand" : "Approve this demand";
    const helperText = isReject
        ? "Add a short reason and submit your decision."
        : isFulfill
            ? "Confirm that staffing is complete and close this demand."
        : "Confirm the demand and move it to the next step.";
    const buttonLabel = isReject ? "Submit Rejection" : isFulfill ? "Mark Fulfilled" : "Confirm Approval";
    const Icon = isReject ? ErrorIcon : SuccessIcon;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[2px]">
            <div className="flex min-h-[430px] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
                <div className={cn("border-b border-slate-100 px-6 py-5", headerBg)}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]", accentWrapClass)}>
                                <Icon className="h-3.5 w-3.5" />
                                {isReject ? "Reject" : isFulfill ? "Fulfill" : "Approve"}
                            </div>
                            <h3 className="mt-3 text-lg font-bold text-slate-900">
                                {title}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                {helperText}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 flex-col justify-between gap-5 px-6 py-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Demand Summary</p>
                        <div className="mt-3 space-y-2">
                            <p className="text-base font-bold text-slate-900">{demand.projectName}</p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                <span>{demand.client}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span>{demand.role}</span>
                            </div>
                        </div>
                    </div>

                    {isReject ? (
                        <div>
                            <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                                Rejection Reason
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => onReasonChange(e.target.value)}
                                rows={4}
                                placeholder="Explain briefly why this demand is being rejected."
                                className={cn(
                                    "w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-350",
                                    error
                                        ? "border-rose-300 ring-4 ring-rose-100"
                                        : "border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                                )}
                            />
                            <div className="mt-2 flex items-center justify-between">
                                <p className={cn("text-xs", error ? "text-rose-600" : "text-slate-400")}>
                                    {error || "A reason is required when rejecting a demand."}
                                </p>
                                <p className="text-[11px] text-slate-400">{reason.trim().length}/250</p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                            <p className="text-sm font-semibold text-slate-800">
                                {isFulfill
                                    ? "The demand will be marked as fulfilled immediately after confirmation."
                                    : "The demand will be approved immediately after confirmation."}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                No extra form update is needed.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={loading}
                        className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60", primaryButtonClass)}
                    >
                        {loading ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                        {buttonLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const DeleteDemandModal = ({ demand, loading, onClose, onSubmit }) => {
    if (!demand) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-rose-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
                <div className="border-b border-rose-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#fff1f2_100%)] px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">
                                <ErrorIcon className="h-3.5 w-3.5" />
                                Delete
                            </div>
                            <h3 className="mt-3 text-lg font-bold text-slate-900">
                                Delete requested demand?
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                This will cancel the requested demand and remove it from the active pipeline.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Demand Summary</p>
                        <p className="mt-3 text-base font-bold text-slate-900">{demand.projectName}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            <span>{demand.client}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>{demand.role}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Keep Demand
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <ErrorIcon className="h-4 w-4" />}
                        Delete Demand
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const DemandWorkspacePage = () => {
    const navigate = useNavigate();
    const {
        filters,
        setFilters,
        resetFilters,
        activeTab,
        setActiveTab,
        isLoading,
        filteredDemands,
        activeKPIs,
        demandRoleOptions,
        selectedRole,
        setSelectedRole,
        effectiveRole,
        refreshData,
        availableClients,
        availableStatuses,
        availableDemandNames,
        availableDemandTypes,
        availableDeliveryModels,
        totalPages,
        totalElements,
        page,
        setPage
    } = useDemand();

    const [filterCollapsed, setFilterCollapsed] = useState(true);
    const filterButtonRef = useRef(null);
    const [dropdownPos, setDropdownPos] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingDemand, setEditingDemand] = useState(null);
    const [draftFilters, setDraftFilters] = useState(filters);
    const [decisionState, setDecisionState] = useState({ demandId: null, action: null });
    const [approvingDemand, setApprovingDemand] = useState(null);
    const [rejectingDemand, setRejectingDemand] = useState(null);
    const [fulfillingDemand, setFulfillingDemand] = useState(null);
    const [rmRejectingDemand, setRmRejectingDemand] = useState(null);
    const [deletingDemand, setDeletingDemand] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectReasonError, setRejectReasonError] = useState("");
    const [rmRejectReason, setRmRejectReason] = useState("");
    const [rmRejectReasonError, setRmRejectReasonError] = useState("");
    const isRMView = effectiveRole === "Resource_Manager";

    const openApproveModal = (demand) => {
        setApprovingDemand(demand);
    };

    const openRejectModal = (demand) => {
        setRejectingDemand(demand);
        setRejectReason("");
        setRejectReasonError("");
    };

    const openFulfillModal = (demand) => {
        setFulfillingDemand(demand);
    };

    const openRMRejectModal = (demand) => {
        setRmRejectingDemand(demand);
        setRmRejectReason("");
        setRmRejectReasonError("");
    };

    const openDeleteModal = (demand) => {
        setDeletingDemand(demand);
    };

    const closeApproveModal = () => {
        if (decisionState.action === "approve") return;
        setApprovingDemand(null);
    };

    const closeRejectModal = () => {
        if (decisionState.action === "reject") return;
        setRejectingDemand(null);
        setRejectReason("");
        setRejectReasonError("");
    };

    const closeFulfillModal = () => {
        if (decisionState.action === "fulfill") return;
        setFulfillingDemand(null);
    };

    const closeRMRejectModal = () => {
        if (decisionState.action === "reject") return;
        setRmRejectingDemand(null);
        setRmRejectReason("");
        setRmRejectReasonError("");
    };

    const closeDeleteModal = () => {
        if (decisionState.action === "delete") return;
        setDeletingDemand(null);
    };

    const handleQuickApprove = async () => {
        if (!approvingDemand?.id) return;

        setDecisionState({ demandId: approvingDemand.id, action: "approve" });
        try {
            const response = await handleDMDecision({
                demandId: approvingDemand.id,
                decision: "APPROVED",
                rejectionReason: null
            });
            toast.success(response?.message || "Demand approved successfully");
            setApprovingDemand(null);
            await refreshData();
        } catch (error) {
            toast.error(getActionErrorMessage(error, "Demand approval failed"));
        } finally {
            setDecisionState({ demandId: null, action: null });
        }
    };

    const handleQuickReject = async () => {
        const cleanedReason = rejectReason.trim();

        if (!cleanedReason) {
            setRejectReasonError("Please enter a rejection reason.");
            return;
        }

        if (!rejectingDemand?.id) return;

        setDecisionState({ demandId: rejectingDemand.id, action: "reject" });
        try {
            const response = await handleDMDecision({
                demandId: rejectingDemand.id,
                decision: "REJECTED",
                rejectionReason: cleanedReason
            });
            toast.success(response?.message || "Demand rejected successfully");
            setRejectingDemand(null);
            setRejectReason("");
            setRejectReasonError("");
            await refreshData();
        } catch (error) {
            toast.error(getActionErrorMessage(error, "Demand rejection failed"));
        } finally {
            setDecisionState({ demandId: null, action: null });
        }
    };

    const handleRMFulfill = async () => {
        if (!fulfillingDemand?.id) return;

        setDecisionState({ demandId: fulfillingDemand.id, action: "fulfill" });
        try {
            const response = await handleRMDecision({
                demandId: fulfillingDemand.id,
                decision: "FULFILLED",
                rejectionReason: null
            });
            toast.success(response?.message || "Demand fulfilled successfully");
            setFulfillingDemand(null);
            await refreshData();
        } catch (error) {
            toast.error(getActionErrorMessage(error, "Demand fulfillment failed"));
        } finally {
            setDecisionState({ demandId: null, action: null });
        }
    };

    const handleRMReject = async () => {
        const cleanedReason = rmRejectReason.trim();

        if (!cleanedReason) {
            setRmRejectReasonError("Please enter a rejection reason.");
            return;
        }

        if (!rmRejectingDemand?.id) return;

        setDecisionState({ demandId: rmRejectingDemand.id, action: "reject" });
        try {
            const response = await handleRMDecision({
                demandId: rmRejectingDemand.id,
                decision: "REJECTED",
                rejectionReason: cleanedReason
            });
            toast.success(response?.message || "Demand rejected successfully");
            setRmRejectingDemand(null);
            setRmRejectReason("");
            setRmRejectReasonError("");
            await refreshData();
        } catch (error) {
            toast.error(getActionErrorMessage(error, "Demand rejection failed"));
        } finally {
            setDecisionState({ demandId: null, action: null });
        }
    };

    const handleDeleteRequestedDemand = async () => {
        const id = deletingDemand?.demandId || deletingDemand?.id;
        if (!id) return;

        setDecisionState({ demandId: id, action: "delete" });
        try {
            const response = await deleteDemandByPM(id);
            toast.success(response?.message || "Demand deleted successfully");
            setDeletingDemand(null);
            await refreshData();
        } catch (error) {
            toast.error(getActionErrorMessage(error, "Failed to delete demand"));
        } finally {
            setDecisionState({ demandId: null, action: null });
        }
    };

    // Sync draft with global filters when they change externally (like Reset)
    useEffect(() => {
        setDraftFilters(filters);
    }, [filters]);

    useEffect(() => {
        const updatePosition = () => {
            if (filterButtonRef.current) {
                const rect = filterButtonRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                const popupHeight = 450;
                const popupWidth = 340;

                const spaceBelow = viewportHeight - rect.bottom;
                const spaceAbove = rect.top;
                const spaceRight = viewportWidth - rect.left;
                const spaceLeft = rect.right;

                // Priority 1: Vertical positioning (Below is preferred)
                let align = 'down';
                if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
                    align = 'up';
                }

                // Priority 2: Horizontal positioning (Align right edge of button and modal)
                let horizontalPos = { right: viewportWidth - rect.right };

                // If modal would overflow left side of screen
                if (rect.right < popupWidth) {
                    horizontalPos = { left: rect.left };
                    delete horizontalPos.right;
                }

                setDropdownPos({
                    top: align === 'up' ? 'auto' : (rect.bottom + 8),
                    bottom: align === 'up' ? (viewportHeight - rect.top + 8) : 'auto',
                    ...horizontalPos,
                    align,
                    maxHeight: Math.min(viewportHeight * 0.85, align === 'up' ? spaceAbove - 24 : spaceBelow - 24)
                });
            }
        };

        if (!filterCollapsed) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [filterCollapsed]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setFilterCollapsed(true);
        };
        const handleClickOutside = (event) => {
            if (filterButtonRef.current && !filterButtonRef.current.contains(event.target)) {
                const portal = document.getElementById('filter-workspace-portal');
                if (portal && !portal.contains(event.target)) {
                    setFilterCollapsed(true);
                }
            }
        };
        if (!filterCollapsed) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [filterCollapsed]);

    const activeFilterCount = [
        filters.client !== 'ALL',
        filters.priority !== 'ALL',
        filters.status !== 'ALL',
        filters.demandName !== 'ALL',
        filters.demandType !== 'ALL',
        filters.deliveryModel !== 'ALL'
    ].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-slate-50/50">
            <main className="w-full px-4 py-4 md:px-6 md:py-6">
                <header className="mb-4 md:mb-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                Demand Pipeline Management
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                A real-time snapshot of resource mandates, SLA compliance, and fulfillment status across the enterprise.
                            </p>
                        </div>
                        {demandRoleOptions.length > 1 && (
                            <div className="flex items-center gap-2 flex-nowrap shrink-0">
                                <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">View As:</span>
                                <Select
                                    value={selectedRole || effectiveRole}
                                    onValueChange={(v) => setSelectedRole(v)}
                                >
                                    <SelectTrigger className="h-9 min-w-[170px] rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm shadow-indigo-100/10">
                                        <SelectValue placeholder="View As" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {demandRoleOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                className="text-xs font-semibold py-2"
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </header>

                <div className="mb-4 md:mb-6">
                    <DemandKPIStrip data={activeKPIs} isLoading={isLoading} />
                </div>

                <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-slate-100 bg-white">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex items-center gap-5">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-[12px] font-bold text-slate-900 tracking-tight">Pipeline View</h3>
                                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500">
                                        {totalElements}
                                    </span>
                                </div>

                                <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
                                    {[
                                        { id: 'breached', label: 'Breached', icon: SecurityAlertIcon, color: 'text-rose-600' },
                                        { id: 'at_risk', label: 'At Risk', icon: WarningIcon, color: 'text-orange-600' },
                                        { id: 'active', label: 'Approved', icon: ActivityIcon, color: 'text-indigo-600' },
                                        { id: 'soft', label: 'Soft', icon: ZapIcon, color: 'text-slate-600' },
                                        ...(isRMView
                                            ? [{ id: 'fulfilled', label: 'Fulfilled', icon: SuccessIcon, color: 'text-emerald-600' }]
                                            : []),
                                        { id: 'rejected', label: 'Rejected', icon: ErrorIcon, color: 'text-rose-600' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                                activeTab === tab.id
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-400 hover:text-slate-600"
                                            )}
                                        >
                                            <tab.icon className={cn("h-3 w-3", activeTab === tab.id ? tab.color : "opacity-40")} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search pipeline..."
                                        value={filters.search}
                                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                        className="h-8 w-[240px] pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-[12px] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                                    />
                                </div>
                                <button
                                    ref={filterButtonRef}
                                    onClick={() => setFilterCollapsed(!filterCollapsed)}
                                    className={cn(
                                        "h-8 flex items-center gap-2 px-3 rounded-lg text-[11px] font-bold border transition-all active:scale-95",
                                        !filterCollapsed ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-100" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    <FilterIcon className="h-3.5 w-3.5" />
                                    {filters.client !== 'ALL' ? filters.client : 'Filters'}
                                    {activeFilterCount > 0 && (
                                        <span className="ml-1 px-1 bg-indigo-100 text-indigo-600 rounded-sm text-[9px]">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto border-t border-slate-100">
                        <div className="min-w-[1000px]">
                            <div className="grid grid-cols-12 items-center gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                                <div className="col-span-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase">Demand Specifications & Context</div>
                                <div className="col-span-1 text-[10px] font-bold text-slate-400 tracking-wider text-center uppercase">Score</div>
                                <div className="col-span-1 text-[10px] font-bold text-slate-400 tracking-wider text-center uppercase">Priority</div>
                                <div className="col-span-3 text-[10px] font-bold text-slate-400 tracking-wider text-center uppercase">
                                    {activeTab === 'rejected' ? 'Rejection Reason' : 'SLA Compliance'}
                                </div>
                                <div className="col-span-2 text-[10px] font-bold text-slate-400 tracking-wider text-center uppercase">Status</div>
                                <div className="col-span-2 text-[10px] font-bold text-slate-400 tracking-wider text-center uppercase">Actions</div>
                            </div>

                            <div className="bg-white min-h-[400px]">
                                {isLoading ? (
                                    <div className="flex flex-col">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="px-6 py-5 border-b border-slate-50 animate-pulse flex items-center justify-between">
                                                <div className="flex items-center gap-4 w-1/3">
                                                    <div className="h-10 w-10 bg-slate-50 rounded-lg" />
                                                    <div className="space-y-2 flex-1">
                                                        <div className="h-3 w-3/4 bg-slate-50 rounded" />
                                                        <div className="h-2 w-1/2 bg-slate-50 rounded" />
                                                    </div>
                                                </div>
                                                <div className="h-4 w-1/12 bg-slate-50 rounded" />
                                                <div className="h-6 w-1/6 bg-slate-50 rounded-full" />
                                            </div>
                                        ))}
                                    </div>
                                ) : filteredDemands.length === 0 ? (
                                    <div className="py-24 text-center">
                                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <SearchIcon className="h-8 w-8 text-slate-200" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900">No matches found</h3>
                                        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search terms</p>
                                    </div>
                                ) : (
                                    <>
                                        <DemandList
                                            demands={filteredDemands}
                                            onViewDetail={(demand) => navigate(`/resource-management/demand/${demand.id}`, { state: { clientName: demand.clientName || demand.client } })}
                                            onEdit={(demand) => {
                                                setEditingDemand(demand);
                                                setEditModalOpen(true);
                                            }}
                                            onDelete={openDeleteModal}
                                            onApprove={openApproveModal}
                                            onReject={openRejectModal}
                                            onFulfill={openFulfillModal}
                                            onRMReject={openRMRejectModal}
                                            decisionState={decisionState}
                                            activeTab={activeTab}
                                            viewerRole={effectiveRole}
                                        />
                                        {totalPages > 1 && (
                                            <div className="py-6 border-t border-slate-100">
                                                <Pagination
                                                    currentPage={page}
                                                    totalPages={totalPages}
                                                    onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                                                    onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {!filterCollapsed && dropdownPos && createPortal(
                <div
                    id="filter-workspace-portal"
                    className={cn(
                        "fixed bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] w-[340px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                        dropdownPos.align === 'up' ? "origin-bottom-right" : "origin-top-right"
                    )}
                    style={{
                        top: dropdownPos.top === 'auto' ? 'auto' : `${dropdownPos.top}px`,
                        bottom: dropdownPos.bottom === 'auto' ? 'auto' : `${dropdownPos.bottom}px`,
                        right: dropdownPos.right !== undefined ? `${dropdownPos.right}px` : 'auto',
                        left: dropdownPos.left !== undefined ? `${dropdownPos.left}px` : 'auto',
                        maxHeight: `${dropdownPos.maxHeight}px`,
                    }}
                >
                    <DemandFilters
                        clientFilter={filters.client}
                        onClientChange={(v) => setFilters(prev => ({ ...prev, client: v }))}
                        priorityFilter={filters.priority}
                        onPriorityChange={(v) => setFilters(prev => ({ ...prev, priority: v }))}
                        onReset={resetFilters}
                        activeCount={activeFilterCount}
                        inline={true}
                        onToggleCollapse={() => setFilterCollapsed(true)}
                        clients={availableClients}
                        statuses={availableStatuses}
                        demandNames={availableDemandNames}
                        statusFilter={filters.status}
                        onStatusChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
                        demandNameFilter={filters.demandName}
                        onDemandNameChange={(v) => setFilters(prev => ({ ...prev, demandName: v }))}
                        demandTypeFilter={filters.demandType}
                        onDemandTypeChange={(v) => setFilters(prev => ({ ...prev, demandType: v }))}
                        deliveryModelFilter={filters.deliveryModel}
                        onDeliveryModelChange={(v) => setFilters(prev => ({ ...prev, deliveryModel: v }))}
                        demandTypes={availableDemandTypes}
                        deliveryModels={availableDeliveryModels}
                        draft={draftFilters}
                        setDraft={setDraftFilters}
                    />
                </div>,
                document.body
            )}

            <DecisionModal
                type="approve"
                demand={approvingDemand}
                reason=""
                error=""
                loading={decisionState.action === "approve" && decisionState.demandId === approvingDemand?.id}
                onReasonChange={() => { }}
                onClose={closeApproveModal}
                onSubmit={handleQuickApprove}
            />

            <DecisionModal
                type="reject"
                demand={rejectingDemand}
                reason={rejectReason}
                error={rejectReasonError}
                loading={decisionState.action === "reject" && decisionState.demandId === rejectingDemand?.id}
                onReasonChange={(value) => {
                    setRejectReason(value.slice(0, 250));
                    if (rejectReasonError && value.trim()) {
                        setRejectReasonError("");
                    }
                }}
                onClose={closeRejectModal}
                onSubmit={handleQuickReject}
            />

            <DecisionModal
                type="fulfill"
                demand={fulfillingDemand}
                reason=""
                error=""
                loading={decisionState.action === "fulfill" && decisionState.demandId === fulfillingDemand?.id}
                onReasonChange={() => { }}
                onClose={closeFulfillModal}
                onSubmit={handleRMFulfill}
            />

            <DecisionModal
                type="reject"
                demand={rmRejectingDemand}
                reason={rmRejectReason}
                error={rmRejectReasonError}
                loading={decisionState.action === "reject" && decisionState.demandId === rmRejectingDemand?.id}
                onReasonChange={(value) => {
                    setRmRejectReason(value.slice(0, 250));
                    if (rmRejectReasonError && value.trim()) {
                        setRmRejectReasonError("");
                    }
                }}
                onClose={closeRMRejectModal}
                onSubmit={handleRMReject}
            />

            <DeleteDemandModal
                demand={deletingDemand}
                loading={decisionState.action === "delete" && decisionState.demandId === deletingDemand?.id}
                onClose={closeDeleteModal}
                onSubmit={handleDeleteRequestedDemand}
            />

            {editModalOpen && (
                <DemandModal
                    open={editModalOpen}
                    mode="edit"
                    initialData={editingDemand}
                    userRole={effectiveRole || ""}
                    onClose={() => {
                        setEditModalOpen(false);
                        setEditingDemand(null);
                    }}
                    onSuccess={() => {
                        setEditModalOpen(false);
                        setEditingDemand(null);
                        refreshData();
                    }}
                />
            )}
        </div>
    );
};

export default DemandWorkspacePage;
