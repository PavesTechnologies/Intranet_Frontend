import React, { useState, useEffect, useMemo } from "react";
import api from "../../../../api/axiosInstance";
import { EditIcon, DeleteIcon, PrevIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { showStatusToast } from "../../../../components/toastfy/toast";

// Services & Hooks
import { getProjectById } from "../../../resource_management/services/projectService";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";
import { useAuth } from "@/contexts/AuthContext";

// Components
import SLAForm from "../../../resource_management/models/client_configuration/forms/SLAForm";
import ComplianceForm from "../../../resource_management/models/client_configuration/forms/ComplianceForm";
import EscalationForm from "../../../resource_management/models/client_configuration/forms/EscalationForm";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Pagination from "../../../../components/Pagination/pagination";
import Button from "../../../../components/Button/Button";
import { Tabs, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Modal from "../../../../components/Modal/modal";
import GenericTable from "../../../../components/Table/table";

const RMS_BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;

const ProjectConfigurations = ({ projectId }) => {
  const { getEnumValues } = useEnums();
  const { user } = useAuth();
  const roles = user?.roles;

  // Role mapping & switcher (support multi-role users: PM / RM / DL)
  const ROLE_LABELS = {
    Project_Manager: "Project Manager",
    Resource_Manager: "Resource Manager",
    Delivery_Manager: "Delivery Manager",
  };

  const normalizeRoleKey = (role = "") =>
    String(role || "")
      .replace(/^ROLE[-_\s]/i, "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

  const toConfigRole = (role = "") => {
    const n = normalizeRoleKey(role);
    if (n.includes("PROJECT") || n.includes("PROJECTMANAGER"))
      return "Project_Manager";
    if (n.includes("RESOURCEMANAGER") || n.includes("RESOURCEMANAGER"))
      return "Resource_Manager";
    if (
      n.includes("DELIVERYMANAGER") ||
      n.includes("DELIVERY") ||
      n.includes("DELIVERY_LEAD")
    )
      return "Delivery_Manager";
    return "";
  };

  const getRoleOptions = (roles = []) => {
    const roleList = Array.isArray(roles)
      ? roles
      : String(roles || "")
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean);

    const seen = new Set();
    return roleList.reduce((options, role) => {
      const value = toConfigRole(role);
      if (!value || seen.has(value)) return options;
      seen.add(value);
      options.push({ value, label: ROLE_LABELS[value] || value });
      return options;
    }, []);
  };

  const roleOptions = useMemo(() => getRoleOptions(roles), [roles]);
  const [selectedRole, setSelectedRole] = useState(() => {
    if (!roleOptions || roleOptions.length === 0) return "";
    // Prefer Project Manager view when present
    if (roleOptions.some((o) => o.value === "Project_Manager"))
      return "Project_Manager";
    return roleOptions[0].value;
  });

  const isRM = selectedRole === "Resource_Manager";
  const canEdit = selectedRole === "Project_Manager";

  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState("sla");
  const [loading, setLoading] = useState(true);

  // Lists
  const [projectSlas, setProjectSlas] = useState([]);
  const [projectCompliance, setProjectCompliance] = useState([]);
  const [projectEscalations, setProjectEscalations] = useState([]);

  // Pagination
  const ITEMS_PER_PAGE = 5;
  const [slaPage, setSlaPage] = useState(1);
  const [compliancePage, setCompliancePage] = useState(1);
  const [escalationPage, setEscalationPage] = useState(1);

  // Modal & Form States
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const [configType, setConfigType] = useState(null); // "sla" | "pre-requisites" | "escalation"
  const [inheritMode, setInheritMode] = useState(false);
  const DEFAULT_FORM_STATE = { activeFlag: true };
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);

  // Inheritance States
  const [clientSlas, setClientSlas] = useState([]);
  const [selectedClientSlas, setSelectedClientSlas] = useState([]);
  const [clientCompliance, setClientCompliance] = useState([]);
  const [selectedClientCompliance, setSelectedClientCompliance] = useState([]);
  const [clientEscalations, setClientEscalations] = useState([]);
  const [selectedClientEscalations, setSelectedClientEscalations] = useState(
    [],
  );

  // Confirm Delete States
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteConfigId, setDeleteConfigId] = useState(null);
  const [deleteType, setDeleteType] = useState(null);

  // ---------------------------------------------------------
  // 1. DATA FETCHING
  // ---------------------------------------------------------

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await getProjectById(projectId);
      const projectObj = res?.data?.data ?? res?.data ?? null;
      setProject(projectObj);
      console.debug("Loaded project:", projectObj);
    } catch (err) {
      console.error("Failed to fetch project details", err);
      showStatusToast(
        err.response?.data?.message || "Failed to fetch project details.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSLAs = async () => {
    try {
      const res = await api.get(
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

  const fetchProjectCompliance = async () => {
    try {
      const res = await api.get(
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

  const fetchProjectEscalations = async () => {
    try {
      const res = await api.get(
        `${RMS_BASE_URL}/api/projects/${projectId}/escalations`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setProjectEscalations(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch escalations", err);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [projectId]);

  useEffect(() => {
    if (activeTab === "sla") fetchProjectSLAs();
    if (activeTab === "pre-requisites") fetchProjectCompliance();
    if (activeTab === "escalation") fetchProjectEscalations();
  }, [activeTab, projectId]);

  // Refetch lists when the active role changes so data/permissions reflect current context
  useEffect(() => {
    // reset pagination when switching roles
    setSlaPage(1);
    setCompliancePage(1);
    setEscalationPage(1);
    // reload whatever tab is active
    if (activeTab === "sla") fetchProjectSLAs();
    if (activeTab === "pre-requisites") fetchProjectCompliance();
    if (activeTab === "escalation") fetchProjectEscalations();
  }, [selectedRole]);

  // ---------------------------------------------------------
  // 2. SLA HANDLERS
  // ---------------------------------------------------------

  const handleInheritClick = async () => {
    if (!project?.clientId) {
      console.warn("Client ID not available yet; cannot fetch client SLAs.");
      showStatusToast("Client data not loaded yet.", "warning");
      return;
    }

    try {
      const res = await api.get(
        `${RMS_BASE_URL}/api/client-sla/clientSLA/${project.clientId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const existingTypes = projectSlas.map((ps) => ps.slaType);
      const validatedSlas = (res.data.data || [])
        .filter((sla) => isActiveRecord(sla))
        .map((sla) => ({
          ...sla,
          isAlreadyMapped: existingTypes.includes(sla.slaType),
        }));
      setClientSlas(validatedSlas);
      setInheritMode(true);
    } catch (err) {
      console.error("Failed to fetch client SLAs", err);
    }
  };

  const saveInheritedSlas = async () => {
    try {
      if (projectSlas.length + selectedClientSlas.length > 3) {
        showStatusToast(
          "Adding these would exceed the limit of 3 SLAs for this project.",
          "warning",
        );
        return;
      }
      const promises = selectedClientSlas.map((type) =>
        api.post(
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
      showStatusToast("SLAs inherited successfully.", "success");
    } catch (err) {
      console.error("Error inheriting SLAs", err);
    }
  };

  const handleManualSave = async () => {
    try {
      const isEditing = !!formData.projectSlaId;
      if (!isEditing) {
        if (projectSlas.length >= 3) {
          showStatusToast(
            "Maximum of 3 SLA configurations allowed per project.",
            "warning",
          );
          return;
        }
        const isDuplicate = projectSlas.some(
          (sla) => sla.slaType === formData.slaType,
        );
        if (isDuplicate) {
          showStatusToast(
            `The SLA type "${formData.slaType}" is already configured.`,
            "warning",
          );
          return;
        }
      }
      const payload = { ...formData, project: { pmsProjectId: projectId } };
      await api.post(`${RMS_BASE_URL}/api/project-sla/save`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE);
      fetchProjectSLAs();
      showStatusToast("SLA configuration saved successfully.", "success");
    } catch (err) {
      console.error("Error saving project SLA", err);
      showStatusToast(
        err.response?.data?.message || "Failed to save SLA configuration",
        "error",
      );
    }
  };

  const handleEditSla = (sla) => {
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

  const handleDeleteSla = async (sla) => {
    const message = sla.isInherited
      ? "This SLA was inherited from client. Do you want to uninherit it from this project?"
      : "Are you sure you want to delete this custom SLA configuration?";
    setDeleteMessage(message);
    setDeleteConfigId(sla.projectSlaId);
    setDeleteType("sla");
    setOpenConfirmModal(true);
  };

  // ---------------------------------------------------------
  // 3. COMPLIANCE (PRE-REQUISITES) HANDLERS
  // ---------------------------------------------------------

  const handleComplianceInheritClick = async () => {
    try {
      const projectRes = await api.get(
        `${RMS_BASE_URL}/api/project-compliance/project/${projectId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const latestProjectCompliance = projectRes.data.data || [];
      const clientRes = await api.get(
        `${RMS_BASE_URL}/api/client-compliance/clientCompliance/${project.clientId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const existingTypes = latestProjectCompliance.map(
        (pc) => pc.requirementType,
      );
      const validatedCompliance = (clientRes.data.data || [])
        .filter((comp) => isActiveRecord(comp))
        .map((comp) => ({
          ...comp,
          isAlreadyMapped: existingTypes.includes(comp.requirementType),
        }));
      setProjectCompliance(latestProjectCompliance);
      setClientCompliance(validatedCompliance);
      setSelectedClientCompliance([]);
      setInheritMode(true);
    } catch (err) {
      console.error("Failed to fetch compliance", err);
    }
  };

  const saveInheritedCompliance = async () => {
    try {
      if (selectedClientCompliance.length === 0) return;
      const promises = selectedClientCompliance.map((complianceType) =>
        api.post(
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
      setOpenConfigModal(false);
      setInheritMode(false);
      setSelectedClientCompliance([]);
      fetchProjectCompliance();
      showStatusToast(
        "Compliance requirements inherited successfully.",
        "success",
      );
    } catch (err) {
      console.error("Error inheriting compliance", err);
    }
  };

  const handleComplianceManualSave = async () => {
    try {
      const isDuplicate = projectCompliance.some(
        (c) =>
          c.requirementType === formData.requirementType &&
          c.isInherited === false,
      );
      if (isDuplicate && !formData.projectComplianceId) {
        showStatusToast(
          `The compliance requirement "${formData.requirementType}" is already configured for this project.`,
          "warning",
        );
        return;
      }
      const payload = { ...formData, project: { pmsProjectId: projectId } };
      await api.post(`${RMS_BASE_URL}/api/project-compliance/save`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE);
      fetchProjectCompliance();
      showStatusToast(
        "Compliance configuration saved successfully.",
        "success",
      );
    } catch (err) {
      console.error("Error saving project compliance", err);
      showStatusToast(
        err.response?.data?.message || "An error occurred during save.",
        "error",
      );
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
    setConfigType("pre-requisites");
    setOpenConfigModal(true);
    setInheritMode(false);
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

  // ---------------------------------------------------------
  // 4. ESCALATION HANDLERS
  // ---------------------------------------------------------

  const handleEscalationInheritClick = async () => {
    try {
      const projectRes = await api.get(
        `${RMS_BASE_URL}/api/projects/${projectId}/escalations`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const existingContactIds = (projectRes.data.data || []).map(
        (e) => e.contactId,
      );
      const clientRes = await api.get(
        `${RMS_BASE_URL}/api/client-contact/clientContact/${project.clientId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const validated = (clientRes.data.data || [])
        .filter((contact) => isActiveRecord(contact))
        .map((contact) => ({
          ...contact,
          isAlreadyMapped: existingContactIds.includes(contact.contactId),
        }));
      setClientEscalations(validated);
      setSelectedClientEscalations([]);
      setInheritMode(true);
    } catch (err) {
      console.error("Failed to fetch client escalation contacts", err);
    }
  };

  const saveInheritedEscalations = async () => {
    try {
      if (selectedClientEscalations.length === 0) return;
      const payload = {
        projectId: projectId,
        type: "inherit",
        contactId: selectedClientEscalations,
      };
      await api.post(`${RMS_BASE_URL}/api/projects/escalations/save`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOpenConfigModal(false);
      setInheritMode(false);
      setSelectedClientEscalations([]);
      fetchProjectEscalations();
      showStatusToast("Escalations inherited successfully.", "success");
    } catch (err) {
      console.error("Error inheriting escalation", err);
    }
  };

  const handleEscalationManualSave = async () => {
    try {
      const payload = { ...formData, projectId: projectId, type: "manual" };
      await api.post(`${RMS_BASE_URL}/api/projects/escalations/save`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE);
      fetchProjectEscalations();
      showStatusToast("Escalation saved successfully.", "success");
    } catch (err) {
      console.error("Error saving escalation", err);
    }
  };

  const handleEscalationUpdate = async () => {
    try {
      const payload = {
        escalationLevel: formData.escalationLevel,
        contactName: formData.contactName,
        contactRole: formData.contactRole,
        email: formData.email,
        phone: formData.phone,
        activeFlag: formData.activeFlag,
      };
      await api.put(
        `${RMS_BASE_URL}/api/projects/update-escalation/${formData.projectEscalationId}`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE);
      fetchProjectEscalations();
      showStatusToast("Escalation updated successfully.", "success");
    } catch (err) {
      console.error("Error updating escalation", err);
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

  const formatLevel = (level) => {
    if (!level) return "";
    if (level.startsWith("LEVEL_")) return `L${level.split("_")[1]}`;
    if (level.startsWith("L") && level.includes("Level-"))
      return `L${level.split("-")[1]}`;
    return level;
  };

  const isActiveRecord = (record) =>
    (record?.activeFlag ?? record?.active_flag ?? true) === true;

  // ---------------------------------------------------------
  // 5. DELETE CONFIRMATION
  // ---------------------------------------------------------

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      if (deleteType === "sla") {
        await api.delete(`${RMS_BASE_URL}/api/project-sla/${deleteConfigId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        fetchProjectSLAs();
        showStatusToast("SLA configuration deleted successfully.", "success");
      }
      if (deleteType === "compliance") {
        await api.delete(
          `${RMS_BASE_URL}/api/project-compliance/${deleteConfigId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        fetchProjectCompliance();
        showStatusToast(
          "Compliance configuration deleted successfully.",
          "success",
        );
      }
      if (deleteType === "escalation") {
        await api.delete(
          `${RMS_BASE_URL}/api/projects/delete-escalation/${deleteConfigId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        fetchProjectEscalations();
        showStatusToast("Escalation deleted successfully.", "success");
      }
      setOpenConfirmModal(false);
    } catch (err) {
      showStatusToast(err.response?.data?.message || "Delete failed.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  if (loading)
    return (
      <div className="p-10 text-center">
        <LoadingSpinner text="Loading Configurations..." />
      </div>
    );
  if (!project)
    return <div className="p-10 text-center">Project details not found.</div>;

  const validCompliance = projectCompliance.filter(
    (comp) => comp.requirementType,
  );
  const paginatedSlas = projectSlas.slice(
    (slaPage - 1) * ITEMS_PER_PAGE,
    slaPage * ITEMS_PER_PAGE,
  );
  const paginatedCompliance = validCompliance.slice(
    (compliancePage - 1) * ITEMS_PER_PAGE,
    compliancePage * ITEMS_PER_PAGE,
  );
  const paginatedEscalations = projectEscalations.slice(
    (escalationPage - 1) * ITEMS_PER_PAGE,
    escalationPage * ITEMS_PER_PAGE,
  );
  const totalSlaPages = Math.ceil(projectSlas.length / ITEMS_PER_PAGE);
  const totalCompliancePages = Math.ceil(
    validCompliance.length / ITEMS_PER_PAGE,
  );
  const totalEscalationPages = Math.ceil(
    projectEscalations.length / ITEMS_PER_PAGE,
  );

  const renderSourceBadge = (isInherited) => (
    <span
      className={`px-2 py-1 rounded text-[10px] font-bold ${
        isInherited
          ? "bg-blue-50 text-blue-600"
          : "bg-purple-50 text-purple-600"
      }`}
    >
      {isInherited ? "INHERITED" : "CUSTOM"}
    </span>
  );

  const renderActiveBadge = (activeFlag) => (
    <span
      className={`px-2 py-1 rounded text-[10px] font-bold ${
        activeFlag ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {activeFlag ? "ACTIVE" : "INACTIVE"}
    </span>
  );

  const slaRows = paginatedSlas.map((sla) => ({
    ...sla,
    type: <span className="font-semibold">{sla.slaType}</span>,
    duration: sla.slaDurationDays ?? "-",
    warning: sla.warningThresholdDays ?? "-",
    status: renderSourceBadge(sla.isInherited),
    actions: canEdit ? (
      <div className="flex justify-center gap-1">
        <Button
          onClick={() => !sla.isInherited && handleEditSla(sla)}
          variant="ghost"
          size="icon"
          disabled={sla.isInherited}
          className={
            sla.isInherited
              ? "!text-gray-300"
              : "!text-blue-600 hover:!bg-blue-50"
          }
        >
          <EditIcon className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => handleDeleteSla(sla)}
          variant="ghost"
          size="icon"
          className="!text-red-600 hover:!bg-red-50"
        >
          <DeleteIcon className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      <span className="text-gray-400">View Only</span>
    ),
  }));

  const complianceRows = paginatedCompliance.map((comp) => ({
    ...comp,
    requirement_type: (
      <span className="font-semibold">{comp.requirementType}</span>
    ),
    requirement_name: comp.requirementName || "-",
    mandatory: comp.mandatoryFlag ? "Yes" : "No",
    status: (
      <div className="flex justify-center gap-1">
        {renderActiveBadge(comp.activeFlag)}
        {comp.isInherited && (
          <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-600">
            INHERITED
          </span>
        )}
      </div>
    ),
    actions: canEdit ? (
      <div className="flex justify-center gap-1">
        <Button
          onClick={() => !comp.isInherited && handleEditCompliance(comp)}
          variant="ghost"
          size="icon"
          disabled={comp.isInherited}
          className={
            comp.isInherited
              ? "!text-gray-300"
              : "!text-blue-600 hover:!bg-blue-50"
          }
        >
          <EditIcon className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => handleDeleteCompliance(comp)}
          variant="ghost"
          size="icon"
          className="!text-red-600 hover:!bg-red-50"
        >
          <DeleteIcon className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      <span className="text-gray-400">View Only</span>
    ),
  }));

  const escalationRows = paginatedEscalations.map((esc) => ({
    ...esc,
    level: (
      <span className="font-semibold">{formatLevel(esc.escalationLevel)}</span>
    ),
    contact_name: esc.contactName || "-",
    contact_role: esc.contactRole || "-",
    status: (
      <div className="flex justify-center gap-1">
        {renderActiveBadge(esc.activeFlag)}
        {esc.source === "INHERITED" && (
          <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
            INHERITED
          </span>
        )}
      </div>
    ),
    actions: canEdit ? (
      <div className="flex justify-center gap-1">
        <Button
          onClick={() =>
            esc.source !== "INHERITED" && handleEditEscalation(esc)
          }
          variant="ghost"
          size="icon"
          disabled={esc.source === "INHERITED"}
          className={
            esc.source === "INHERITED"
              ? "!text-gray-300"
              : "!text-blue-600 hover:!bg-blue-50"
          }
        >
          <EditIcon className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => handleDeleteEscalation(esc)}
          variant="ghost"
          size="icon"
          className="!text-red-600 hover:!bg-red-50"
        >
          <DeleteIcon className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      <span className="text-gray-400">View Only</span>
    ),
  }));

  const formatLabel = (value) =>
    value ? String(value).replace(/_/g, " ").toUpperCase() : "-";

  const mappedBadge = (isAlreadyMapped) => (
    <span
      className={`px-2 py-1 rounded text-[10px] font-bold ${
        isAlreadyMapped
          ? "bg-slate-100 text-slate-500"
          : "bg-blue-50 text-blue-700"
      }`}
    >
      {isAlreadyMapped ? "MAPPED" : "AVAILABLE"}
    </span>
  );

  const inheritCheckboxClass =
    "h-4 w-4 rounded border-gray-300 text-[#263383] focus:ring-[#263383] disabled:cursor-not-allowed disabled:opacity-40";

  const clientSlaRows = clientSlas.map((sla) => ({
    ...sla,
    selection: (
      <div className="flex w-full justify-center">
        <input
          type="checkbox"
          disabled={sla.isAlreadyMapped}
          checked={selectedClientSlas.includes(sla.slaType)}
          className={inheritCheckboxClass}
          onChange={(e) =>
            setSelectedClientSlas((prev) =>
              e.target.checked
                ? [...prev, sla.slaType]
                : prev.filter((type) => type !== sla.slaType),
            )
          }
        />
      </div>
    ),
    type: formatLabel(sla.slaType),
    duration: `${sla.slaDurationDays}d / ${sla.warningThresholdDays}d`,
    mapping: mappedBadge(sla.isAlreadyMapped),
    rowClass: sla.isAlreadyMapped ? "opacity-60" : "",
  }));

  const clientComplianceRows = clientCompliance.map((comp) => ({
    ...comp,
    selection: (
      <div className="flex w-full justify-center">
        <input
          type="checkbox"
          disabled={comp.isAlreadyMapped}
          checked={selectedClientCompliance.includes(comp.requirementType)}
          className={inheritCheckboxClass}
          onChange={(e) =>
            setSelectedClientCompliance((prev) =>
              e.target.checked
                ? [...prev, comp.requirementType]
                : prev.filter((type) => type !== comp.requirementType),
            )
          }
        />
      </div>
    ),
    requirement_name: comp.requirementName || "-",
    requirement_type: formatLabel(comp.requirementType),
    mapping: mappedBadge(comp.isAlreadyMapped),
    rowClass: comp.isAlreadyMapped ? "opacity-60" : "",
  }));

  const clientEscalationRows = clientEscalations.map((esc) => ({
    ...esc,
    selection: (
      <div className="flex w-full justify-center">
        <input
          type="checkbox"
          disabled={esc.isAlreadyMapped}
          checked={selectedClientEscalations.includes(esc.contactId)}
          className={inheritCheckboxClass}
          onChange={(e) =>
            setSelectedClientEscalations((prev) =>
              e.target.checked
                ? [...prev, esc.contactId]
                : prev.filter((id) => id !== esc.contactId),
            )
          }
        />
      </div>
    ),
    level: formatLevel(esc.escalationLevel || esc.escalation_level),
    contact: `${esc.contactName || "-"} (${formatLabel(esc.contactRole)})`,
    mapping: mappedBadge(esc.isAlreadyMapped),
    rowClass: esc.isAlreadyMapped ? "opacity-60" : "",
  }));

  return (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="flex items-start justify-between">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="border-b border-gray-200"
        >
          <TabsList className="!inline-flex !h-auto !bg-transparent !p-0 !rounded-none items-center gap-6">
            {["sla", "pre-requisites", "escalation"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className={cn(
                  "pb-3 text-sm font-medium capitalize relative !rounded-none !bg-transparent !shadow-none border-b-2 -mb-px",
                  "data-[state=active]:!text-[#263383] data-[state=active]:!border-[#263383]",
                  "data-[state=inactive]:text-gray-500 data-[state=inactive]:border-transparent hover:text-gray-700",
                )}
              >
                {tab === "sla"
                  ? "SLA"
                  : tab === "pre-requisites"
                    ? "Pre-Requisites"
                    : tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {roleOptions && roleOptions.length > 1 ? (
          <div className="ml-4 mt-1 shrink-0">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-[12px] font-semibold text-gray-500">
                View As:
              </span>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v)}
              >
                <SelectTrigger className="h-9 min-w-[160px] rounded-xl border border-gray-200 bg-white px-3 text-[12px] font-bold text-gray-700 shadow-sm">
                  <SelectValue placeholder="View As" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="py-2 text-xs font-semibold"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </div>

      {/* SLA TAB */}
      {activeTab === "sla" && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Project SLA Configuration</h3>
            {canEdit && (
              <Button
                disabled={projectSlas.length >= 3}
                onClick={() => {
                  setFormData(DEFAULT_FORM_STATE);
                  setConfigType("sla");
                  setOpenConfigModal(true);
                }}
                variant="primary"
                size="small"
              >
                {projectSlas.length >= 3
                  ? "Limit Reached (3/3)"
                  : "+ Create SLA"}
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <GenericTable
              headers={[
                "Type",
                "Duration (Days)",
                "Warning (Days)",
                "Status",
                "Actions",
              ]}
              columns={["type", "duration", "warning", "status", "actions"]}
              rows={slaRows}
            />
          </div>
          {totalSlaPages > 1 && (
            <div className="pt-4">
              <Pagination
                currentPage={slaPage}
                totalPages={totalSlaPages}
                onPrevious={() => setSlaPage((p) => Math.max(p - 1, 1))}
                onNext={() => setSlaPage((p) => Math.min(p + 1, totalSlaPages))}
              />
            </div>
          )}
        </div>
      )}

      {/* PRE-REQUISITES TAB */}
      {activeTab === "pre-requisites" && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">
              Project Pre-requisites Configuration
            </h3>
            {canEdit && (
              <Button
                onClick={() => {
                  setFormData(DEFAULT_FORM_STATE);
                  setConfigType("pre-requisites");
                  setOpenConfigModal(true);
                }}
                variant="primary"
                size="small"
              >
                + Create Pre-requisites
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <GenericTable
              headers={[
                "Requirement Type",
                "Name",
                "Mandatory",
                "Status",
                "Actions",
              ]}
              columns={[
                "requirement_type",
                "requirement_name",
                "mandatory",
                "status",
                "actions",
              ]}
              rows={complianceRows}
            />
          </div>
          {totalCompliancePages > 1 && (
            <div className="pt-4">
              <Pagination
                currentPage={compliancePage}
                totalPages={totalCompliancePages}
                onPrevious={() => setCompliancePage((p) => Math.max(p - 1, 1))}
                onNext={() =>
                  setCompliancePage((p) =>
                    Math.min(p + 1, totalCompliancePages),
                  )
                }
              />
            </div>
          )}
        </div>
      )}

      {/* ESCALATION TAB */}
      {activeTab === "escalation" && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Project Escalation Matrix</h3>
            {canEdit && (
              <Button
                onClick={() => {
                  setConfigType("escalation");
                  setOpenConfigModal(true);
                }}
                variant="primary"
                size="small"
              >
                + Create Escalation
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <GenericTable
              headers={["Level", "Name", "Role", "Status", "Actions"]}
              columns={[
                "level",
                "contact_name",
                "contact_role",
                "status",
                "actions",
              ]}
              rows={escalationRows}
            />
          </div>
          {totalEscalationPages > 1 && (
            <div className="pt-4">
              <Pagination
                currentPage={escalationPage}
                totalPages={totalEscalationPages}
                onPrevious={() => setEscalationPage((p) => Math.max(p - 1, 1))}
                onNext={() =>
                  setEscalationPage((p) =>
                    Math.min(p + 1, totalEscalationPages),
                  )
                }
              />
            </div>
          )}
        </div>
      )}

      {/* CONFIG MODAL */}
      <Modal
        isOpen={openConfigModal}
        onClose={() => {
          setOpenConfigModal(false);
          setInheritMode(false);
          setFormData(DEFAULT_FORM_STATE);
        }}
        title={
          inheritMode
            ? `Inherit from ${project?.client?.client_name || "Client"}`
            : `${
                formData.projectSlaId ||
                formData.projectComplianceId ||
                formData.projectEscalationId
                  ? "Update"
                  : "Create"
              } ${configType}`
        }
        size="2xl"
        animation="zoom"
      >
        {configType === "sla" &&
          (inheritMode ? (
            <div className="space-y-4">
              <p className="text-sm">Select client SLAs to map:</p>
              <div className="overflow-x-auto">
                <GenericTable
                  headers={["Select", "Type", "Duration / Warning", "Mapping"]}
                  columns={["selection", "type", "duration", "mapping"]}
                  rows={clientSlaRows}
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setInheritMode(false)}
                >
                  Manual
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  disabled={selectedClientSlas.length === 0}
                  onClick={saveInheritedSlas}
                >
                  Map
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <SLAForm formData={formData} setFormData={setFormData} />
              <div className="flex justify-between mt-4">
                <Button
                  variant="link"
                  size="small"
                  onClick={handleInheritClick}
                >
                  <PrevIcon className="w-3.5 h-3.5" /> Inherit
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleManualSave}
                >
                  Save
                </Button>
              </div>
            </div>
          ))}

        {configType === "pre-requisites" &&
          (inheritMode ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <GenericTable
                  headers={[
                    "Select",
                    "Requirement Type",
                    "Requirement Name",
                    "Mapping",
                  ]}
                  columns={[
                    "selection",
                    "requirement_type",
                    "requirement_name",
                    "mapping",
                  ]}
                  rows={clientComplianceRows}
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setInheritMode(false)}
                >
                  Manual
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  disabled={selectedClientCompliance.length === 0}
                  onClick={saveInheritedCompliance}
                >
                  Map
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <ComplianceForm formData={formData} setFormData={setFormData} />
              <div className="flex justify-between mt-4">
                <Button
                  variant="link"
                  size="small"
                  onClick={handleComplianceInheritClick}
                >
                  <PrevIcon className="w-3.5 h-3.5" /> Inherit
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleComplianceManualSave}
                >
                  Save
                </Button>
              </div>
            </div>
          ))}

        {configType === "escalation" &&
          (inheritMode ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <GenericTable
                  headers={["Select", "Level", "Contact", "Mapping"]}
                  columns={["selection", "level", "contact", "mapping"]}
                  rows={clientEscalationRows}
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setInheritMode(false)}
                >
                  Manual
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  disabled={selectedClientEscalations.length === 0}
                  onClick={saveInheritedEscalations}
                >
                  Map
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <EscalationForm formData={formData} setFormData={setFormData} />
              <div className="flex justify-between mt-4">
                <Button
                  variant="link"
                  size="small"
                  onClick={handleEscalationInheritClick}
                >
                  <PrevIcon className="w-3.5 h-3.5" /> Inherit
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={
                    formData.projectEscalationId
                      ? handleEscalationUpdate
                      : handleEscalationManualSave
                  }
                >
                  Save
                </Button>
              </div>
            </div>
          ))}
      </Modal>

      {/* DELETE MODAL */}
      <ConfirmationModal
        isOpen={openConfirmModal}
        title="Confirm Action"
        message={deleteMessage}
        onConfirm={confirmDelete}
        onCancel={() => setOpenConfirmModal(false)}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default ProjectConfigurations;
