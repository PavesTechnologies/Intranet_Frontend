// src/pages/resource_management/projects/ProjectDetails.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ProjectResourcesTable from "./ProjectResourcesTable";
import axios from "axios";
import SLAForm from "../../models/client_configuration/forms/SLAForm";
import ComplianceForm from "../../models/client_configuration/forms/ComplianceForm";
import EscalationForm from "../../models/client_configuration/forms/EscalationForm";
import DemandModal from "../../models/DemandModal";
import ProjectFinancialsInline from "../../components/FinancialModal";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { CheckSquare } from "lucide-react";
import AddDeliverableRoleModal from "../../models/AddDeliverableRoleModal";
import Pagination from "../../../../components/Pagination/pagination";
import GenericTable from "../../../../components/Table/table";
import { useAuth } from "@/contexts/AuthContext";

const RMS_BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;
import {
  ArrowLeft,
  Calendar,
  Users,
  Globe,
  ShieldAlert,
  Lock,
  AlertTriangle,
  Edit,
  Trash2,
} from "lucide-react";
import {
  getProjectById,
  checkDemandCreation,
} from "../../services/projectService";
import {
  getSkillCategoriesTree,
  getProficiencyLevels,
} from "../../services/workforceService";

import { toast } from "react-toastify";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";

const RMSProjectDetails = () => {
  const { getEnumValues } = useEnums();
  const { user } = useAuth();
  const location = useLocation();
  const roles = user?.roles;
  const isRM = roles?.includes("Resource_Manager");

  const { projectId } = useParams();
  const navigate = useNavigate();
  const [projectEscalations, setProjectEscalations] = useState([]);
  const [clientEscalations, setClientEscalations] = useState([]);

  const [selectedClientEscalations, setSelectedClientEscalations] = useState(
    [],
  );

  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState(location.state?.initialTab || "overview");
  const [overlaps, setOverlaps] = useState([]);
  const [overlapsPage, setOverlapsPage] = useState(1);
  const OVERLAPS_PER_PAGE = 3;
  const ITEMS_PER_PAGE = 8;
  const [slaPage, setSlaPage] = useState(1);
  const [compliancePage, setCompliancePage] = useState(1);
  const [escalationPage, setEscalationPage] = useState(1);
  const [loadingOverlaps, setLoadingOverlaps] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDemand, setLoadingDemand] = useState(false);
  const [demandResponse, setDemandResponse] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const [configType, setConfigType] = useState(null); // "sla" | "compliance" | "escalation"

  // ================= Deliverable Role Modal =================
  const [openDeliverableRoleModal, setOpenDeliverableRoleModal] =
    useState(false);

  const [categories, setCategories] = useState([]);
  const [proficiencyLevels, setProficiencyLevels] = useState([]);

  const [projectSlas, setProjectSlas] = useState([]);
  const [inheritMode, setInheritMode] = useState(false);
  const [clientSlas, setClientSlas] = useState([]);
  const [selectedClientSlas, setSelectedClientSlas] = useState([]);
  const [projectCompliance, setProjectCompliance] = useState([]);
  const [clientCompliance, setClientCompliance] = useState([]);
  const [selectedClientCompliance, setSelectedClientCompliance] = useState([]);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteConfigId, setDeleteConfigId] = useState(null);
  const [deleteType, setDeleteType] = useState(null);

  const DEFAULT_FORM_STATE = {
    activeFlag: true,
  };
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);

  useEffect(() => {
    if (location.state?.initialTab) {
      setActiveTab(location.state.initialTab);
    }
  }, [location.state]);

  // 1. Fetch Client SLAs when entering Inherit Mode
  const handleInheritClick = async () => {
    try {
      const res = await axios.get(
        `${RMS_BASE_URL}/api/client-sla/clientSLA/${project.clientId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      const existingTypes = projectSlas.map((ps) => ps.slaType);

      const validatedSlas = (res.data.data || []).map((sla) => ({
        ...sla,
        isAlreadyMapped: existingTypes.includes(sla.slaType),
      }));

      // CHANGE: Ensure this matches the variable name declared above
      setClientSlas(validatedSlas);
      setInheritMode(true);
    } catch (err) {
      console.error("Failed to fetch client SLAs", err);
    }
  };
  const fetchProjectSLAs = async () => {
    try {
      const res = await axios.get(
        `${RMS_BASE_URL}/api/project-sla/project/${projectId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setProjectSlas(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch project SLAs", err);
    }
  };
  //2 save inherited SLAs to project
  const saveInheritedSlas = async () => {
    try {
      // Prevent saving if the total would exceed 3
      if (projectSlas.length + selectedClientSlas.length > 3) {
        alert(
          "Adding these would exceed the limit of 3 SLAs for this project.",
        );
        return;
      }
      // We loop through selected types and call your backend inherit endpoint
      const promises = selectedClientSlas.map((type) =>
        axios.post(
          `${RMS_BASE_URL}/api/project-sla/inherit/${project.pmsProjectId}/type/${type}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        ),
      );
      await Promise.all(promises);
      setOpenConfigModal(false);
      setInheritMode(false);
      setSelectedClientSlas([]);
      fetchProjectSLAs();
      // fetchDetail(); // Refresh project data
    } catch (err) {
      console.error("Error inheriting SLAs", err);
    }
  };

  // 3. Handle Manual Save
  const handleManualSave = async () => {
    try {
      const isEditing = !!formData.projectSlaId; // Check if we are updating an existing SLA

      if (!isEditing) {
        // ONLY check max limit if creating a NEW SLA
        if (projectSlas.length >= 3) {
          alert("Maximum of 3 SLA configurations allowed per project.");
          return;
        }

        // ONLY check for duplicate type if creating a NEW SLA
        const isDuplicate = projectSlas.some(
          (sla) => sla.slaType === formData.slaType,
        );
        if (isDuplicate) {
          alert(`The SLA type "${formData.slaType}" is already configured.`);
          return;
        }
      }

      const payload = {
        ...formData,
        project: { pmsProjectId: projectId },
      };

      await axios.post(`${RMS_BASE_URL}/api/project-sla/save`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE); // Reset form after save
      fetchProjectSLAs(); // Refresh table
    } catch (err) {
      console.error("Error saving project SLA", err);
      alert(err.response?.data?.message || "Failed to save SLA configuration");
    }
  };

  // 1. Handle Delete Logic
  const handleDeleteSla = async (sla) => {
    const message = sla.isInherited
      ? "This SLA was inherited from client. Do you want to uninherit it from this project?"
      : "Are you sure you want to delete this custom SLA configuration?";
    setDeleteMessage(message);
    setDeleteConfigId(sla.projectSlaId);
    setDeleteType("sla");
    setOpenConfirmModal(true);
  };
  const handleDeleteCompliance = (comp) => {
    const message = comp.isInherited
      ? "This compliance was inherited from client. Do you want to uninherit it from this project?"
      : "Are you sure you want to delete this compliance configuration?";

    setDeleteMessage(message);
    setDeleteConfigId(comp.projectComplianceId);
    setDeleteType("compliance");
    setOpenConfirmModal(true);
  };
  const handleDeleteEscalation = (esc) => {
    const message =
      esc.source === "INHERITED"
        ? "This escalation was inherited from client. Do you want to uninherit it?"
        : "Are you sure you want to delete this escalation?";

    setDeleteMessage(message);
    setDeleteConfigId(esc.projectEscalationId);
    setDeleteType("escalation");
    setOpenConfirmModal(true);
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);

    try {
      if (deleteType === "sla") {
        await axios.delete(
          `${RMS_BASE_URL}/api/project-sla/${deleteConfigId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        fetchProjectSLAs();
        toast.success("SLA Configuration Deleted Successfully.");
      }

      if (deleteType === "compliance") {
        await axios.delete(
          `${RMS_BASE_URL}/api/project-compliance/${deleteConfigId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        fetchProjectCompliance();
        toast.success("Compliance Configuration Deleted Successfully.");
      }

      if (deleteType === "escalation") {
        await axios.delete(
          `${RMS_BASE_URL}/api/projects/delete-escalation/${deleteConfigId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        fetchProjectEscalations();
        toast.success("Escalation Deleted Successfully.");
      }

      setOpenConfirmModal(false);
      setDeleteMessage("");
      setDeleteType(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // 2. Handle Edit Logic
  const handleEditSla = (sla) => {
    // Populate the form with existing data
    setFormData({
      projectSlaId: sla.projectSlaId,
      slaType: sla.slaType,
      slaDurationDays: sla.slaDurationDays,
      warningThresholdDays: sla.warningThresholdDays,
      activeFlag: sla.activeFlag,
      project: { pmsProjectId: projectId },
    });
    setConfigType("sla");
    setOpenConfigModal(true);
    setInheritMode(false);
  };

  // . Fetch Existing Project Compliance (for the tab table and validation)
  const fetchProjectCompliance = async () => {
    try {
      const res = await axios.get(
        `${RMS_BASE_URL}/api/project-compliance/project/${projectId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setProjectCompliance(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch project compliance", err);
    }
  };

  //  Fetch Client Compliance when entering Inherit Mode
  const handleComplianceInheritClick = async () => {
    try {
      // 🔥 1️⃣ Fetch latest project compliance from DB
      const projectRes = await axios.get(
        `${RMS_BASE_URL}/api/project-compliance/project/${projectId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      const latestProjectCompliance = projectRes.data.data || [];

      // 🔥 2️⃣ Fetch client compliance
      const clientRes = await axios.get(
        `${RMS_BASE_URL}/api/client-compliance/clientCompliance/${project.clientId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      // 🔥 Only block if ALREADY inherited
      const inheritedTypes = latestProjectCompliance
        .filter((pc) => pc.isInherited === true)
        .map((pc) => pc.requirementType);

      const validatedCompliance = (clientRes.data.data || []).map((comp) => ({
        ...comp,
        isAlreadyMapped: inheritedTypes.includes(comp.requirementType),
      }));

      // 🔥 4️⃣ Update states
      setProjectCompliance(latestProjectCompliance);
      setClientCompliance(validatedCompliance);
      setSelectedClientCompliance([]); // reset selection
      setInheritMode(true);
    } catch (err) {
      console.error("Failed to fetch compliance", err);
    }
  };

  //  Save Inherited Compliance to Project
  const saveInheritedCompliance = async () => {
    try {
      if (selectedClientCompliance.length === 0) return;

      // Call the specific inherit endpoint: /inherit/{projectId}/type/{complianceType}
      const promises = selectedClientCompliance.map((complianceType) =>
        axios.post(
          `${RMS_BASE_URL}/api/project-compliance/inherit/${projectId}/type/${complianceType}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        ),
      );

      await Promise.all(promises);

      // UI Cleanup
      setOpenConfigModal(false);
      setInheritMode(false);
      setSelectedClientCompliance([]);
      fetchProjectCompliance(); // Refresh the main UI table
    } catch (err) {
      console.error("Error inheriting compliance", err);
      alert("Internal Server Error: Ensure Enum types match backend exactly.");
    }
  };

  //  Update the Manual Save for Compliance
  const handleComplianceManualSave = async () => {
    try {
      // 1. LOCAL CHECK: Prevent duplicates before hitting the backend
      const isDuplicate = projectCompliance.some(
        (c) =>
          c.requirementType === formData.requirementType &&
          c.isInherited === false,
      );

      if (isDuplicate && !formData.projectComplianceId) {
        alert(
          `The compliance requirement "${formData.requirementType}" is already configured for this project.`,
        );
        return; // Stop the execution here
      }

      const payload = {
        ...formData,
        // activeFlag: formData.activeFlag ?? true,
        project: { pmsProjectId: projectId },
      };

      await axios.post(`${RMS_BASE_URL}/api/project-compliance/save`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE);
      fetchProjectCompliance();
    } catch (err) {
      console.error("Error saving project compliance", err);
      // This will display "Serial number already exists" if the local check missed something
      alert(err.response?.data?.message || "An error occurred during save.");
    }
  };

  const handleEditCompliance = (comp) => {
    setFormData({
      projectComplianceId: comp.projectComplianceId,
      requirementType: comp.requirementType,
      requirementName: comp.requirementName,
      mandatoryFlag: comp.mandatoryFlag,
      activeFlag: comp.activeFlag,
      project: { pmsProjectId: projectId },
    });

    setConfigType("compliance");
    setOpenConfigModal(true);
    setInheritMode(false);
  };

  const handleEscalationManualSave = async () => {
    try {
      const payload = {
        ...formData,
        projectId: projectId,
        type: "manual",
      };

      await axios.post(
        `${RMS_BASE_URL}/api/projects/escalations/save`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE);
      fetchProjectEscalations(); // when you create this
    } catch (err) {
      console.error("Error saving escalation", err);
      alert(err.response?.data?.message || "Failed to save escalation");
    }
  };

  const loadProficiencyLevels = async () => {
    try {
      const res = await getProficiencyLevels();

      console.log("RAW RESPONSE:", res); // 🔴 MUST LOG
      console.log("DATA ARRAY:", res.data.data); // 🔴 MUST LOG

      setProficiencyLevels(res.data.data);
    } catch (err) {
      console.error("Failed to load proficiency levels", err);
    }
  };

  const fetchProjectEscalations = async () => {
    try {
      const res = await axios.get(
        `${RMS_BASE_URL}/api/projects/${projectId}/escalations`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setProjectEscalations(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch escalations", err);
    }
  };

  // ================= Deliverable Role APIs =================
  const loadCategoryTree = async () => {
    try {
      const res = await getSkillCategoriesTree();
      setCategories(res.data || []);
    } catch (err) {
      console.error("Failed to fetch skill categories", err);
    }
  };

  const handleEscalationInheritClick = async () => {
    try {
      const projectRes = await axios.get(
        `${RMS_BASE_URL}/api/projects/${projectId}/escalations`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const existingContactIds = (projectRes.data.data || []).map(
        (e) => e.contactId,
      );

      const clientRes = await axios.get(
        `${RMS_BASE_URL}/api/client-contact/clientContact/${project.clientId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      console.log("Exisiting Contacts:", existingContactIds); // Debug log
      const validated = (clientRes.data.data || []).map((contact) => ({
        ...contact,
        isAlreadyMapped: existingContactIds.includes(contact.contactId),
      }));
      console.log("Validated: ", validated);

      setClientEscalations(validated);
      setSelectedClientEscalations([]);
      setInheritMode(true);
    } catch (err) {
      console.error("Failed to fetch client escalation contacts", err);
    }
  };

  // No longer needed: handled internally by AddDeliverableRoleModal

  // ================= Fetch Deliverable Role Data on Modal Open =================

  // ================= Fetch Deliverable Role Data on Modal Open =================
  useEffect(() => {
    if (openDeliverableRoleModal) {
      if (proficiencyLevels.length === 0) {
        loadProficiencyLevels();
      }
      if (categories.length === 0) {
        loadCategoryTree();
      }
    }
  }, [openDeliverableRoleModal, proficiencyLevels.length, categories.length]);

  const saveInheritedEscalations = async () => {
    try {
      if (selectedClientEscalations.length === 0) return;

      const payload = {
        projectId: projectId,
        type: "inherit",
        contactId: selectedClientEscalations,
      };

      await axios.post(
        `${RMS_BASE_URL}/api/projects/escalations/save`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setOpenConfigModal(false);
      setInheritMode(false);
      setSelectedClientEscalations([]);
      fetchProjectEscalations();
    } catch (err) {
      console.error("Error inheriting escalation", err);
      alert(err.response?.data?.message || "Failed to inherit escalation");
    }
  };

  const handleEscalationUpdate = async () => {
    try {
      if (!formData.projectEscalationId) {
        alert("Escalation ID missing for update.");
        return;
      }

      const payload = {
        escalationLevel: formData.escalationLevel,
        contactName: formData.contactName,
        contactRole: formData.contactRole,
        email: formData.email,
        phone: formData.phone,
        activeFlag: formData.activeFlag,
      };

      await axios.put(
        `${RMS_BASE_URL}/api/projects/update-escalation/${formData.projectEscalationId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE);
      fetchProjectEscalations();
    } catch (err) {
      console.error("Error updating escalation", err);
      alert(err.response?.data?.message || "Failed to update escalation");
    }
  };

  const handleEditEscalation = (esc) => {
    setFormData({
      projectEscalationId: esc.projectEscalationId,
      escalationLevel: esc.escalationLevel,
      contactName: esc.contactName,
      contactRole: esc.contactRole,
      email: esc.email,
      phone: esc.phone,
      activeFlag: esc.activeFlag,
    });

    setConfigType("escalation");
    setOpenConfigModal(true);
    setInheritMode(false);
  };

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await getProjectById(projectId);
      setProject(res.data);
    } catch (err) {
      console.error("Failed to fetch project details", err);
      toast.error(
        err.response?.data?.message || "Failed to fetch project details.",
      );
    } finally {
      setLoading(false);
    }
  };

  const checkDemand = async () => {
    setLoadingDemand(true);
    try {
      const res = await checkDemandCreation(projectId);
      setDemandResponse(res.data);
    } catch (err) {
      console.error("Failed to check demand creation", err);
      toast.error(
        err.response?.data?.message || "Failed to check demand creation.",
      );
    } finally {
      setLoadingDemand(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    checkDemand();
    console.log("Project Details: ", project);
  }, [projectId]);

  useEffect(() => {
    if (activeTab === "overlaps") {
      fetchOverlaps();
    }
  }, [activeTab, projectId]);
  useEffect(() => {
    if (activeTab === "sla") {
      fetchProjectSLAs();
    }
  }, [activeTab, projectId]);

  useEffect(() => {
    if (activeTab === "pre-requisites") {
      fetchProjectCompliance();
    }
    console.log("Catogories:", categories);
  }, [activeTab, projectId]);

  useEffect(() => {
    if (activeTab === "escalation") {
      fetchProjectEscalations();
    }
  }, [activeTab, projectId]);

  useEffect(() => {
    if (openConfigModal || modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [openConfigModal, modalOpen]);

  const fetchOverlaps = async () => {
    try {
      setLoadingOverlaps(true);
      const res = await axios.get(
        `${RMS_BASE_URL}/api/projects/${projectId}/overlaps`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setOverlaps(res.data.data || []);
    } catch (err) {
      console.error("Failed to load overlaps", err);
      setOverlaps([]);
    } finally {
      setLoadingOverlaps(false);
      setOverlapsPage(1); // Reset to first page on new fetch
    }
  };

  const totalOverlapsPages = Math.ceil(overlaps.length / OVERLAPS_PER_PAGE);
  const paginatedOverlaps = overlaps.slice(
    (overlapsPage - 1) * OVERLAPS_PER_PAGE,
    overlapsPage * OVERLAPS_PER_PAGE,
  );

  const totalSlaPages = Math.ceil(projectSlas.length / ITEMS_PER_PAGE);
  const paginatedSlas = projectSlas.slice(
    (slaPage - 1) * ITEMS_PER_PAGE,
    slaPage * ITEMS_PER_PAGE,
  );

  const validCompliance = projectCompliance.filter(
    (comp) => comp.requirementType,
  );
  const totalCompliancePages = Math.ceil(
    validCompliance.length / ITEMS_PER_PAGE,
  );
  const paginatedCompliance = validCompliance.slice(
    (compliancePage - 1) * ITEMS_PER_PAGE,
    compliancePage * ITEMS_PER_PAGE,
  );

  const totalEscalationPages = Math.ceil(
    projectEscalations.length / ITEMS_PER_PAGE,
  );
  const paginatedEscalations = projectEscalations.slice(
    (escalationPage - 1) * ITEMS_PER_PAGE,
    escalationPage * ITEMS_PER_PAGE,
  );

  const formatLevel = (level) => {
    if (!level) return "";

    if (level.startsWith("LEVEL_")) {
      return `L${level.split("_")[1]}`;
    }

    if (level.startsWith("L") && level.includes("Level-")) {
      return `L${level.split("-")[1]}`;
    }

    return level;
  };

  if (loading)
    return (
      <div className="p-10 text-center">
        <LoadingSpinner text="Loading..." />
      </div>
    );

  if (!project)
    return <div className="p-10 text-center">Project not found</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-3 md:gap-4 w-full lg:w-auto">
            {/* Back Arrow */}
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition shadow-sm shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-[#081534] flex flex-wrap items-center gap-2 md:gap-3">
                <span className="truncate max-w-[200px] md:max-w-none">
                  {project.projectName}
                </span>
                <span
                  className={`text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full border whitespace-nowrap ${project.projectStatus === "ACTIVE"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                >
                  {project.projectStatus}
                </span>
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">
                {project.clientName} •{" "}
                <span className="hidden sm:inline">Project ID:</span>{" "}
                {project.pmsProjectId}
              </p>
            </div>
          </div>
          {/* <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                console.log("Deliverable Role button clicked");
                setOpenDeliverableRoleModal(true);
              }}
              className="bg-white border border-[#263383] text-[#263383] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#263383] hover:text-white transition"
            >
              + Add Deliverable Role
            </button>
            <button
              title={!demandResponse?.create ? demandResponse?.reason : ""}
              className={`bg-blue-800 px-4 py-2 rounded-lg text-white text-xs font-semibold ${loadingDemand || !demandResponse?.create
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-900"
                }`}
              disabled={loadingDemand || !demandResponse?.create}
              onClick={() => setModalOpen(true)}
            >
              Create Demand
            </button>
          </div> */}
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="flex items-center gap-6 mt-6 md:mt-8 border-b border-gray-200 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap -mx-4 md:mx-0 px-4 md:px-0">
          {[
            "overview",
            "resources",
            "financials",
            "overlaps",
            "sla",
            "pre-requisites",
            "escalation",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize relative shrink-0 ${activeTab === tab ? "text-[#263383]" : "text-gray-500"
                }`}
            >
              {tab === "sla"
                ? "SLA"
                : tab === "pre-requisites"
                  ? "Pre-Requisites"
                  : tab}
              {tab === "overlaps" && overlaps.length > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  {overlaps.length}
                </span>
              )}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#263383]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Lock className="h-3 w-3" /> PMS Context (Read-Only)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Project Manager ID
                  </label>
                  <div className="flex items-center gap-2 text-gray-800 font-medium">
                    <Users className="h-4 w-4 text-blue-800" />
                    {project.projectManagerId}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Risk Profile
                  </label>
                  <div className="flex items-center gap-2 text-gray-600 font-medium">
                    <ShieldAlert
                      className={`h-4 w-4 ${project.riskLevel === "HIGH"
                        ? "text-red-500"
                        : "text-green-500"
                        }`}
                    />
                    {project.riskLevel}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Lifecycle Stage
                  </label>
                  <div className="text-sm font-medium text-gray-600 uppercase">
                    {project.lifecycleStage}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Start Date
                  </label>
                  <div className="flex items-center gap-2 text-gray-800 text-sm">
                    <Calendar className="h-4 w-4 text-red-600" />
                    {new Date(project.startDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">
              Delivery Model
            </h3>
            <div className="p-3 bg-blue-50 rounded border border-blue-100 flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600 font-semibold">Model</span>
              <span className="font-bold text-[#263383]">
                {project.deliveryModel}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
              <Globe className="h-5 w-5 text-blue-600" />
              <div>
                <span className="text-xs text-gray-500 block">
                  Primary Location
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {project.primaryLocation}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAPS TAB */}
      {activeTab === "overlaps" && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-500 h-5 w-5" />
            Overlapping Projects
          </h3>

          {loadingOverlaps ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <LoadingSpinner />
              <p className="text-sm text-gray-400 font-medium animate-pulse">
                Analyzing project timelines...
              </p>
            </div>
          ) : overlaps.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <CheckSquare className="text-green-500 h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-gray-900">
                No Conflict Detected
              </h4>
              <p className="text-sm text-gray-500 max-w-[240px] mt-1 leading-relaxed">
                {" "}
                This project's timeline is completely clear of resource
                overlaps.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedOverlaps.map((p) => (
                  <div
                    key={p.projectId}
                    className="group bg-white p-5 rounded-2xl border border-gray-100 hover:border-red-200 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500 origin-bottom transition-transform group-hover:scale-y-110" />

                    <div className="flex flex-col h-full space-y-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle
                            size={14}
                            className="text-red-500 shrink-0"
                          />
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter">
                            Timeline Conflict
                          </span>
                        </div>
                        <h4
                          className="font-bold text-[#081534] truncate text-sm md:text-base group-hover:text-red-700 transition-colors"
                          title={p.projectName}
                        >
                          {p.projectName}
                        </h4>
                        <p
                          className="text-xs text-gray-500 font-medium truncate"
                          title={p.clientName}
                        >
                          {p.clientName}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                            Overlap Period
                          </span>
                          <span className="text-xs text-gray-700 font-bold mt-0.5">
                            {new Date(p.startDate).toLocaleDateString()} —{" "}
                            {new Date(p.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all cursor-pointer shadow-sm">
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              <Pagination
                currentPage={overlapsPage}
                totalPages={totalOverlapsPages}
                onPrevious={() =>
                  setOverlapsPage((prev) => Math.max(prev - 1, 1))
                }
                onNext={() =>
                  setOverlapsPage((prev) =>
                    Math.min(prev + 1, totalOverlapsPages),
                  )
                }
                className="mt-8 pt-6 border-t border-gray-100"
              />
            </>
          )}
        </div>
      )}

      {activeTab === "resources" && (
        <ProjectResourcesTable projectId={projectId} />
      )}

      {activeTab === "sla" && (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold">Project SLA Configuration</h3>
            {!isRM && (
              <button
                disabled={projectSlas.length >= 3}
                onClick={() => {
                  setFormData(DEFAULT_FORM_STATE);
                  setConfigType("sla");
                  setOpenConfigModal(true);
                }}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-bold transition-all ${projectSlas.length >= 3
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[#263383] text-white hover:opacity-90 shadow-md active:scale-95"
                  }`}
              >
                {projectSlas.length >= 3
                  ? "Limit Reached (3/3)"
                  : "+ Create SLA"}
              </button>
            )}
          </div>

          {projectSlas.length > 0 ? (
            <>
              <GenericTable
                headers={["Type", "Duration (Days)", "Warning (Days)", "Status", "Actions"]}
                columns={["slaType", "slaDurationDays", "warningThresholdDays", "status", "actions"]}
                rows={paginatedSlas.map((sla) => ({
                  ...sla,
                  status: (
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-bold ${sla.isInherited ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}
                    >
                      {sla.isInherited ? "INHERITED" : "CUSTOM"}
                    </span>
                  ),
                  actions: isRM ? (
                    <div><p className="italic font-medium text-gray-400 text-xs">No permission</p></div>
                  ) : (
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => {
                          if (sla.isInherited) return;
                          handleEditSla(sla);
                        }}
                        className={`transition-colors ${sla.isInherited
                          ? "text-gray-300 cursor-not-allowed pointer-events-none"
                          : "text-blue-600 hover:text-blue-800"
                          }`}
                        title={sla.isInherited ? "Cannot edit inherited SLAs" : "Edit SLA"}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSla(sla)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete / Uninherit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                }))}
              />

              {totalSlaPages > 1 && (
                <Pagination
                  currentPage={slaPage}
                  totalPages={totalSlaPages}
                  onPrevious={() => setSlaPage((prev) => Math.max(prev - 1, 1))}
                  onNext={() =>
                    setSlaPage((prev) => Math.min(prev + 1, totalSlaPages))
                  }
                  className="mt-6 border-t border-gray-100 pt-4"
                />
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              No SLA configuration added yet.
            </p>
          )}
        </div>
      )}

      {activeTab === "financials" && <ProjectFinancialsInline />}

      {activeTab === "pre-requisites" && (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold">
              Project Pre-requisites Configuration
            </h3>
            {!isRM && (
              <button
                onClick={() => {
                  setFormData(DEFAULT_FORM_STATE);
                  setConfigType("pre-requisites");
                  setOpenConfigModal(true);
                }}
                className="w-full sm:w-auto bg-[#263383] text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 shadow-md active:scale-95"
              >
                + Create Pre-requisites
              </button>
            )}
          </div>

          {projectCompliance.length > 0 ? (
            <>
              <GenericTable
                headers={["Requirement Type", "Requirement Name", "Mandatory", "Status", "Actions"]}
                columns={["requirementType", "requirementName", "mandatory", "status", "actions"]}
                rows={paginatedCompliance.map((comp) => ({
                  ...comp,
                  mandatory: comp.mandatoryFlag ? "Yes" : "No",
                  status: (
                    <div className="flex justify-center items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold ${comp.activeFlag
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                          }`}
                      >
                        {comp.activeFlag ? "ACTIVE" : "INACTIVE"}
                      </span>
                      {comp.isInherited && (
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-600">
                          INHERITED
                        </span>
                      )}
                    </div>
                  ),
                  actions: isRM ? (
                    <div><p className="italic font-medium text-gray-400 text-xs">No permission</p></div>
                  ) : (
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => {
                          if (comp.isInherited) return;
                          handleEditCompliance(comp);
                        }}
                        className={`${comp.isInherited
                          ? "text-gray-300 cursor-not-allowed pointer-events-none"
                          : "text-blue-600 hover:text-blue-800"
                          }`}
                        title={comp.isInherited ? "Cannot edit inherited compliance" : "Edit Compliance"}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCompliance(comp)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete / Uninherit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                }))}
              />

              {totalCompliancePages > 1 && (
                <Pagination
                  currentPage={compliancePage}
                  totalPages={totalCompliancePages}
                  onPrevious={() =>
                    setCompliancePage((prev) => Math.max(prev - 1, 1))
                  }
                  onNext={() =>
                    setCompliancePage((prev) =>
                      Math.min(prev + 1, totalCompliancePages),
                    )
                  }
                  className="mt-6 border-t border-gray-100 pt-4"
                />
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              No compliance configuration added yet.
            </p>
          )}
        </div>
      )}

      {activeTab === "escalation" && (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold">Project Escalation Matrix</h3>

            {!isRM && (
              <button
                onClick={() => {
                  setConfigType("escalation");
                  setOpenConfigModal(true);
                }}
                className="w-full sm:w-auto bg-[#263383] text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 shadow-md active:scale-95"
              >
                + Create Escalation
              </button>
            )}
          </div>

          {projectEscalations.length > 0 ? (
            <>
              <GenericTable
                headers={["Level", "Name", "Role", "Email", "Phone", "Status", "Action"]}
                columns={["level", "contactName", "contactRole", "email", "phone", "status", "action"]}
                rows={paginatedEscalations.map((esc) => ({
                  ...esc,
                  level: formatLevel(esc.escalationLevel),
                  status: (
                    <div className="flex justify-center items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold ${esc.activeFlag
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                          }`}
                      >
                        {esc.activeFlag ? "ACTIVE" : "INACTIVE"}
                      </span>
                      {esc.source === "INHERITED" && (
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                          INHERITED
                        </span>
                      )}
                    </div>
                  ),
                  action: isRM ? (
                    <div><p className="text-gray-400 italic text-xs">No permission</p></div>
                  ) : (
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => {
                          if (esc.source === "INHERITED") return;
                          handleEditEscalation(esc);
                        }}
                        className={`${esc.source === "INHERITED"
                          ? "text-gray-300 cursor-not-allowed pointer-events-none"
                          : "text-blue-600 hover:text-blue-800"
                          }`}
                        title={esc.source === "INHERITED" ? "Cannot edit inherited escalation" : "Edit"}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEscalation(esc)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete / Uninherit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                }))}
              />

              {totalEscalationPages > 1 && (
                <Pagination
                  currentPage={escalationPage}
                  totalPages={totalEscalationPages}
                  onPrevious={() =>
                    setEscalationPage((prev) => Math.max(prev - 1, 1))
                  }
                  onNext={() =>
                    setEscalationPage((prev) =>
                      Math.min(prev + 1, totalEscalationPages),
                    )
                  }
                  className="mt-6 border-t border-gray-100 pt-4"
                />
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              No escalation configuration added yet.
            </p>
          )}
        </div>
      )}

      {/* CONFIGURATION MODAL */}
      {openConfigModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => {
                setOpenConfigModal(false);
                setInheritMode(false);
                setFormData(DEFAULT_FORM_STATE);
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <div className="px-3 py-1.5 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold capitalize">
                {inheritMode
                  ? `Inherit ${configType === "sla"
                    ? "SLAs"
                    : configType === "compliance"
                      ? "Compliance"
                      : "Escalation Contacts"
                  } from ${project?.client?.client_name || "Client"}`
                  : `Create ${configType} Configuration`}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {configType === "pre-requisites" && (
                <>
                  {!inheritMode ? (
                    /* MANUAL FORM VIEW */
                    <div className="space-y-6">
                      <ComplianceForm
                        formData={formData}
                        setFormData={setFormData}
                      />

                      {/* Action buttons placed OUTSIDE the ComplianceForm component */}
                      <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={handleComplianceInheritClick}
                          className="text-[#263383] font-semibold hover:underline text-sm flex items-center gap-1"
                        >
                          ← Inherit from Client Defaults
                        </button>
                        <button
                          type="button"
                          onClick={handleComplianceManualSave}
                          className="bg-[#263383] text-white px-6 py-2 rounded-lg text-sm hover:opacity-90 shadow-sm"
                        >
                          {formData.projectComplianceId
                            ? "Update Compliance Configuration"
                            : "Save Compliance Configuration"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* INHERITANCE TABLE VIEW */
                    <div className="space-y-4">
                      {clientCompliance.length > 0 &&
                        clientCompliance.every((c) => c.isAlreadyMapped) ? (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                          <p className="text-sm text-blue-800 font-medium">
                            All available client compliance requirements are
                            already inherited.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 mb-2">
                          Select compliance requirements to map:
                        </p>
                      )}

                      <GenericTable
                        headers={["Select", "Requirement Name", "Type"]}
                        columns={["selection", "requirementName", "requirementType"]}
                        rows={clientCompliance.map((comp) => ({
                          ...comp,
                          selection: (
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#263383] disabled:opacity-50"
                              disabled={comp.isAlreadyMapped}
                              checked={selectedClientCompliance.includes(comp.requirementType)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClientCompliance([...selectedClientCompliance, comp.requirementType]);
                                } else {
                                  setSelectedClientCompliance(selectedClientCompliance.filter((t) => t !== comp.requirementType));
                                }
                              }}
                            />
                          ),
                          requirementName: (
                            <div className="flex items-center gap-2">
                              {comp.requirementName}
                              {comp.isAlreadyMapped && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase font-bold">
                                  Mapped
                                </span>
                              )}
                            </div>
                          ),
                          rowClass: comp.isAlreadyMapped ? "bg-gray-50/50" : ""
                        }))}
                      />

                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          onClick={() => setInheritMode(false)}
                          className="px-4 py-2 text-gray-500 text-sm"
                        >
                          Back to Manual
                        </button>
                        <button
                          onClick={saveInheritedCompliance}
                          disabled={selectedClientCompliance.length === 0}
                          className="bg-[#263383] text-white px-6 py-2 rounded-lg text-sm disabled:bg-gray-300"
                        >
                          Map to Project
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* SLA Configuration Views */}
              {configType === "sla" && (
                <>
                  {!inheritMode ? (
                    /* MANUAL CREATE VIEW */
                    <div className="space-y-6">
                      <SLAForm formData={formData} setFormData={setFormData} />
                      <div className="flex justify-between items-center mt-6">
                        <button
                          onClick={handleInheritClick}
                          className="text-[#263383] font-medium hover:underline text-sm"
                        >
                          ← Inherit from Client Defaults
                        </button>
                        <button
                          onClick={() => {
                            handleManualSave();
                          }}
                          className="bg-[#263383] text-white px-6 py-2 rounded-lg text-sm hover:opacity-90"
                        >
                          Save SLA Configuration
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* INHERIT FROM CLIENT VIEW */
                    <div className="space-y-4">
                      {clientSlas.length > 0 &&
                        clientSlas.every((sla) => sla.isAlreadyMapped) ? (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                          <p className="text-sm text-blue-800">
                            All available client SLAs have already been
                            inherited for this project.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 mb-2">
                          Select default client SLAs to map to this project:
                        </p>
                      )}
                      <GenericTable
                        headers={["Select", "Type", "Duration", "Warning"]}
                        columns={["selection", "slaType", "slaDurationDays", "warningThresholdDays"]}
                        rows={clientSlas.map((sla) => ({
                          ...sla,
                          selection: (
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#263383] disabled:opacity-50"
                              checked={selectedClientSlas.includes(sla.slaType)}
                              disabled={sla.isAlreadyMapped}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClientSlas([...selectedClientSlas, sla.slaType]);
                                } else {
                                  setSelectedClientSlas(selectedClientSlas.filter((t) => t !== sla.slaType));
                                }
                              }}
                            />
                          ),
                          slaType: (
                            <div className="flex items-center gap-2">
                              {sla.slaType}
                              {sla.isAlreadyMapped && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                  Already Inherited
                                </span>
                              )}
                            </div>
                          ),
                          slaDurationDays: `${sla.slaDurationDays} Days`,
                          warningThresholdDays: `${sla.warningThresholdDays} Days`,
                          rowClass: sla.isAlreadyMapped ? "bg-gray-50/50" : ""
                        }))}
                      />

                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          onClick={() => setInheritMode(false)}
                          className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700"
                        >
                          Back to Manual
                        </button>
                        <button
                          onClick={saveInheritedSlas}
                          disabled={selectedClientSlas.length === 0}
                          className="bg-[#263383] text-white px-6 py-2 rounded-lg text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Map to Project
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Compliance Form */}
              {/* {configType === "compliance" && (
              <ComplianceForm formData={formData} setFormData={setFormData} />
            )} */}

              {configType === "escalation" && (
                <>
                  {!inheritMode ? (
                    /* ================= MANUAL VIEW ================= */
                    <div className="space-y-6">
                      <EscalationForm
                        formData={formData}
                        setFormData={setFormData}
                      />

                      <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={handleEscalationInheritClick}
                          className="text-[#263383] font-semibold hover:underline text-sm"
                        >
                          ← Inherit from Client Defaults
                        </button>

                        <button
                          type="button"
                          onClick={
                            formData.projectEscalationId
                              ? handleEscalationUpdate
                              : handleEscalationManualSave
                          }
                          className="bg-[#263383] text-white px-6 py-2 rounded-lg text-sm hover:opacity-90 shadow-sm"
                        >
                          Save Escalation Configuration
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ================= INHERIT VIEW ================= */
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 mb-2">
                        Select escalation contacts to map:
                      </p>

                      <div className="max-h-60 overflow-y-auto border rounded-md">
                      <GenericTable
                        headers={["Select", "Level", "Name", "Role"]}
                        columns={["selection", "level", "name", "contactRole"]}
                        rows={clientEscalations.map((contact) => ({
                          ...contact,
                          selection: (
                            <input
                              type="checkbox"
                              disabled={contact.isAlreadyMapped}
                              checked={selectedClientEscalations.includes(contact.contactId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClientEscalations([...selectedClientEscalations, contact.contactId]);
                                } else {
                                  setSelectedClientEscalations(selectedClientEscalations.filter((id) => id !== contact.contactId));
                                }
                              }}
                              className="h-4 w-4 accent-[#263383]"
                            />
                          ),
                          level: formatLevel(contact.escalationLevel),
                          name: (
                            <div className="flex items-center gap-2">
                              {contact.contactName}
                              {contact.isAlreadyMapped && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase font-bold">
                                  Mapped
                                </span>
                              )}
                            </div>
                          ),
                          rowClass: contact.isAlreadyMapped ? "bg-gray-50/50" : ""
                        }))}
                      />
                      </div>

                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          onClick={() => setInheritMode(false)}
                          className="px-4 py-2 text-gray-500 text-sm"
                        >
                          Back to Manual
                        </button>

                        <button
                          onClick={saveInheritedEscalations}
                          disabled={selectedClientEscalations.length === 0}
                          className="bg-[#263383] text-white px-6 py-2 rounded-lg text-sm disabled:bg-gray-300"
                        >
                          Map to Project
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <DemandModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          projectDetails={project}
          onSuccess={() => setModalOpen(false)}
        />
      )}

      {/* ================= Add Deliverable Role Modal ================= */}

      <AddDeliverableRoleModal
        open={openDeliverableRoleModal}
        onClose={() => setOpenDeliverableRoleModal(false)}
        categories={categories}
        proficiencyLevels={proficiencyLevels}
      />

      <ConfirmationModal
        isOpen={openConfirmModal}
        title="Delete Project"
        message={
          deleteMessage ||
          "Are you sure you want to delete this project SLA? This action cannot be undone."
        }
        onConfirm={confirmDelete}
        onCancel={() => setOpenConfirmModal(false)}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default RMSProjectDetails;
