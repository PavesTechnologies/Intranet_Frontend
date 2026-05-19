import { useState, useMemo, useCallback, useEffect } from "react";
import demandService from "../services/demandService";
import { useAuth } from "../../../../contexts/AuthContext";
import { notify } from "../../utils/notify";


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
    "Delivery_Manager",
    "Resource_Manager",
    "Project_Manager",
    "MANAGER",
    "Admin",
    "Super_Admin",
    "SUPER-ADMIN",
    "GENERAL"
];

const DEMAND_ROLE_LABELS = {
    "Resource_Manager": "Resource Manager",
    "Delivery_Manager": "Delivery Manager",
    "Project_Manager": "Project Manager"
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
    return role
        .replace(/^ROLE[-_\s]/i, "") // Strip ROLE-, ROLE_ or ROLE prefix
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
};

const ROLE_CANONICAL_BY_KEY = ROLE_PRIORITY.reduce((acc, role) => {
    acc[normalizeRoleKey(role)] = role;
    return acc;
}, {});

const toCanonicalDemandRole = (role = "") => ROLE_CANONICAL_BY_KEY[normalizeRoleKey(role)] || role;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value) => typeof value === "string" && UUID_REGEX.test(value.trim());

const getRoleObjectId = (role = {}) =>
    role.deliveryRoleId ||
    role.roleId ||
    role.role_id ||
    role.dev_role_id ||
    role.id ||
    "";

const getRoleObjectName = (role = {}) =>
    role.deliveryRoleName ||
    role.roleName ||
    role.role ||
    role.name ||
    "";

const getDemandDeliveryRoleId = (demand = {}) => {
    const roleObjectId = typeof demand.deliveryRole === "object"
        ? getRoleObjectId(demand.deliveryRole)
        : "";

    const candidates = [
        demand.deliveryRoleId,
        demand.roleId,
        demand.delivery_role_id,
        demand.delivery_role_uuid,
        demand.dev_role_id,
        roleObjectId,
        demand.deliveryRole,
    ];

    return candidates.find(isUuid) || "";
};

const getDemandDeliveryRoleName = (demand = {}) => {
    if (demand.deliveryRoleName) return demand.deliveryRoleName;
    if (typeof demand.deliveryRole === "object") return getRoleObjectName(demand.deliveryRole);
    return isUuid(demand.deliveryRole) ? "" : demand.deliveryRole;
};

const getDemandCommitment = (demand = {}) =>
    String(
        demand.demandCommitment ||
        demand.commitment ||
        demand.demand_commitment ||
        ""
    ).toUpperCase();

const isSoftDemand = (demand) => getDemandCommitment(demand) === "SOFT";

const getDemandStatus = (demand = {}) =>
    String(demand.demandStatus || demand.lifecycleState || "").toUpperCase();

const isFulfilledDemand = (demand = {}) => getDemandStatus(demand) === "FULFILLED";

const isCancelledOrClosedDemand = (demand = {}) =>
    ["CANCELLED", "CLOSED"].includes(getDemandStatus(demand));

const isRejectedDemand = (demand = {}) => getDemandStatus(demand) === "REJECTED";

const isBreachedDemand = (demand = {}) => demand.slaBreached === true;

const isAtRiskDemand = (demand = {}) =>
    !isBreachedDemand(demand) &&
    !isFulfilledDemand(demand) &&
    demand.remainingDays !== undefined &&
    demand.warningThresholdDays !== undefined &&
    Number(demand.remainingDays) < Number(demand.warningThresholdDays);

const getDemandRoleOptions = (roles = []) => {
    if (!Array.isArray(roles) || roles.length === 0) return [];
    const normalized = roles.map(normalizeRoleKey);
    const options = ROLE_PRIORITY.filter((role) => normalized.includes(normalizeRoleKey(role)))
        .filter((role) => DEMAND_ROLE_LABELS[role])
        .map((role) => ({ value: role, label: DEMAND_ROLE_LABELS[role] }));
    return options;
};

