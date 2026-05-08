import React, { useState, useEffect, useMemo, Fragment } from "react";
import { jwtDecode } from "jwt-decode";

import { useNavigate, useParams } from "react-router-dom";
import { getAssetsByClient } from "../services/clientservice";
import { projectResourceDetails } from "../services/resource";
import { getAvailableSerialsByAssetId } from "../services/clientservice";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Box,
  Users,
  Laptop,
  Percent,
  Undo2,
  Check,
  ChevronDown,
} from "lucide-react";
import Button from "../../../components/Button/Button";
import {
  getClientAssetAssignments,
  assignClientAsset,
  assignUpdateClientAsset,
  getAssignmentKPI,
  returnAssetAssignment,
  deleteClientAssignment,
  getProjectsByClient,
} from "../services/clientservice";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { Listbox, Transition } from "@headlessui/react";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import Pagination from "../../../components/Pagination/pagination";

/* ---------------- CONSTANTS & STYLES ---------------- */

const STATUS_COLORS = {
  ASSIGNED: "bg-blue-100 text-blue-700",
  REQUESTED: "bg-yellow-100 text-yellow-700",
  RETURNED: "bg-slate-100 text-slate-600",
  REJECTED: "bg-red-100 text-red-700",
  LOST: "bg-red-100 text-red-700",
};

const COLOR_STYLES = {
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    border: "border-indigo-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-100",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-100",
  },
  blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
  yellow: {
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    border: "border-yellow-100",
  },
};

/* ---------------- SUB-COMPONENTS ---------------- */

