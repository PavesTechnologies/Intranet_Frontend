import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatCurrency } from "../services/clientservice";
import { getProjectsByClient } from "../services/clientservice";
import { getProjectSLA } from "../services/clientservice";
import { getProjectCompliance } from "../services/clientservice";
import { getProjectEscalations } from "../services/clientservice";
import Pagination from "../../../components/Pagination/pagination";
import { getAssetsByClient } from "../services/clientservice";
import { getAssetsByProjectId } from "../services/clientservice";
import CompanyEscalationModal from "./client_configuration/CompanyEscalationModal";
import { createCompanyContact } from "../services/clientservice";
import {
  PrevIcon,
  BuildingIcon,
  GlobalIcon,
  DocumentIcon,
  SuccessIcon,
  AuthSuccessIcon,
  TeamIcon,
  BoxIcon,
  MoreHorizontalIcon,
  ProjectsIcon,
  WarningIcon,
  PackageIcon,
  EditIcon,
  DeleteIcon,
} from "@/components/icons";

import { useAuth } from "../../../contexts/AuthContext";
import { KPICard } from "../../../components/kpi/KPI";

import ClientSection from "./ClientSection";
import AddConfigurationModal from "../models/client_configuration/AddConfigurationModal";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/Modal/modal";
import CreateClient from "./CreateClient";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";

import { toast } from "react-toastify";
import {
  getClientById,
  deleteClient,
  getClientPageData,
  createClientSLA,
  createClientCompliance,
  createClientEscalation,
} from "../services/clientservice";
import GenericTable from "../../../components/Table/table";
import StatusBadge from "../../../components/status/statusbadge";

/* ---------------- SUB COMPONENTS ---------------- */

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

const ProjectSLA = ({ data, loading }) => {
  if (loading) {
    return <div className="text-sm text-gray-500">Loading SLA...</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic font-semibold text-center">
        No SLA configuration found for this project.
      </div>
    );
  }

  // ===============================
  // COLOR HELPERS
  // ===============================

  const getSlaTypeColor = (type) => {
    if (type === "NEW_DEMAND") return "bg-blue-100 text-blue-700";

    if (type === "REPLACEMENT") return "bg-purple-100 text-purple-700";

    return "bg-gray-100 text-gray-700";
  };

  const getWarningColor = (days) => {
    if (days <= 2) return "bg-red-100 text-red-700";
    if (days <= 4) return "bg-amber-100 text-amber-700";
    return "bg-green-100 text-green-700";
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Service Level Agreement"
        subtitle="Contractual obligations and metrics."
      />

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <p className="text-sm font-semibold text-gray-700">SLA Definitions</p>
        </div>

        <GenericTable
          headers={["SLA Type", "Duration", "Warning Threshold", "Status"]}
          columns={["slaType_info", "duration_info", "warning_info", "status_info"]}
          rows={data.map((sla) => ({
            ...sla,
            slaType_info: (
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getSlaTypeColor(sla.slaType)}`}>
                {sla.slaType.replaceAll("_", " ")}
              </span>
            ),
            duration_info: (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                {sla.slaDurationDays} days
              </span>
            ),
            warning_info: (
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getWarningColor(sla.warningThresholdDays)}`}>
                {sla.warningThresholdDays} days
              </span>
            ),
            status_info: (
              <StatusBadge label={sla.activeFlag ? "ACTIVE" : "INACTIVE"} size="sm" />
            )
          }))}
        />
      </div>
    </div>
  );
};

