import React, { useState, useEffect, useMemo, Fragment } from "react";
import FilterListbox from "../../../components/filter/FilterListbox";
import { jwtDecode } from "jwt-decode";
import { KPICard } from "../../../components/kpi/KPI";

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
import { notify } from "../utils/notify";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { Listbox, Transition } from "@headlessui/react";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import Pagination from "../../../components/Pagination/pagination";
import GenericTable from "../../../components/Table/table";

/* ---------------- CONSTANTS & STYLES ---------------- */

const STATUS_COLORS = {
  ASSIGNED: "bg-blue-100 text-blue-700",
  REQUESTED: "bg-yellow-100 text-yellow-700",
  RETURNED: "bg-slate-100 text-slate-600",
  REJECTED: "bg-red-100 text-red-700",
  LOST: "bg-red-100 text-red-700",
};

/* ---------------- SUB-COMPONENTS ---------------- */

const Stat = ({ title, value, icon: Icon, color = "indigo" }) => {
  const theme = COLOR_STYLES[color] || COLOR_STYLES.indigo;
  return (
    <div
      className={`bg-white border rounded-xl p-5 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${theme.border}`}
    >
      <div>
        <p className="text-xs text-gray-400 font-bold tracking-wider">
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

const Input = ({ label, required, error, ...props }) => (
  <div className="space-y-1.5 w-full">
    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      {...props}
      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
        error
          ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      }`}
    />
    {error && <p className="text-[11px] text-red-500 font-medium ml-1 mt-0.5">{error}</p>}
  </div>
);

const Select = ({ label, options, required, error, ...props }) => (
  <div className="space-y-1.5 w-full">
    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      {...props}
      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm outline-none appearance-none cursor-pointer ${
        error
          ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      }`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
    {error && <p className="text-[11px] text-red-500 font-medium ml-1 mt-0.5">{error}</p>}
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
  const [errors, setErrors] = useState({});

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
      notify.error(err, "Failed to load project resources");
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
      notify.error("Failed To Load Available Serial Numbers");
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
      notify.error(err, "Failed to load asset details");
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
      notify.error(err, "Failed to load KPI data");
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
    if (rate >= 80) return "bg-emerald-100 text-emerald-600";
    if (rate >= 50) return "bg-amber-100 text-amber-600";
    return "bg-rose-100 text-rose-600";
  };

  const getUtilizationIconColor = (rate) => {
    if (rate >= 80) return "text-emerald-600";
    if (rate >= 50) return "text-amber-600";
    return "text-rose-600";
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
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleReturnChange = (e) => {
    const { name, value } = e.target;
    setReturnData((prev) => ({ ...prev, [name]: value }));
  };

  const listboxButtonClass = (hasError) => 
    `w-full cursor-default rounded-lg border py-2 pl-4 pr-10 text-left text-sm shadow-sm transition focus:outline-none focus:ring-2 bg-white ${
      hasError
        ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
        : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
    }`;

  const handleAssignSave = async (e) => {
    e.preventDefault();

    // Field validations
    const newErrors = {};
    if (!formData.projectId) {
      newErrors.projectId = "Project is required.";
    }
    if (!formData.resourceName) {
      newErrors.resourceName = "Resource Name is required.";
    }
    if (!formData.serialNumber) {
      newErrors.serialNumber = "Serial Number is required.";
    }
    if (!formData.expectedReturnDate) {
      newErrors.expectedReturnDate = "Expected Return Date is required.";
    }
    if (!formData.assignmentStatus) {
      newErrors.assignmentStatus = "Assignment Status is required.";
    }
    if (!formData.locationType) {
      newErrors.locationType = "Work Type is required.";
    }
    if (!formData.locationDetails || !formData.locationDetails.trim()) {
      newErrors.locationDetails = "Location Details are required.";
    }
    if (!formData.description || !formData.description.trim()) {
      newErrors.description = "Description is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      notify.error("Please fill in all mandatory fields.");
      return;
    }

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
        notify.success("Assignment Updated Successfully");
      } else {
        notify.success("Assignment Created Successfully");
      }
      await fetchData();
      fetchKPI();
      closeModal();
    } catch (err) {
      notify.error(err, "Failed to save record");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnData.conditionOnReturn) {
      notify.warning("Please select the condition on return.");
      return;
    }
    setReturnLoading(true);
    try {
      const res = await returnAssetAssignment(
        returnItem.assignmentId,
        today,
        returnData.returnNotes,
      );
      notify.success(res.message || "Asset marked as returned");
      await fetchData();
      fetchKPI();
      setReturnModal(false);
      setReturnItem(null);
    } catch (err) {
      notify.error(err, "Failed to return asset");
    } finally {
      setReturnLoading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await deleteClientAssignment(deleteTarget.assignmentId);
      notify.success(res.message || "Record deleted");
      await fetchData();
    } catch (err) {
      console.log(err);
      notify.error(err, "Failed to delete record");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const openEditModal = async (a) => {
    // mark editing target so availableProjectResources allows it
    setEditingAssignment(a);

    // fetch project resources for the assignment's project so the resource list contains the current resource
    try {
      if (a.projectId) {
        setProjectResourcesLoading(true);
        const res = await projectResourceDetails(a.projectId);
        const fetched = res?.data || [];

        // If the resource in the assignment isn't present in fetched list, add it so the listbox can show it
        if (a.resourceName && !fetched.find((r) => r.resourceName === a.resourceName)) {
          fetched.push({ resourceName: a.resourceName, resourceRole: a.resourceRole || "" });
        }

        setProjectResources(fetched);
      }
    } catch (err) {
      console.error("Failed to load project resources for edit modal", err);
    } finally {
      setProjectResourcesLoading(false);
    }

    // populate form with existing assignment values
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

    // ensure serials are loaded
    fetchAvailableSerials();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAssignment(null);
    setErrors({});
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
          <KPICard
            label="Total Stock"
            value={totalStock}
            icon={<Box className="w-5 h-5 text-blue-600" />}
            color="bg-blue-100 text-blue-600"
          />
          <KPICard
            label="Active Assignments"
            value={assignedCount}
            icon={<Users className="w-5 h-5 text-emerald-600" />}
            color="bg-emerald-100 text-emerald-600"
          />
          <KPICard
            label="Available"
            value={availableCount}
            icon={<Laptop className="w-5 h-5 text-amber-600" />}
            color="bg-amber-100 text-amber-600"
          />
          <KPICard
            label="Utilization"
            value={`${utilization}%`}
            icon={<Percent className={`w-5 h-5 ${getUtilizationIconColor(utilization)}`} />}
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
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden no-scrollbar">
        <GenericTable
          headers={[
            "Resource",
            "Project",
            "Serial",
            "Location",
            "Assigned",
            ...(activeTab === "HISTORY" ? ["Returned"] : []),
            "Status",
            "Actions",
          ]}
          columns={[
            "resourceName",
            "projectName",
            "serial_info",
            "location_info",
            "assigned_info",
            ...(activeTab === "HISTORY" ? ["returned_info"] : []),
            "status_info",
            "actions",
          ]}
          rows={paginatedAssignments.map((a) => ({
            ...a,
            serial_info: <div className="text-xs font-mono text-slate-500 text-center">{a.serialNumber || "-"}</div>,
            location_info: <div className="text-slate-600 text-center">{a.locationDetails || "-"}</div>,
            assigned_info: (
              <div className="text-slate-600 text-center">
                {new Date(a.assignedDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            ),
            returned_info: a.actualReturnDate ? (
              <div className="text-slate-600 text-center">
                {new Date(a.actualReturnDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            ) : "-",
            status_info: (
              <div className="text-center">
                <span
                  className={`inline-flex items-center justify-center min-w-[80px] py-1 px-2 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[a.assignmentStatus] || "bg-gray-100 text-gray-600"}`}
                >
                  {a.assignmentStatus}
                </span>
              </div>
            ),
            actions: (
              <div className="text-center">
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
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Read Only</span>
                )}
              </div>
            )
          }))}
          loading={loading}
        />
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
                    Project <span className="text-red-500">*</span>
                  </label>
                  <FilterListbox
                    options={[
                      { value: "", label: "Select Project" },
                      ...clientProjects.map((p) => ({ value: p.pmsProjectId, label: p.projectName }))
                    ]}
                    value={formData.projectId || ""}
                    buttonClassName={listboxButtonClass(!!errors.projectId)}
                    onChange={(val) => {
                      setFormData((prev) => ({
                        ...prev,
                        projectId: val,
                        projectName: clientProjects.find((p) => p.pmsProjectId == val)?.projectName || "",
                      }));
                      if (errors.projectId) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.projectId;
                          return copy;
                        });
                      }
                    }}
                  />
                  {errors.projectId && (
                    <p className="text-[11px] text-red-500 font-medium ml-1 mt-0.5">{errors.projectId}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                    Resource Name <span className="text-red-500">*</span>
                  </label>
                  <FilterListbox
                    options={[
                      { value: "", label: !formData.projectId ? "Select Resource" : projectResourcesLoading ? "Loading resources..." : availableProjectResources.length === 0 ? "No resources allocated to this project" : "Select Resource" },
                      ...availableProjectResources.map((res) => ({ value: res.resourceName, label: `${res.resourceName} - ${res.resourceRole}` }))
                    ]}
                    value={formData.resourceName || ""}
                    buttonClassName={listboxButtonClass(!!errors.resourceName)}
                    onChange={(val) => {
                      handleFormChange({ target: { name: "resourceName", value: val } });
                      if (errors.resourceName) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.resourceName;
                          return copy;
                        });
                      }
                    }}
                  />
                  {errors.resourceName && (
                    <p className="text-[11px] text-red-500 font-medium ml-1 mt-0.5">{errors.resourceName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                    Serial Number <span className="text-red-500">*</span>
                  </label>

                  <FilterListbox
                    options={[
                      { value: "", label: serialLoading ? "Loading serials..." : "Select Serial Number" },
                      ...(editingAssignment && formData.serialNumber ? [{ value: formData.serialNumber, label: `${formData.serialNumber} (Current)` }] : []),
                      ...availableSerials.map((s) => ({ value: s.serialNumber, label: s.serialNumber }))
                    ]}
                    value={formData.serialNumber}
                    buttonClassName={listboxButtonClass(!!errors.serialNumber)}
                    onChange={(val) => {
                      handleFormChange({ target: { name: "serialNumber", value: val } });
                      if (errors.serialNumber) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.serialNumber;
                          return copy;
                        });
                      }
                    }}
                  />
                  {errors.serialNumber && (
                    <p className="text-[11px] text-red-500 font-medium ml-1 mt-0.5">{errors.serialNumber}</p>
                  )}
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
                  required
                  error={errors.expectedReturnDate}
                />
                <Select
                  label="Status"
                  name="assignmentStatus"
                  value={formData.assignmentStatus}
                  onChange={handleFormChange}
                  // When creating a new assignment, only allow ASSIGNED.
                  // When editing an existing assignment, keep existing options.
                  options={editingAssignment ? ["ASSIGNED", "REQUESTED", "REJECTED"] : ["ASSIGNED"]}
                  required
                  error={errors.assignmentStatus}
                />
                <Input
                  label="Location"
                  name="locationDetails"
                  value={formData.locationDetails}
                  onChange={handleFormChange}
                  placeholder="e.g. Hyderabad"
                  required
                  error={errors.locationDetails}
                />
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                    Work Type <span className="text-red-500">*</span>
                  </label>
                  <FilterListbox
                    options={[
                      { value: "", label: "Select work mode" },
                      { value: "HYBRID", label: "Hybrid" },
                      { value: "ON_SITE", label: "On Site" },
                      { value: "CLIENT_LOCATION", label: "Client Location" },
                    ]}
                    value={formData.locationType || ""}
                    buttonClassName={listboxButtonClass(!!errors.locationType)}
                    onChange={(val) => {
                      setFormData((prev) => ({ ...prev, locationType: val }));
                      if (errors.locationType) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.locationType;
                          return copy;
                        });
                      }
                    }}
                  />
                  {errors.locationType && (
                    <p className="text-[11px] text-red-500 font-medium ml-1 mt-0.5">{errors.locationType}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  className={`w-full bg-slate-50 border rounded-xl p-3 mt-1.5 text-sm outline-none transition-all focus:ring-2 ${
                    errors.description
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                  }`}
                  rows={3}
                  required
                />
                {errors.description && (
                  <p className="text-[11px] text-red-500 font-medium ml-1 mt-1">{errors.description}</p>
                )}
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
