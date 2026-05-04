import { useState, useMemo, useCallback, useEffect } from "react";
import demandService from "../services/demandService";
import { useAuth } from "../../../../contexts/AuthContext";


export const defaultFilters = {
    search: "",
    client: [],
    priority: [],
    status: [],
    demandName: [],
    demandType: [],
    deliveryModel: [],
};

const ROLE_PRIORITY = [
    "RESOURCE-MANAGER",
    "DELIVERY-MANAGER",
    "PROJECT-MANAGER",
    "MANAGER",
    "ADMIN",
    "SUPER ADMIN",
    "SUPER-ADMIN",
    "GENERAL"
];

const DEMAND_ROLE_LABELS = {
    "RESOURCE-MANAGER": "Resource Manager",
    "DELIVERY-MANAGER": "Delivery Manager"
};

export const DEMAND_STATUSES = [
    "DRAFT",
    "REQUESTED",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
    "FULFILLED"
];

export const DEMAND_TYPES = [
    "NET_NEW",
    "REPLACEMENT",
    "BACKFILL",
    "EMERGENCY"
];

export const DELIVERY_MODELS = [
    "ONSITE",
    "OFFSHORE",
    "HYBRID"
];

const normalizeRoleKey = (role = "") => {
    if (!role) return "";
    return role.toUpperCase()
        .replace(/^ROLE[-_]/, "") // Strip ROLE- or ROLE_ prefix
        .replace(/_/g, "-")       // Standardize underscores to hyphens
        .trim();
};

const getDemandRoleOptions = (roles = []) => {
    if (!Array.isArray(roles) || roles.length === 0) return [];
    const normalized = roles.map(normalizeRoleKey);
    const options = ROLE_PRIORITY.filter((role) => normalized.includes(role))
        .filter((role) => DEMAND_ROLE_LABELS[role])
        .map((role) => ({ value: role, label: DEMAND_ROLE_LABELS[role] }));
    return options;
};

const pickPrimaryDemandRole = (roles = []) => {
    if (!Array.isArray(roles) || roles.length === 0) return null;
    const normalized = roles.map(normalizeRoleKey);
    return ROLE_PRIORITY.find((role) => normalized.includes(role)) || roles[0];
};

