import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Filter,
  Search,
  Users,
  UserRoundMinus,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import KPISection from "./KPISection";
import RoleOffTable from "./RoleOffTable";
import BulkActionBar from "./BulkActionBar";
import RoleOffFilterPanel from "./RoleOffFilterPanel";
import RoleOffSidePanel from "./RoleOffSidePanel";
import RoleOffSummaryCard from "./RoleOffSummaryCard";
import CancelRoleOffModal from "./CancelRoleOffModal";
import {
  bulkDlFulfill,
  bulkDlReject,
  bulkPlannedRoleOff,
  bulkRmApprove,
  bulkRmReject,
  createRoleOff,
  dlFulfill,
  dlReject,
  getPendingRoleOffs,
  getPendingRoleOffsForDM,
  getResources,
  getRoleOffProjectKPI,
  pmCancelRoleOff,
  rmApprove,
  rmReject,
}
  from "../services/roleOffService";

const mapStatus = (item) => {
  const rawRoleOffStatus = item?.roleOffStatus;
  const normalizedRoleOffStatus = String(rawRoleOffStatus ?? "").trim().toUpperCase();

  if (normalizedRoleOffStatus === "PENDING") return "Pending Approval";
  if (normalizedRoleOffStatus === "APPROVED") return "Approved";
  if (normalizedRoleOffStatus === "REJECTED") return "Rejected";
  if (normalizedRoleOffStatus === "FULFILLED") return "Fulfilled";
  if (!normalizedRoleOffStatus || normalizedRoleOffStatus === "NULL" || normalizedRoleOffStatus === "NOT_REQUESTED") {
    return "Not Requested";
  }
  return normalizeStatus(item.status);
};

const TODAY = new Date().toISOString().slice(0, 10);

const deriveImpact = (allocation) => {
  if (
    allocation.businessCritical ||
    allocation.keyPosition ||
    allocation.allocationPercent >= 90 ||
    !allocation.backupReady ||
    allocation.backfillWindowDays <= 7
  ) {
    return "High";
  }

  if (allocation.allocationPercent >= 70 || allocation.backfillWindowDays <= 21) {
    return "Medium";
  }

  return "Low";
};

