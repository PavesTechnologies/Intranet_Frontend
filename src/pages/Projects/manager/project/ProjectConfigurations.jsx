import React, { useState, useEffect } from "react";
import axios from "axios";
import { Edit, Trash2, ArrowLeft } from "lucide-react";
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

const RMS_BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;

const ProjectConfigurations = ({ projectId }) => {
  const { getEnumValues } = useEnums();
  const { user } = useAuth();
  const roles = user?.roles;
  const isRM = roles?.includes("Resource_Manager");

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
      setProject(res.data);
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

  const fetchProjectEscalations = async () => {
    try {
      const res = await axios.get(
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

  // ---------------------------------------------------------
  // 2. SLA HANDLERS
  // ---------------------------------------------------------

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
      setClientSlas(validatedSlas);
      setInheritMode(true);
    } catch (err) {
      console.error("Failed to fetch client SLAs", err);
    }
  };

  const saveInheritedSlas = async () => {
    try {
      if (projectSlas.length + selectedClientSlas.length > 3) {
        alert(
          "Adding these would exceed the limit of 3 SLAs for this project.",
        );
        return;
      }
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
    } catch (err) {
      console.error("Error inheriting SLAs", err);
    }
  };

  const handleManualSave = async () => {
    try {
      const isEditing = !!formData.projectSlaId;
      if (!isEditing) {
        if (projectSlas.length >= 3) {
          alert("Maximum of 3 SLA configurations allowed per project.");
          return;
        }
        const isDuplicate = projectSlas.some(
          (sla) => sla.slaType === formData.slaType,
        );
        if (isDuplicate) {
          alert(`The SLA type "${formData.slaType}" is already configured.`);
          return;
        }
      }
      const payload = { ...formData, project: { pmsProjectId: projectId } };
      await axios.post(`${RMS_BASE_URL}/api/project-sla/save`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE);
      fetchProjectSLAs();
    } catch (err) {
      console.error("Error saving project SLA", err);
      alert(err.response?.data?.message || "Failed to save SLA configuration");
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
      const projectRes = await axios.get(
        `${RMS_BASE_URL}/api/project-compliance/project/${projectId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const latestProjectCompliance = projectRes.data.data || [];
      const clientRes = await axios.get(
        `${RMS_BASE_URL}/api/client-compliance/clientCompliance/${project.clientId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const inheritedTypes = latestProjectCompliance
        .filter((pc) => pc.isInherited === true)
        .map((pc) => pc.requirementType);
      const validatedCompliance = (clientRes.data.data || []).map((comp) => ({
        ...comp,
        isAlreadyMapped: inheritedTypes.includes(comp.requirementType),
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
      setOpenConfigModal(false);
      setInheritMode(false);
      setSelectedClientCompliance([]);
      fetchProjectCompliance();
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
        alert(
          `The compliance requirement "${formData.requirementType}" is already configured for this project.`,
        );
        return;
      }
      const payload = { ...formData, project: { pmsProjectId: projectId } };
      await axios.post(`${RMS_BASE_URL}/api/project-compliance/save`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE);
      fetchProjectCompliance();
    } catch (err) {
      console.error("Error saving project compliance", err);
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
      const projectRes = await axios.get(
        `${RMS_BASE_URL}/api/projects/${projectId}/escalations`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const existingContactIds = (projectRes.data.data || []).map(
        (e) => e.contactId,
      );
      const clientRes = await axios.get(
        `${RMS_BASE_URL}/api/client-contact/clientContact/${project.clientId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const validated = (clientRes.data.data || []).map((contact) => ({
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
      await axios.post(
        `${RMS_BASE_URL}/api/projects/escalations/save`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setOpenConfigModal(false);
      setInheritMode(false);
      setSelectedClientEscalations([]);
      fetchProjectEscalations();
    } catch (err) {
      console.error("Error inheriting escalation", err);
    }
  };

  const handleEscalationManualSave = async () => {
    try {
      const payload = { ...formData, projectId: projectId, type: "manual" };
      await axios.post(
        `${RMS_BASE_URL}/api/projects/escalations/save`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE);
      fetchProjectEscalations();
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
      await axios.put(
        `${RMS_BASE_URL}/api/projects/update-escalation/${formData.projectEscalationId}`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setOpenConfigModal(false);
      setFormData(DEFAULT_FORM_STATE);
      fetchProjectEscalations();
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

  // ---------------------------------------------------------
  // 5. DELETE CONFIRMATION
  // ---------------------------------------------------------

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
        showStatusToast("SLA configuration deleted successfully.", "success");
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
        showStatusToast("Compliance configuration deleted successfully.", "success");
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

  return (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200">
        {["sla", "pre-requisites", "escalation"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium capitalize relative ${activeTab === tab ? "text-[#263383]" : "text-gray-500"}`}
          >
            {tab === "sla"
              ? "SLA"
              : tab === "pre-requisites"
                ? "Pre-Requisites"
                : tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#263383]" />
            )}
          </button>
        ))}
      </div>

      {/* SLA TAB */}
      {activeTab === "sla" && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Project SLA Configuration</h3>
            {!isRM && (
              <button
                disabled={projectSlas.length >= 3}
                onClick={() => {
                  setFormData(DEFAULT_FORM_STATE);
                  setConfigType("sla");
                  setOpenConfigModal(true);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-all ${projectSlas.length >= 3 ? "bg-gray-300 cursor-not-allowed" : "bg-[#263383] hover:opacity-90 shadow-md"}`}
              >
                {projectSlas.length >= 3
                  ? "Limit Reached (3/3)"
                  : "+ Create SLA"}
              </button>
            )}
          </div>
          {projectSlas.length > 0 ? (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-center">Duration (Days)</th>
                    <th className="p-4 text-center">Warning (Days)</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedSlas.map((sla) => (
                    <tr key={sla.projectSlaId} className="hover:bg-gray-50">
                      <td className="p-4 font-semibold">{sla.slaType}</td>
                      <td className="p-4 text-center">{sla.slaDurationDays}</td>
                      <td className="p-4 text-center">
                        {sla.warningThresholdDays}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold ${sla.isInherited ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}
                        >
                          {sla.isInherited ? "INHERITED" : "CUSTOM"}
                        </span>
                      </td>
                      <td className="p-4 text-center flex justify-center gap-3">
                        <button
                          onClick={() => !sla.isInherited && handleEditSla(sla)}
                          className={
                            sla.isInherited ? "text-gray-300" : "text-blue-600"
                          }
                          disabled={sla.isInherited}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSla(sla)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {Math.ceil(projectSlas.length / ITEMS_PER_PAGE) > 1 && (
                <Pagination
                  currentPage={slaPage}
                  totalPages={Math.ceil(projectSlas.length / ITEMS_PER_PAGE)}
                  onPrevious={() => setSlaPage((p) => Math.max(p - 1, 1))}
                  onNext={() =>
                    setSlaPage((p) =>
                      Math.min(
                        p + 1,
                        Math.ceil(projectSlas.length / ITEMS_PER_PAGE),
                      ),
                    )
                  }
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No SLA configuration added yet.
            </p>
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
            {!isRM && (
              <button
                onClick={() => {
                  setFormData(DEFAULT_FORM_STATE);
                  setConfigType("pre-requisites");
                  setOpenConfigModal(true);
                }}
                className="bg-[#263383] text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 shadow-md"
              >
                + Create Pre-requisites
              </button>
            )}
          </div>
          {projectCompliance.length > 0 ? (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-4">Requirement Type</th>
                    <th className="p-4">Name</th>
                    <th className="p-4 text-center">Mandatory</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedCompliance.map((comp) => (
                    <tr
                      key={comp.projectComplianceId}
                      className="hover:bg-gray-50"
                    >
                      <td className="p-4 font-semibold">
                        {comp.requirementType}
                      </td>
                      <td className="p-4">{comp.requirementName}</td>
                      <td className="p-4 text-center">
                        {comp.mandatoryFlag ? "Yes" : "No"}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold ${comp.activeFlag ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                        >
                          {comp.activeFlag ? "ACTIVE" : "INACTIVE"}
                        </span>
                        {comp.isInherited && (
                          <span className="ml-1 px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-600">
                            INHERITED
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center flex justify-center gap-3">
                        <button
                          onClick={() =>
                            !comp.isInherited && handleEditCompliance(comp)
                          }
                          className={
                            comp.isInherited ? "text-gray-300" : "text-blue-600"
                          }
                          disabled={comp.isInherited}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompliance(comp)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No compliance configuration added yet.
            </p>
          )}
        </div>
      )}

      {/* ESCALATION TAB */}
      {activeTab === "escalation" && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Project Escalation Matrix</h3>
            {!isRM && (
              <button
                onClick={() => {
                  setConfigType("escalation");
                  setOpenConfigModal(true);
                }}
                className="bg-[#263383] text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 shadow-md"
              >
                + Create Escalation
              </button>
            )}
          </div>
          {projectEscalations.length > 0 ? (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-4">Level</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Role</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedEscalations.map((esc) => (
                    <tr
                      key={esc.projectEscalationId}
                      className="hover:bg-gray-50"
                    >
                      <td className="p-4 font-semibold">
                        {formatLevel(esc.escalationLevel)}
                      </td>
                      <td className="p-4">{esc.contactName}</td>
                      <td className="p-4">{esc.contactRole}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold ${esc.activeFlag ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                        >
                          {esc.activeFlag ? "ACTIVE" : "INACTIVE"}
                        </span>
                        {esc.source === "INHERITED" && (
                          <span className="ml-1 px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                            INHERITED
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center flex justify-center gap-3">
                        <button
                          onClick={() =>
                            esc.source !== "INHERITED" &&
                            handleEditEscalation(esc)
                          }
                          className={
                            esc.source === "INHERITED"
                              ? "text-gray-300"
                              : "text-blue-600"
                          }
                          disabled={esc.source === "INHERITED"}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEscalation(esc)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No escalation configuration added yet.
            </p>
          )}
        </div>
      )}

      {/* CONFIG MODAL */}
      {openConfigModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col relative">
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
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold capitalize">
                {inheritMode
                  ? `Inherit from ${project?.client?.client_name || "Client"}`
                  : `Create ${configType}`}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {configType === "sla" &&
                (inheritMode ? (
                  <div className="space-y-4">
                    <p className="text-sm">Select client SLAs to map:</p>
                    <table className="w-full text-sm">
                      <tbody className="divide-y">
                        {clientSlas.map((sla) => (
                          <tr key={sla.slaId}>
                            <td>
                              <input
                                type="checkbox"
                                disabled={sla.isAlreadyMapped}
                                checked={selectedClientSlas.includes(
                                  sla.slaType,
                                )}
                                onChange={(e) =>
                                  e.target.checked
                                    ? setSelectedClientSlas([
                                      ...selectedClientSlas,
                                      sla.slaType,
                                    ])
                                    : setSelectedClientSlas(
                                      selectedClientSlas.filter(
                                        (t) => t !== sla.slaType,
                                      ),
                                    )
                                }
                              />
                            </td>
                            <td className="p-2">{sla.slaType}</td>
                            <td className="p-2 text-gray-500">
                              {sla.slaDurationDays}d /{" "}
                              {sla.warningThresholdDays}d
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={() => setInheritMode(false)}
                        className="text-sm text-gray-500"
                      >
                        Manual
                      </button>
                      <button
                        onClick={saveInheritedSlas}
                        disabled={selectedClientSlas.length === 0}
                        className="bg-[#263383] text-white px-4 py-2 rounded-lg disabled:bg-gray-300"
                      >
                        Map
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <SLAForm formData={formData} setFormData={setFormData} />
                    <div className="flex justify-between mt-4">
                      <button
                        onClick={handleInheritClick}
                        className="text-[#263383] text-sm"
                      >
                        ← Inherit
                      </button>
                      <button
                        onClick={handleManualSave}
                        className="bg-[#263383] text-white px-4 py-2 rounded-lg"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))}

              {configType === "pre-requisites" &&
                (inheritMode ? (
                  <div className="space-y-4">
                    <table className="w-full text-sm">
                      <tbody className="divide-y">
                        {clientCompliance.map((comp) => (
                          <tr key={comp.clientcomplianceId}>
                            <td>
                              <input
                                type="checkbox"
                                disabled={comp.isAlreadyMapped}
                                checked={selectedClientCompliance.includes(
                                  comp.requirementType,
                                )}
                                onChange={(e) =>
                                  e.target.checked
                                    ? setSelectedClientCompliance([
                                      ...selectedClientCompliance,
                                      comp.requirementType,
                                    ])
                                    : setSelectedClientCompliance(
                                      selectedClientCompliance.filter(
                                        (t) => t !== comp.requirementType,
                                      ),
                                    )
                                }
                              />
                            </td>
                            <td className="p-2">{comp.requirementName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={() => setInheritMode(false)}
                        className="text-sm text-gray-500"
                      >
                        Manual
                      </button>
                      <button
                        onClick={saveInheritedCompliance}
                        disabled={selectedClientCompliance.length === 0}
                        className="bg-[#263383] text-white px-4 py-2 rounded-lg disabled:bg-gray-300"
                      >
                        Map
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ComplianceForm
                      formData={formData}
                      setFormData={setFormData}
                    />
                    <div className="flex justify-between mt-4">
                      <button
                        onClick={handleComplianceInheritClick}
                        className="text-[#263383] text-sm"
                      >
                        ← Inherit
                      </button>
                      <button
                        onClick={handleComplianceManualSave}
                        className="bg-[#263383] text-white px-4 py-2 rounded-lg"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))}

              {configType === "escalation" &&
                (inheritMode ? (
                  <div className="space-y-4">
                    <table className="w-full text-sm">
                      <tbody className="divide-y">
                        {clientEscalations.map((esc) => (
                          <tr key={esc.contactId}>
                            <td>
                              <input
                                type="checkbox"
                                disabled={esc.isAlreadyMapped}
                                checked={selectedClientEscalations.includes(
                                  esc.contactId,
                                )}
                                onChange={(e) =>
                                  e.target.checked
                                    ? setSelectedClientEscalations([
                                      ...selectedClientEscalations,
                                      esc.contactId,
                                    ])
                                    : setSelectedClientEscalations(
                                      selectedClientEscalations.filter(
                                        (id) => id !== esc.contactId,
                                      ),
                                    )
                                }
                              />
                            </td>
                            <td className="p-2">
                              {esc.contactName} ({esc.contactRole})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={() => setInheritMode(false)}
                        className="text-sm text-gray-500"
                      >
                        Manual
                      </button>
                      <button
                        onClick={saveInheritedEscalations}
                        disabled={selectedClientEscalations.length === 0}
                        className="bg-[#263383] text-white px-4 py-2 rounded-lg disabled:bg-gray-300"
                      >
                        Map
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <EscalationForm
                      formData={formData}
                      setFormData={setFormData}
                    />
                    <div className="flex justify-between mt-4">
                      <button
                        onClick={handleEscalationInheritClick}
                        className="text-[#263383] text-sm"
                      >
                        ← Inherit
                      </button>
                      <button
                        onClick={
                          formData.projectEscalationId
                            ? handleEscalationUpdate
                            : handleEscalationManualSave
                        }
                        className="bg-[#263383] text-white px-4 py-2 rounded-lg"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

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