const pickPrimaryDemandRole = (roles = []) => {
    if (!Array.isArray(roles) || roles.length === 0) return null;
    const normalized = roles.map(normalizeRoleKey);
    const matchedRole = ROLE_PRIORITY.find((role) => normalized.includes(normalizeRoleKey(role)));
    return matchedRole || toCanonicalDemandRole(roles[0]);
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

        return {
            demandsData: demandsData || [],
            kpis: kpis || null,
        };
    }, [effectiveRole, projectId]);

    useEffect(() => {
        let isActive = true;

        const loadData = async () => {
            setIsLoading(true);
            try {
                const { demandsData, kpis } = await fetchData();
                if (!isActive) return;
                setDemands(demandsData);
                setKpiData(kpis);
            } catch (error) {
                if (!isActive) return;
                console.error("Demand Hook Fetch Error:", error);
                notify.error(error, "Failed to load demand data");
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isActive = false;
        };
    }, [fetchData]);

    const filteredDemands = useMemo(() => {
        const currentUserIdentifier = user?.email || user?.sub || user?.name || user?.fullName;
        const isPM = effectiveRole === "Project_Manager";
        const isRM = effectiveRole === "Resource_Manager";
        const isDM = effectiveRole === "Delivery_Manager";

        // 1. Apply Draft Visibility Rule (Strict)
        let list = demands.filter(d => {
            const status = getDemandStatus(d);
            if (status !== 'DRAFT') return true;
            if (isRM || isDM) return false;
            if (isPM) return d.createdBy === currentUserIdentifier || d.createdByUserId === user?.id;
            return false;
        });

        // Tab Filtering (Segmented Logic)
        if (activeTab === 'breached') {
            list = list.filter(isBreachedDemand);
        } else if (activeTab === 'at_risk') {
            list = list.filter(isAtRiskDemand);
        } else if (activeTab === 'active') {
            list = list.filter(d => getDemandStatus(d) === 'APPROVED');
        } else if (activeTab === 'requested') {
            list = list.filter(d => getDemandStatus(d) === 'REQUESTED');
        } else if (activeTab === 'soft') {
            list = list.filter(isSoftDemand);
        } else if (activeTab === 'rejected') {
            list = list.filter(isRejectedDemand);
        } else if (activeTab === 'fulfilled') {
            list = list.filter(isFulfilledDemand);
        }
        // 'all' fallthrough shows everything minus cancelled/closed if we want to be strict, 
        // but usually 'all' means all relevant demands.

        // Standard Filter: Remove Cancelled/Closed unless explicitly requested
        if (activeTab !== 'all' && activeTab !== 'rejected') {
            list = list.filter(d => !isCancelledOrClosedDemand(d) && !isRejectedDemand(d));
        } else if (activeTab !== 'all') {
            list = list.filter(d => !isCancelledOrClosedDemand(d));
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
            list = list.filter(d => us.includes(getDemandStatus(d)));
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
            demandCommitment: d.demandCommitment || d.commitment || d.demand_commitment,
            demandType: d.demandType || d.type || d.demand_type || d.type_of_demand,
            type: d.type || d.demandType || d.demand_type || d.type_of_demand,
            deliveryRole: getDemandDeliveryRoleId(d),
            deliveryRoleId: getDemandDeliveryRoleId(d),
            deliveryRoleName: getDemandDeliveryRoleName(d),
            resourcesRequired: d.resourcesRequired || d.resourceRequired || d.resource_required,
            resourceRequired: d.resourceRequired || d.resourcesRequired || d.resource_required,
            slaDueAt: d.slaDueAt,
            slaDays: d.remainingDays !== undefined ? d.remainingDays : d.slaDays,
            demandSlaId: d.demandSlaId || d.slaId,
            lifecycleState: d.demandStatus || d.lifecycleState,
            priorityScore: d.priorityScore || d.score || 85
        }));
    }, [demands, activeTab, filters, effectiveRole, user]);

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
        // Recalculate KPIs from the visibility-filtered list to ensure DRAFT rules are respected
        const currentUserIdentifier = user?.email || user?.sub || user?.name || user?.fullName;
        const isPM = effectiveRole === "Project_Manager";
        const isRM = effectiveRole === "Resource_Manager";
        const isDM = effectiveRole === "Delivery_Manager";

        const baseList = demands.filter(d => {
            const status = getDemandStatus(d);
            if (status !== 'DRAFT') return true;
            if (isRM || isDM) return false;
            if (isPM) return d.createdBy === currentUserIdentifier || d.createdByUserId === user?.id;
            return false;
        });

        const counts = {
            active: 0,
            approved: 0,
            pending: 0,
            soft: 0,
            atRisk: 0,
            breached: 0
        };

        baseList.forEach(d => {
            const status = getDemandStatus(d);
            const commitment = getDemandCommitment(d);
            const isActiveSLA = ['REQUESTED', 'PENDING', 'DRAFT'].includes(status);

            if (['APPROVED', 'OPEN', 'ACTIVE'].includes(status)) counts.approved++;
            if (['REQUESTED', 'PENDING', 'DRAFT'].includes(status)) counts.pending++;
            if (['APPROVED', 'OPEN', 'ACTIVE', 'REQUESTED', 'PENDING', 'DRAFT', 'IN_PROGRESS', 'IN PROGRESS'].includes(status)) counts.active++;

            if (commitment === 'SOFT' || status === 'SOFT') counts.soft++;

            if (isBreachedDemand(d)) {
                counts.breached++;
            } else if (isAtRiskDemand(d)) {
                counts.atRisk++;
            }
        });

        return [
            { label: "Active", count: counts.active },
            { label: "Approved", count: counts.approved },
            { label: "Pending", count: counts.pending },
            { label: "Soft", count: counts.soft },
            { label: "SLA At Risk", count: counts.atRisk },
            { label: "SLA Breached", count: counts.breached }
        ];
    }, [demands, effectiveRole, user]);

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
