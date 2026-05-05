import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    Search, Filter, Activity, AlertTriangle, Zap, ShieldAlert, XCircle, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import DemandKPIStrip from '../components/DemandKPIStrip';
import DemandList from '../components/DemandList';
import DemandFilters from '../components/DemandFilters';
import { useDemand } from '../hooks/useDemand';
import DemandModal from '../../models/DemandModal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Pagination from '../../../../components/Pagination/pagination';

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
    const isRMView = effectiveRole === "Resource_Manager";

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
                                        { id: 'breached', label: 'Breached', icon: ShieldAlert, color: 'text-rose-600' },
                                        { id: 'at_risk', label: 'At Risk', icon: AlertTriangle, color: 'text-orange-600' },
                                        { id: 'active', label: 'Approved', icon: Activity, color: 'text-indigo-600' },
                                        { id: 'soft', label: 'Soft', icon: Zap, color: 'text-slate-600' },
                                        ...(isRMView
                                            ? [{ id: 'fulfilled', label: 'Fulfilled', icon: CheckCircle2, color: 'text-emerald-600' }]
                                            : []),
                                        { id: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-rose-600' }
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
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
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
                                    <Filter className="h-3.5 w-3.5" />
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
                            <div className="grid grid-cols-10 items-center gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                                <div className="col-span-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase">Demand Specifications & Context</div>
                                <div className="col-span-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">Score</div>
                                <div className="col-span-1 text-[10px] font-bold text-slate-400 tracking-wider text-center uppercase">Priority</div>
                                <div className="col-span-2 text-[10px] font-bold text-slate-400 tracking-wider text-center uppercase">
                                    {activeTab === 'rejected' ? 'Rejection Reason' : 'SLA Compliance'}
                                </div>
                                <div className="col-span-2 text-[10px] font-bold text-slate-400 tracking-wider text-center uppercase">Status</div>
                                <div className="col-span-1 text-[10px] font-bold text-slate-400 tracking-wider text-center uppercase">Actions</div>
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
                                            <Search className="h-8 w-8 text-slate-200" />
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
                                            activeTab={activeTab}
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