const formatDisplayDate = (dateIso) => {
  if (!dateIso) return "-";

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const normalizeStatus = (status) => {
  if (!status) return "Active";

  const upperStatus = String(status).toUpperCase();
  if (upperStatus === "ACTIVE") return "Active";
  if (upperStatus === "PENDING_APPROVAL") return "Pending Approval";
  if (upperStatus === "APPROVED") return "Approved";
  if (upperStatus === "REJECTED") return "Rejected";
  if (upperStatus === "CANCELLED") return "Cancelled";

  return status;
};

const normalizeImpact = (impact) => {
  if (!impact) return "Low";

  const upperImpact = String(impact).toUpperCase();
  if (upperImpact === "LOW") return "Low";
  if (upperImpact === "MEDIUM") return "Medium";
  if (upperImpact === "HIGH") return "High";

  return impact;
};

const getRoleOffSources = (item) => ([
  item,
  item?.roleOff,
  item?.roleOffRequest,
  item?.currentRoleOff,
  item?.latestRoleOff,
  item?.activeRoleOff,
  item?.request,
]).filter(Boolean);

const getFirstDefinedValue = (sources, keys, fallback = undefined) => {
  for (const source of sources) {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }

  return fallback;
};

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1", "y"].includes(normalized)) return true;
    if (["false", "no", "0", "n", ""].includes(normalized)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return Boolean(value);
};

const isBulkCreatedRoleOff = (item) => {
  if (!item || typeof item !== "object") return false;

  const explicitBulkFlag = Boolean(
    item.isBulk
    || item.bulk
    || item.bulkRoleOff
    || item.bulkCreated
    || item.createdInBulk
    || item.bulkPlanned
    || item.bulkRequestId
    || item.groupRequestId
    || item.batchId
    || item.bulkRoleOffRequestId
    || item.bulkRoleOffId
    || item.bulkRequest
    || item.bulkRoleOffRequest
    || item.parentBulkId
    || item.bulkActionId,
  );

  if (explicitBulkFlag) return true;

  return Object.keys(item).some((key) => {
    const normalizedKey = String(key || "").toLowerCase();
    if (!normalizedKey.includes("bulk")) return false;
    return Boolean(item[key]);
  });
};

const mapResourceToAllocation = (item, index) => {
  const roleOffSources = getRoleOffSources(item);
  const backendRoleOffId = getFirstDefinedValue(roleOffSources, ["roleOffId"], null);
  const backendRoleOffStatus = getFirstDefinedValue(roleOffSources, ["roleOffStatus"], item.roleOffStatus);
  const cachedRoleOffDetails = getCachedRoleOffDetails(item);
  if (cachedRoleOffDetails) {
    roleOffSources.unshift(cachedRoleOffDetails);
  }
  const roleOffId = backendRoleOffId;
  const roleOffStatus = backendRoleOffStatus;
  const effectiveDateIso = getFirstDefinedValue(
    roleOffSources,
    ["effectiveDate", "effectiveRoleOffDate", "roleOffEffectiveDate"],
    "",
  );
  const roleOffType = getFirstDefinedValue(roleOffSources, ["roleOffType", "type"], "Planned");
  const roleOffReason = getFirstDefinedValue(
    roleOffSources,
    ["roleOffReason", "reason", "reasonCode", "roleOffReasonCode", "reasonLabel", "reasonName"],
    "",
  );
  const skipReason = getFirstDefinedValue(
    roleOffSources,
    ["skipReason", "skipReplacementReason", "replacementSkipReason", "noReplacementReason"],
    "",
  );
  const replacementRequired = getFirstDefinedValue(
    roleOffSources,
    ["autoReplacementRequired", "replacementRequired", "requestedReplacement", "replacementNeeded"],
    false,
  );
  const impactSummary = getFirstDefinedValue(roleOffSources, ["impactSummary"], "");
  const rejectionReason = getFirstDefinedValue(roleOffSources, ["rejectionReason", "rejectReason"], "");
  const rejectedBy = getFirstDefinedValue(roleOffSources, ["rejectedBy"], "");

  const allocation = {
    // 🔥 CRITICAL FIXES
    id: item.id || item.allocationId,          // ✅ UUID (MANDATORY)
    allocationId: item.id || item.allocationId, // ✅ backup
    projectId: item.projectId,                // ✅ REQUIRED
    resourceId: item.resourceId,              // ✅ REQUIRED
    deliveryRoleId: item.deliveryRoleId,      // ✅ REQUIRED FOR DEMAND

    // ✅ UI FIELDS (keep flexible)
    resource:
      item.name ||
      item.resourceName ||
      item.resource?.name ||
      "-",

    project:
      item.projectName ||
      item.project?.name ||
      "-",

    client:
      item.clientName ||
      item.project?.client?.name ||
      "-",

    department: item.department || "-",

    role:
      item.demandName ||
      item.roleName ||
      item.role?.name ||
      "-",

    skill:
      [...(item.skills || []), ...(item.subSkills || [])]
        .filter(Boolean)
        .join(", ") || "-",

    allocationPercent: Number(item.allocationPercentage || 0),

    endDate: formatDisplayDate(item.endDate),
    endDateIso: item.endDate || "",

    status: normalizeStatus(item.status),
    roleOffId,
    roleOffStatus: mapStatus({ ...item, roleOffStatus }),
    effectiveDate: formatDisplayDate(effectiveDateIso),
    effectiveDateIso,
    type: roleOffType,
    reason: roleOffReason,
    impactSummary,
    skipReason,
    replacementRequired: toBoolean(replacementRequired),
    rejectionReason,
    rejectedBy,
    isBulkCreated: isBulkCreatedRoleOff(item),

    businessCritical: Number(item.allocationPercentage || 0) >= 90,
    keyPosition: false,
    backupReady: Number(item.allocationPercentage || 0) < 70,
    backfillWindowDays: 30,
  };

  return {
    ...allocation,
    impact: item.impact ? normalizeImpact(item.impact) : deriveImpact(allocation),
  };
};

const mapPendingRoleOffToRequest = (item) => {
  const fallbackId = item.roleOffId || item.id || item.allocationId || `${item.resourceId}-${item.projectName}-${item.endDate}`;

  return {
    id: fallbackId,
    roleOffId: item.roleOffId || null,
    allocationId: item.allocationId || fallbackId,
    resourceId: item.resourceId,
    deliveryRoleId: item.deliveryRoleId || null,
    // deliveryRoleId: item.deliveryRoleId,
    resource:
      item.name ||
      item.resourceName ||
      item.resource?.name ||
      "-",
    project:
      item.projectName ||
      item.project?.name ||
      "-",
    client:
      item.clientName ||
      item.project?.client?.name ||
      "-",
    department: item.department || "-",
    role:
      item.demandName ||
      item.roleName ||
      item.role?.name ||
      "-",
    skill:
      [...(item.skills || []), ...(item.subSkills || [])]
        .filter(Boolean)
        .join(", ") || "-",
    impact: normalizeImpact(item.impact),
    impactSummary: `Allocation on ${item.projectName || "the current project"} is at ${Number(item.allocationPercentage || 0)}% with ${normalizeImpact(item.impact).toLowerCase()} impact.`,
    status: mapStatus(item),
    allocationPercent: Number(item.allocationPercentage || 0),
    effectiveDate: formatDisplayDate(item.effectiveDate || item.endDate),
    effectiveDateIso: item.effectiveDate || item.endDate || "",
    endDate: formatDisplayDate(item.endDate),
    endDateIso: item.endDate || "",
    replacementRequired: Boolean(item.demandName),
    reason: item.roleOffReason || item.demandName || "",
  };
};

const titleMap = {
  pm: {
    title: "Role-Off Management",
    subtitle: "Project Manager workspace for initiating and tracking role-off requests on active allocations.",
  },
  rm: {
    title: "Role-Off Operations",
    subtitle: "Resource Manager view across all role-off requests, replacement planning, and cancellation controls.",
  },
  dm: {
    title: "Role-Off Approvals",
    subtitle: "Delivery Manager approval queue for pending role-off decisions and high impact review handling.",
  },
};

const buildKpis = (mode, allocations, roleOffRequests, selectedRows) => {
  const activeAllocations = allocations.filter((item) => item.status === "Active");
  const pendingRequests = roleOffRequests.filter((item) => item.status === "Pending Approval");
  const highImpactPending = pendingRequests.filter((item) => item.impact === "High");

  if (mode === "pm") {
    return [
      {
        label: "Active Allocations",
        value: activeAllocations.length,
        icon: <Users className="h-5 w-5" />,
        iconWrapperClassName: "border-blue-100 bg-blue-50 text-blue-700",
      },
      {
        label: "Pending Role-Offs",
        value: pendingRequests.length,
        icon: <UserRoundMinus className="h-5 w-5" />,
        iconWrapperClassName: "border-amber-100 bg-amber-50 text-amber-700",
      },
      {
        label: "At Risk",
        value: activeAllocations.filter((item) => item.impact === "High").length,
        icon: <AlertTriangle className="h-5 w-5" />,
        iconWrapperClassName: "border-rose-100 bg-rose-50 text-rose-700",
      },
      {
        label: "Selected Count",
        value: selectedRows.length,
        icon: <Check className="h-5 w-5" />,
        iconWrapperClassName: "border-slate-100 bg-slate-100 text-slate-700",
      },
    ];
  }

  if (mode === "rm") {
    return [
      {
        label: "Active Allocations",
        value: activeAllocations.length,
        icon: <Users className="h-5 w-5" />,
        iconWrapperClassName: "border-blue-100 bg-blue-50 text-blue-700",
      },
      {
        label: "Pending Requests",
        value: pendingRequests.length,
        icon: <ClipboardCheck className="h-5 w-5" />,
        iconWrapperClassName: "border-amber-100 bg-amber-50 text-amber-700",
      },
      {
        label: "At Risk",
        value: highImpactPending.length,
        icon: <AlertTriangle className="h-5 w-5" />,
        iconWrapperClassName: "border-rose-100 bg-rose-50 text-rose-700",
      },
      {
        label: "Replacement Created",
        value: roleOffRequests.filter((item) => item.replacementRequired).length,
        icon: <Check className="h-5 w-5" />,
        iconWrapperClassName: "border-emerald-100 bg-emerald-50 text-emerald-700",
      },
    ];
  }

  return [
    {
      label: "Pending Approvals",
      value: pendingRequests.length,
      icon: <ClipboardCheck className="h-5 w-5" />,
      iconWrapperClassName: "border-amber-100 bg-amber-50 text-amber-700",
    },
    {
      label: "High Impact Requests",
      value: highImpactPending.length,
      icon: <AlertTriangle className="h-5 w-5" />,
      iconWrapperClassName: "border-rose-100 bg-rose-50 text-rose-700",
    },
    {
      label: "Approved Today",
      value: roleOffRequests.filter((item) => item.approvedDateIso === TODAY).length,
      icon: <Check className="h-5 w-5" />,
      iconWrapperClassName: "border-emerald-100 bg-emerald-50 text-emerald-700",
    },
  ];
};

const buildPmDemandStyleKpis = (allocations, roleOffRequests, selectedRows) => {
  const activeAllocations = allocations.filter((item) => item.status === "Active");
  const pendingRequests = allocations.filter((item) => item.roleOffStatus === "Pending Approval");
  const totalRoleOffs = allocations.filter((item) => item.roleOffStatus && item.roleOffStatus !== "Not Requested");

  return [
    { label: "Active Allocations", count: activeAllocations.length },
    { label: "Pending Role-Offs", count: pendingRequests.length },
    { label: "High Impact Allocations", count: activeAllocations.filter((item) => item.impact === "High").length },
    { label: "Total RoleOff", count: totalRoleOffs.length },
  ];
};

const normalizePmKpis = (kpiPayload, fallbackMetrics = []) => {
  const source = extractObjectPayload(kpiPayload);
  if (!source) return fallbackMetrics;

  return [
    {
      label: "Active Allocations",
      count: getNumericMetricValue(
        source,
        ["activeAllocations", "totalActiveAllocations", "activeAllocationCount", "activeCount", "active", "totalAllocations"],
        fallbackMetrics[0]?.count ?? 0,
      ),
    },
    {
      label: "Pending Role-Offs",
      count: getNumericMetricValue(
        source,
        ["pendingRoleOffs", "pendingRoleOffCount", "pendingRequests", "pendingRequestCount", "pending", "pendingCount"],
        fallbackMetrics[1]?.count ?? 0,
      ),
    },
    {
      label: "High Impact Allocations",
      count: getNumericMetricValue(
        source,
        ["highImpactAllocations", "highImpactAllocationCount", "highImpact", "atRisk", "atRiskAllocations", "highRiskCount"],
        fallbackMetrics[2]?.count ?? 0,
      ),
    },
    {
      label: "Total RoleOff",
      count: getNumericMetricValue(
        source,
        ["totalRoleOff", "totalRoleOffs", "roleOffCount", "totalRoleOffCount", "totalRequests", "totalCount"],
        fallbackMetrics[3]?.count ?? 0,
      ),
    },
  ];
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const getApiMessage = (payload, fallback) => {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (typeof payload?.message === "string" && payload.message.trim()) return payload.message;
  if (typeof payload?.data?.message === "string" && payload.data.message.trim()) return payload.data.message;
  return fallback;
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const ROLE_OFF_FORM_CACHE_KEY = "roleoff-form-cache";

const readRoleOffFormCache = () => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(ROLE_OFF_FORM_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Failed to read role-off form cache", error);
    return {};
  }
};

const writeRoleOffFormCache = (cache) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(ROLE_OFF_FORM_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to write role-off form cache", error);
  }
};

const getCachedRoleOffDetails = (item) => {
  const cache = readRoleOffFormCache();
  return cache[item?.roleOffId] || cache[item?.allocationId] || cache[item?.id] || null;
};

const cacheRoleOffDetails = (keys = [], details = {}) => {
  const validKeys = keys.filter(Boolean);
  if (validKeys.length === 0) return;

  const cache = readRoleOffFormCache();
  validKeys.forEach((key) => {
    cache[key] = {
      ...cache[key],
      ...details,
    };
  });
  writeRoleOffFormCache(cache);
};

const removeCachedRoleOffDetails = (keys = []) => {
  const validKeys = keys.filter(Boolean);
  if (validKeys.length === 0) return;

  const cache = readRoleOffFormCache();
  validKeys.forEach((key) => {
    delete cache[key];
  });
  writeRoleOffFormCache(cache);
};

const PM_QUEUE_TABS = [
  { id: "active", label: "Active" },
  { id: "process", label: "Roleoff Process" },
  { id: "fulfilled", label: "Fulfilled Roleoff" },
];

const extractArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const extractObjectPayload = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    if (payload.data.data && typeof payload.data.data === "object" && !Array.isArray(payload.data.data)) {
      return payload.data.data;
    }

    return payload.data;
  }

  return payload;
};