const ProjectCompliance = ({ data, loading }) => {
  if (loading) {
    return <div className="text-sm text-gray-500">Loading compliance...</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic font-semibold text-center">
        No compliance requirements configured for this project.
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-4">
      <SectionHeader
        title="Compliance & Security"
        subtitle="Required certifications and audit status."
      />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <GenericTable
          headers={["Requirement", "Type", "Mandatory", "Source", "Status"]}
          columns={["requirementName", "requirementType", "mandatory_info", "source_info", "status_info"]}
          rows={data.map((item) => ({
            ...item,
            mandatory_info: (
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${item.mandatoryFlag ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                {item.mandatoryFlag ? "Mandatory" : "Optional"}
              </span>
            ),
            source_info: (
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${item.isInherited ? "bg-indigo-100 text-indigo-700" : "bg-purple-100 text-purple-700"}`}>
                {item.isInherited ? "Inherited" : "Project"}
              </span>
            ),
            status_info: (
              <StatusBadge label={item.activeFlag ? "ACTIVE" : "INACTIVE"} size="sm" />
            )
          }))}
        />
      </div>
    </div>
  );
};

const ProjectAssets = ({ assets, loading }) => {
  if (loading) {
    return <div className="text-sm text-gray-500">Loading assets...</div>;
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic font-semibold text-center">
        No assets assigned for this project.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Assigned Assets"
        subtitle="Hardware and licenses allocated to this project."
      />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <GenericTable
          headers={["Asset Name", "Serial / ID", "Assigned User", "Status"]}
          columns={["asset_info", "serial_info", "assigned_info", "status_info"]}
          rows={assets.map((asset, index) => ({
            ...asset,
            asset_info: <span>{asset.asset?.assetName || asset.assetName || "—"}</span>,
            serial_info: <span className="font-mono text-gray-600">{asset.serialNumber || asset.serial || "—"}</span>,
            assigned_info: <span>{asset.assignedBy || asset.assignedTo || "—"}</span>,
            status_info: (
              <StatusBadge label={asset.asset?.status || asset.status || "UNKNOWN"} size="sm" />
            )
          }))}
        />
      </div>
    </div>
  );
};

const ProjectEscalation = ({ data, loading }) => {
  console.log("Escalation Data:", data);
  if (loading) {
    return (
      <div className="text-sm text-gray-500">Loading escalation matrix...</div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic font-semibold text-center">
        No escalation contacts configured for this project.
      </div>
    );
  }

  // ===============================
  // ✅ Extract level number safely
  // Handles LEVEL-1, LEVEL_1, Level 1 etc
  // ===============================
  const getLevelNumber = (level) => {
    const match = String(level).match(/\d+/);
    return match ? Number(match[0]) : 1;
  };

  // ===============================
  // ✅ GROUP CONTACTS BY LEVEL
  // ===============================
  const grouped = data.reduce((acc, item) => {
    const level = item.escalationLevel || "LEVEL-1";
    const levelNum = getLevelNumber(level);

    if (!acc[levelNum]) acc[levelNum] = [];
    acc[levelNum].push(item);

    return acc;
  }, {});

  // ===============================
  // ✅ SORT LEVELS ASCENDING
  // ===============================
  const sortedLevels = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Escalation Matrix"
        subtitle="Emergency contacts for critical issues."
      />

      {sortedLevels.map((levelNumber) => (
        <div key={levelNumber} className="space-y-4">
          {/* ===============================
              LEVEL HEADER
          =============================== */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white font-bold shadow-sm">
              {levelNumber}
            </div>

            <h3 className="text-lg font-semibold text-gray-900">
              Escalation Level {levelNumber}
            </h3>
          </div>

          {/* ===============================
              CONTACT CARDS
          =============================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grouped[levelNumber].map((esc) => (
              <div
                key={esc.projectEscalationId || esc.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition duration-200"
              >
                {/* ROLE */}
                <p className="text-xs uppercase text-gray-500 font-semibold tracking-wide">
                  {esc.contactRole?.replaceAll("_", " ") || "Role"}
                </p>

                {/* NAME */}
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {esc.contactName || "Unknown"}
                </p>

                {/* CONTACT DETAILS */}
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  {esc.email && <p>📧 {esc.email}</p>}

                  {esc.phone && <p>📞 {esc.phone}</p>}
                </div>

                {/* TRIGGERS */}
                {esc.triggers?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {esc.triggers.map((trigger, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs rounded-full bg-red-50 text-red-700 font-medium"
                      >
                        {trigger.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------------- MAIN PAGE ---------------- */

const ClientPage = () => {
  const { clientId } = useParams();
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];
  const canConfigAgreements = roles.includes("Admin");  // permissions.includes("ADD_CONFIGURATION");
  const canManageAssets = roles.includes("Resource_Manager"); // permissions.includes("ASSETS_MANAGEMENT");
  const canEditProfile = roles.includes("Admin");  // permissions.includes("EDIT_CLIENT_PROFILE");
  const navigate = useNavigate();

  // State declarations - ALL hooks inside component
  const getProjectId = (project) => project?.projectId || project?.pmsProjectId;
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const [clientDetails, setClientDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slaRefetchKey, setSLARefetchKey] = useState(0);
  const [complianceRefetchKey, setComplianceRefetchKey] = useState(0);
  const [escalationRefetchKey, setEscalationRefetchKey] = useState(0);
  const [openUpdateClient, setOpenUpdateClient] = useState(false);
  const [openDeleteClient, setOpenDeleteClient] = useState(false);
  const [openCompanyEscalation, setOpenCompanyEscalation] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const handleCompanyContactCreate = async (payload) => {
    setLoading(true);
    try {
      const res = await createCompanyContact({
        ...payload,
        clientId, // VERY IMPORTANT
      });
      toast.success(res.message || "Escalation contact created");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create contact");
    } finally {
      setLoading(false);
    }
  };

  // Projects state
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [clientAssets, setClientAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  useEffect(() => {
    const fetchAssetsByProject = async () => {
      const pid = getProjectId(selectedProject);
      if (!pid) return;

      try {
        setLoadingAssets(true);
        const res = await getAssetsByProjectId(pid);
        setClientAssets(res.data || []);
      } catch (err) {
        setClientAssets([]);
      } finally {
        setLoadingAssets(false);
      }
    };

    fetchAssetsByProject();
  }, [getProjectId(selectedProject)]);

  // ✅ ADD HERE — Pagination
  const PROJECTS_PER_PAGE = 3;
  const [currentPage, setCurrentPage] = useState(1);

  // Project SLA state
  const [projectSLA, setProjectSLA] = useState(null);
  const [loadingSLA, setLoadingSLA] = useState(false);

  // Project Compliance state
  const [projectCompliance, setProjectCompliance] = useState([]);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

  // Project Escalations state
  const [projectEscalations, setProjectEscalations] = useState([]);
  const [loadingEscalations, setLoadingEscalations] = useState(false);

  // Client stats state
  const [clientStats, setClientStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalSpend: 0,
    satisfactionScore: 0,
    pendingIssues: 0,
    overallHealth: "UNKNOWN",
  });



  // useEffect(() => {
  //   const pid = getProjectId(selectedProject);
  //   if (pid) fetchProjectSLA(pid);
  // }, [selectedProject]);

  // useEffect(() => {
  //   const pid = getProjectId(selectedProject);
  //   if (pid) fetchProjectCompliance(pid);
  // }, [selectedProject]);

  // useEffect(() => {
  //   const pid = getProjectId(selectedProject);
  //   if (pid) fetchProjectEscalations(pid);
  // }, [selectedProject]);

  // Helper function to normalize project ID
  // const getProjectId = (project) => project?.projectId || project?.id;

  // Fetch functions
  const fetchClientDetails = async () => {
    setLoading(true);
    try {
      const data = await getClientById(clientId);
      setClientDetails(data.data);
    } catch (error) {
      toast.error("Failed to fetch client details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientStats = async () => {
    try {
      const res = await getClientPageData(clientId);
      if (res.success && res.data) {
        setClientStats(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch client stats", error);
    }
  };

  const fetchClientProjects = async () => {
    try {
      setLoadingProjects(true);

      const res = await getProjectsByClient(clientId);

      const projectList = res?.data || [];

      setProjects(projectList);
    } catch (error) {
      console.error("Failed to fetch projects", error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchProjectSLA = async (projectId) => {
    try {
      setLoadingSLA(true);
      const res = await getProjectSLA(projectId);
      setProjectSLA(res.data || res);
    } catch (error) {
      if (error.response?.status === 403) {
        console.warn(`Access denied (403): Cannot view SLA for project ${projectId}`);
      } else {
        console.error("Failed to fetch project SLA", error);
      }
      setProjectSLA(null);
    } finally {
      setLoadingSLA(false);
    }
  };

  const fetchProjectCompliance = async (projectId) => {
    try {
      setLoadingCompliance(true);
      const res = await getProjectCompliance(projectId);
      setProjectCompliance(res.data || res || []);
    } catch (error) {
      if (error.response?.status === 403) {
        console.warn(`Access denied (403): Cannot view compliance for project ${projectId}`);
      } else {
        console.error("Failed to fetch compliance", error);
      }
      setProjectCompliance([]);
    } finally {
      setLoadingCompliance(false);
    }
  };

  const fetchProjectEscalations = async (projectId) => {
    try {
      setLoadingEscalations(true);
      const res = await getProjectEscalations(projectId);
      setProjectEscalations(res.data || res || []);
    } catch (error) {
      if (error.response?.status === 403) {
        console.warn(`Access denied (403): Cannot view escalations for project ${projectId}`);
      } else {
        console.error("Failed to fetch escalations", error);
      }
      setProjectEscalations([]);
    } finally {
      setLoadingEscalations(false);
    }
  };

  const handleDeleteClient = async (clientId) => {
    setLoading(true);
    try {
      const res = await deleteClient(clientId);
      toast.success(res.message || "Client deleted successfully.");
      setOpenDeleteClient(false);
      navigate(-1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete client.");
    } finally {
      setLoading(false);
    }
  };

  const handleSLACreate = async (data) => {
    setLoading(true);
    try {
      const res = await createClientSLA(data);
      toast.success(res.message || "SLA created successfully");
      setSLARefetchKey((prev) => prev + 1);
    } catch (res) {
      toast.error(res.response?.data?.message || "Failed to create SLA");
    } finally {
      setLoading(false);
    }
  };

  const handleComplianceCreate = async (data) => {
    setLoading(true);
    console.log("Creating compliance with data:", data);
    try {
      const res = await createClientCompliance(data);
      toast.success(res.message || "Compliance created successfully");
      setComplianceRefetchKey((prev) => prev + 1);
    } catch (res) {
      toast.error(res.response?.data?.message || "Failed to create Compliance");
    } finally {
      setLoading(false);
    }
  };

  const handleEscalationCreate = async (data) => {
    setLoading(true);
    try {
      const res = await createClientEscalation(data);
      toast.success(res.message || "Escalation created successfully");
      setEscalationRefetchKey((prev) => prev + 1);
    } catch (res) {
      toast.error(res.response?.data?.message || "Failed to create Escalation");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async ({ type, data }) => {
    if (type === "slas") {
      await handleSLACreate(data);
    } else if (type === "compliances") {
      await handleComplianceCreate(data);
    } else if (type === "escalations") {
      await handleEscalationCreate(data);
    } else {
      toast.error("Unknown configuration type");
    }
    setOpenConfigModal(false);
  };

  // useEffect hooks - ALL inside component

  // Fetch client details and stats on mount
  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
      fetchClientStats();
      fetchClientProjects();
    }
  }, [clientId]);

  // Set default project when projects load
  useEffect(() => {
    if (paginatedProjects.length > 0) {
      setSelectedProject(paginatedProjects[0]);
      setActiveTab("sla");
    }
  }, [currentPage, projects]);

  useEffect(() => {
    setCurrentPage(1);
  }, [clientId]);

  // Fetch project SLA when selected project changes
  useEffect(() => {
    const pid = getProjectId(selectedProject);

    if (pid) {
      fetchProjectSLA(pid);
    } else {
      setProjectSLA(null);
    }
  }, [getProjectId(selectedProject), slaRefetchKey]);

  // Fetch project compliance when selected project changes
  useEffect(() => {
    const pid = getProjectId(selectedProject);
    if (pid) {
      fetchProjectCompliance(pid);
    }
  }, [getProjectId(selectedProject)]);

  // Fetch project escalations when selected project changes
  useEffect(() => {
    const pid = getProjectId(selectedProject);
    if (pid) {
      fetchProjectEscalations(pid);
    }
  }, [getProjectId(selectedProject)]);

  // Tab icon helper
  const ActivityIcon = SuccessIcon;

  // Determine available tabs for the selected project
  const getTabs = () => {
    return [
      { id: "sla", label: "SLA & Metrics", icon: ActivityIcon },
      { id: "compliance", label: "Pre-requisites", icon: AuthSuccessIcon },
      { id: "assets", label: "Assets", icon: BoxIcon },
      { id: "escalation", label: "Escalation", icon: TeamIcon },
    ];
  };

  // Dynamic KPI Data Construction
  const kpiData = [
    {
      label: "Active Projects",
      value: clientStats.activeProjects,
      icon: DocumentIcon,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Total Spend",
      value: formatCurrency(clientStats.totalSpend),
      icon: BoxIcon,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Satisfaction",
      value: clientStats.satisfactionScore != null ? `${clientStats.satisfactionScore}%` : "0%",
      icon: TeamIcon,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      label: "Pending Issues",
      value: clientStats.pendingIssues || 0,
      icon: WarningIcon,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
  ];

  const totalPages = Math.ceil(projects.length / PROJECTS_PER_PAGE);

  const paginatedProjects = projects.slice(
    (currentPage - 1) * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE,
  );

  const projectAssets = clientAssets;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition shadow-sm"
          >
            <PrevIcon size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center flex-wrap gap-2">
              <span className="truncate max-w-[200px] sm:max-w-none">{clientDetails.client_name}</span>
              {canEditProfile && (
                <div className="flex gap-2">
                  <EditIcon
                    size={16}
                    className="text-blue-500 hover:text-blue-700 cursor-pointer"
                    title="Edit Client"
                    onClick={() => setOpenUpdateClient(true)}
                  />
                  <DeleteIcon
                    size={16}
                    className="text-red-500 hover:text-red-700 cursor-pointer"
                    title="Delete Client"
                    onClick={() => setOpenDeleteClient(true)}
                  />
                </div>
              )}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <GlobalIcon size={14} /> {clientDetails.country_name}
              </span>
              <span className="hidden sm:inline w-1 h-1 bg-gray-300 rounded-full"></span>
              <span className="flex items-center gap-1">
                <ProjectsIcon size={14} /> {clientDetails.client_type}
              </span>
            </div>
          </div>
        </div>

        {/* Client Level Stats */}
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none text-left md:text-right px-4 border-r border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase">
              Total Projects
            </p>
            <p className="text-xl font-bold text-gray-900">
              {clientStats.totalProjects}
            </p>
          </div>
          <div className="flex-1 md:flex-none text-left md:text-right pl-2">
            <p className="text-xs text-gray-500 font-semibold uppercase">
              Overall Health
            </p>
            <p className={`text-xl font-bold ${clientStats.overallHealth === "POOR"
              ? "text-red-600"
              : clientStats.overallHealth === "GOOD"
                ? "text-green-600"
                : "text-yellow-600"
              }`}>
              {clientStats.overallHealth || "Unknown"}
            </p>
          </div>
        </div>
      </div>

      {/* Client KPI's */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 mb-10">
        {kpiData.map((kpi, idx) => (
          <KPICard
            key={idx}
            label={kpi.label}
            value={kpi.value}
            icon={<kpi.icon className={`w-5 h-5 ${kpi.color}`} />}
            color={`${kpi.bg} ${kpi.color}`}
          />
        ))}
      </div>



      {(clientDetails.compliance ||
        clientDetails.SLA ||
        clientDetails.escalationContact) && (
          <div className="mt-8 mb-10">
            <ClientSection
              clientDetails={clientDetails}
              slaRefetchKey={slaRefetchKey}
              complianceRefetchKey={complianceRefetchKey}
              escalationRefetchKey={escalationRefetchKey}
              actions={
                (canConfigAgreements || canManageAssets) && (
                  <>
                    {canConfigAgreements && (
                      <Button
                        variant="secondary"
                        onClick={() => setOpenCompanyEscalation(true)}
                        className="px-4 py-2 text-sm border rounded-lg whitespace-nowrap"
                      >
                        Company Escalation
                      </Button>
                    )}
                    {canConfigAgreements &&
                      (clientDetails.compliance ||
                        clientDetails.SLA ||
                        clientDetails.escalationContact) && (
                        <Button
                          variant="primary"
                          onClick={() => setOpenConfigModal(true)}
                          className="px-4 py-2 text-sm border rounded-lg whitespace-nowrap"
                        >
                          + Add Configuration
                        </Button>
                      )}

                    {canManageAssets && (
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/manage-assets/${clientId}?name=${encodeURIComponent(clientDetails.client_name)}`)}
                        disabled={clientDetails.status !== "ACTIVE"}
                        title={clientDetails.status !== "ACTIVE" ? "Manage Assets is available only for ACTIVE clients" : ""}
                      >
                        <PackageIcon size={16} />
                        Manage Assets
                      </Button>
                    )}
                  </>
                )
              }
            />
          </div>
        )}

      <div className="grid grid-cols-12 gap-8 mt-10">
        {/* LEFT SIDE: Project List */}
        <div className="col-span-12 lg:col-span-4 space-y-4 lg:max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{projects.length} Total</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar min-h-[300px] lg:min-h-0">
            {/* Project Cards */}
            {loadingProjects ? (
              <div className="text-sm text-gray-400">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="text-sm text-gray-400">No projects found</div>
            ) : (
              paginatedProjects.map((project) => (
                <div
                  key={project.projectId || project.pmsProjectId}
                  onClick={() => {
                    setSelectedProject(project);
                    setActiveTab("sla");
                  }}
                  className={`group cursor-pointer relative p-5 rounded-xl border transition-all duration-200 ${getProjectId(selectedProject) === getProjectId(project)
                    ? "bg-white border-indigo-600 ring-1 ring-indigo-600 shadow-md"
                    : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3
                      className={`font-semibold ${getProjectId(selectedProject) === getProjectId(project)
                        ? "text-indigo-900"
                        : "text-gray-900"
                        }`}
                    >
                      {project.projectName}
                    </h3>
                    {getProjectId(selectedProject) ===
                      getProjectId(project) && (
                        <SuccessIcon className="w-5 h-5 text-indigo-600" />
                      )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Status</span>
                      <StatusBadge label={project.projectStatus || "UNKNOWN"} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Location</span>
                      <span className="text-gray-900 font-medium">
                        {project.primaryLocation}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 line-clamp-2">
                        Stage: {project.lifecycleStage}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ✅ PAGINATION GOES HERE — INSIDE LEFT COLUMN */}
          <div className="pt-2 border-t border-gray-100 mt-auto">
            {projects.length > PROJECTS_PER_PAGE && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((p) => p - 1)}
                onNext={() => setCurrentPage((p) => p + 1)}
              />
            )}
          </div>
        </div>

        {/* PROJECT DETAILS */}
        <div className="col-span-12 lg:col-span-8 bg-white border rounded-xl shadow-sm">
          {selectedProject ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[600px] flex flex-col">
              {/* Project Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 rounded-t-xl">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedProject.projectName}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Managed by{" "}
                    <span className="font-medium text-gray-900">
                      {selectedProject.projectManagerId}
                    </span>
                  </p>
                </div>
                {/* <button className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontalIcon />
                </button> */}
              </div>

              {/* Dynamic Tabs */}
              <div className="flex border-b border-gray-200 px-6 overflow-x-auto no-scrollbar">
                {getTabs().map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
                {getTabs().length === 0 && (
                  <div className="py-4 text-sm text-gray-400 italic">
                    No detailed configurations available
                  </div>
                )}
              </div>

              {/* Tab Content Area */}
              <div className="p-8 flex-1 bg-white rounded-b-xl">
                {activeTab === "sla" && (
                  <ProjectSLA data={projectSLA} loading={loadingSLA} />
                )}

                {activeTab === "compliance" && (
                  <ProjectCompliance
                    data={projectCompliance}
                    loading={loadingCompliance}
                  />
                )}

                {activeTab === "assets" && (
                  <ProjectAssets
                    assets={projectAssets}
                    loading={loadingAssets}
                  />
                )}

                {activeTab === "escalation" && (
                  <ProjectEscalation
                    data={projectEscalations}
                    loading={loadingEscalations}
                  />
                )}

                {!activeTab && getTabs().length > 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <DocumentIcon size={48} className="mb-4 text-gray-200" />
                    <p>Select a category above to view details.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <BuildingIcon size={64} className="mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">
                Select a project to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Configuration Modal */}
      <AddConfigurationModal
        open={openConfigModal}
        onClose={() => setOpenConfigModal(false)}
        onSave={handleSaveConfiguration}
        clientDetails={clientDetails}
        loading={loading}
      />

      {/* Update Client Modal */}
      <Modal
        isOpen={openUpdateClient}
        title="Update Client"
        subtitle="Modify client details and settings."
        onClose={() => setOpenUpdateClient(false)}
      >
        <CreateClient
          mode="edit"
          initialData={clientDetails}
          isEditable={clientStats.activeProjects > 0}
          onSuccess={() => {
            fetchClientDetails();
            setOpenUpdateClient(false);
          }}
        />
      </Modal>

      <Modal
        isOpen={openCompanyEscalation}
        title={editMode ? "Edit Escalation Contact" : "Company Escalation"}
        subtitle={
          editMode ? "Update escalation contact" : "Add escalation contact"
        }
        onClose={() => setOpenCompanyEscalation(false)}
      >
        <CompanyEscalationModal
          mode={editMode ? "edit" : "create"}
          initialData={selectedContact}
          loading={loading}
          onClose={() => setOpenCompanyEscalation(false)}
          onSave={async (payload) => {
            if (editMode) {
              await handleUpdateCompanyContact(payload);
            } else {
              await handleCompanyContactCreate(payload);
            }

            setOpenCompanyEscalation(false);
            window.dispatchEvent(new Event("refresh-company-escalation"));
          }}
        />
      </Modal>

      {/* Delete Client Modal */}
      {openDeleteClient && (
        <ConfirmationModal
          isOpen={openDeleteClient}
          title="Delete Client"
          message="Are you sure you want to delete this client? This action cannot be undone."
          onCancel={() => setOpenDeleteClient(false)}
          onConfirm={() => handleDeleteClient(clientId)}
          isLoading={loading}
        />
      )}
    </div>
  );
};

export default ClientPage;