const Stat = ({ title, value, icon: Icon, color = "indigo" }) => {
  const theme = COLOR_STYLES[color] || COLOR_STYLES.indigo;
  return (
    <div
      className={`bg-white border rounded-xl p-5 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${theme.border}`}
    >
      <div>
        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
          {title}
        </p>
        <p className={`text-2xl font-bold mt-1 ${theme.text}`}>{value}</p>
      </div>
      <div className={`${theme.bg} p-3 rounded-lg`}>
        <Icon className={theme.text} size={22} />
      </div>
    </div>
  );
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 md:p-10">
    {/* Backdrop */}
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    />

    <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
      <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b rounded-t-2xl shrink-0">
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-red-500 transition-colors p-1 hover:bg-white rounded-full"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
      {label}
    </label>
    <input
      {...props}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
      {label}
    </label>
    <select
      {...props}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const AssetDetail = () => {
  const navigate = useNavigate();
  const { clientId, assetId } = useParams();
  const [assignments, setAssignments] = useState([]);
  const [masterAsset, setMasterAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [kpiLoading, setKPILoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ACTIVE");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;
  const today = new Date().toISOString().split("T")[0];
  const [showModal, setShowModal] = useState(false);
  const [returnModal, setReturnModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [returnItem, setReturnItem] = useState(null);
  const [kpiData, setKPIData] = useState(null);

  const [availableSerials, setAvailableSerials] = useState([]);
  const [serialLoading, setSerialLoading] = useState(false);
  const [projectResources, setProjectResources] = useState([]);
  const [projectResourcesLoading, setProjectResourcesLoading] = useState(false);

  const availableProjectResources = useMemo(() => {
    const currentlyAssignedNames = assignments
      .filter((a) => a.assignmentStatus === "ASSIGNED")
      .map((a) => a.resourceName);

    return projectResources.filter((res) => {
      // Allow the currently selected resource in edit mode to remain available
      if (editingAssignment && editingAssignment.resourceName === res.resourceName) {
        return true;
      }
      return !currentlyAssignedNames.includes(res.resourceName);
    });
  }, [projectResources, assignments, editingAssignment]);

  const fetchProjectResources = async () => {
    setProjectResourcesLoading(true);
    try {
      const res = await projectResourceDetails(formData.projectId);
      setProjectResources(res?.data || []);
    } catch (err) {
      console.error("Failed to load project resources", err);
      toast.error(err.response?.data?.message || "Failed to load project resources");
    } finally {
      setProjectResourcesLoading(false);
    }
  };

  const getLoggedInUserName = () => {
    const token = localStorage.getItem("token");
    if (!token) return "System";

    const decoded = jwtDecode(token);
    return decoded?.name || decoded?.email || "System";
  };
  const fetchAvailableSerials = async () => {
    if (!assetId) return;

    setSerialLoading(true);
    try {
      const res = await getAvailableSerialsByAssetId(assetId);

      // HARD FILTER: remove any serial already assigned
      const filtered = (res || []).filter(
        (s) => !assignedSerialNumbers.includes(s.serialNumber),
      );

      setAvailableSerials(filtered);
    } catch (err) {
      console.error("Failed to fetch serial numbers", err);
      toast.error("Failed to load available serial numbers");
    } finally {
      setSerialLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    resourceName: "",
    projectId: "",
    projectName: "",
    assignedDate: today,
    expectedReturnDate: "",
    assignmentStatus: "ASSIGNED",
    assignedBy: "",
    locationType: "",
    locationDetails: "",
    description: "",
    serialNumber: "",
  });

  useEffect(() => {
    if (formData.projectId) {
      fetchProjectResources();
    }
  }, [formData.projectId]);

  const [returnData, setReturnData] = useState({
    conditionOnReturn: "",
    returnNotes: "",
  });
  const [clientProjects, setClientProjects] = useState([]);
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await getProjectsByClient(clientId);
        setClientProjects(res?.data || []);
      } catch (err) {
        console.error("Failed to load projects", err);
      }
    };

    if (clientId) fetchProjects();
  }, [clientId]);
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getClientAssetAssignments(assetId);

      if (res.success && res.data) {
        setAssignments(res.data.assignments || []);
        if (res.data.asset) {
          setMasterAsset(res.data.asset);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load asset details");
    } finally {
      setLoading(false);
    }
  };
  const assignedSerialNumbers = useMemo(() => {
    return assignments
      .filter((a) => a.assignmentStatus !== "RETURNED")
      .map((a) => a.serialNumber)
      .filter(Boolean);
  }, [assignments]);

  const fetchKPI = async () => {
    setKPILoading(true);
    try {
      const res = await getAssignmentKPI(assetId);
      setKPIData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load KPI data");
    } finally {
      setKPILoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchData();
      fetchKPI();
    }
  }, [assetId]);

  /* ---------------- KPI CALCULATIONS ---------------- */
  const totalStock = kpiData?.totalAssets || 0;
  const assignedCount = kpiData?.activeAssets;
  const availableCount = kpiData?.availableAssets;
  const utilization = kpiData?.utilization;

  const getUtilizationColor = (rate) => {
    if (rate >= 80) return "emerald";
    if (rate >= 50) return "yellow";
    return "rose";
  };

  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((a) =>
        activeTab === "ACTIVE"
          ? a.assignmentStatus !== "RETURNED"
          : a.assignmentStatus === "RETURNED",
      )
      .filter((a) => {
        const search = searchTerm.toLowerCase();
        return (
          a.resourceName?.toLowerCase().includes(search) ||
          a.projectName?.toLowerCase().includes(search) ||
          a.serialNumber?.toLowerCase().includes(search) ||
          a.location?.toLowerCase().includes(search)
        );
      });
  }, [assignments, activeTab, searchTerm]);

  const totalPages = Math.ceil(filteredAssignments.length / rowsPerPage);
  useEffect(() => setCurrentPage(1), [activeTab, searchTerm]);

  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  /* ---------------- HANDLERS ---------------- */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReturnChange = (e) => {
    const { name, value } = e.target;
    setReturnData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssignSave = async (e) => {
    e.preventDefault();

    const payload = {
      asset: {
        assetId: assetId,
      },
      serialNumber: formData.serialNumber,
      resourceName: formData.resourceName,
      projectId: formData.projectId,
      projectName: formData.projectName,
      assignedDate: formData.assignedDate,
      expectedReturnDate: formData.expectedReturnDate,
      assignmentStatus: formData.assignmentStatus,
      assignedBy: formData.assignedBy,
      locationType: formData.locationType,
      locationDetails: formData.locationDetails,
      description: formData.description,
      active: true,
    };

    setUpdateLoading(true);
    try {
      if (editingAssignment) {
        const res = await assignUpdateClientAsset(editingAssignment.assignmentId, payload);
      } else {
        const res = await assignClientAsset(payload);
      }
      if (editingAssignment) {
        toast.success("Assignment updated successfully");
      } else {
        toast.success("Assignment created successfully");
      }
      await fetchData();
      fetchKPI();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save record");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnData.conditionOnReturn) {
      toast.warning("Please select the condition on return.");
      return;
    }
    setReturnLoading(true);
    try {
      const res = await returnAssetAssignment(
        returnItem.assignmentId,
        today,
        returnData.returnNotes,
      );
      toast.success(res.message || "Asset marked as returned");
      await fetchData();
      fetchKPI();
      setReturnModal(false);
      setReturnItem(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to return asset");
    } finally {
      setReturnLoading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await deleteClientAssignment(deleteTarget.assignmentId);
      toast.success(res.message || "Record deleted");
      await fetchData();
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data || "Failed to delete record");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const openEditModal = (a) => {
    setEditingAssignment(a);

    setFormData({
      resourceName: a.resourceName || "",
      projectId: a.projectId || "",
      projectName: a.projectName || "",
      assignedDate: a.assignedDate ? new Date(a.assignedDate).toISOString().split("T")[0] : today,
      expectedReturnDate: a.expectedReturnDate || "",
      assignmentStatus: a.assignmentStatus || "ASSIGNED",
      assignedBy: a.assignedBy || getLoggedInUserName(), // 🔥 fallback
      locationType: a.locationType || "",
      locationDetails: a.locationDetails || "",
      description: a.description || "",
      serialNumber: a.serialNumber || "",
    });

    fetchAvailableSerials();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAssignment(null);
    setFormData({
      resourceName: "",
      projectId: "",
      projectName: "",
      assignedDate: today,
      expectedReturnDate: "",
      assignmentStatus: "ASSIGNED",
      assignedBy: "",
      locationType: "",
      locationDetails: "",
      description: "",
      serialNumber: "",
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner text="Loading Asset Assignment Details..." />
      </div>
    );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div className="flex gap-3 items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {masterAsset?.assetName || "Asset Detail"}
            </h1>
            <p className="text-sm text-slate-500">
              Category:{" "}
              <span className="font-medium">
                {masterAsset?.assetCategory || "Unknown"}
              </span>
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setFormData((prev) => ({
              ...prev,
              assignedBy: getLoggedInUserName(),
              assignedDate: today,
            }));
            setShowModal(true);
            fetchAvailableSerials();
          }}
        >
          Assign Asset
        </Button>
      </div>

      {/* KPI CARDS */}
      {kpiLoading ? (
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner text="Loading KPI Data..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            title="Total Stock"
            value={totalStock}
            icon={Box}
            color="blue"
          />
          <Stat
            title="Active Assignments"
            value={assignedCount}
            icon={Users}
            color="emerald"
          />
          <Stat
            title="Available"
            value={availableCount}
            icon={Laptop}
            color="amber"
          />
          <Stat
            title="Utilization"
            value={`${utilization}%`}
            icon={Percent}
            color={getUtilizationColor(utilization)}
          />
        </div>
      )}

      {/* TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row justify-between items-center border-b gap-4">
        <div className="flex gap-6 w-full sm:w-auto">
          {["ACTIVE", "HISTORY"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === tab
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-indigo-600"
                }`}
            >
              {tab === "ACTIVE" ? "Active Assignments" : "Assignment History"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-auto mb-2 sm:mb-0">
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 border-b bg-gray-50/50">
              <tr>
                <th className="py-3 px-4 text-center w-[15%]">Resource</th>
                <th className="py-3 px-4 text-center w-[15%]">Project</th>
                <th className="py-3 px-4 text-center w-[15%]">Serial</th>
                <th className="py-3 px-4 text-center w-[15%]">Location</th>
                <th className="py-3 px-4 text-center w-[15%]">Assigned</th>
                {activeTab === "HISTORY" && (
                  <th className="py-3 px-4 text-center w-[15%]">Returned</th>
                )}
                <th className="py-3 px-4 text-center w-[10%]">Status</th>
                <th className="py-3 px-4 text-center w-[15%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-400">
                    Loading data...
                  </td>
                </tr>
              ) : paginatedAssignments.length > 0 ? (
                paginatedAssignments.map((a) => (
                  <tr
                    key={a.assignmentId}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {a.resourceName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {a.projectName}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500 text-center">
                      {a.serialNumber || "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {a.locationDetails || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-center">
                      {new Date(a.assignedDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    {activeTab === "HISTORY" && (
                      <td className="py-3 px-4 text-slate-600 text-center">
                        {new Date(a.actualReturnDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center min-w-[80px] py-1 px-2 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[a.assignmentStatus] || "bg-gray-100 text-gray-600"}`}
                      >
                        {a.assignmentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {activeTab === "ACTIVE" ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditModal(a)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setReturnData({
                                conditionOnReturn: "",
                                returnNotes: "",
                              });
                              setReturnItem(a);
                              setReturnModal(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Return"
                          >
                            <Undo2 size={16} />
                          </button>
                          {/* <button
                            onClick={() => setDeleteTarget(a)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button> */}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Read Only
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                      <div className="bg-slate-50 p-3 rounded-full">
                        <Box size={24} className="opacity-40" />
                      </div>
                      <p className="text-sm">No assignments found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        </div>
      )}

      {/* --- MODALS --- */}

      {/* ASSIGN / EDIT MODAL */}
      {showModal && (
        <Modal
          title={editingAssignment ? "Edit Assignment" : "Assign Asset"}
          onClose={closeModal}
        >
          <form onSubmit={handleAssignSave} className="flex flex-col h-full max-h-[calc(80vh-60px)]">
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                    Project
                  </label>
                  <select
                    name="projectId"
                    value={formData.projectId || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        projectId: e.target.value,
                        projectName:
                          clientProjects.find(
                            (p) => p.pmsProjectId == e.target.value,
                          )?.projectName || "",
                      }))
                    }
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select Project</option>
                    {clientProjects.map((p) => (
                      <option key={p.pmsProjectId} value={p.pmsProjectId}>
                        {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                    Resource Name
                  </label>
                  <select
                    name="resourceName"
                    value={formData.resourceName || ""}
                    onChange={handleFormChange}
                    required
                    disabled={!formData.projectId || projectResourcesLoading || availableProjectResources.length === 0}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all ${projectResourcesLoading
                      ? "cursor-wait opacity-60"
                      : !formData.projectId || availableProjectResources.length === 0
                        ? "cursor-not-allowed opacity-60"
                        : "appearance-none cursor-pointer"
                      }`}
                  >
                    <option value="">
                      {!formData.projectId
                        ? "Select Resource"
                        : projectResourcesLoading
                          ? "Loading resources..."
                          : availableProjectResources.length === 0
                            ? "No resources allocated to this project"
                            : "Select Resource"}
                    </option>
                    {availableProjectResources.map((res) => (
                      <option key={res.resourceId} value={res.resourceName}>
                        {res.resourceName} - {res.resourceRole}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                    Serial Number
                  </label>

                  <select
                    name="serialNumber"
                    value={formData.serialNumber}
                    onChange={handleFormChange}
                    required
                    disabled={serialLoading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">
                      {serialLoading
                        ? "Loading serials..."
                        : "Select Serial Number"}
                    </option>

                    {/* Keep current serial visible in edit mode */}
                    {editingAssignment && formData.serialNumber && (
                      <option value={formData.serialNumber}>
                        {formData.serialNumber} (Current)
                      </option>
                    )}

                    {availableSerials.map((s) => (
                      <option key={s.serialNumber} value={s.serialNumber}>
                        {s.serialNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Assigned By"
                  name="assignedBy"
                  value={formData.assignedBy}
                  disabled
                />
                <Input
                  label="Assigned Date"
                  type="date"
                  name="assignedDate"
                  value={formData.assignedDate}
                  onChange={handleFormChange}
                  required
                  disabled
                />
                <Input
                  label="Exp. Return"
                  type="date"
                  name="expectedReturnDate"
                  value={formData.expectedReturnDate}
                  onChange={handleFormChange}
                  min={today}
                />
                <Select
                  label="Status"
                  name="assignmentStatus"
                  value={formData.assignmentStatus}
                  onChange={handleFormChange}
                  options={["ASSIGNED", "REQUESTED", "REJECTED"]}
                />
                <Input
                  label="Location"
                  name="locationDetails"
                  value={formData.locationDetails}
                  onChange={handleFormChange}
                  placeholder="e.g. Hyderabad"
                />
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                    Work Type
                  </label>
                  <select
                    id="locationType"
                    name="locationType"
                    value={formData.locationType || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        locationType: e.target.value,
                      }))
                    }
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="" disabled>
                      Select work mode
                    </option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ON_SITE">On Site</option>
                    <option value="CLIENT_LOCATION">Client Location</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  rows={3}
                />
              </div>
            </div>
            {/* FOOTER */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-6 py-4 border-t bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className={`w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 ${updateLoading ? "cursor-not-allowed" : ""}`}
                disabled={updateLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-500 hover:bg-indigo-600 ${updateLoading ? "cursor-not-allowed" : ""}`}
                disabled={updateLoading}
              >
                {editingAssignment
                  ? `${updateLoading ? "Updating..." : "Update"}`
                  : `${updateLoading ? "Assigning..." : "Assign"}`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* RETURN MODAL */}
      {returnModal && returnItem && (
        <Modal title="Return Asset" onClose={() => setReturnModal(false)}>
          <form onSubmit={handleReturnSubmit} className="flex flex-col h-full max-h-[calc(80vh-60px)]">
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Resource"
                  value={returnItem.resourceName}
                  disabled
                />
                <Input label="Project" value={returnItem.projectName} disabled />
                <Input
                  label="Serial Number"
                  value={returnItem.serialNumber}
                  disabled
                />
                <Input label="Return Date" value={today} disabled />
              </div>

              {/* --- INLINE LISTBOX START --- */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                  Condition on Return
                </label>
                <Listbox
                  value={returnData.conditionOnReturn}
                  onChange={(val) =>
                    handleReturnChange({
                      target: { name: "conditionOnReturn", value: val },
                    })
                  }
                >
                  <div className="relative">
                    <Listbox.Button className="relative w-full cursor-pointer bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-10 text-left text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                      <span className={`block truncate ${!returnData.conditionOnReturn ? "text-slate-400 italic" : "text-slate-700"}`}>
                        {returnData.conditionOnReturn || "Select Condition Type"}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDown
                          size={16}
                          className="text-gray-400"
                          aria-hidden="true"
                        />
                      </span>
                    </Listbox.Button>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none z-[60]">
                        {["Good", "Damaged", "Needs Repair", "Lost"].map(
                          (opt) => (
                            <Listbox.Option
                              key={opt}
                              value={opt}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "text-gray-900"
                                }`
                              }
                            >
                              {({ selected }) => (
                                <>
                                  <span
                                    className={`block truncate ${selected ? "font-medium" : "font-normal"}`}
                                  >
                                    {opt}
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                      <Check size={16} aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ),
                        )}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
              </div>
              {/* --- INLINE LISTBOX END --- */}

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                  Return Notes
                </label>
                <textarea
                  name="returnNotes"
                  value={returnData.returnNotes}
                  onChange={handleReturnChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  rows={3}
                />
              </div>
            </div>
            {/* FOOTER */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-6 py-4 border-t bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={() => setReturnModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={returnLoading}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {returnLoading ? "Returning..." : "Return"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE DIALOG */}
      {deleteTarget && (
        <ConfirmationModal
          isOpen={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          title="Delete Asset"
          message="Are you sure you want to delete this asset?"
          onConfirm={confirmDelete}
          isLoading={deleteLoading}
        />
      )}
    </div>
  );
};

export default AssetDetail;