const getNumericMetricValue = (source, keys, fallback = 0) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return fallback;
};

const createBulkPanelRecord = (records = []) => {
  const validRecords = Array.isArray(records) ? records : [];
  const count = validRecords.length;
  const highImpactCount = validRecords.filter((item) => item.impact === "High").length;
  const allocationTotal = validRecords.reduce(
    (sum, item) => sum + Number(item.allocationPercent || 0),
    0,
  );
  const averageAllocation = count ? Math.round(allocationTotal / count) : 0;
  const projectNames = [...new Set(validRecords.map((item) => item.project).filter(Boolean))];
  const resourceNames = validRecords.map((item) => item.resource).filter(Boolean);

  return {
    id: `bulk-${validRecords.map((item) => item.id).join("-")}`,
    isBulk: true,
    records: validRecords,
    resource: `${count} Selected Resources`,
    project: projectNames.length === 1 ? projectNames[0] : `${projectNames.length} Projects`,
    client: "-",
    role: "Planned Role-Off",
    department: "-",
    skill: "-",
    impact: highImpactCount > 0 ? "High" : "Medium",
    impactSummary: `${count} allocations will be submitted in bulk. ${highImpactCount} high-impact allocation(s) are included.`,
    allocationPercent: averageAllocation,
    roleOffStatus: "Not Requested",
    effectiveDateIso: "",
    reason: "",
    replacementRequired: false,
    skipReason: "",
    selectedCount: count,
    highImpactCount,
    resourceNames,
  };
};

