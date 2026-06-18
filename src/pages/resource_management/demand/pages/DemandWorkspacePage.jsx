import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    SearchIcon, FilterIcon, ActivityIcon, WarningIcon, ZapIcon, SecurityAlertIcon,
    ErrorIcon, SuccessIcon, SpinnerIcon, CloseIcon, ProjectsIcon, UserIcon,
    CheckIcon, EditIcon, DeleteIcon, PendingIcon
} from "@/components/icons";
import Button from '../../../../components/Button/Button';
import GenericTable from '../../../../components/Table/table';
import { PriorityBadge, StateBadge, SLABadge, DemandTypeBadge } from '../components/FormalBadges';
import { cn } from "@/lib/utils";
import DemandKPIStrip from '../components/DemandKPIStrip';
import DemandFilters from '../components/DemandFilters';
import { useDemand } from '../hooks/useDemand';
import DemandModal from '../../models/DemandModal';
import { handleDMDecision, handleRMDecision, deleteDemandByPM } from '../../services/demandService';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Pagination from '../../../../components/Pagination/pagination';
import { notify } from "../../utils/notify";
import {
    canProjectManagerEditDemand,
    canProjectManagerMutateDemand,
    PM_EDITABLE_DEMAND_MESSAGE,
    PM_REQUESTED_DEMAND_ONLY_MESSAGE,
} from '../utils/demandPermissions';

const getActionErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.message ||
    fallback;

const DM_PENDING_STATUSES = ['REQUESTED', 'DRAFT', 'SOFT', 'PROPOSED', 'PENDING', 'OPEN', 'IN_PROGRESS', 'IN PROGRESS'];
const DM_REJECTABLE_STATUSES = [...DM_PENDING_STATUSES, 'APPROVED'];

const normalizeRole = (role = "") =>
    String(role)
        .toUpperCase()
        .replace(/^ROLE[-_]/, "")
        .replace(/[^A-Z0-9]/g, "");

const getDemandCommitment = (demand = {}) =>
    String(
        demand.demandCommitment ||
        demand.commitment ||
        demand.demand_commitment ||
        ""
    ).toUpperCase();

const getDemandType = (demand = {}) =>
    demand.demandType ||
    demand.type ||
    demand.demand_type ||
    demand.type_of_demand ||
    "";

