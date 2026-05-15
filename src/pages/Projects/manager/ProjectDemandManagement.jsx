import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DemandDetailPage from '../../resource_management/demand/pages/DemandDetailPage';
import DemandKPIStrip from '../../resource_management/demand/components/DemandKPIStrip';
import DemandList from '../../resource_management/demand/components/DemandList';
import DemandFilters from '../../resource_management/demand/components/DemandFilters';
import demandService from '../../resource_management/demand/services/demandService';
import { Search, Filter, Plus, FilePlus, Calendar, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { showStatusToast } from "../../../components/toastfy/toast";
import { getProjectById, checkDemandCreation, updateDemandStatus } from '../../resource_management/services/projectService';
import { getSkillCategoriesTree, getProficiencyLevels } from "../../resource_management/services/workforceService";
import DemandModal from "../../resource_management/models/DemandModal";
import DeleteDemandModal from "../../resource_management/demand/components/DeleteDemandModal";
import AddDeliverableRoleModal from "../../resource_management/models/AddDeliverableRoleModal";
import Pagination from '../../../components/Pagination/pagination';
import { useAuth } from "../../../contexts/AuthContext";
import {
    canProjectManagerEditDemand,
    canProjectManagerMutateDemand,
    PM_EDITABLE_DEMAND_MESSAGE,
    PM_REQUESTED_DEMAND_ONLY_MESSAGE,
} from '../../resource_management/demand/utils/demandPermissions';

const normalizeRole = (role = "") =>
    String(role)
        .toUpperCase()
        .replace(/^ROLE[-_]/, "")
        .replace(/[^A-Z0-9]/g, "");

const getDemandActionErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.message ||
    fallback;

const getDemandCommitment = (demand = {}) =>
    String(
        demand.demandCommitment ||
        demand.commitment ||
        demand.demand_commitment ||
        ""
    ).toUpperCase();

const isSoftDemand = (demand) => getDemandCommitment(demand) === "SOFT";


const ProjectDemandManagement = ({ projectId, projectName }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const demandId = searchParams.get('demandId');

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCollapsed, setFilterCollapsed] = useState(true);
    const filterButtonRef = useRef(null);
    const [dropdownPos, setDropdownPos] = useState(null);

    const [filters, setFilters] = useState({
        client: [],
        priority: [],
        status: [],
        demandName: [],
        demandType: [],
        deliveryModel: []
    });
    const [activeTab, setActiveTab] = useState('all');
    const [draftFilters, setDraftFilters] = useState(filters);

    useEffect(() => {
        setDraftFilters(filters);
    }, [filters]);

    // Project & Modal states
    const [project, setProject] = useState(null);
    const [loadingProject, setLoadingProject] = useState(true);
    const [allDemands, setAllDemands] = useState([]);
    const [kpiData, setKpiData] = useState(null);
    const [loadingDemand, setLoadingDemand] = useState(false);
    const [demandResponse, setDemandResponse] = useState(null);
    const [demandModalOpen, setDemandModalOpen] = useState(false);
    const [deliverableModalOpen, setDeliverableModalOpen] = useState(false);

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingDemand, setEditingDemand] = useState(null);
    const [deletingDemand, setDeletingDemand] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const effectiveRole = useMemo(() => {
        const roles = user?.roles || user?.role || [];
        const roleList = Array.isArray(roles) ? roles : String(roles).split(",");
        const matchedRole = roleList.find((role) =>
            ["PROJECTMANAGER", "MANAGER", "DELIVERYMANAGER", "RESOURCEMANAGER"].includes(normalizeRole(role))
        );

        return matchedRole || "";
    }, [user]);

    const handleEdit = (demand) => {
        if (["PROJECTMANAGER", "MANAGER"].includes(normalizeRole(effectiveRole)) && !canProjectManagerEditDemand(demand)) {
            showStatusToast(PM_EDITABLE_DEMAND_MESSAGE, "error");
            return;
        }
        setEditingDemand(demand);
        setEditModalOpen(true);
    };

    const applyDemandUpdate = useCallback((updatedDemand) => {
        if (!updatedDemand) return;

        const updatedId = updatedDemand.demandId || updatedDemand.id;
        if (!updatedId) return;

        setAllDemands((prev) => prev.map((demand) => {
            const demandId = demand.demandId || demand.id;
            if (String(demandId) !== String(updatedId)) return demand;

            return {
                ...demand,
                ...updatedDemand,
                id: updatedId,
                demandId: updatedId,
                demandName: updatedDemand.demandName || demand.demandName,
                demandPriority: updatedDemand.demandPriority || updatedDemand.priority || demand.demandPriority,
                priority: updatedDemand.priority || updatedDemand.demandPriority || demand.priority,
                demandCommitment: updatedDemand.demandCommitment || updatedDemand.commitment || demand.demandCommitment,
                demandStatus: updatedDemand.demandStatus || updatedDemand.lifecycleState || demand.demandStatus,
                lifecycleState: updatedDemand.lifecycleState || updatedDemand.demandStatus || demand.lifecycleState,
                demandType: updatedDemand.demandType || updatedDemand.type || updatedDemand.demand_type || updatedDemand.type_of_demand || demand.demandType,
                type: updatedDemand.type || updatedDemand.demandType || demand.type,
                demand_type: updatedDemand.demand_type || updatedDemand.demandType || demand.demand_type,
                type_of_demand: updatedDemand.type_of_demand || updatedDemand.demandType || demand.type_of_demand,
                deliveryModel: updatedDemand.deliveryModel || demand.deliveryModel,
                deliveryRoleId: updatedDemand.deliveryRoleId || updatedDemand.deliveryRole || demand.deliveryRoleId,
                deliveryRole: updatedDemand.deliveryRoleId || demand.deliveryRole,
                deliveryRoleName: updatedDemand.deliveryRoleName || demand.deliveryRoleName,
                allocationPercentage: updatedDemand.allocationPercentage ?? demand.allocationPercentage,
                resourcesRequired: updatedDemand.resourcesRequired ?? updatedDemand.resourceRequired ?? demand.resourcesRequired,
                resourceRequired: updatedDemand.resourceRequired ?? updatedDemand.resourcesRequired ?? demand.resourceRequired,
                minExp: updatedDemand.minExp ?? updatedDemand.experience ?? demand.minExp,
                experience: updatedDemand.experience ?? updatedDemand.minExp ?? demand.experience,
                demandJustification: updatedDemand.demandJustification || updatedDemand.justification || demand.demandJustification,
                justification: updatedDemand.justification || updatedDemand.demandJustification || demand.justification,
            };
        }));
    }, []);

    const handleDelete = (demand) => {
        if (["PROJECTMANAGER", "MANAGER"].includes(normalizeRole(effectiveRole)) && !canProjectManagerMutateDemand(demand)) {
            showStatusToast(PM_REQUESTED_DEMAND_ONLY_MESSAGE, "error");
            return;
        }
        setDeletingDemand(demand);
    };

    const handleDeleteRequestedDemand = async () => {
        const id = deletingDemand?.demandId || deletingDemand?.id;
        if (!id) return;

        if (!canProjectManagerMutateDemand(deletingDemand)) {
            showStatusToast(PM_REQUESTED_DEMAND_ONLY_MESSAGE, "error");
            return;
        }

        setDeleteLoading(true);
        try {
            const response = await demandService.deleteDemandByPM(id, deletingDemand);
            showStatusToast(response?.message || "Demand deleted successfully", "success");
            setDeletingDemand(null);
            await fetchContext();
        } catch (error) {
            showStatusToast(getDemandActionErrorMessage(error, "Failed to delete demand"), "error");
        } finally {
            setDeleteLoading(false);
        }
    };

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(8);

    // Deliverable Role Data
    const [categories, setCategories] = useState([]);
    const [proficiencyLevels, setProficiencyLevels] = useState([]);

    // Fetch Project and Demand Check
    const fetchContext = useCallback(async () => {
        if (!projectId) return;
        try {
            setLoadingProject(true);
            const [projRes, demandRes, projectDemandsData, kpis] = await Promise.all([
                getProjectById(projectId),
                checkDemandCreation(projectId),
                demandService.getProjectDemands(projectId),
                demandService.getProjectKPIs(projectId)
            ]);
            setProject(projRes.data);
            setDemandResponse(demandRes.data);
            setAllDemands(projectDemandsData || []);
            setKpiData(kpis);
        } catch (err) {
            console.error("Failed to fetch project context", err);
            showStatusToast("Failed to load project details for demand creation", "error");
        } finally {
            setLoadingProject(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchContext();
    }, [fetchContext]);

    // Load Deliverable Role master data
    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [catRes, profRes] = await Promise.all([
                    getSkillCategoriesTree(),
                    getProficiencyLevels()
                ]);
                setCategories(catRes.data || []);
                setProficiencyLevels(profRes.data?.data || []);
            } catch (err) {
                console.error("Failed to load master data", err);
            }
        };
        loadMasterData();
    }, []);


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

                // Priority 1: Vertical positioning (Below is preferred)
                let align = 'down';
                if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
                    align = 'up';
                }

                // Priority 2: Horizontal positioning
                let horizontalPos = { right: viewportWidth - rect.right };
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

    // Keyboard and click outside handling
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setFilterCollapsed(true);
        };

        const handleClickOutside = (event) => {
            if (filterButtonRef.current && !filterButtonRef.current.contains(event.target)) {
                const portal = document.getElementById('filter-portal-root');
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

    const handleViewDetail = (demand) => {
        const id = demand.id || demand.demandId;
        searchParams.set('demandId', id);
        setSearchParams(searchParams, {
            state: {
                clientName: demand.clientName || demand.client,
                demand,
            }
        });
    };

    const handleBackToList = () => {
        searchParams.delete('demandId');
        setSearchParams(searchParams);
    };



    // Map fields from project-specific demands
    const projectDemands = useMemo(() => {
        if (!allDemands) return [];
        return allDemands.map(d => ({
            ...d,
            id: d.demandId || d.id,
            client: d.clientName || d.client,
            role: d.deliveryRoleName || d.role,
            demandName: d.demandName,
            priority: d.demandPriority || d.priority,
            demandCommitment: d.demandCommitment || d.commitment || d.demand_commitment,
            demandType: d.demandType || d.type || d.demand_type || d.type_of_demand,
            type: d.type || d.demandType || d.demand_type || d.type_of_demand,
            deliveryRole: d.deliveryRoleId,
            deliveryRoleId: d.deliveryRoleId,
            deliveryRoleName: d.deliveryRoleName,
            resourcesRequired: d.resourcesRequired || d.resourceRequired || d.resource_required,
            resourceRequired: d.resourceRequired || d.resourcesRequired || d.resource_required,
            slaDueAt: d.slaDueAt, // New field from response
            slaDays: d.remainingDays !== undefined ? d.remainingDays : d.slaDays,
            lifecycleState: d.demandStatus || d.lifecycleState,
            priorityScore: d.priorityScore || d.score
        }));
    }, [allDemands]);

    // Calculate dynamic KPIs for this project using API data
    const projectKPIs = useMemo(() => {
        if (!kpiData) return [];

        const total = kpiData.total || projectDemands.length;
        const active = kpiData.active || projectDemands.filter(d => ['REQUESTED', 'APPROVED'].includes(d.lifecycleState?.toUpperCase())).length;
        const fulfilled = kpiData.fulfilled || projectDemands.filter(d => d.lifecycleState?.toUpperCase() === 'FULFILLED').length;
        const soft = projectDemands.filter(isSoftDemand).length;
        const pending = kpiData.pending || projectDemands.filter(d => ['DRAFT', 'REQUESTED'].includes(d.lifecycleState?.toUpperCase())).length;

        if (total === 0 && kpiData) {
            return [
                { label: "Total", count: kpiData.total || 0, color: "bg-slate-50 text-slate-600" },
                { label: "Active", count: (kpiData.active || 0) + (kpiData.approved || 0), color: "bg-indigo-50 text-indigo-600" },
                { label: "Fulfilled", count: kpiData.fulfilled || 0, color: "bg-emerald-50 text-emerald-600" },
                { label: "Soft", count: soft, color: "bg-amber-50 text-amber-600" },
                { label: "Pending", count: kpiData.pending || 0, color: "bg-blue-50 text-blue-600" }
            ];
        }

        return [
            { label: "Total", count: total, color: "bg-slate-50 text-slate-600" },
            { label: "Active", count: active, color: "bg-indigo-50 text-indigo-600" },
            { label: "Fulfilled", count: fulfilled, color: "bg-emerald-50 text-emerald-600" },
            { label: "Soft", count: soft, color: "bg-amber-50 text-amber-600" },
            { label: "Pending", count: pending, color: "bg-blue-50 text-blue-600" }
        ];
    }, [projectDemands, kpiData]);

    const availableClients = useMemo(() => {
        return Array.from(new Set(projectDemands.map(d => d.client).filter(Boolean))).sort();
    }, [projectDemands]);

    const availableStatuses = useMemo(() => [
        "DRAFT", "REQUESTED", "APPROVED", "REJECTED", "CANCELLED", "FULFILLED"
    ], []);

    const availableDemandNames = useMemo(() => {
        return Array.from(new Set(projectDemands.map(d => d.role).filter(Boolean))).sort();
    }, [projectDemands]);

    const availableDemandTypes = useMemo(() => [
        "NET_NEW", "REPLACEMENT", "BACKFILL", "EMERGENCY"
    ], []);

    const availableDeliveryModels = useMemo(() => [
        "ONSITE", "OFFSHORE", "HYBRID"
    ], []);

    const availablePriorities = useMemo(() => ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], []);
    const filteredDemands = useMemo(() => {
        let list = [...projectDemands];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter(d =>
                (d.projectName && d.projectName.toLowerCase().includes(query)) ||
                (d.role && d.role.toLowerCase().includes(query))
            );
        }

        list = list.filter(d => !['CANCELLED', 'REJECTED'].includes(d.lifecycleState?.toUpperCase()));

        if (activeTab === 'fulfilled') {
            list = list.filter(d => d.lifecycleState?.toUpperCase() === 'FULFILLED');
        } else if (activeTab === 'active') {
            list = list.filter(d => ['REQUESTED', 'APPROVED'].includes(d.lifecycleState?.toUpperCase()));
        } else if (activeTab === 'soft') {
            list = list.filter(isSoftDemand);
        }

        if (filters.client?.length > 0) {
            list = list.filter(d => filters.client.includes(d.client));
        }
        if (filters.priority?.length > 0) {
            const upperPriorities = filters.priority.map(p => p.toUpperCase());
            list = list.filter(d => upperPriorities.includes(d.priority?.toUpperCase()));
        }
        if (filters.status?.length > 0) {
            const upperStatuses = filters.status.map(s => s.toUpperCase());
            list = list.filter(d => upperStatuses.includes(d.lifecycleState?.toUpperCase()));
        }
        if (filters.demandName?.length > 0) {
            list = list.filter(d => filters.demandName.includes(d.role));
        }
        if (filters.demandType?.length > 0) {
            list = list.filter(d => filters.demandType.includes(d.demandType));
        }
        if (filters.deliveryModel?.length > 0) {
            list = list.filter(d => filters.deliveryModel.includes(d.deliveryModel));
        }

        return list;
    }, [projectDemands, searchQuery, filters, activeTab]);


    const totalElements = filteredDemands.length;
    const totalPages = Math.ceil(totalElements / pageSize);

    const paginatedDemands = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredDemands.slice(start, start + pageSize);
    }, [filteredDemands, page, pageSize]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, filters, activeTab]);

    const activeFilterCount = [
        filters.client?.length > 0,
        filters.priority?.length > 0,
        filters.status?.length > 0,
        filters.demandName?.length > 0,
        filters.demandType?.length > 0,
        filters.deliveryModel?.length > 0
    ].filter(Boolean).length;

    const resetFilters = () => {
        setSearchQuery('');
        setFilters({
            client: [],
            priority: [],
            status: [],
            demandName: [],
            demandType: [],
            deliveryModel: []
        });
    };

    const selectedDemand = demandId
        ? projectDemands.find((demand) => String(demand.id || demand.demandId) === String(demandId))
        : null;

    if (demandId) {
        return (
            <DemandDetailPage
                demandId={demandId}
                onBack={handleBackToList}
                initialDemand={selectedDemand}
            />
        );
    }

    return (
        <div className="bg-white min-h-[600px] border rounded-lg shadow-sm">
            <div className="p-4 border-b">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xl font-bold text-slate-800">Demand Management</h2>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span className="font-medium text-slate-600 truncate max-w-[200px]">{projectName}</span>
                                {project?.startDate && project?.endDate && (
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-[1px] bg-slate-300 mx-1" />
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                                                {new Date(project.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                <span className="mx-1 text-slate-300">—</span>
                                                {new Date(project.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setDeliverableModalOpen(true)}
                                className="flex items-center gap-2 bg-white border border-indigo-600 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all active:scale-[0.98] shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Deliverable Role
                            </button>

                            <button
                                disabled={!demandResponse?.create || loadingDemand}
                                onClick={() => setDemandModalOpen(true)}
                                title={!demandResponse?.create ? demandResponse?.reason : ""}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98] shadow-sm",
                                    demandResponse?.create
                                        ? "bg-indigo-600 hover:bg-indigo-700"
                                        : "bg-slate-300 cursor-not-allowed opacity-70"
                                )}
                            >
                                <FilePlus className="w-3.5 h-3.5" />
                                Create Demand
                            </button>
                        </div>
                    </div>

                    <DemandKPIStrip data={projectKPIs} />

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-slate-900">
                                Project Demand Pipeline
                            </h3>
                            <span className="text-[11px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                {totalElements} records
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search project demands..."
                                    className="w-72 pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm transition-all placeholder:text-slate-400"
                                />
                            </div>

                            <button
                                ref={filterButtonRef}
                                onClick={() => setFilterCollapsed(!filterCollapsed)}
                                className={cn(
                                    "relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-[0.98] shadow-sm",
                                    !filterCollapsed
                                        ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-500/20"
                                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                )}
                            >
                                <Filter className={cn("h-3.5 w-3.5", !filterCollapsed ? "text-white" : "text-slate-500")} />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className={cn(
                                        "absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold shadow-sm ring-2 ring-white animate-in zoom-in duration-200",
                                        !filterCollapsed ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
                                    )}>
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-start gap-1 border-b -mx-4 px-4 pt-2">
                        {[
                            { id: 'all', label: 'All Demands' },
                            { id: 'active', label: 'Active & Approved' },
                            { id: 'fulfilled', label: 'Fulfilled' },
                            { id: 'soft', label: 'Soft Demands' }
                        ].map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "px-6 py-3 text-xs font-bold transition-all border-b-2 relative -mb-px flex-shrink-0",
                                        isActive
                                            ? "text-indigo-600 border-indigo-600 bg-indigo-50/30"
                                            : "text-slate-400 border-transparent hover:text-slate-700 hover:bg-slate-50/50"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* List Content Area */}
            <div className="p-0 relative">
                <div className="grid grid-cols-12 items-center gap-4 px-5 py-3 bg-slate-50 border-b">
                    <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Demand Specifications & Context</div>
                    <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left pl-2">Score</div>
                    <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Priority</div>
                    <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">SLA Compliance</div>
                    <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</div>
                    <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Actions</div>
                </div>

                <div className="flex flex-col">
                    {paginatedDemands.length > 0 ? (
                        <div className="flex flex-col">
                            <DemandList
                                demands={paginatedDemands}
                                onViewDetail={handleViewDetail}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                activeTab={activeTab}
                                viewerRole={effectiveRole}
                            />
                            {totalPages > 1 && (
                                <div className="py-6 border-t border-slate-100">
                                    <Pagination
                                        currentPage={page}
                                        totalPages={totalPages}
                                        onPrevious={() => setPage(p => Math.max(1, p - 1))}
                                        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-24 text-center">
                            <p className="text-sm font-medium text-slate-400">No demands found for this project matching criteria.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Overlay Filter Panel */}
            {!filterCollapsed && dropdownPos && createPortal(
                <div
                    id="filter-portal-root"
                    className={cn(
                        "fixed bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] z-[100] w-[340px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                        dropdownPos.align === 'up' ? "origin-bottom-right" : "origin-top-right"
                    )}
                    style={{
                        top: dropdownPos.top === 'auto' ? 'auto' : `${dropdownPos.top}px`,
                        bottom: dropdownPos.bottom === 'auto' ? 'auto' : `${dropdownPos.bottom}px`,
                        right: dropdownPos.right !== undefined ? `${dropdownPos.right}px` : 'auto',
                        left: dropdownPos.left !== undefined ? `${dropdownPos.left}px` : 'auto',
                        maxHeight: `${dropdownPos.maxHeight}px`
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

            {/* Modals */}
            {demandModalOpen && (
                <DemandModal
                    open={demandModalOpen}
                    onClose={() => setDemandModalOpen(false)}
                    projectDetails={project}
                    userRole={effectiveRole}
                    onSuccess={async () => {
                        setDemandModalOpen(false);
                        await fetchContext(); // Reload data after creation
                    }}
                />
            )}

            {editModalOpen && (
                <DemandModal
                    open={editModalOpen}
                    onClose={() => {
                        setEditModalOpen(false);
                        setEditingDemand(null);
                    }}
                    initialData={editingDemand}
                    mode="edit"
                    userRole={effectiveRole}
                    onSuccess={async (response, submittedDemand) => {
                        const responseData = response?.data;
                        const responseDemand = (responseData?.demandId || responseData?.id)
                            ? responseData
                            : response?.demand || response?.payload;
                        setEditModalOpen(false);
                        setEditingDemand(null);
                        await fetchContext(); // Reload data after update
                        applyDemandUpdate(responseDemand || submittedDemand);
                    }}
                />
            )}

            <AddDeliverableRoleModal
                open={deliverableModalOpen}
                onClose={() => setDeliverableModalOpen(false)}
                categories={categories}
                proficiencyLevels={proficiencyLevels}
            />

            <DeleteDemandModal
                open={!!deletingDemand}
                demand={deletingDemand}
                loading={deleteLoading}
                onClose={() => {
                    if (!deleteLoading) setDeletingDemand(null);
                }}
                onSubmit={handleDeleteRequestedDemand}
            />
        </div>
    );
};

export default ProjectDemandManagement;