const createBulkRequestRecord = (records = [], actionLabel = "Selected Requests") => {
  const validRecords = Array.isArray(records) ? records : [];
  const count = validRecords.length;
  const projectNames = [...new Set(validRecords.map((item) => item.project).filter(Boolean))];
  const resourceNames = validRecords.map((item) => item.resource).filter(Boolean);
  const highImpactCount = validRecords.filter((item) => item.impact === "High").length;

  return {
    id: `bulk-${validRecords.map((item) => item.id).join("-")}`,
    isBulk: true,
    records: validRecords,
    resource: `${count} ${actionLabel}`,
    project: projectNames.length === 1 ? projectNames[0] : `${projectNames.length} Projects`,
    client: "-",
    role: "Bulk Action",
    department: "-",
    skill: "-",
    impact: highImpactCount > 0 ? "High" : "Medium",
    impactSummary: `${count} request(s) selected for bulk processing.`,
    allocationPercent: 0,
    status: "Pending Approval",
    roleOffStatus: "Pending Approval",
    selectedCount: count,
    resourceNames,
    rejectionReason: "",
  };
};

const RoleOffWorkspace = ({ mode, embedded = false, projectId: projectIdProp, projectName = "" }) => {
  const params = useParams();
  const navigate = useNavigate();
  const projectId = projectIdProp || params.projectId;
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [roleOffRequests, setRoleOffRequests] = useState([]);
  const [projectKpiData, setProjectKpiData] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterPanelCollapsed, setFilterPanelCollapsed] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    impact: "",
    reason: "",
  });
  const [pmActiveTab, setPmActiveTab] = useState("active");
  const [panelState, setPanelState] = useState({
    open: false,
    actionType: "create",
    record: null,
  });
  const [cancelModalState, setCancelModalState] = useState({
    open: false,
    record: null,
    isSubmitting: false,
  });
  const [bulkActionState, setBulkActionState] = useState({
    key: null,
    loading: false,
  });

  const loadPmResources = useCallback(async (isActiveRef = () => true) => {
    if (mode !== "pm") {
      setAllocations([]);
      setProjectKpiData(null);
      return;
    }

    if (!projectId) {
      setAllocations([]);
      setProjectKpiData(null);
      return;
    }

    setLoading(true);
    try {
      const [resourcesResult, kpiResult] = await Promise.allSettled([
        getResources(projectId),
        getRoleOffProjectKPI(projectId),
      ]);
      if (!isActiveRef()) return;

      if (resourcesResult.status === "fulfilled") {
        const nextAllocations = Array.isArray(resourcesResult.value?.data)
          ? resourcesResult.value.data.map(mapResourceToAllocation)
          : [];
        setAllocations(nextAllocations);
      } else {
        setAllocations([]);
        toast.error("Failed to load role-off resources");
      }

      if (kpiResult.status === "fulfilled") {
        setProjectKpiData(kpiResult.value);
      } else {
        setProjectKpiData(null);
        console.error("Failed to load role-off project KPI", kpiResult.reason);
      }
    } catch (error) {
      if (!isActiveRef()) return;

      setAllocations([]);
      setProjectKpiData(null);
      toast.error("Failed to load role-off resources");
    } finally {
      if (isActiveRef()) setLoading(false);
    }
  }, [mode, projectId]);

  useEffect(() => {
    let active = true;
    loadPmResources(() => active);

    return () => {
      active = false;
    };
  }, [loadPmResources]);

  const loadPendingRoleOffRequests = useCallback(async (isActiveRef = () => true) => {
    if (mode !== "rm" && mode !== "dm") {
      setRoleOffRequests([]);
      return;
    }
    setLoading(true);
    try {
      const response = mode === "dm"
        ? await getPendingRoleOffsForDM()
        : await getPendingRoleOffs();
      if (!isActiveRef()) return;

      const data = extractArrayPayload(response);
      const mappedRequests = data.map(mapPendingRoleOffToRequest);
      setRoleOffRequests(mappedRequests);
    } catch (error) {
      if (!isActiveRef()) return;

      setRoleOffRequests([]);
      toast.error(
        mode === "dm"
          ? "Failed to load DM role-off requests"
          : "Failed to load pending role-off requests",
      );
    } finally {
      if (isActiveRef()) setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    let active = true;
    loadPendingRoleOffRequests(() => active);

    return () => {
      active = false;
    };
  }, [loadPendingRoleOffRequests]);

  const refreshPendingQueue = useCallback(async () => {
    await loadPendingRoleOffRequests();
  }, [loadPendingRoleOffRequests]);

  const pageCopy = titleMap[mode];
  const scopedAllocations = useMemo(() => {
    if (!projectName) return allocations;

    const normalizedProjectName = normalizeText(projectName);
    const matches = allocations.filter(
      (item) => normalizeText(item.project) === normalizedProjectName,
    );

    return matches.length > 0 ? matches : allocations;
  }, [allocations, projectName]);

  const scopedRoleOffRequests = useMemo(() => {
    if (!projectName) return roleOffRequests;

    const normalizedProjectName = normalizeText(projectName);
    const matches = roleOffRequests.filter(
      (item) => normalizeText(item.project) === normalizedProjectName,
    );

    return matches.length > 0 ? matches : roleOffRequests;
  }, [roleOffRequests, projectName]);

  const kpis = useMemo(
    () => buildKpis(mode, scopedAllocations, scopedRoleOffRequests, selectedRows),
    [mode, scopedAllocations, scopedRoleOffRequests, selectedRows],
  );
  const pmKpiFallback = useMemo(
    () => buildPmDemandStyleKpis(scopedAllocations, scopedRoleOffRequests, selectedRows),
    [scopedAllocations, scopedRoleOffRequests, selectedRows],
  );
  const pmKpis = useMemo(
    () => normalizePmKpis(projectKpiData, pmKpiFallback),
    [projectKpiData, pmKpiFallback],
  );

  const pmTabCounts = useMemo(() => ({
    active: scopedAllocations.filter(
      (item) =>
        item.status === "Active" &&
        (item.roleOffStatus === "Not Requested" || item.roleOffStatus === "Rejected"),
    ).length,
    process: scopedAllocations.filter(
      (item) =>
        item.status === "Active" &&
        item.roleOffStatus !== "Not Requested" &&
        item.roleOffStatus !== "Fulfilled",
    ).length,
    fulfilled: scopedAllocations.filter(
      (item) => item.status === "Active" && item.roleOffStatus === "Fulfilled",
    ).length,
  }), [scopedAllocations]);

  const visibleRows = useMemo(() => {
    const baseRows =
      mode === "pm"
        ? scopedAllocations.filter((item) => {
          if (item.status !== "Active") return false;

          if (pmActiveTab === "fulfilled") {
            return item.roleOffStatus === "Fulfilled";
          }

          if (pmActiveTab === "process") {
            return item.roleOffStatus !== "Not Requested" && item.roleOffStatus !== "Fulfilled";
          }

          return item.roleOffStatus === "Not Requested" || item.roleOffStatus === "Rejected";
        })
        : mode === "rm"
          ? scopedRoleOffRequests
          : scopedRoleOffRequests;

    return baseRows.filter((row) => {
      const searchTarget = [row.resource, row.project, row.role, row.client].join(" ").toLowerCase();
      const matchesSearch = filters.search ? searchTarget.includes(filters.search.toLowerCase()) : true;
      const matchesStatus = filters.status ? row.status === filters.status : true;
      const matchesImpact = filters.impact ? row.impact === filters.impact : true;
      const matchesReason = filters.reason ? row.reason === filters.reason : true;
      return matchesSearch && matchesStatus && matchesImpact && matchesReason;
    });
  }, [scopedAllocations, scopedRoleOffRequests, mode, filters, pmActiveTab]);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => String(value || "").trim() !== ""),
    [filters],
  );

  useEffect(() => {
    const visibleIds = new Set(visibleRows.map((item) => item.id));
    setSelectedRows((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [visibleRows]);


  const handleToggleRow = (id, checked) => {
    setSelectedRows((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  };

  const handleToggleAll = (checked) => {
    setSelectedRows(checked ? visibleRows.map((item) => item.id) : []);
  };

  const openSidePanel = (record, actionType = "view") => {
    setPanelState({
      open: true,
      actionType,
      record,
    });
  };

  const handleOpenBulkRoleOff = () => {
    const selectedAllocations = visibleRows.filter((item) => selectedRows.includes(item.id));
    if (selectedAllocations.length === 0) return;
    setBulkActionState({ key: "pm-create", loading: true });
    try {
      openSidePanel(createBulkPanelRecord(selectedAllocations), "bulk-create");
    } finally {
      setBulkActionState({ key: null, loading: false });
    }
  };

  const handleOpenBulkRmPanel = () => {
    const selectedRequests = visibleRows.filter((item) => selectedRows.includes(item.id));
    if (selectedRequests.length < 2) return;

    openSidePanel(createBulkRequestRecord(selectedRequests, "Selected Requests"), "bulk-rm");
  };

  const handleOpenBulkDmPanel = () => {
    const selectedRequests = visibleRows.filter((item) => selectedRows.includes(item.id));
    if (selectedRequests.length < 2) return;

    openSidePanel(createBulkRequestRecord(selectedRequests, "Selected Requests"), "bulk-dm");
  };

  const getPmActionType = (row, currentTab = pmActiveTab) => {
    const roleOffStatus = String(row.roleOffStatus || "").trim();

    if (currentTab === "active") {
      return "create";
    }

    if (
      roleOffStatus === "Approved" ||
      roleOffStatus === "Fulfilled" ||
      roleOffStatus === "Rejected"
    ) {
      return "view";
    }

    if (roleOffStatus !== "Not Requested") {
      return "update";
    }

    return "create";
  };

  const handleRmApprove = async (request) => {
    try {
      let response;
      if (request?.isBulk) {
        setBulkActionState({ key: "rm-approve", loading: true });
        response = await bulkRmApprove(request.records.map((item) => item.id));
      } else {
        response = await rmApprove(request.id);
      }
      await refreshPendingQueue();
      setSelectedRows([]);
      setPanelState({ open: false, actionType: "view", record: null });
      toast.success(
        getApiMessage(
          response,
          request?.isBulk
            ? `${request.records.length} role-off request(s) approved by RM`
            : "Role-off request approved by RM",
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "RM approval failed"));
    } finally {
      setBulkActionState({ key: null, loading: false });
    }
  };

  const handleRmReject = async (request, rejectionReason) => {
    try {
      let response;
      if (request?.isBulk) {
        setBulkActionState({ key: "rm-reject", loading: true });
        response = await bulkRmReject(
          request.records.map((item) => item.id),
          rejectionReason,
        );
      } else {
        response = await rmReject(request.id, rejectionReason);
      }
      await refreshPendingQueue();
      setSelectedRows([]);
      setPanelState({ open: false, actionType: "view", record: null });
      toast.success(
        getApiMessage(
          response,
          request?.isBulk
            ? `${request.records.length} role-off request(s) rejected by RM`
            : "Role-off request rejected by RM",
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Request rejection failed"));
    } finally {
      setBulkActionState({ key: null, loading: false });
    }
  };

  const handleTableAction = async (action, row) => {

    if (mode === "pm" && action === "cancel") {
      setCancelModalState({
        open: true,
        record: row,
        isSubmitting: false,
      });
      return;
    }

    if (mode === "pm" && (action === "roleoff" || action === "edit" || action === "view")) {
      openSidePanel(row, getPmActionType(row, pmActiveTab));
      return;
    }

    // RM VIEW
    if (mode === "rm" && action === "view") {
      openSidePanel(row, "view");
      return;
    }

    if (mode === "dm" && action === "view") {
      openSidePanel(row, "view");
      return;
    }

    // 🔥 RM APPROVE
    if (mode === "rm" && action === "approve") {
      try {
        const response = await rmApprove(row.id);
        await refreshPendingQueue();
        toast.success(getApiMessage(response, "Role-off request approved by RM"));
      } catch (err) {
        console.error(err);
        toast.error(getErrorMessage(err, "RM approval failed"));
      }
      return;
    }

    // 🔥 RM REJECT
    if (mode === "rm" && action === "reject") {
      try {
        const response = await rmReject(row.id, "Rejected by RM");
        await refreshPendingQueue();
        toast.success(getApiMessage(response, "Role-off request rejected by RM"));
      } catch (err) {
        console.error(err);
        toast.error(getErrorMessage(err, "RM rejection failed"));
      }
      return;
    }

    // 🔥 DM APPROVE (FULFILL)
    if (mode === "dm" && action === "approve") {
      try {
        await dlFulfill(row.id);
        await refreshPendingQueue();
        toast.success("Role-off request fulfilled by DM");
      } catch (err) {
        console.error(err);
        toast.error(getErrorMessage(err, "DM fulfillment failed"));
      }
      return;
    }

    // 🔥 DM REJECT
    if (mode === "dm" && action === "reject") {
      try {
        const response = await dlReject(row.id, "Rejected by DL");
        await refreshPendingQueue();
        toast.success(getApiMessage(response, "Role-off request rejected by DM"));
      } catch (err) {
        console.error(err);
        toast.error(getErrorMessage(err, "DM rejection failed"));
      }
      return;
    }
  };


  const handleRowClick = (row) => {
    if (mode === "pm") {
      openSidePanel(row, getPmActionType(row, pmActiveTab));
      return;
    }

    openSidePanel(row, "view");
  };

  const handlePanelSubmit = async (formState) => {
    try {
      const allocation = panelState.record;
      const records = allocation?.isBulk ? allocation.records || [] : [allocation];

      if (records.length === 0) {
        throw new Error("No allocations selected for role-off");
      }

      let confirmationResponse = null;
      const isBulkCreate = panelState.actionType === "bulk-create";

      if (isBulkCreate) {
        const bulkPayload = {
          projectId,
          allocationIds: records.map((item) => item.id),
          resourceIds: records.map((item) => item.resourceId),
          effectiveRoleOffDate: formState.effectiveDate,
          roleOffReason: formState.reason,
          roleOffType: "PLANNED",
          confirmed: Boolean(formState.reviewConfirmed),
        };

        const response = await bulkPlannedRoleOff(bulkPayload);
        if (response?.requiresConfirmation && !formState.reviewConfirmed) {
          return response;
        }

        records.forEach((record) => {
          cacheRoleOffDetails(
            [record?.roleOffId, record?.allocationId, record?.id],
            {
              type: "Planned",
              roleOffType: "Planned",
              reason: formState.reason,
              roleOffReason: formState.reason,
              effectiveDate: formState.effectiveDate,
              effectiveRoleOffDate: formState.effectiveDate,
              replacementRequired: formState.replacementRequired,
              autoReplacementRequired: formState.replacementRequired,
              skipReason: formState.skipReason,
            },
          );
        });

        await loadPmResources();
        setSelectedRows([]);
        setPanelState({ open: false, actionType: "create", record: null });
        toast.success(
          getApiMessage(response, `${records.length} planned role-off request(s) created`),
        );
        return { success: true };
      }

      let lastResponse = null;
      for (const currentAllocation of records) {
        const isBulkStyleUpdate =
          panelState.actionType === "update" && Boolean(currentAllocation?.isBulkCreated);
        const payload = {
          projectId,
          resourceId: currentAllocation.resourceId,
          allocationId: currentAllocation.id,
          roleOffId:
            panelState.actionType === "update" ? currentAllocation.roleOffId : undefined,
          roleOffType: isBulkStyleUpdate ? "PLANNED" : formState.type.toUpperCase(),
          effectiveRoleOffDate: formState.effectiveDate,
          roleOffReason: formState.reason,
          autoReplacementRequired: isBulkStyleUpdate ? false : formState.replacementRequired,
          skipReason: isBulkStyleUpdate
            ? null
            : formState.replacementRequired
              ? null
              : formState.skipReason,
          confirmed: Boolean(formState.reviewConfirmed),
          deliveryRoleId: !isBulkStyleUpdate && formState.replacementRequired
            ? currentAllocation.deliveryRoleId
            : null,
        };

        const response = await createRoleOff(payload);
        lastResponse = response;
        if (response?.requiresConfirmation && !formState.reviewConfirmed) {
          confirmationResponse = response;
          break;
        }

        cacheRoleOffDetails(
          [
            response?.roleOffId,
            response?.data?.roleOffId,
            currentAllocation?.roleOffId,
            currentAllocation?.allocationId,
            currentAllocation?.id,
          ],
          {
            type: formState.type,
            roleOffType: formState.type,
            reason: formState.reason,
            roleOffReason: formState.reason,
            effectiveDate: formState.effectiveDate,
            effectiveRoleOffDate: formState.effectiveDate,
            replacementRequired: formState.replacementRequired,
            autoReplacementRequired: formState.replacementRequired,
            skipReason: formState.skipReason,
          },
        );
      }

      if (confirmationResponse) {
        return confirmationResponse;
      }

      toast.success(
        getApiMessage(
          lastResponse,
          panelState.actionType === "bulk-create"
            ? `${records.length} planned role-off request(s) created`
            : panelState.actionType === "update"
              ? "Role-off request updated"
              : "Role-off request created",
        ),
      );

      setSelectedRows([]);
      setPanelState({ open: false, actionType: "create", record: null });
      loadPmResources();
      return { success: true };
    } catch (err) {
      console.error(err);
      const fallbackMessage = panelState.actionType === "bulk-create"
          ? "Failed to create bulk role-off"
          : panelState.actionType === "update"
            ? "Failed to update role-off"
            : "Failed to create role-off";
      toast.error(getErrorMessage(err, fallbackMessage));
      throw err;
    }
  };

  const handlePmCancelRoleOff = async () => {
    const record = cancelModalState.record;
    if (!record?.roleOffId) {
      toast.error("Role-off ID is missing");
      return;
    }

    setCancelModalState((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const response = await pmCancelRoleOff(record.roleOffId);
      removeCachedRoleOffDetails([record?.roleOffId, record?.allocationId, record?.id]);
      await loadPmResources();
      setCancelModalState({ open: false, record: null, isSubmitting: false });
      toast.success(getApiMessage(response, "Role-off request cancelled"));
    } catch (err) {
      console.error(err);
      setCancelModalState((prev) => ({ ...prev, isSubmitting: false }));
      toast.error(getErrorMessage(err, "Failed to cancel role-off"));
    }
  };

  // const fetchRoleOffs = async () => {
  //   try {
  //     const response = await getAllRoleOffs();
  //     const data = extractArrayPayload(response);

  //     const mapped = data.map((item) => ({
  //       id: item.id,
  //       allocationId: item.allocation?.id,
  //       resource: item.resource?.name,
  //       project: item.project?.name,
  //       role: item.role?.name || "N/A",
  //       impact: "Medium",
  //       status: mapStatus(item),
  //       effectiveDate: item.effectiveRoleOffDate,
  //       effectiveDateIso: item.effectiveRoleOffDate,
  //       reason: item.roleOffReason,
  //     }));

  //     setRoleOffRequests(mapped);

  //   } catch (err) {
  //     setRoleOffRequests([]);
  //     if (err.response?.status === 403) {
  //       toast.error("You do not have access to view role-off requests");
  //     } else {
  //       toast.error("Failed to load role-off requests");
  //     }
  //     console.error(err);
  //   }
  // };


  // const handleBulkCreate = () => {
  //   if (selectedRows.length === 0) return;

  //   const requests = scopedAllocations
  //     .filter((item) => selectedRows.includes(item.id))
  //     .map((allocation) =>
  //       createRoleOffRequest(allocation, {
  //         type: allocation.impact === "High" ? "Emergency" : "Planned",
  //         reason: allocation.impact === "High" ? "Critical Dependency" : "Project Completion",
  //         replacementRequired: allocation.impact !== "Low",
  //         effectiveDate: TODAY,
  //       }),
  //     );

  //   setRoleOffRequests((prev) => [...requests, ...prev]);
  //   setSelectedRows([]);
  //   toast.success(`${requests.length} role-off requests created`);
  // };

  const handleApproveRequest = async (request) => {
    try {
      if (request?.isBulk) {
        setBulkActionState({ key: "dm-fulfill", loading: true });
        await bulkDlFulfill(request.records.map((item) => item.id));
      } else {
        await dlFulfill(request.id);
      }
      await refreshPendingQueue();
      setSelectedRows([]);
      setPanelState({ open: false, actionType: "view", record: null });
      toast.success(
        request?.isBulk
          ? `${request.records.length} role-off request(s) fulfilled by DM`
          : `${request.resource} role-off fulfilled by DM`,
      );
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "DM fulfillment failed"));
    } finally {
      setBulkActionState({ key: null, loading: false });
    }
  };

  const handleRejectRequest = async (request, reason) => {
    try {
      let response;
      if (request?.isBulk) {
        setBulkActionState({ key: "dm-reject", loading: true });
        response = await bulkDlReject(
          request.records.map((item) => item.id),
          reason,
        );
      } else {
        response = await dlReject(request.id, reason);
      }
      await refreshPendingQueue();
      setSelectedRows([]);
      setPanelState({ open: false, actionType: "view", record: null });
      toast.success(
        getApiMessage(
          response,
          request?.isBulk
            ? `${request.records.length} role-off request(s) rejected`
            : `${request.resource} role-off rejected`,
        ),
      );
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "DM rejection failed"));
    } finally {
      setBulkActionState({ key: null, loading: false });
    }
  };

  const bulkBarConfig = useMemo(() => {
    if (mode === "pm" && pmActiveTab === "active") {
      return {
        title: `${selectedRows.length} role-off request(s) selected`,
        description: "Create planned role-off requests for the selected allocations.",
        actions: [
          {
            label: bulkActionState.loading && bulkActionState.key === "pm-create"
              ? "Opening..."
              : "Create Bulk Role-Off",
            onClick: handleOpenBulkRoleOff,
            loading: bulkActionState.loading && bulkActionState.key === "pm-create",
            disabled: bulkActionState.loading,
          },
        ],
      };
    }

    if (mode === "rm") {
      return {
        title: `${selectedRows.length} request(s) selected`,
        description: "Approve or reject the selected role-off requests in bulk.",
        actions: [
          {
            label: bulkActionState.loading && bulkActionState.key === "rm-approve"
              ? "Approving..."
              : "Bulk Approve",
            onClick: () => handleRmApprove(createBulkRequestRecord(
              visibleRows.filter((item) => selectedRows.includes(item.id)),
            )),
            loading: bulkActionState.loading && bulkActionState.key === "rm-approve",
            disabled: bulkActionState.loading,
          },
          {
            label: bulkActionState.loading && bulkActionState.key === "rm-reject"
              ? "Rejecting..."
              : "Bulk Reject",
            onClick: handleOpenBulkRmPanel,
            variant: "outline",
            className: "h-9 border-rose-300 bg-white text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800",
            disabled: bulkActionState.loading,
          },
        ],
      };
    }

    if (mode === "dm") {
      return {
        title: `${selectedRows.length} request(s) selected`,
        description: "Fulfill or reject the selected role-off requests in bulk.",
        actions: [
          {
            label: bulkActionState.loading && bulkActionState.key === "dm-fulfill"
              ? "Fulfilling..."
              : "Bulk Fulfill",
            onClick: () => handleApproveRequest(createBulkRequestRecord(
              visibleRows.filter((item) => selectedRows.includes(item.id)),
            )),
            loading: bulkActionState.loading && bulkActionState.key === "dm-fulfill",
            disabled: bulkActionState.loading,
          },
          {
            label: bulkActionState.loading && bulkActionState.key === "dm-reject"
              ? "Rejecting..."
              : "Bulk Reject",
            onClick: handleOpenBulkDmPanel,
            variant: "outline",
            className: "h-9 border-rose-300 bg-white text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800",
            disabled: bulkActionState.loading,
          },
        ],
      };
    }

    return null;
  }, [bulkActionState, mode, pmActiveTab, selectedRows, visibleRows]);

  return (
    <div className={embedded ? "bg-gray-50 p-0" : "min-h-screen bg-gray-50 p-6"}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex-1">
          {!embedded ? (
            mode !== "pm" ? (
              <div>
                <h1 className="text-2xl font-bold text-[#081534]">{pageCopy.title}</h1>
                <p className="mt-1 text-sm text-gray-500">{pageCopy.subtitle}</p>
              </div>
            ) : null
          ) : (
            mode !== "pm" ? (
              <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <h2 className="text-xl font-bold text-[#081534]">{pageCopy.title}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {projectName
                    ? `${pageCopy.subtitle} Current project: ${projectName}.`
                    : pageCopy.subtitle}
                </p>
              </div>
            ) : null
          )}
        </div>
        <div className="ml-4 shrink-0">
          <button
            onClick={() => navigate('/resource-management/roleoff/report')}
            className="inline-flex items-center gap-2 rounded-md bg-[#081534] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#10214f]"
          >
            <ClipboardCheck className="h-4 w-4" />
            Roleoff Report
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {mode === "pm" ? (
          <RoleOffSummaryCard
            title="Role-Off Management"
            description={
              projectName
                ? `Project Manager workspace for initiating and tracking role-off requests on active allocations. Current project: ${projectName}.`
                : "Project Manager workspace for initiating and tracking role-off requests on active allocations."
            }
            metrics={pmKpis}
          />
        ) : (
          <KPISection items={kpis} />
        )}

        <div className="flex flex-col gap-4">
          {bulkBarConfig ? (
            <BulkActionBar
              count={selectedRows.length}
              title={bulkBarConfig.title}
              description={bulkBarConfig.description}
              actions={bulkBarConfig.actions}
              onClear={() => setSelectedRows([])}
            />
          ) : null}

          <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-4">
              <div className="flex items-center w-full gap-4">

                {/* LEFT - TITLE */}
                <div className="shrink-0">
                  <h3 className="text-lg font-bold text-[#081534] whitespace-nowrap">
                    Role-Off Queue
                  </h3>
                </div>

                {/* CENTER - SEARCH */}
                <div className="flex flex-1 justify-end">
                  <div className="flex w-full max-w-md items-center gap-1">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(event) =>
                          setFilters((prev) => ({ ...prev, search: event.target.value }))
                        }
                        placeholder={mode === "pm" ? "Search resource, client or demand name" : "Search resource, project, client or demand name"}
                        className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none transition-colors focus:border-blue-500"
                      />
                    </div>
                    {mode !== "pm" ? (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setFilterPanelCollapsed((prev) => !prev)}
                          className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${filterPanelCollapsed
                            ? "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-[#081534]"
                            : "border-[#081534] bg-[#081534] text-white hover:bg-[#10214f]"
                            }`}
                        >
                          <Filter className="h-4 w-4" />
                          Filters
                        </button>

                        {!filterPanelCollapsed ? (
                          <div className="absolute right-0 top-12 z-20">
                            <RoleOffFilterPanel
                              collapsed={filterPanelCollapsed}
                              filters={filters}
                              onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                              onReset={() => setFilters({ search: "", status: "", impact: "", reason: "" })}
                              onApply={() => setFilterPanelCollapsed(true)}
                              onClose={() => setFilterPanelCollapsed(true)}
                              mode={mode}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* RIGHT - FILTERS */}
                {mode === "pm" ? (
                  <div className="flex items-center gap-3 shrink-0">
                    <select
                      value={filters.impact}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, impact: event.target.value }))
                      }
                      className="h-10 min-w-[140px] rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Impact</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>

                    <select
                      value={filters.reason}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, reason: event.target.value }))
                      }
                      className="h-10 min-w-[160px] rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Reason</option>
                      <option value="Project Completion">Project Completion</option>
                      <option value="Client Ramp Down">Client Ramp Down</option>
                      <option value="Performance Issue">Performance Issue</option>
                      <option value="Budget Realignment">Budget Realignment</option>
                      <option value="Critical Dependency">Critical Dependency</option>
                      <option value="Emergency Transition">Emergency Transition</option>
                    </select>
                  </div>
                ) : null}

              </div>

              {mode === "pm" ? (
                <div className="mt-2 pt-1">
                  <div className="flex items-end gap-8 overflow-x-auto px-1">
                    {PM_QUEUE_TABS.map((tab) => {
                      const isActive = pmActiveTab === tab.id;
                      const count = pmTabCounts[tab.id] || 0;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setPmActiveTab(tab.id);
                            setSelectedRows([]);
                          }}
                          className={`group relative inline-flex items-center gap-2 whitespace-nowrap px-1 pb-3 pt-2 text-left transition-colors ${isActive
                            ? "text-[#263383]"
                            : "text-gray-600 hover:text-[#263383]"
                            }`}
                        >
                          <span className={`text-[15px] font-semibold leading-tight ${isActive ? "text-[#263383]" : "text-gray-700"
                            }`}>
                            {tab.label}
                          </span>
                          <span className={`text-xs font-medium ${isActive ? "text-[#263383]" : "text-gray-400 group-hover:text-[#263383]"
                            }`}>
                            {count}
                          </span>
                          <span
                            className={`absolute bottom-0 left-0 h-0.5 rounded-full bg-blue-600 transition-all ${isActive ? "w-full opacity-100" : "w-0 opacity-0"
                              }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4">

              <RoleOffTable
                mode={mode}
                pmTab={pmActiveTab}
                loading={loading}
                rows={visibleRows}
                hasActiveFilters={hasActiveFilters}
                selectedRows={selectedRows}
                activeRowId={panelState.record?.id}
                onToggleRow={handleToggleRow}
                onToggleAll={handleToggleAll}
                onAction={handleTableAction}
                onRowClick={handleRowClick}
              />
            </div>
          </div>
        </div>
      </div>

      <RoleOffSidePanel
        open={panelState.open}
        mode={mode}
        pmTab={pmActiveTab}
        record={panelState.record}
        actionType={panelState.actionType}
        onClose={() => setPanelState({ open: false, actionType: "view", record: null })}
        onSubmit={handlePanelSubmit}
        onRmApprove={handleRmApprove}
        onRmReject={handleRmReject}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
      />

      <CancelRoleOffModal
        open={cancelModalState.open}
        record={cancelModalState.record}
        isSubmitting={cancelModalState.isSubmitting}
        onClose={() => {
          if (cancelModalState.isSubmitting) return;
          setCancelModalState({ open: false, record: null, isSubmitting: false });
        }}
        onSubmit={handlePmCancelRoleOff}
      />
    </div>
  );
};

export default RoleOffWorkspace;