const getDemandId = (demand = {}) => demand.demandId || demand.id;

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
    const title = isReject ? "Share The Rejection Reason" : isFulfill ? "Fulfill This Demand" : "Approve This Demand";
    const helperText = isReject
        ? "Add A Short Reason And Submit Your Decision."
        : isFulfill
            ? "Confirm That Staffing Is Complete And Close This Demand."
            : "Confirm The Demand And Move It To The Next Step.";
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
                        <Button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-slate-200 p-0 text-slate-400 shadow-none hover:border-slate-300 hover:text-slate-600"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </Button>
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
                                placeholder="Explain Briefly Why This Demand Is Being Rejected."
                                className={cn(
                                    "w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-350",
                                    error
                                        ? "border-rose-300 ring-4 ring-rose-100"
                                        : "border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                                )}
                            />
                            <div className="mt-2 flex items-center justify-between">
                                <p className={cn("text-xs", error ? "text-rose-600" : "text-slate-400")}>
                                    {error || "A Reason Is Required When Rejecting A Demand."}
                                </p>
                                <p className="text-[11px] text-slate-400">{reason.trim().length}/250</p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                            <p className="text-sm font-semibold text-slate-800">
                                {isFulfill
                                    ? "The Demand Will Be Marked As Fulfilled Immediately After Confirmation."
                                    : "The Demand Will Be Approved Immediately After Confirmation."}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                No Extra Form Update Is Needed.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        variant="outline"
                        size="small"
                        className="rounded-xl border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-none hover:border-slate-300"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={loading}
                        size="small"
                        className={cn("rounded-xl px-4 py-2 text-sm font-semibold text-white", primaryButtonClass)}
                    >
                        {loading ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                        {buttonLabel}
                    </Button>
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
                                Delete Requested Demand?
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                This Will Cancel The Requested Demand And Remove It From The Active Pipeline.
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-slate-200 p-0 text-slate-400 shadow-none hover:border-slate-300 hover:text-slate-600"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </Button>
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
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        variant="outline"
                        size="small"
                        className="rounded-xl border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-none hover:border-slate-300"
                    >
                        Keep Demand
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={loading}
                        variant="danger"
                        size="small"
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-rose-200 hover:bg-rose-700"
                    >
                        {loading ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <ErrorIcon className="h-4 w-4" />}
                        Delete Demand
                    </Button>
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
    const isRMView = normalizeRole(effectiveRole) === "RESOURCEMANAGER";

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
        const normalizedRole = normalizeRole(effectiveRole);
        const isRM = normalizedRole === "RESOURCEMANAGER";
        const isPM = normalizedRole === "PROJECTMANAGER" || normalizedRole === "MANAGER";

        if ((isPM || isRM) && !canProjectManagerMutateDemand(demand)) {
            notify.error("Only Requested Demands Can Be Deleted.");
            return;
        }
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
            notify.success(response?.message || "Demand Approved Successfully");
            setApprovingDemand(null);
            await refreshData();
        } catch (error) {
            notify.error(getActionErrorMessage(error, "Demand Approval Failed"));
        } finally {
            setDecisionState({ demandId: null, action: null });
        }
    };

    const handleQuickReject = async () => {
        const cleanedReason = rejectReason.trim();
        const currentStatus = String(rejectingDemand?.lifecycleState || rejectingDemand?.demandStatus || "").toUpperCase();

        if (!cleanedReason) {
            setRejectReasonError("Please Enter A Rejection Reason.");
            return;
        }

        const demandId = getDemandId(rejectingDemand);
        if (!demandId) return;

        if (!DM_REJECTABLE_STATUSES.includes(currentStatus)) {
            notify.error("Only Pending Or Approved Demands Can Be Rejected By Dm.");
            return;
        }

        setDecisionState({ demandId, action: "reject" });
        try {
            const response = await handleDMDecision({
                demandId,
                decision: "REJECTED",
                rejectionReason: cleanedReason
            });
            notify.success(response?.message || (currentStatus === "APPROVED" ? "Approved Demand Rejected Successfully" : "Demand Rejected Successfully"));
            setRejectingDemand(null);
            setRejectReason("");
            setRejectReasonError("");
            await refreshData();
        } catch (error) {
            notify.error(getActionErrorMessage(error, "Demand Rejection Failed"));
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
            notify.success(response?.message || "Demand Fulfilled Successfully");
            setFulfillingDemand(null);
            await refreshData();
        } catch (error) {
            notify.error(getActionErrorMessage(error, "Demand Fulfillment Failed"));
        } finally {
            setDecisionState({ demandId: null, action: null });
        }
    };

    const handleRMReject = async () => {
        const cleanedReason = rmRejectReason.trim();

        if (!cleanedReason) {
            setRmRejectReasonError("Please Enter A Rejection Reason.");
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
            notify.success(response?.message || "Demand Rejected Successfully");
            setRmRejectingDemand(null);
            setRmRejectReason("");
            setRmRejectReasonError("");
            await refreshData();
        } catch (error) {
            notify.error(getActionErrorMessage(error, "Demand Rejection Failed"));
        } finally {
            setDecisionState({ demandId: null, action: null });
        }
    };

    const handleDeleteRequestedDemand = async () => {
        const id = deletingDemand?.demandId || deletingDemand?.id;
        if (!id) return;

        const normalizedRole = normalizeRole(effectiveRole);
        const isRM = normalizedRole === "RESOURCEMANAGER";
        const isPM = normalizedRole === "PROJECTMANAGER" || normalizedRole === "MANAGER";

        if ((isPM || isRM) && !canProjectManagerMutateDemand(deletingDemand)) {
            notify.error("Only Requested Demands Can Be Deleted.");
            return;
        }

        setDecisionState({ demandId: id, action: "delete" });
        try {
            const response = await deleteDemandByPM(id, deletingDemand);
            notify.success(response?.message || "Demand Deleted Successfully");
            setDeletingDemand(null);
            await refreshData();
        } catch (error) {
            notify.error(getActionErrorMessage(error, "Failed To Delete Demand"));
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

    const hasRM = demandRoleOptions.some(option => option.value === "Resource_Manager");
    const hasDM = demandRoleOptions.some(option => option.value === "Delivery_Manager");
    const showRoleDropdown = hasRM && hasDM;
    const displayedRoleOptions = demandRoleOptions.filter(option => option.value === "Resource_Manager" || option.value === "Delivery_Manager");

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
                                A Real-Time Snapshot Of Resource Mandates, Sla Compliance, And Fulfillment Status Across The Enterprise.
                            </p>
                        </div>
                        {showRoleDropdown && (
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
                                        {displayedRoleOptions.map((option) => (
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
                    <div className="border-b border-slate-100 bg-white">
                        <div className="px-5 pt-3 pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-[12px] font-bold text-slate-900 tracking-tight">Pipeline View</h3>
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500">
                                    {totalElements}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 pb-2 lg:pb-0">
                                <div className="relative">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search Pipeline..."
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

                        <div className="px-5 flex items-center gap-6 overflow-x-auto scrollbar-hide">
                            {[
                                { id: 'breached', label: 'Breached', color: 'text-rose-600' },
                                { id: 'at_risk', label: 'At Risk', color: 'text-orange-600' },
                                ...(normalizeRole(effectiveRole) === 'DELIVERYMANAGER' ? [{ id: 'requested', label: 'Requested', color: 'text-blue-600' }] : []),
                                { id: 'active', label: 'Approved', color: 'text-indigo-600' },
                                { id: 'soft', label: 'Soft', color: 'text-slate-600' },
                                { id: 'fulfilled', label: 'Fulfilled', color: 'text-emerald-600' },
                                { id: 'rejected', label: 'Rejected', color: 'text-rose-600' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "relative py-3 text-[11px] font-bold transition-colors whitespace-nowrap outline-none",
                                        activeTab === tab.id
                                            ? "text-indigo-600"
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <span className="absolute bottom-0 left-0 w-full h-[2px] rounded-t-full bg-indigo-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4">
                        <GenericTable
                            headers={[
                                "Demand Details",
                                "Score",
                                "Priority",
                                activeTab === 'rejected' ? 'Rejection Reason' : 'SLA Compliance',
                                "Status",
                                "Actions"
                            ]}
                            columns={["demand_details", "score", "priority", "sla_compliance", "status", "actions"]}
                            loading={isLoading}
                            rows={filteredDemands.map((demand) => {
                                const status = String(demand.lifecycleState || demand.demandStatus || '').toUpperCase();
                                const demandCommitment = getDemandCommitment(demand);
                                const normalizedViewerRole = normalizeRole(effectiveRole);
                                const isDMView = normalizedViewerRole === "DELIVERYMANAGER";
                                const isRMView = normalizedViewerRole === "RESOURCEMANAGER";
                                const isPMView = normalizedViewerRole === "PROJECTMANAGER" || normalizedViewerRole === "MANAGER";
                                const canQuickDecision = isDMView && DM_PENDING_STATUSES.includes(status);
                                const canDMRevertApprovedDemand = isDMView && status === 'APPROVED';
                                const canRMAction = isRMView && (status === 'APPROVED' || status === 'REQUESTED');
                                const canPMEditDemand = isPMView && canProjectManagerEditDemand(demand);
                                const canDeleteDemand = (isPMView || isRMView) && canProjectManagerMutateDemand(demand);
                                const isFulfilled = status === 'FULFILLED';
                                const isRejected = status === 'REJECTED';
                                const isEditDisabled = isFulfilled || isRejected || (isDMView && status === 'APPROVED') || (isPMView && !canPMEditDemand);

                                const isApproving = decisionState?.demandId === demand.id && decisionState?.action === "approve";
                                const isRejecting = decisionState?.demandId === demand.id && decisionState?.action === "reject";
                                const isFulfilling = decisionState?.demandId === demand.id && decisionState?.action === "fulfill";

                                return {
                                    ...demand,
                                    onRowClick: () => navigate(`/resource-management/demand/${demand.id}`, {
                                        state: { clientName: demand.clientName || demand.client }
                                    }),
                                    rowClass: "group",
                                    demand_details: (
                                        <div className="flex flex-col gap-1 text-left px-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[13px] font-bold text-slate-900 truncate tracking-tight group-hover:text-indigo-600 transition-colors">
                                                    {demand.projectName}
                                                </h3>
                                                <div className="px-1.5 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-500 tracking-tighter">
                                                    ID: {demand.id?.split('-')[0]}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex items-center gap-1 min-w-0">
                                                    <ProjectsIcon className="h-3 w-3 text-slate-400" />
                                                    <span className="text-[11px] font-semibold text-slate-500 truncate">{demand.client}</span>
                                                </div>
                                                <div className="h-2.5 w-[1px] bg-slate-200" />
                                                <div className="flex items-center gap-1 min-w-0">
                                                    <UserIcon className="h-3 w-3 text-slate-400" />
                                                    <span className="text-[11px] text-slate-400 truncate">{demand.role}</span>
                                                </div>
                                                <DemandTypeBadge type={getDemandType(demand)} />
                                            </div>
                                        </div>
                                    ),
                                    score: (
                                        <div className="flex flex-col items-center">
                                            <span className="text-base font-black text-slate-900 tracking-tighter leading-none">
                                                {demand.priorityScore || 0}
                                            </span>
                                            <div className="text-[8px] font-bold text-slate-400 tracking-widest mt-0.5 uppercase">Score</div>
                                        </div>
                                    ),
                                    priority: (
                                        <div className="flex justify-center">
                                            <PriorityBadge priority={demand.priority} />
                                        </div>
                                    ),
                                    sla_compliance: (
                                        <div className="flex justify-center w-full">
                                            {activeTab === 'rejected' ? (
                                                <div className="flex flex-col items-center gap-1 w-full px-2 overflow-hidden">
                                                    {(demand.rmRejectionReason || demand.dmRejectionReason || demand.rejectionReason) ? (
                                                        <span
                                                            className="text-[10px] font-bold text-rose-600 truncate max-w-full italic"
                                                            title={demand.rmRejectionReason || demand.dmRejectionReason || demand.rejectionReason}
                                                        >
                                                            "{demand.rmRejectionReason || demand.dmRejectionReason || demand.rejectionReason}"
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic font-bold">No Reason Specified</span>
                                                    )}
                                                </div>
                                            ) : isFulfilled ? (
                                                <div className="flex flex-col items-center gap-0.5 px-2 py-0.5 rounded-lg border min-w-[80px] bg-emerald-50 border-emerald-100 text-emerald-600">
                                                    <div className="flex items-center gap-1">
                                                        <CheckIcon className="h-2 w-2" />
                                                        <span className="text-[8px] font-black tracking-widest uppercase">SLA</span>
                                                    </div>
                                                    <span className="text-[11px] font-black">Satisfied</span>
                                                </div>
                                            ) : (demand.demandSlaId || demand.slaId) ? (
                                                <SLABadge
                                                    days={demand.slaDays}
                                                    isSoft={
                                                        !demand.demandSlaId && (
                                                            activeTab === 'soft' ||
                                                            demandCommitment === 'SOFT' ||
                                                            demand.lifecycleState?.toUpperCase() === 'SOFT'
                                                        )
                                                    }
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-0.5 px-2 py-0.5 rounded-lg border min-w-[80px] bg-slate-50 border-slate-100 text-slate-400">
                                                    <div className="flex items-center gap-1">
                                                        <PendingIcon className="h-2 w-2 opacity-40" />
                                                        <span className="text-[8px] font-black tracking-widest uppercase">SLA</span>
                                                    </div>
                                                    <span className="text-[11px] font-black">No SLA</span>
                                                </div>
                                            )}
                                        </div>
                                    ),
                                    status: (
                                        <div className="flex justify-center">
                                            <StateBadge state={demand.lifecycleState} />
                                        </div>
                                    ),
                                    actions: (
                                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            {canQuickDecision ? (
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        onClick={() => openApproveModal(demand)}
                                                        disabled={isApproving || isRejecting}
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Approve"
                                                        className="h-7 w-7 rounded-md p-0 text-emerald-600 shadow-none hover:bg-emerald-50"
                                                    >
                                                        {isApproving ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                                                    </Button>
                                                    <Button
                                                        onClick={() => openRejectModal(demand)}
                                                        disabled={isApproving || isRejecting}
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Reject"
                                                        className="h-7 w-7 rounded-md p-0 text-rose-600 shadow-none hover:bg-rose-50"
                                                    >
                                                        {isRejecting ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <CloseIcon className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            ) : canRMAction ? (
                                                <div className="flex items-center justify-center">
                                                    <Button
                                                        onClick={() => openRMRejectModal(demand)}
                                                        disabled={isRejecting}
                                                        title="Reject Demand"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-md p-0 text-rose-600 shadow-none hover:bg-rose-50"
                                                    >
                                                        {isRejecting ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <CloseIcon className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            ) : canDMRevertApprovedDemand ? (
                                                <Button
                                                    title="Reject approved demand"
                                                    onClick={() => openRejectModal(demand)}
                                                    disabled={isRejecting}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-md p-0 text-rose-600 shadow-none hover:bg-rose-50"
                                                >
                                                    {isRejecting ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <CloseIcon className="h-4 w-4" />}
                                                </Button>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        onClick={() => {
                                                            if (isPMView && !canProjectManagerEditDemand(demand)) {
                                                                notify.error(PM_EDITABLE_DEMAND_MESSAGE);
                                                                return;
                                                            }
                                                            setEditingDemand(demand);
                                                            setEditModalOpen(true);
                                                        }}
                                                        disabled={isEditDisabled}
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn("h-8 w-8 rounded-lg p-0 shadow-none", isEditDisabled ? "text-slate-300" : "text-blue-600 hover:bg-blue-50")}
                                                    >
                                                        <EditIcon className="h-4 w-4" />
                                                    </Button>
                                                    {canDeleteDemand && (
                                                        <Button
                                                            onClick={() => openDeleteModal(demand)}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg p-0 text-rose-600 shadow-none hover:bg-rose-50"
                                                        >
                                                            <DeleteIcon className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                };
                            })}
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