export function useDemand(projectId = null) {
    const { user } = useAuth();
    const [filters, setFilters] = useState(defaultFilters);
    const [statusFilter, setStatusFilter] = useState(null);
    const [filterPanelCollapsed, setFilterPanelCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState("active"); // breached, at_risk, active, soft
    const [isLoading, setIsLoading] = useState(true);
    const [demands, setDemands] = useState([]);
    const [kpiData, setKpiData] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const demandRoleOptions = useMemo(() => getDemandRoleOptions(user?.roles), [user?.roles]);
    const effectiveRole = useMemo(
        () => selectedRole || pickPrimaryDemandRole(user?.roles),
        [selectedRole, user?.roles]
    );

    useEffect(() => {
        if (!selectedRole) return;
        const roleExists = demandRoleOptions.some((option) => option.value === selectedRole);
        if (!roleExists) {
            setSelectedRole(null);
        }
    }, [demandRoleOptions, selectedRole]);

    // Fetch master demands and kpis
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            let demandsData, kpis;
            if (projectId) {
                [demandsData, kpis] = await Promise.all([
                    demandService.getProjectDemands(projectId),
                    demandService.getProjectKPIs(projectId)
                ]);
            } else {
                [demandsData, kpis] = await Promise.all([
                    demandService.getRoleScopedDemands(effectiveRole),
                    demandService.getRoleScopedKPISummary(effectiveRole)
                ]);
            }
            setDemands(demandsData || []);
            setKpiData(kpis);
        } catch (error) {
            console.error("Demand Hook Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [effectiveRole, projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredDemands = useMemo(() => {
        let list = [...demands];

        // Tab Filtering (Segmented Logic)
        if (activeTab === 'breached') {
            list = list.filter(d => d.remainingDays < 0);
        } else if (activeTab === 'at_risk') {
            list = list.filter(d => d.remainingDays >= 0 && d.remainingDays <= 5);
        } else if (activeTab === 'active') {
            list = list.filter(d => ['APPROVED', 'OPEN', 'ACTIVE', 'REQUESTED', 'IN_PROGRESS', 'IN PROGRESS'].includes((d.demandStatus || d.lifecycleState)?.toUpperCase()));
        } else if (activeTab === 'soft') {
            list = list.filter(d => ['SOFT', 'REQUESTED', 'DRAFT', 'PROPOSED'].includes((d.demandStatus || d.lifecycleState)?.toUpperCase()));
        } else if (activeTab === 'rejected') {
            list = list.filter(d => (d.demandStatus || d.lifecycleState)?.toUpperCase() === 'REJECTED');
        }
        else if (activeTab === 'fulfilled') {
            list = list.filter(d => d.lifecycleState?.toUpperCase() === 'FULFILLED' || d.demandStatus?.toUpperCase() === 'FULFILLED');
        }
        // 'all' fallthrough shows everything minus cancelled/closed if we want to be strict, 
        // but usually 'all' means all relevant demands.

        // Standard Filter: Remove Cancelled/Closed unless explicitly requested
        if (activeTab !== 'all' && activeTab !== 'rejected') {
            list = list.filter(d => !['CANCELLED', 'CLOSED', 'REJECTED'].includes((d.demandStatus || d.lifecycleState)?.toUpperCase()));
        } else if (activeTab !== 'all') {
            list = list.filter(d => !['CANCELLED', 'CLOSED'].includes((d.demandStatus || d.lifecycleState)?.toUpperCase()));
        }

        // Search
        if (filters.search) {
            const query = filters.search.toLowerCase();
            list = list.filter(d =>
                d.projectName?.toLowerCase().includes(query) ||
                d.role?.toLowerCase()?.includes(query) ||
                d.demandName?.toLowerCase().includes(query) ||
                d.clientName?.toLowerCase().includes(query)
            );
        }

        // Advanced Filters
        if (filters.client?.length > 0) {
            list = list.filter(d => filters.client.includes(d.clientName) || filters.client.includes(d.client));
        }
        if (filters.priority?.length > 0) {
            const up = filters.priority.map(p => p.toUpperCase());
            list = list.filter(d => up.includes((d.demandPriority || d.priority)?.toUpperCase()));
        }
        if (filters.status?.length > 0) {
            const us = filters.status.map(s => s.toUpperCase());
            list = list.filter(d => us.includes((d.demandStatus || d.lifecycleState)?.toUpperCase()));
        }
        if (filters.demandName?.length > 0) {
            list = list.filter(d => filters.demandName.includes(d.demandName) || filters.demandName.includes(d.role));
        }
        if (filters.demandType?.length > 0) {
            list = list.filter(d => filters.demandType.includes(d.demandType));
        }
        if (filters.deliveryModel?.length > 0) {
            list = list.filter(d => filters.deliveryModel.includes(d.deliveryModel));
        }

        return list.map(d => ({
            ...d,
            id: d.demandId || d.id,
            client: d.clientName || d.client,
            role: d.demandName || d.role,
            priority: d.demandPriority || d.priority,
            slaDueAt: d.slaDueAt,
            slaDays: d.remainingDays !== undefined ? d.remainingDays : d.slaDays,
            demandSlaId: d.demandSlaId || d.slaId,
            lifecycleState: d.demandStatus || d.lifecycleState,
            priorityScore: d.priorityScore || d.score || 85
        }));
    }, [demands, activeTab, filters]);

    const totalElements = filteredDemands.length;
    const totalPages = Math.ceil(totalElements / pageSize);

    const paginatedDemands = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredDemands.slice(start, start + pageSize);
    }, [filteredDemands, page, pageSize]);

    useEffect(() => {
        setPage(1);
    }, [activeTab, filters]);

    useEffect(() => {
        if (totalPages > 0 && page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const activeKPIs = useMemo(() => {
        if (!kpiData) return [];

        return [
            { label: "Active", count: kpiData.active || 0 },
            { label: "Approved", count: kpiData.approved || 0 },
            { label: "Pending", count: kpiData.pending || 0 },
            { label: "Soft", count: kpiData.soft || 0 },
            { label: "SLA At Risk", count: kpiData.slaAtRisk || 0 },
            { label: "SLA Breached", count: kpiData.slaBreached || 0 }
        ];
    }, [kpiData]);

    const availableClients = useMemo(() => {
        const clients = new Set(demands.map(d => d.clientName || d.client).filter(Boolean));
        return Array.from(clients).sort();
    }, [demands]);

    const availableStatuses = useMemo(() => DEMAND_STATUSES, []);

    const availableDemandNames = useMemo(() => {
        const names = new Set(demands.map(d => d.demandName || d.role).filter(Boolean));
        return Array.from(names).sort();
    }, [demands]);

    const availableDemandTypes = useMemo(() => DEMAND_TYPES, []);

    const availableDeliveryModels = useMemo(() => DELIVERY_MODELS, []);

    const resetFilters = useCallback(() => {
        setFilters(defaultFilters);
        setActiveTab("active");
    }, []);

    return {
        filters,
        setFilters,
        resetFilters,
        filterPanelCollapsed,
        setFilterPanelCollapsed,
        toggleFilterPanel: () => setFilterPanelCollapsed((prev) => !prev),
        activeTab,
        setActiveTab,
        isLoading,
        demands,
        filteredDemands: paginatedDemands,
        allFilteredDemands: filteredDemands,
        activeKPIs,
        availableClients,
        availableStatuses,
        availableDemandNames,
        availableDemandTypes,
        availableDeliveryModels,
        kpiData,
        demandRoleOptions,
        selectedRole,
        setSelectedRole,
        effectiveRole,
        refreshData: fetchData,
        page,
        setPage,
        pageSize,
        setPageSize,
        totalPages,
        totalElements
    };
}
